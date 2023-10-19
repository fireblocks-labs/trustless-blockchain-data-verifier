import { PageHandler } from '../../PageHandler';
import { ETH } from '../../../../common';
import { BalanceVerificationResult, AccountBalance, AccountsToVerify } from '../../../../LightClientVerifier';
import { verifyingText, delayMs } from '../../utils';
import { waitForElement } from '../../utils';

const MetamaskPortfolioRoundingDigits = 17; // Token balances on https://portfolio.metamask.io page are rounded to 17 digits after decimal point

interface MetamaskAccount {
  address: string;
  name: string;
  selected: boolean;
}

interface MetamaskAccountData {
  accountAddress: string;
  chainId: number;

  updatedAt: string;
  nativeBalance: {
    symbol: string;
    address: string;
    name: string;
    balance: number;
    chainId: number;
  };
  tokenBalances: [
    {
      symbol: string;
      address: string;
      name: string;
      balance: number;
      chainId: number;
    },
  ];
}

export class MetaMaskPortfolioPageHandler extends PageHandler {
  constructor(
    document: Document,
    window: Window,
    public address?: string,
    private tokenTable?: HTMLTableElement,
    private accountData?: MetamaskAccountData,
  ) {
    super(document, window, MetamaskPortfolioRoundingDigits, MetamaskPortfolioRoundingDigits);
  }

  checkMatch(url: string): boolean {
    return /^https:\/\/portfolio\.metamask\.io\//.test(url);
  }

  async setup() {
    this.tokenTable = await this.getTokenTable();
    const accountsString = localStorage.getItem('accounts');
    if (!accountsString) {
      throw Error('Failed to get accounts');
    }

    const accounts = JSON.parse(accountsString) as MetamaskAccount[];
    const currentAccount = this.getCurrentAccount(accounts);
    if (!currentAccount) {
      throw Error('Failed to get current account');
    }
    this.address = currentAccount.address;

    const url = `https://account.metafi.codefi.network/accounts/${this.address}?chainId=1`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseJson: MetamaskAccountData = await response.json();
    if (!responseJson) {
      throw new Error('Failed to get account data');
    }
    this.accountData = responseJson;

    this.setupVerificationStatus();
  }

  async _beforeRun() {
    // Wait for token table to load
    await this.getTokenTable();
  }

  async getTokenTable(): Promise<HTMLTableElement> {
    const tokenTable = await waitForElement('div#token-table > div > table', this.document);
    if (!tokenTable) {
      throw Error('Token table not found');
    }
    return tokenTable as HTMLTableElement;
  }

  getCurrentAccount(accounts: MetamaskAccount[]) {
    return accounts.find((account) => account.selected === true);
  }

  convertMetamaskAccountDataToAccountBalance(data: MetamaskAccountData): AccountBalance {
    const ethBalance = data.nativeBalance.symbol === ETH ? data.nativeBalance.balance : 0;
    const erc20Balances: Record<string, number> = {};

    for (const tokenBalance of data.tokenBalances) {
      erc20Balances[tokenBalance.address] = tokenBalance.balance;
    }

    return { ethBalance, erc20Balances };
  }

  getSymbolFromTokenElement(tokenElement: Element) {
    const symbolElement = tokenElement.querySelector('.list-name');
    if (symbolElement) {
      const symbolText = symbolElement.textContent?.trim();
      const symbolMatch = symbolText?.match(/\(([^)]+)\)/);
      if (symbolMatch) {
        return symbolMatch[1];
      }
    }
    return null;
  }

  getBalanceFromTokenElement(tokenElement: Element) {
    const balanceElement = tokenElement.querySelector('.text-muted');
    if (balanceElement) {
      const balanceText = balanceElement.textContent?.trim();
      const balance = balanceText?.replace(/,/g, '');
      return balance;
    }
    return null;
  }

  getAddressFromTokenElement(tokenElement: Element) {
    const anchorElement = tokenElement.querySelector('a');
    if (anchorElement) {
      const href = anchorElement.getAttribute('href');
      const addressMatch = href?.match(/\/token\/(.*?)\?a=/);

      if (addressMatch) {
        const address = addressMatch[1];
        return address;
      }
      return null;
    }
  }

  extractSymbolFromBalanceCell(balanceCell: Element) {
    const paragraphElement = balanceCell.querySelector('div > div > p:last-child');

    if (paragraphElement) {
      const textContent = paragraphElement.textContent || '';
      const parts = textContent.split(' ');

      if (parts.length >= 2) {
        const symbol = parts[parts.length - 1];
        return symbol;
      }
    }

    return;
  }

  getTokenAddressFromSymbol(symbol: string) {
    const token = this.accountData?.tokenBalances.find((tokenBalance: any) => tokenBalance.symbol === symbol);
    return token?.address!;
  }

  isEthereumTokenRow(row: HTMLTableRowElement) {
    const columnIndex = this.findColumnIndex(this.tokenTable!, 'token-header');
    if (columnIndex === -1) {
      return false;
    }
    const tokenCell = row.cells[columnIndex];
    const networkImage = tokenCell.querySelector('img') as HTMLImageElement;
    return networkImage.src.indexOf('ethereum') !== -1;
  }

  updateVerificationStatus(tokenToTextMap: Record<string, string>) {
    const columnIndex = this.findColumnIndex(this.tokenTable!, 'balance-header');

    if (columnIndex !== -1) {
      for (let i = 1; i < this.tokenTable!.rows.length; i++) {
        const row = this.tokenTable!.rows[i];
        if (this.isEthereumTokenRow(row)) {
          const balanceCell = row.cells[columnIndex];
          const symbol = this.extractSymbolFromBalanceCell(balanceCell);
          if (!symbol) {
            throw new Error('Failed to get token symbol');
          }
          let tokenIdentifier: string;
          if (symbol === ETH) {
            tokenIdentifier = ETH;
          } else {
            tokenIdentifier = this.getTokenAddressFromSymbol(symbol);
          }
          this.setVerificationStatusElement(balanceCell, tokenToTextMap[tokenIdentifier]);
        }
      }
    }
  }

  findColumnIndex(table: HTMLTableElement, columnId: string): number {
    let columnIndex = -1;
    const headers = table?.rows[0].cells;

    if (headers) {
      for (let i = 0; i < headers.length; i++) {
        const headerId = headers[i].getAttribute('id');

        if (headerId === columnId) {
          columnIndex = i;
          break;
        }
      }
    }

    return columnIndex;
  }

  setupVerificationStatus() {
    const columnIndex = this.findColumnIndex(this.tokenTable!, 'balance-header');
    if (columnIndex !== -1) {
      for (let i = 1; i < this.tokenTable!.rows.length; i++) {
        const row = this.tokenTable!.rows[i];
        if (this.isEthereumTokenRow(row)) {
          const balanceCell = row.cells[columnIndex];
          this.setVerificationStatusElement(balanceCell.querySelector('div')!, verifyingText);
        }
      }
    }
  }

  getAccountsToVerify(): AccountsToVerify {
    const extractedData = this.convertMetamaskAccountDataToAccountBalance(this.accountData!);
    const accountsToVerify = {
      [this.address!]: {
        ethBalance: extractedData.ethBalance,
        erc20Balances: extractedData.erc20Balances,
      },
    };
    return accountsToVerify;
  }

  handleVerificationResponse(response: BalanceVerificationResult): void {
    this.addVerificationStatusToPage(response[this.address!]);
  }
}
