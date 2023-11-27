import { BalanceComparisonAtBlock } from '../../LightClientVerifier';
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

export function generateTokenToTextMap(balanceComparisonAtBlock: BalanceComparisonAtBlock): Record<string, string> {
  const tokenToTextMap: Record<string, string> = {};
  const balancesData = balanceComparisonAtBlock.balanceComparisonResult;
  const suffix = ` @ Block ${balanceComparisonAtBlock.blockNumber}`;
  const verifiedText = '✅ Verified' + suffix;
  const balanceNotEqText = '❌ Balance Mismatch';
  const verificationFailedText = '❌ Verification Failed' + suffix;
  if (balancesData.ethBalance.isVerified) {
    if (balancesData.ethBalance.isEqual === true) {
      tokenToTextMap[ETH] = verifiedText;
    } else {
      tokenToTextMap[ETH] =
        balanceNotEqText + `, Diff ${balancesData.ethBalance.expected - balancesData.ethBalance.returned!}` + suffix;
    }
  } else {
    tokenToTextMap[ETH] = verificationFailedText;
  }

  for (const address in balancesData.erc20Balances) {
    if (balancesData.erc20Balances.hasOwnProperty(address)) {
      const token = balancesData.erc20Balances[address];
      if (token.returned === undefined) {
        tokenToTextMap[address] = '❓ Unsupported Token';
      } else if (token.isVerified) {
        if (token.isEqual === true) {
          tokenToTextMap[address] = verifiedText;
        } else {
          tokenToTextMap[address] = balanceNotEqText + `, Diff ${token.expected - token.returned!}` + suffix;
        }
      } else {
        tokenToTextMap[address] = verificationFailedText;
      }
    }
  }

  return tokenToTextMap;
}
