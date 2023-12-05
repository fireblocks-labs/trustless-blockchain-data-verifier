import { verifyingText } from '../utils';
import {
  BalanceComparisonAtBlock,
  AccountsToVerifyAllNetworks,
  BalanceVerificationResult,
} from '../../../verifiers/BalanceVerifier';
import { Actions, VerificationRequest, VerificationTypeEnum, ETH } from '../../../common';
import { PageHandler } from './PageHandler';

export abstract class BalancePageHandler extends PageHandler {
  constructor(
    public document: Document,
    public window: Window,
    private tokenRoundingDigits?: number,
    private ethRoundingDigits?: number,
  ) {
    super(document, window);
  }

  abstract updateVerificationStatus(tokenToTextMap: Record<string, string>): void;

  abstract getAccountsToVerify(): AccountsToVerifyAllNetworks;

  addVerificationStatusToPage(balanceComparisonAtBlock: BalanceComparisonAtBlock) {
    const tokenToTextMap = this.generateTokenToTextMap(balanceComparisonAtBlock);
    this.updateVerificationStatus(tokenToTextMap);
  }

  prepareVerificationRequests(): VerificationRequest[] {
    const accountsToVerify = this.getAccountsToVerify();

    const verificationRequests = Object.entries(accountsToVerify).map(([network, accountsToVerify]) => ({
      network,
      type: VerificationTypeEnum.BALANCES,
      dataToVerify: {
        accountsToVerify,
        tokenRoundingDigits: this.tokenRoundingDigits,
        ethRoundingDigits: this.ethRoundingDigits,
      },
    })) as VerificationRequest[];

    return verificationRequests;
  }

  generateTokenToTextMap(balanceComparisonAtBlock: BalanceComparisonAtBlock): Record<string, string> {
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
}
