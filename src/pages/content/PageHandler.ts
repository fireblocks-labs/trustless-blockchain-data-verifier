import { generateTokenToTextMap, verifyingText } from './utils';
import { BalanceComparisonAtBlock, AccountsToVerifyAllNetworks, BalanceVerificationResult } from '../../LightClientVerifier';
import { Actions, verificationStatusElementId } from '../../common';

export abstract class PageHandler {
  constructor(
    public document: Document,
    public window: Window,
    private tokenRoundingDigits?: number,
    private ethRoundingDigits?: number,
  ) {}

  abstract checkMatch(url: string): boolean;

  abstract setup(): Promise<void>;

  abstract setupVerificationStatus(): void;

  abstract updateVerificationStatus(tokenToTextMap: Record<string, string>): void;

  abstract getAccountsToVerify(): AccountsToVerifyAllNetworks;

  abstract handleVerificationResponse(response: BalanceVerificationResult): void;

  async run() {
    await this._beforeRun();

    await this.verifyBalancesAndUpdatePage();

    await this._run();

    chrome.runtime.onMessage.addListener(async (message) => {
      if (message.action === Actions.headerUpdate) {
        await this.verifyBalancesAndUpdatePage();
      } else if (message.action === Actions.configUpdate) {
        this.window.location.reload();
      }
    });
  }

  _run(): void {}

  _beforeRun(): void {}

  setVerificationStatusElement(parentElement: Element, status: string, lineBreak?: boolean, beforeChildIndex?: number) {
    let verificationStatusElement = parentElement.querySelector(`#${verificationStatusElementId}`);
    if (verificationStatusElement) {
      verificationStatusElement!.textContent = status;
    } else {
      verificationStatusElement = this.document.createElement('div');
      verificationStatusElement.textContent = verifyingText;
      verificationStatusElement.id = verificationStatusElementId;

      if (beforeChildIndex) {
        const beforeChild = parentElement.children[beforeChildIndex];
        if (lineBreak) {
          parentElement.insertBefore(this.document.createElement('br'), beforeChild);
        }
        parentElement.insertBefore(verificationStatusElement, beforeChild);
      } else {
        if (lineBreak) {
          parentElement.appendChild(this.document.createElement('br'));
        }
        parentElement.appendChild(verificationStatusElement);
      }
    }
  }

  addVerificationStatusToPage(balanceComparisonAtBlock: BalanceComparisonAtBlock) {
    const tokenToTextMap = generateTokenToTextMap(balanceComparisonAtBlock);
    this.updateVerificationStatus(tokenToTextMap);
  }

  verifyBalancesAndUpdatePage() {
    const accountsToVerify = this.getAccountsToVerify();

    chrome.runtime.sendMessage(
      {
        action: Actions.verifyBalances,
        accountsToVerify,
        tokenRoundingDigits: this.tokenRoundingDigits,
        ethRoundingDigits: this.ethRoundingDigits,
      },
      (response: BalanceVerificationResult) => {
        this.handleVerificationResponse(response);
      },
    );
  }
}
