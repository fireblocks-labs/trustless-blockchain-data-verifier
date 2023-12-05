import { getStorageItem } from '../../storage';
import { runningStatusStorageName, ETH, NetworkEnum } from '../../common';

export const verifyingText = '⌛ Verifying...';

export function delayMs(ms: number = 50) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function waitForClientToStart(network: NetworkEnum, delay?: number): Promise<void> {
  const runningStatus = await getStorageItem(runningStatusStorageName);
  if (runningStatus[network] === true) {
    return; // Client has started; exit the function.
  } else {
    await delayMs(delay);
    await waitForClientToStart(network, delay);
  }
}

export async function waitForAllClientsToStart(delay?: number): Promise<void> {
  const networks = Object.values(NetworkEnum);

  await Promise.all(
    networks.map(async (network) => {
      await waitForClientToStart(network, delay);
    }),
  );
}

export function waitForElement(selector: string, document: Document) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}
