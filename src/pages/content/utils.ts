import { BalanceComparisonAtBlock } from '../../LightClientVerifier';
import { getStorageItem } from '../../storage';
import { runningStorageName, ETH } from '../../common';

export const verifyingText = '⌛ Verifying...';

export function delayMs(ms: number = 50) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function waitForClientToStart(delay?: number): Promise<void> {
  const running = await getStorageItem(runningStorageName);
  if (running === true) {
    return; // Client has started; exit the function.
  } else {
    await delayMs(delay);
    await waitForClientToStart();
  }
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
  const verifiedText = `✅ Verified @ Block ${balanceComparisonAtBlock.blockNumber}`;
  const balanceNotEqText = `❌ Balance Mismatch @ Block ${balanceComparisonAtBlock.blockNumber}`;
  const verificationFailedText = `❌ Verification Failed @ Block ${balanceComparisonAtBlock.blockNumber}`;
  if (balancesData.ethBalance.isVerified) {
    if (balancesData.ethBalance.isEqual === true) {
      tokenToTextMap[ETH] = verifiedText;
    } else {
      tokenToTextMap[ETH] = balanceNotEqText;
    }
  } else {
    tokenToTextMap[ETH] = verificationFailedText;
  }

  for (const address in balancesData.erc20Balances) {
    if (balancesData.erc20Balances.hasOwnProperty(address)) {
      const token = balancesData.erc20Balances[address];
      if (token.returned === undefined) {
        tokenToTextMap[address] = '❓ Unsupported Token';
      } else if (balancesData.ethBalance.isVerified) {
        if (token.isEqual === true) {
          tokenToTextMap[address] = verifiedText;
        } else {
          tokenToTextMap[address] = balanceNotEqText;
        }
      } else {
        tokenToTextMap[address] = verificationFailedText;
      }
    }
  }

  return tokenToTextMap;
}
