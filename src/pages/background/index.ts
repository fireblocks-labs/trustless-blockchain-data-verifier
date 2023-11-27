import { LightClientVerifier, AccountsToVerify, AccountsToVerifyAllNetworks } from '../../LightClientVerifier';
import {
  Actions,
  configStorageName,
  runningStatusStorageName,
  initialConfig,
  NetworkEnum,
  ConfigType,
  RunningStatusType,
} from '../../common';
import { getStorageItem, setStorageItem, setStorageData } from '../../storage';

// TODO: Make onInstalled work properly
// chrome.runtime.onInstalled.addListener(function (details) {
//   if (details.reason === 'install' || details.reason === 'update') {
//     setStorageData({ [configStorageName]: initialConfig, [runningStorageName]: false });
//   }
// });

chrome.runtime.onStartup.addListener(async () => {
  main();
});

async function initializeSingleLightClientVerifier(network: NetworkEnum, config: ConfigType) {
  const lightClientVerifier = new LightClientVerifier(config[network]);
  await lightClientVerifier.initialize();
  const runningStatus = {
    ...(await getStorageItem(runningStatusStorageName)),
    [network]: true,
  };

  await setStorageItem(runningStatusStorageName, runningStatus);

  lightClientVerifier.setOptimisticHeaderHook(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: Actions.headerUpdate }, () => {
          if (
            chrome.runtime.lastError &&
            chrome.runtime.lastError.message !== 'The message port closed before a response was received.'
          ) {
            console.log('Error sending message, no tab with content script was active');
          }
        });
      }
    });
  });

  return lightClientVerifier;
}

async function initializeLightClientVerifiers() {
  let config = await getStorageItem(configStorageName);
  if (!config) {
    config = initialConfig;
    await setStorageItem(configStorageName, config);
  }
  let lightClientVerifiers: Record<string, LightClientVerifier> = {};
  for (const network of Object.values(NetworkEnum)) {
    lightClientVerifiers[network] = await initializeSingleLightClientVerifier(network, config);
  }
  return lightClientVerifiers;
}
let globalLightClientVerifiers: Record<string, LightClientVerifier>;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Got message', message);

  if (message.action === Actions.wakeUp) {
    console.log('Got wakeUp message');
  } else if (message.action === Actions.verifyBalances) {
    const accountsByNetwork = message.accountsToVerify as AccountsToVerifyAllNetworks;

    const results: Record<NetworkEnum, any> = Object.fromEntries(
      Object.values(NetworkEnum).map((network) => [network, {}]),
    ) as RunningStatusType;

    const promises: Promise<any>[] = Object.entries(accountsByNetwork).map(async ([network, accountsToVerify]) => {
      if (Object.keys(accountsToVerify).length > 0) {
        const lightClientVerifier = globalLightClientVerifiers[network];
        let result;
        if (lightClientVerifier) {
          try {
            result = await lightClientVerifier.verifyBalances(
              accountsToVerify,
              message.ethRoundingDigits,
              message.tokenRoundingDigits,
            );
            console.log(`Verification result for ${network}`, result);
          } catch (error) {
            console.error(`Error during verification for ${network}`, error);
            result = 'Error during verification';
          }
        } else {
          console.error(`LightClientVerifier not initialized for ${network}`);
          result = 'LightClientVerifier not initialized';
        }
        results[network as NetworkEnum] = result;
      }
    });
    Promise.all(promises)
      .then(() => {
        sendResponse(results);
      })
      .catch((error) => {
        console.error('Error during verification', error);
        sendResponse('Error during verification');
      });
  } else if (message.action === Actions.configUpdate) {
    // Your existing logic for config update...
  } else {
    sendResponse('Wrong action');
  }

  return true;
});
async function main() {
  // TODO: Make onInstalled work properly
  // await setStorageItem(runningStorageName, false);
  // let config = await getStorageItem(configStorageName);
  // if (!config) {
  //   await setStorageItem(configStorageName, initialConfig);
  //   config = initialConfig;
  // }
  const initialRunningStatus: RunningStatusType = Object.fromEntries(
    Object.values(NetworkEnum).map((network) => [network, false]),
  ) as RunningStatusType;
  setStorageData({ [configStorageName]: initialConfig, [runningStatusStorageName]: initialRunningStatus });
  globalLightClientVerifiers = await initializeLightClientVerifiers();
}

try {
  main();
} catch (error) {
  console.log('Initializing LightClientVerifier failed with error', error);
}
