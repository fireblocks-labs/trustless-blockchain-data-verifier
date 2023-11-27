import { NetworkEnum } from '../../../../../common';
import { AccountsToVerifyAllNetworks, BalanceVerificationResult } from '../../../../../LightClientVerifier';

import { EtherscanAddressPageHandler } from '../address';

export class SepoliaEtherscanAddressPageHandler extends EtherscanAddressPageHandler {
  checkMatch(url: string): boolean {
    return /^https:\/\/sepolia\.etherscan\.io\/address\//.test(url);
  }

  getAddress(url: string): string | undefined {
    let match = url.match(/^https:\/\/sepolia\.etherscan\.io\/address\/(0x[0-9a-fA-F]+)/);
    if (!match) {
      return document.getElementById('mainaddress')?.innerText;
    } else {
      return match[1];
    }
  }

  getAccountsToVerify(): AccountsToVerifyAllNetworks {
    const extractedData = this.extractBalancesFromHTML();
    const accountsToVerify: AccountsToVerifyAllNetworks = {
      [NetworkEnum.SEPOLIA]: {
        [this.address!]: {
          ethBalance: extractedData.ethBalance,
          erc20Balances: extractedData.erc20Balances,
        },
      },
    };
    return accountsToVerify;
  }

  handleVerificationResponse(response: BalanceVerificationResult): void {
    this.addVerificationStatusToPage(response[NetworkEnum.SEPOLIA]![this.address!]);
  }
}
