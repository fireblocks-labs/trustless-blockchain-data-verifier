import fs from 'fs';
import { join } from 'path';

const { JSDOM } = require('jsdom');

import { EtherscanAddressPageHandler } from '../../../src/pages/content/sites/etherscan/address';

const htmlTestFile = join(__dirname, 'data', 'Address 0x790A2376A063BFE075B318Ddd1036e46558cD908 _ Etherscan.html');

describe('EtherscanAddressPageHandler', function () {
  let handler: EtherscanAddressPageHandler;
  let document: Document;
  let window: Window;

  beforeEach(() => {
    const htmlFileContents = fs.readFileSync(htmlTestFile, 'utf8');
    const dom = new JSDOM(htmlFileContents, {
      url: 'https://etherscan.io/address/0x790A2376A063BFE075B318Ddd1036e46558cD908',
    });
    document = dom.window.document;
    window = dom.window;
    handler = new EtherscanAddressPageHandler(document, window);
  });

  it('Should test checkMatch on valid urls', async function () {
    const urls = [
      'https://etherscan.io/address/0x790A2376A063BFE075B318Ddd1036e46558cD908',
      'https://etherscan.io/address/0x123',
    ];

    for (const url of urls) {
      expect(handler.checkMatch(url)).toBe(true);
    }
  });

  it('Should test checkMatch on invalid urls', async function () {
    const urls = [
      'https://etherscan.io/addres/0x790A2376A063BFE075B318Ddd1036e46558cD908',
      'https://etherscan.io/0x790A2376A063BFE075B318Ddd1036e46558cD908',
      'http://etherscan.io/address/0x790A2376A063BFE075B318Ddd1036e46558cD908',
    ];

    for (const url of urls) {
      expect(handler.checkMatch(url)).toBe(false);
    }
  });

  it('setup', async function () {
    await handler.setup();
  });

  it('handleVerificationResponse', async function () {
    await handler.setup();
    const response = {
      mainnet: {
        '0x790A2376A063BFE075B318Ddd1036e46558cD908': {
          balanceComparisonResult: {
            ethBalance: {
              expected: 0.002728809697369,
              returned: 0.002728809697369,
              isEqual: true,
              isVerified: true,
            },
            erc20Balances: {
              '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
                expected: 1,
                returned: 1,
                isEqual: true,
                isVerified: true,
              },
            },
            verified: true,
          },
          blockNumber: 18377035,
        },
      },
    };
    handler.handleVerificationResponse(response);
    const elements = document.querySelectorAll('#verification-status-id');

    expect(elements.length).toBe(2);

    elements.forEach((element: Element) => {
      expect(element.textContent).toContain('Verified');
    });
  });
});
