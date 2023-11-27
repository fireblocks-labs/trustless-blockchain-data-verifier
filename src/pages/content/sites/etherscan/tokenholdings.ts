import { PageHandler } from '../../PageHandler';
import { ETH, NetworkEnum } from '../../../../common';
import { BalanceVerificationResult, AccountsToVerifyAllNetworks, AccountBalance } from '../../../../LightClientVerifier';
import { verifyingText } from '../../utils';
export class EtherscanTokenholdingsPageHandler extends PageHandler {
  constructor(
    document: Document,
    window: Window,
    public address?: string,
    private table?: HTMLTableElement,
  ) {
    super(document, window);
  }

  checkMatch(url: string): boolean {
    return /^https:\/\/etherscan\.io\/tokenholdings\?a=/.test(url);
  }

  async setup() {
    const table = this.document.querySelector('table[id="mytable"]');
    if (!table) {
      throw Error('Balance table not found');
    }
    this.table = table as HTMLTableElement;

    const address = this.getAddressFromUrl(this.window.location.href);
    if (!address) {
      throw Error('Failed to get address');
    }
    this.address = address;

    this.setupVerificationStatus();
  }

  _run() {
    const handler = this;
    const observer = new MutationObserver(async function (mutations) {
      const hasTbodyMutation = mutations.some((mutation) => {
        return mutation.target instanceof Element && mutation.target.tagName.toLowerCase() === 'tbody';
      });

      if (hasTbodyMutation) {
        handler.setupVerificationStatus();
        await handler.verifyBalancesAndUpdatePage();
      }
    });

    observer.observe(this.table!, { childList: true, subtree: true });
  }

  getAddressFromUrl(url: string): string | null {
    const match = url.match(/^https:\/\/etherscan\.io\/tokenholdings\?a=(0x[0-9a-fA-F]+)/);
    return match ? match[1] : null;
  }

  getSymbolFromRow(row: HTMLTableRowElement) {
    const symbolColumnId = this.findColumnIndex(this.table!, 'Symbol');
    return row.cells[symbolColumnId].textContent;
  }

  getAddressFromRow(row: HTMLTableRowElement) {
    const symbolColumnId = this.findColumnIndex(this.table!, 'Contract Address');
    return (row.cells[symbolColumnId].querySelector('a')?.getAttribute('href') || '').split('/').pop()?.toLowerCase();
  }
  getBalanceFromRow(row: HTMLTableRowElement) {
    const balanceColumnId = this.findColumnIndex(this.table!, 'Quantity');
    return row.cells[balanceColumnId].textContent;
  }

  extractBalancesFromHTML(): AccountBalance {
    const erc20Balances: Record<string, number> = {};
    let ethBalance = 0;

    for (let i = 1; i < this.table!.rows.length; i++) {
      const row = this.table!.rows[i];
      const symbol = this.getSymbolFromRow(row);
      const address = this.getAddressFromRow(row);
      const balance = this.getBalanceFromRow(row);
      if (symbol && balance) {
        if (symbol === ETH) {
          ethBalance = parseFloat(balance);
        } else if (address) {
          erc20Balances[address] = parseFloat(balance);
        }
      }
    }

    return {
      ethBalance,
      erc20Balances,
    };
  }

  findColumnIndex(table: HTMLTableElement, columnHeaderText: string): number {
    let columnIndex = -1;
    const headers = table?.rows[0].cells;

    if (headers) {
      for (let i = 0; i < headers.length; i++) {
        if (headers[i].textContent === columnHeaderText) {
          columnIndex = i;
          break;
        }
      }
    }

    return columnIndex;
  }

  updateVerificationStatus(tokenToTextMap: Record<string, string>) {
    for (let i = 1; i < this.table!.rows.length; i++) {
      const row = this.table!.rows[i];
      let tokenIdentifier;
      const symbol = this.getSymbolFromRow(row);
      if (symbol === ETH) {
        tokenIdentifier = symbol;
      } else {
        tokenIdentifier = this.getAddressFromRow(row);
      }

      if (tokenIdentifier && tokenToTextMap[tokenIdentifier]) {
        const balanceColumnId = this.findColumnIndex(this.table!, 'Quantity');
        this.setVerificationStatusElement(row.cells[balanceColumnId], tokenToTextMap[tokenIdentifier]);
      }
    }
  }

  setupVerificationStatus() {
    for (let i = 1; i < this.table!.rows.length; i++) {
      const row = this.table!.rows[i];
      const columnIndex = this.findColumnIndex(this.table!, 'Quantity');
      if (columnIndex === -1) {
        return false;
      }
      const balanceCell = row.cells[columnIndex];
      this.setVerificationStatusElement(balanceCell, verifyingText);
    }
  }

  getAccountsToVerify(): AccountsToVerifyAllNetworks {
    const extractedData = this.extractBalancesFromHTML();
    const accountsToVerify: AccountsToVerifyAllNetworks = {
      [NetworkEnum.MAINNET]: {
        [this.address!]: {
          ethBalance: extractedData.ethBalance,
          erc20Balances: extractedData.erc20Balances,
        },
      },
    };
    return accountsToVerify;
  }

  handleVerificationResponse(response: BalanceVerificationResult): void {
    this.addVerificationStatusToPage(response[NetworkEnum.MAINNET]![this.address!]);
  }
}
