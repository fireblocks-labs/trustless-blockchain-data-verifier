import { PageHandler } from '../../page_handlers/PageHandler';
import { VerificationTypeEnum, VerificationResponseMessage, VerificationRequest, NetworkEnum } from '../../../../common';
import { delayMs, verifyingText } from '../../utils';
import { waitForElement } from '../../utils';
import { Datafeed, DatafeedVerificationInput, DatafeedVerificationResults } from '../../../../verifiers/DatafeedVerifier';

const chainlinkDatafeedRoundingDigits = 2;

export type DatafeedsPerNetwork = Record<NetworkEnum, Datafeed[]>;

const ChainlinkNetworkMap: Record<string, NetworkEnum> = {
  'Ethereum Mainnet': NetworkEnum.MAINNET,
};

export class ChainlinkDatafeedsPageHandler extends PageHandler {
  constructor(
    document: Document,
    window: Window,
    private table?: HTMLTableElement,
  ) {
    super(document, window);
  }

  checkMatch(url: string): boolean {
    return /^https:\/\/data\.chain\.link\//.test(url);
  }

  _run() {
    const handler = this;
    const observer = new MutationObserver(async function (mutations) {
      const hasTbodyMutation = mutations.some((mutation) => {
        return mutation.target instanceof Element && mutation.target.tagName.toLowerCase() === 'tbody';
      });

      if (hasTbodyMutation) {
        handler.setupVerificationStatus();
        await handler.verifyAndUpdatePage();
      }
    });

    observer.observe(this.table!, { childList: true, subtree: true });
  }

  async _beforeRun() {
    // Wait for table to load
    await this.getDatafeedTable();
  }

  async setup() {
    this.table = await this.getDatafeedTable();
    if (!this.table) {
      throw Error('Datafeed table not found');
    }

    this.setupVerificationStatus();
  }

  setupVerificationStatus() {
    this.setupTable();
  }

  setupTable() {
    for (let i = 1; i < this.table!.rows.length; i++) {
      const row = this.table!.rows[i];
      const columnIndex = this.findColumnIndex(this.table!, 'Answer');
      if (columnIndex === -1) {
        return false;
      }

      const network = this.getNetworkFromRow(row)!;
      if (network) {
        const answerCell = row.cells[columnIndex];
        this.setVerificationStatusElement(answerCell, verifyingText);
      }
    }
  }

  prepareVerificationRequests(): VerificationRequest[] {
    const datafeedsToVerifyPerNetwork = this.getDatafeedsToVerifyPerNetwork();
    const verificationRequests = Object.entries(datafeedsToVerifyPerNetwork).map(([network, datafeedsToVerify]) => ({
      network,
      type: VerificationTypeEnum.DATAFEEDS,
      dataToVerify: {
        datafeedsToVerify,
        roundingDigits: chainlinkDatafeedRoundingDigits,
      } as DatafeedVerificationInput,
    })) as VerificationRequest[];

    return verificationRequests;
  }

  getDatafeedsToVerifyPerNetwork() {
    let datafeedsToVerifyPerNetwork: DatafeedsPerNetwork = Object.fromEntries(
      (Object.values(NetworkEnum) as NetworkEnum[]).map((network) => [network, [] as Datafeed[]]),
    ) as DatafeedsPerNetwork;

    for (let i = 1; i < this.table!.rows.length; i++) {
      const row = this.table!.rows[i];
      const network = this.getNetworkFromRow(row)!;
      const address = this.getAddressFromRow(row)!;
      const answerString = this.getAnswerFromRow(row)!;
      const answer = parseFloat(answerString.replace(/[$Ξ,]/g, ''));

      if (network) {
        datafeedsToVerifyPerNetwork[network].push({ address, answer });
      }
    }

    return datafeedsToVerifyPerNetwork;
  }

  async getDatafeedTable() {
    const datafeedTable = await waitForElement('table', this.document);
    // Wait for table to get populated
    await delayMs(2000);
    if (!datafeedTable) {
      throw Error('Datafeed table not found');
    }
    return datafeedTable as HTMLTableElement;
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

  getNetworkFromRow(row: HTMLTableRowElement) {
    if (/^https:\/\/data\.chain\.link\/ethereum\//.test(window.location.href)) {
      return NetworkEnum.MAINNET;
    } else {
      const networkColumnId = this.findColumnIndex(this.table!, 'Network');
      const networkString = row.cells[networkColumnId].textContent!;
      if (Object.keys(ChainlinkNetworkMap).indexOf(networkString) !== -1) {
        return ChainlinkNetworkMap[networkString];
      }
    }
    return null;
  }

  getAddressFromRow(row: HTMLTableRowElement) {
    const addressColumnId = this.findColumnIndex(this.table!, 'Contract address');
    return (row.cells[addressColumnId].querySelector('a')?.getAttribute('href') || '').split('/').pop()?.toLowerCase();
  }

  getAnswerFromRow(row: HTMLTableRowElement) {
    const answerColumnId = this.findColumnIndex(this.table!, 'Answer');
    return row.cells[answerColumnId].textContent;
  }

  updateVerificationStatus(datafeedToTextMap: Record<string, string>) {
    for (let i = 1; i < this.table!.rows.length; i++) {
      const row = this.table!.rows[i];

      const address = this.getAddressFromRow(row)!;
      if (address in datafeedToTextMap) {
        const answerColumnId = this.findColumnIndex(this.table!, 'Answer');
        this.setVerificationStatusElement(row.cells[answerColumnId], datafeedToTextMap[address]);
      }
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
