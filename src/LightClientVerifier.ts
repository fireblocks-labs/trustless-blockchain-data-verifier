import { NetworkName } from '@lodestar/config/networks';
import { LightclientEvent } from '@lodestar/light-client';

import { allForks } from '@lodestar/types';
import { formatUnits } from 'ethers';
import Web3 from 'web3';
import { createVerifiedExecutionProvider, LCTransport, Web3jsProvider, ProofProvider } from '@lodestar/prover';
import { hexToNumberString } from 'web3-utils';
import { Multicall, ContractCallResults, ContractCallContext } from 'ethereum-multicall';

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

export type LightClientVerifierInitArgs = {
  network: NetworkName;
  elRpcUrl: string;
  beaconApiUrl: string;
  initialCheckpoint: string;
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

export class LightClientVerifier {
  private web3: Web3 | undefined;
  private network: NetworkName;
  private beaconApiUrl: string;
  private initialCheckpoint: string;
  private elRpcUrl: string;
  public provider: Web3jsProvider | undefined;
  public proofProvider: ProofProvider | undefined;

  constructor({ network, elRpcUrl, beaconApiUrl, initialCheckpoint }: LightClientVerifierInitArgs) {
    this.elRpcUrl = elRpcUrl;
    this.beaconApiUrl = beaconApiUrl;
    this.network = network;
    this.initialCheckpoint = initialCheckpoint;
  }

  public async verifyBalances(
    accountsToVerify: AccountsToVerify,
    ethRoundingDigits?: number,
    tokenRoundingDigits?: number,
  ): Promise<BalanceVerificationResult> {
    const accountsResult: Record<string, BalanceComparisonAtBlock> = {};
    for (const [address, balance] of Object.entries(accountsToVerify)) {
      const erc20Addresses: string[] = Object.keys(balance.erc20Balances);
      const accountResult = await this.fetchAndVerifyAccount(address, erc20Addresses);
      const balanceComparisonResult = this.compareBalances(
        balance,
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

  private areNumbersEqualUpToNDigits(num1: number, num2: number, roundingDigits?: number): boolean {
    if (!roundingDigits) {
      return num1 === num2;
    }
    const multiplier = Math.pow(10, roundingDigits);
    const roundedNum1 = Math.round(num1 * multiplier) / multiplier;
    const roundedNum2 = Math.round(num2 * multiplier) / multiplier;
    return roundedNum1 === roundedNum2;
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

  public async initialize() {
    const { provider, proofProvider } = createVerifiedExecutionProvider(new Web3.providers.HttpProvider(this.elRpcUrl), {
      transport: LCTransport.Rest,
      urls: [this.beaconApiUrl],
      network: this.network,
      wsCheckpoint: this.initialCheckpoint,
    });
    this.provider = provider;
    this.proofProvider = proofProvider;
    this.web3 = new Web3(provider);
    await this.waitForClientToStart();
  }

  public async stop() {
    await this.proofProvider?.lightClient?.stop();
  }

  private async waitForClientToStart(): Promise<void> {
    await this.proofProvider?.waitToBeReady();
  }

  public setOptimisticHeaderHook(handler: (newHeader: allForks.LightClientHeader) => void) {
    this.proofProvider?.lightClient!.emitter.on(LightclientEvent.lightClientOptimisticHeader, handler);
  }

  private async fetchAndVerifyAccount(address: string, erc20Contracts: string[]) {
    await this.waitForClientToStart();
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
      let balance = await this.web3!.eth.getBalance(address);
      console.log('eth', balance);
      ethBalance = {
        balance: Number(this.web3!.utils.fromWei(balance, 'ether')),
        verified: true,
      };
    } catch (e) {
      console.log('ERROR eth balance', e);
      ethBalance = {
        balance: 0,
        verified: false,
      };
    }
    const multicall = new Multicall({
      web3Instance: this.web3,
      tryAggregate: true,
      multicallCustomContractAddress: '0xca11bde05977b3631167028862be2a173976ca11', // Getting multicall address from network fails
    });

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
    const erc20Balances: Record<string, VerifiedBalance> = {};
    const results: ContractCallResults = await multicall.call(contractCallContext);

    for (const key of Object.keys(results.results)) {
      const result = results.results[key];
      const erc20ContractAddress = key;
      console.log(erc20ContractAddress, result);
      if (result && result.callsReturnContext) {
        // @ts-ignore
        const balanceResult = result.callsReturnContext.find((call) => call.reference === 'balanceOf');
        // @ts-ignore
        const decimalsResult = result.callsReturnContext.find((call) => call.reference === 'decimals');

        if (balanceResult?.success && decimalsResult?.success) {
          const decimals = decimalsResult?.returnValues[0];
          const balance = parseFloat(formatUnits(hexToNumberString(balanceResult?.returnValues[0].hex), decimals));
          console.log('contract', erc20ContractAddress, balance);
          erc20Balances[erc20ContractAddress] = { balance: balance, verified: true };
        } else {
          erc20Balances[erc20ContractAddress] = { balance: 0, verified: false };
        }
      }
    }

    // const erc20Balances: Record<string, VerifiedBalance> = {};
    // for (const erc20ContractAddress of erc20Contracts) {
    //   const contract = new this.web3!.eth.Contract(ERC20ABI, erc20ContractAddress, { dataInputFill: 'data' });
    //   try {
    //     // @ts-ignore
    //     let balance = (await contract.methods.balanceOf(address).call()) as BigNumberish;
    //     const decimals = (await contract.methods.decimals().call()) as Numeric;
    //     console.log('contract', erc20ContractAddress, balance);
    //     balance = parseFloat(formatUnits(balance, decimals));
    //     erc20Balances[erc20ContractAddress] = { balance: balance, verified: true };
    //   } catch (e) {
    //     console.log('ERROR erc20 balance', e);
    //     erc20Balances[erc20ContractAddress] = { balance: 0, verified: false };
    //   }
    // }

    return {
      balance: {
        ethBalance,
        erc20Balances,
      },
      blockNumber: this.proofProvider?.getStatus().latest!,
    };
  }
}
