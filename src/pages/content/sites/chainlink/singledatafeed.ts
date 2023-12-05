import { PageHandler } from '../../page_handlers/PageHandler';
import { VerificationTypeEnum, VerificationResponseMessage, VerificationRequest, NetworkEnum } from '../../../../common';
import { delayMs, verifyingText } from '../../utils';
import { Datafeed, DatafeedVerificationInput, DatafeedVerificationResults } from '../../../../verifiers/DatafeedVerifier';

const chainlinkDatafeedRoundingDigits = 2;

export type DatafeedsPerNetwork = Record<NetworkEnum, Datafeed[]>;

export class ChainlinkDatafeedPageHandler extends PageHandler {
  constructor(document: Document, window: Window) {
    super(document, window);
  }

  checkMatch(url: string): boolean {
    return /^https:\/\/data\.chain\.link\/ethereum\/mainnet\//.test(url);
  }

  async setup() {
    const answerElement = this.getAnswerElement()!;
    this.setVerificationStatusElement(answerElement, verifyingText);
  }
  async _beforeRun() {
    // Wait for page to load
    await delayMs(500);
  }

  getAnswerElement() {
    return document.querySelector('main > section:nth-child(3) > div > div > div:nth-child(2)');
  }

  getAddress() {
    return document.querySelector('[class^="hexAddress_container__"]')?.textContent;
  }

  getAnswer() {
    return parseFloat(this.getAnswerElement()!.textContent!.replace(/[$Ξ,]/g, ''));
  }

  prepareVerificationRequests(): VerificationRequest[] {
    const verificationRequests = [
      {
        network: NetworkEnum.MAINNET,
        type: VerificationTypeEnum.DATAFEEDS,
        dataToVerify: {
          datafeedsToVerify: [
            {
              address: this.getAddress(),
              answer: this.getAnswer(),
            },
          ],
          roundingDigits: chainlinkDatafeedRoundingDigits,
        } as DatafeedVerificationInput,
      },
    ] as VerificationRequest[];

    return verificationRequests;
  }

  updateVerificationStatus(datafeedToTextMap: Record<string, string>) {
    const address = this.getAddress()!;
    if (address in datafeedToTextMap) {
      this.setVerificationStatusElement(this.getAnswerElement()!, datafeedToTextMap[address]);
    }
  }

  generateDatafeedToTextMap(datafeedVerificationResults: DatafeedVerificationResults): Record<string, string> {
    const datafeedToTextMap: Record<string, string> = {};
    const results = datafeedVerificationResults.results;
    const suffix = ` @ Block ${datafeedVerificationResults.blockNumber}`;
    const verifiedText = '✅ Verified' + suffix;
    const balanceNotEqText = '❌ Balance Mismatch';
    const verificationFailedText = '❌ Verification Failed' + suffix;

    for (const [address, datafeedVerificationResult] of Object.entries(results)) {
      if (datafeedVerificationResult.isVerified) {
        if (datafeedVerificationResult.isEqual === true) {
          datafeedToTextMap[address] = verifiedText;
        } else {
          datafeedToTextMap[address] =
            balanceNotEqText +
            `, Diff ${datafeedVerificationResult.expectedAnswer - datafeedVerificationResult.returnedAnswer!}` +
            suffix;
        }
      } else {
        datafeedToTextMap[address] = verificationFailedText;
      }
    }
    return datafeedToTextMap;
  }

  addVerificationStatusToPage(datafeedVerificationResults: DatafeedVerificationResults) {
    const datafeedToTextMap = this.generateDatafeedToTextMap(datafeedVerificationResults);
    this.updateVerificationStatus(datafeedToTextMap);
  }

  handleVerificationResponseMessage(response: VerificationResponseMessage): void {
    response.results.map((result) => {
      if (!result.errorMsg && result.network == NetworkEnum.MAINNET && result.type == VerificationTypeEnum.DATAFEEDS) {
        const datafeedVerificationResults = result.result as DatafeedVerificationResults;
        this.addVerificationStatusToPage(datafeedVerificationResults);
      }
    });
  }
}
