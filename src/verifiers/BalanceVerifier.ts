import { formatUnits } from 'ethers';
import { NetworkEnum, ETH } from '../common';
import { hexToNumberString } from 'web3-utils';
import { ContractCallResults, ContractCallContext } from 'ethereum-multicall';
import { Verifier } from './Verifier';

const ERC20ABI = [
  {
    constant: true,
    inputs: [
      {
        name: '_owner',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        name: 'balance',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        name: 'decimals',
        type: 'uint8',
      },
    ],
    payable: false,
    type: 'function',
  },
];

export type ERC20Contract = {
  contractAddress: string;
  balanceMappingIndex: number;
  decimals: number;
  symbol: string;
};

type VerifiedAccount = {
  balance: VerifiedAccountBalance;
  blockNumber: number;
};

export type AccountBalance = {
  ethBalance: number;
  erc20Balances: Record<string, number>;
};

export type VerifiedBalance = {
  balance: number;
  verified: boolean;
};

export type VerifiedAccountBalance = {
  ethBalance: VerifiedBalance;
  erc20Balances: Record<string, VerifiedBalance>;
};

type BalanceComparison = {
  expected: number;
  returned: number | undefined;
  isEqual: boolean;
  isVerified: boolean;
};

export type BalanceComparisonResult = {
  ethBalance: BalanceComparison;
  erc20Balances: Record<string, BalanceComparison>;
  verified: boolean;
};

export type BalanceComparisonAtBlock = {
  balanceComparisonResult: BalanceComparisonResult;
  blockNumber: number;
};

export type BalanceVerificationResult = Record<string, BalanceComparisonAtBlock>;

export type AccountsToVerify = Record<string, AccountBalance>;

export type AccountsToVerifyAllNetworks = {
  [network in NetworkEnum]?: AccountsToVerify;
};

export type BalanceVerificationInput = {
  accountsToVerify: AccountsToVerify;
  ethRoundingDigits?: number;
  tokenRoundingDigits?: number;
};

export class BalanceVerifier extends Verifier {
  public async verify(dataToVerify: BalanceVerificationInput): Promise<BalanceVerificationResult> {
    return this.verifyBalances(dataToVerify);
  }
  public async verifyBalances({
    accountsToVerify,
    ethRoundingDigits,
    tokenRoundingDigits,
  }: BalanceVerificationInput): Promise<BalanceVerificationResult> {
    const accountsResult: Record<string, BalanceComparisonAtBlock> = {};
    for (const [address, balance] of Object.entries(accountsToVerify)) {
      const erc20Addresses: string[] = Object.keys(balance!.erc20Balances);
      const accountResult = await this.fetchAndVerifyAccount(address, erc20Addresses);
      const balanceComparisonResult = this.compareBalances(
        balance!,
        accountResult?.balance,
        ethRoundingDigits,
        tokenRoundingDigits,
      );
      accountsResult[address] = {
        balanceComparisonResult,
        blockNumber: accountResult.blockNumber,
      };
    }
    return accountsResult;
  }

  public compareBalances(
    expectedBalance: AccountBalance,
    returnedBalance: VerifiedAccountBalance,
    ethRoundingDigits?: number,
    tokenRoundingDigits?: number,
  ): BalanceComparisonResult {
    if (returnedBalance === undefined) {
      throw Error('AccountBalance undefined');
    }
    const ethBalanceComparison: BalanceComparison = {
      expected: expectedBalance.ethBalance,
      returned: returnedBalance.ethBalance.balance,
      isEqual: this.areNumbersEqualUpToNDigits(expectedBalance.ethBalance, returnedBalance.ethBalance.balance, ethRoundingDigits),
      isVerified: returnedBalance.ethBalance.verified,
    };
    const erc20BalancesComparison: Record<string, BalanceComparison> = {};
    for (const token in expectedBalance.erc20Balances) {
      if (expectedBalance.erc20Balances.hasOwnProperty(token)) {
        const expectedTokenBalance = expectedBalance.erc20Balances[token];
        const returnedTokenBalance = returnedBalance.erc20Balances[token];
        let tokenComparison: BalanceComparison;
        if (returnedTokenBalance === undefined) {
          tokenComparison = {
            expected: expectedTokenBalance,
            returned: undefined,
            isEqual: false,
            isVerified: false,
          };
        } else {
          tokenComparison = {
            expected: expectedTokenBalance,
            returned: returnedTokenBalance.balance,
            isEqual: this.areNumbersEqualUpToNDigits(expectedTokenBalance, returnedTokenBalance.balance, tokenRoundingDigits),
            isVerified: returnedTokenBalance.verified,
          };
        }
        erc20BalancesComparison[token] = tokenComparison;
      }
    }

    const verified =
      ethBalanceComparison.isEqual &&
      Object.values(erc20BalancesComparison).every((comparison) => comparison.isEqual) &&
      Object.values(erc20BalancesComparison).every((comparison) => comparison.isVerified);

    return {
      ethBalance: ethBalanceComparison,
      erc20Balances: erc20BalancesComparison,
      verified,
    };
  }

  private async fetchAndVerifyAccount(address: string, erc20Contracts: string[]) {
    await this.lightclient.waitForClientToStart();
    const verifiedAccount = await this.fetchAndVerifyAddressBalances({
      address,
      erc20Contracts,
    });

    return verifiedAccount;
  }

  private async fetchAndVerifyAddressBalances({
    address,
    erc20Contracts,
  }: {
    address: string;
    erc20Contracts: string[];
  }): Promise<VerifiedAccount> {
    let ethBalance;
    try {
      let balance = await this.lightclient.web3!.eth.getBalance(address);
      ethBalance = {
        balance: Number(this.lightclient.web3!.utils.fromWei(balance, 'ether')),
        verified: true,
      };
    } catch (e) {
      ethBalance = {
        balance: 0,
        verified: false,
      };
    }
    const erc20Balances: Record<string, VerifiedBalance> = {};

    const contractCallContext: ContractCallContext[] = erc20Contracts.map((erc20ContractAddress) => {
      return {
        reference: erc20ContractAddress,
        contractAddress: erc20ContractAddress,
        abi: ERC20ABI,
        calls: [
          { reference: 'balanceOf', methodName: 'balanceOf', methodParameters: [address] },
          { reference: 'decimals', methodName: 'decimals', methodParameters: [] },
        ],
      };
    });

    const results: ContractCallResults = await this.lightclient.multicall!.call(contractCallContext);

    for (const key of Object.keys(results.results)) {
      const result = results.results[key];
      const erc20ContractAddress = key;
      if (result && result.callsReturnContext) {
        // @ts-ignore
        const balanceResult = result.callsReturnContext.find((call) => call.reference === 'balanceOf');
        // @ts-ignore
        const decimalsResult = result.callsReturnContext.find((call) => call.reference === 'decimals');

        if (balanceResult?.success && decimalsResult?.success) {
          const decimals = decimalsResult?.returnValues[0];
          const balance = parseFloat(formatUnits(hexToNumberString(balanceResult?.returnValues[0].hex), decimals));
          erc20Balances[erc20ContractAddress] = { balance: balance, verified: true };
        } else {
          erc20Balances[erc20ContractAddress] = { balance: 0, verified: false };
        }
      }
    }

    return {
      balance: {
        ethBalance,
        erc20Balances,
      },
      blockNumber: await this.lightclient.getLatestBlockNum(),
    };
  }
}
