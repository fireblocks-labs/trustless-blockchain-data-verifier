import { PageHandler } from '../../PageHandler';
import { ETH } from '../../../../common';
import { BalanceVerificationResult, AccountsToVerify } from '../../../../LightClientVerifier';
import { verifyingText } from '../../utils';

const etherscanAddressTokenRoundingDigits = 8; // Token balances on https://etherscan.io/address page are rounded to 8 digits after decimal point

export class EtherscanAddressPageHandler extends PageHandler {
  constructor(
    document: Document,
    window: Window,
    public address?: string,
    private tokenList?: NodeListOf<Element>,
    private verificationElementId: string = 'verification-status-id',
  ) {
    super(document, window, etherscanAddressTokenRoundingDigits, undefined);
  }

  checkMatch(url: string): boolean {
    return /^https:\/\/etherscan\.io\/address\//.test(url);
  }

  async setup() {
    const tokenList = this.document.querySelectorAll('li.list-custom-ERC20');
    if (!tokenList) {
      throw Error('Token list not found');
    }
    this.tokenList = tokenList;

    const address = this.getAddressFromUrl(this.window.location.href);
    if (!address) {
      throw Error('Failed to get address');
    }
    this.address = address;

    this.setupVerificationStatus();
  }

  getAddressFromUrl(url: string): string | null {
    const match = url.match(/^https:\/\/etherscan\.io\/address\/(0x[0-9a-fA-F]+)/);
    return match ? match[1] : null;
  }

  getSymbolFromTokenElement(tokenElement: Element) {
    const symbolElement = tokenElement.querySelector('.list-name');
    if (symbolElement) {
      const symbolText = symbolElement.textContent?.trim();
      const symbolMatch = symbolText?.match(/\(([^)]+)\)/); // Use a regular expression to capture text within parentheses
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
      const balance = balanceText?.replace(/,/g, ''); // Remove commas from balance
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

  getEthBalance() {
    const ethereumIcon = this.document.querySelector('.fa-ethereum');

    if (ethereumIcon) {
      const balanceContainer = ethereumIcon.parentNode;
      if (balanceContainer) {
        const balanceText = balanceContainer.textContent?.trim();
        const match = balanceText?.match(/([\d.]+)/);
        if (match) {
          return parseFloat(match[0]);
        }
      }
    }

    return null;
  }

  extractBalancesFromHTML() {
    const ethBalance = this.getEthBalance();

    const erc20Balances: Record<string, number> = {};
    this.tokenList!.forEach((tokenElement) => {
      const symbol = this.getSymbolFromTokenElement(tokenElement);
      const address = this.getAddressFromTokenElement(tokenElement);
      const balance = this.getBalanceFromTokenElement(tokenElement);
      if (symbol && balance && address) {
        erc20Balances[address] = parseFloat(balance);
      }
    });

    return {
      ethBalance,
      erc20Balances,
    };
  }

  updateVerificationStatus(tokenToTextMap: Record<string, string>) {
    const ethBalanceDiv = this.document.querySelector('.fa-ethereum')?.parentElement;
    if (ethBalanceDiv) {
      if (tokenToTextMap[ETH]) {
        this.setVerificationStatusElement(ethBalanceDiv, tokenToTextMap[ETH]);
      }
    }

    this.tokenList!.forEach((tokenElement) => {
      const tokenIdentifier = this.getAddressFromTokenElement(tokenElement);

      if (tokenIdentifier && tokenToTextMap[tokenIdentifier]) {
        this.setVerificationStatusElement(tokenElement, tokenToTextMap[tokenIdentifier], false, 1);
      }
    });
  }

  setupVerificationStatus() {
    const ethBalanceDiv = this.document.querySelector('.fa-ethereum')?.parentElement;
    if (ethBalanceDiv) {
      this.setVerificationStatusElement(ethBalanceDiv, verifyingText);
    }

    this.tokenList!.forEach((tokenElement) => {
      this.setVerificationStatusElement(tokenElement, verifyingText, false, 1);
    });
  }

  getAccountsToVerify(): AccountsToVerify {
    const extractedData = this.extractBalancesFromHTML();
    const accountsToVerify = {
      [this.address!]: {
        ethBalance: extractedData.ethBalance!,
        erc20Balances: extractedData.erc20Balances,
      },
    };
    return accountsToVerify;
  }

  handleVerificationResponse(response: BalanceVerificationResult): void {
    this.addVerificationStatusToPage(response[this.address!]);
  }
}
