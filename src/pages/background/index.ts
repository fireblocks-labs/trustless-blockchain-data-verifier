import { LightClient } from '../../LightClient';
import {
  Actions,
  configStorageName,
  runningStatusStorageName,
  initialConfig,
  NetworkEnum,
  ConfigType,
  RunningStatusType,
  VerificationRequest,
  VerificationTypeEnum,
  VerificationResult,
  VerificationRequestMessage,
  VerificationResponseMessage,
} from '../../common';
import { getStorageItem, setStorageItem, setStorageData } from '../../storage';
import { BalanceVerifier } from '../../verifiers/BalanceVerifier';
import { DatafeedVerifier } from '../../verifiers/DatafeedVerifier';

// TODO: Make onInstalled work properly
// chrome.runtime.onInstalled.addListener(function (details) {
//   if (details.reason === 'install' || details.reason === 'update') {
//     setStorageData({ [configStorageName]: initialConfig, [runningStorageName]: false });
//   }
// });

chrome.runtime.onStartup.addListener(async () => {
  main();
});

async function initializeSingleLightClient(network: NetworkEnum, config: ConfigType) {
  const lightClient = new LightClient(config[network]);
  await lightClient.initialize();
  const runningStatus = {
    ...(await getStorageItem(runningStatusStorageName)),
    [network]: true,
  };

  await setStorageItem(runningStatusStorageName, runningStatus);

  lightClient.setOptimisticHeaderHook(() => {
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

  return lightClient;
}

async function initializeLightClients() {
  let config = await getStorageItem(configStorageName);
  if (!config) {
    config = initialConfig;
    await setStorageItem(configStorageName, config);
  }
  let lightClients: Record<string, LightClient> = {};
  for (const network of Object.values(NetworkEnum)) {
    lightClients[network] = await initializeSingleLightClient(network, config);
  }
  return lightClients;
}
let globalLightClients: Record<string, LightClient>;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Got message', message);

  if (message.action === Actions.wakeUp) {
    console.log('Got wakeUp message');
  } else if (message.action === Actions.verify) {
    const verficationRequestMessage = message as VerificationRequestMessage;

    let response: VerificationResponseMessage = { results: [] };

    const promises: Promise<any>[] = verficationRequestMessage.requests.map(async (verificationRequest) => {
      const lightClient = globalLightClients[verificationRequest.network];
      let result;
      let errorMsg;

      if (lightClient) {
        let verifier;
        if (verificationRequest.type == VerificationTypeEnum.BALANCES) {
          verifier = new BalanceVerifier(lightClient);
        } else if (verificationRequest.type == VerificationTypeEnum.DATAFEEDS) {
          verifier = new DatafeedVerifier(lightClient);
        } else {
          errorMsg = `Wrong verification type ${verificationRequest.type}`;
        }

        if (verifier) {
          try {
            result = await verifier!.verify(verificationRequest.dataToVerify);
            console.log(`Verification result for ${verificationRequest.network}`, result);
          } catch (error) {
            console.log(`Error during verification for ${verificationRequest.network}`, error);
            errorMsg = 'Error during verification';
          }
        }
      } else {
        console.error(`LightClientVerifier not initialized for ${verificationRequest.network}`);
        errorMsg = `LightClient for network ${verificationRequest.network} not initialized`;
      }
      response.results.push({
        result,
        network: verificationRequest.network,
        type: verificationRequest.type,
        errorMsg,
      } as VerificationResult);
    });

    Promise.all(promises)
      .then(() => {
        sendResponse(response);
      })
      .catch((error) => {
        console.log('Error sending response', error);
      });
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
  globalLightClients = await initializeLightClients();
}

try {
  main();
} catch (error) {
  console.log('Initializing LightClients failed with error', error);
}
