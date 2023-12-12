import { verifyingText } from '../utils';
import {
  Actions,
  VerificationRequestMessage,
  VerificationResponseMessage,
  VerificationRequest,
  verificationStatusElementId,
} from '../../../common';

export abstract class PageHandler {
  constructor(
    public document: Document,
    public window: Window,
  ) {}

  abstract checkMatch(url: string): boolean;

  abstract setup(): Promise<void>;

  abstract prepareVerificationRequests(): VerificationRequest[];

  abstract handleVerificationResponseMessage(verificationResponseMessage: VerificationResponseMessage): void;

  _run(): void {}

  _beforeRun(): void {}

  async run() {
    await this._beforeRun();

    await this.verifyAndUpdatePage();

    await this._run();

    chrome.runtime.onMessage.addListener(async (message) => {
      if (message.action === Actions.headerUpdate) {
        await this.verifyAndUpdatePage();
      } else if (message.action === Actions.configUpdate) {
        this.window.location.reload();
      }
    });
  }

  verifyAndUpdatePage() {
    const verificationRequests = this.prepareVerificationRequests();
    const verificationRequestMessage = { action: Actions.verify, requests: verificationRequests } as VerificationRequestMessage;
    chrome.runtime.sendMessage(verificationRequestMessage, (verificationResponseMessage: VerificationResponseMessage) => {
      this.handleVerificationResponseMessage(verificationResponseMessage);
    });
  }

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
}
