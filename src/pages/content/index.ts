import { waitForAllClientsToStart } from './utils';
import { EtherscanTokenholdingsPageHandler } from './sites/etherscan/tokenholdings';
import { EtherscanAddressPageHandler } from './sites/etherscan/address';

import { SepoliaEtherscanAddressPageHandler } from './sites/etherscan/sepolia/address';
import { MetaMaskPortfolioPageHandler } from './sites/metamask/portfolio';
import { PageHandler } from './PageHandler';
import { Actions } from '../../common';

function intializePageHandler<T extends PageHandler>(handler: { new (document: Document, window: Window): T }): T {
  return new handler(globalThis.document, globalThis.window);
}

const pageHandlers = [
  intializePageHandler(EtherscanTokenholdingsPageHandler),
  intializePageHandler(EtherscanAddressPageHandler),
  intializePageHandler(SepoliaEtherscanAddressPageHandler),
  intializePageHandler(MetaMaskPortfolioPageHandler),
];
const currentURL = window.location.href;

(async function () {
  for (const pageHandler of pageHandlers) {
    if (pageHandler.checkMatch(currentURL)) {
      chrome.runtime.sendMessage({ action: Actions.wakeUp });
      await pageHandler.setup();
      await waitForAllClientsToStart();
      pageHandler.run();
    }
  }
})();
