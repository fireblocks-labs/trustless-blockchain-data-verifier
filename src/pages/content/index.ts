import { waitForClientToStart } from './utils';
import { EtherscanTokenholdingsPageHandler } from './sites/etherscan/tokenholdings';
import { EtherscanAddressPageHandler } from './sites/etherscan/address';
import { MetaMaskPortfolioPageHandler } from './sites/metamask/portfolio';
import { PageHandler } from './PageHandler';

function intializePageHandler<T extends PageHandler>(handler: { new (document: Document, window: Window): T }): T {
  return new handler(globalThis.document, globalThis.window);
}

const pageHandlers = [
  intializePageHandler(EtherscanTokenholdingsPageHandler),
  intializePageHandler(EtherscanAddressPageHandler),
  intializePageHandler(MetaMaskPortfolioPageHandler),
];
const currentURL = window.location.href;

(async function () {
  for (const pageHandler of pageHandlers) {
    if (pageHandler.checkMatch(currentURL)) {
      await pageHandler.setup();
      await waitForClientToStart();
      pageHandler.run();
    }
  }
})();
