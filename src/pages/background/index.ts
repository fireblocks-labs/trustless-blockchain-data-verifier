import { LightClientVerifierInitArgs, LightClientVerifier } from '../../LightClientVerifier';
import { Actions, configStorageName, runningStorageName, initialConfig } from '../../common';
import { getStorageItem, setStorageItem, setStorageData } from '../../storage';

async function initializeLightClientVerifier() {
  let config = await getStorageItem(configStorageName);
  if (!config) {
    config = initialConfig;
    await setStorageItem(configStorageName, config);
  }
  const lightClientVerifier = new LightClientVerifier(config);
  await lightClientVerifier.initialize();
  await setStorageItem(runningStorageName, true);

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
let globalLightClientVerifier: LightClientVerifier;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Got message', message);
  if (message.action === Actions.verifyBalances) {
    if (globalLightClientVerifier) {
      globalLightClientVerifier
        .verifyBalances(message.accountsToVerify, message.ethRoundingDigits, message.tokenRoundingDigits)
        .then((result) => {
          console.log('Verification result', result);
          sendResponse(result);
        })
        .catch((error) => {
          console.log(error);
          sendResponse('Error during verification');
        });
    } else {
      sendResponse('LightClientVerifier not initialized');
    }
  } else if (message.action === Actions.configUpdate) {
    if (globalLightClientVerifier) {
      globalLightClientVerifier.stop().then(() => {
        initializeLightClientVerifier().then((result) => {
          globalLightClientVerifier = result as LightClientVerifier;
        });
      });
    } else {
      initializeLightClientVerifier().then((result) => {
        globalLightClientVerifier = result as LightClientVerifier;
      });
    }
  } else {
    sendResponse('Wrong action');
  }
  return true;
});

async function main() {
  let config = await getStorageItem(configStorageName);
  if (!config) {
    await setStorageData({ [configStorageName]: initialConfig, [runningStorageName]: false });
    config = initialConfig;
  } else {
    await setStorageItem(runningStorageName, false);
  }
  globalLightClientVerifier = await initializeLightClientVerifier();
}

try {
  main();
} catch (error) {
  console.log('Initializing LightClientVerifier failed with error', error);
}
