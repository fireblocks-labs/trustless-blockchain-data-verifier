import { waitForAllClientsToStart } from './utils';
import { EtherscanTokenholdingsPageHandler } from './sites/etherscan/tokenholdings';
import { EtherscanAddressPageHandler } from './sites/etherscan/address';
import { ChainlinkDatafeedsPageHandler } from './sites/chainlink/datafeeds';
import { SepoliaEtherscanAddressPageHandler } from './sites/etherscan/sepolia/address';
import { MetaMaskPortfolioPageHandler } from './sites/metamask/portfolio';
import { PageHandler } from './page_handlers/PageHandler';
import { Actions } from '../../common';
import { ChainlinkDatafeedPageHandler } from './sites/chainlink/singledatafeed';

function initializePageHandler<T extends PageHandler>(handler: { new (document: Document, window: Window): T }): T {
  return new handler(globalThis.document, globalThis.window);
}

const pageHandlers = [
  initializePageHandler(EtherscanTokenholdingsPageHandler),
  initializePageHandler(EtherscanAddressPageHandler),
  initializePageHandler(SepoliaEtherscanAddressPageHandler),
  initializePageHandler(MetaMaskPortfolioPageHandler),
  initializePageHandler(ChainlinkDatafeedsPageHandler),
  initializePageHandler(ChainlinkDatafeedPageHandler),
];
const currentURL = window.location.href;

(async function () {
  chrome.runtime.sendMessage({ action: Actions.wakeUp });
  for (const pageHandler of pageHandlers) {
    if (pageHandler.checkMatch(currentURL)) {
      await pageHandler.setup();
      await waitForAllClientsToStart();
      pageHandler.run();
    }
  }
})();
