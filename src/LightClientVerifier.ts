import { fromHexString, toHexString } from '@chainsafe/ssz';
import { DefaultStateManager } from '@ethereumjs/statemanager';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Api, ApiError, getClient } from '@lodestar/api';
import { createChainForkConfig } from '@lodestar/config';
import { genesisData as networkGenesis, NetworkName, networksChainConfig } from '@lodestar/config/networks';
import { Lightclient, LightclientEvent, RunStatusCode } from '@lodestar/light-client';
import { LightClientRestTransport } from '@lodestar/light-client/transport';
import { getLcLoggerConsole } from '@lodestar/light-client/utils';
import { allForks, bellatrix, ssz } from '@lodestar/types';
import { keccak256, toBuffer } from 'ethereumjs-util';
import { formatUnits } from 'ethers';
import Web3 from 'web3';
import { hexToNumberString, numberToHex } from 'web3-utils';
import { createVerifiedExecutionProvider, LCTransport, Web3jsProvider, ProofProvider } from '@lodestar/prover';

const balanceOfABI = [
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
  erc20Contracts: Record<string, ERC20Contract>;
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
  private stateManager: DefaultStateManager;
  private erc20Contracts: Record<string, ERC20Contract>;
  private network: NetworkName;
  private beaconApiUrl: string;
  private initialCheckpoint: string;
  private elRpcUrl: string;
  public provider: Web3jsProvider | undefined;
  public proofProvider: ProofProvider | undefined;

  constructor({ network, elRpcUrl, beaconApiUrl, erc20Contracts, initialCheckpoint }: LightClientVerifierInitArgs) {
    this.elRpcUrl = elRpcUrl;
    this.beaconApiUrl = beaconApiUrl;
    this.network = network;
    this.erc20Contracts = erc20Contracts;
    this.initialCheckpoint = initialCheckpoint;
    this.stateManager = new DefaultStateManager();
  }

  public async verifyBalances(
    accountsToVerify: AccountsToVerify,
    ethRoundingDigits?: number,
    tokenRoundingDigits?: number,
  ): Promise<BalanceVerificationResult> {
    const accountsResult: Record<string, BalanceComparisonAtBlock> = {};
    for (const [address, balance] of Object.entries(accountsToVerify)) {
      const matchingContracts: ERC20Contract[] = [];
      Object.entries(this.erc20Contracts).forEach(([address, erc20Contract]) => {
        if (Object.keys(balance.erc20Balances).includes(address)) {
          matchingContracts.push(erc20Contract);
        }
      });

      const accountResult = await this.fetchAndVerifyAccount(address, matchingContracts);
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
  }

  public async stop() {
    await this.proofProvider?.lightClient?.stop();
  }

  private async waitForClientStarted(): Promise<void> {
    await this.proofProvider?.waitToBeReady();
  }

  public setOptimisticHeaderHook(handler: (newHeader: allForks.LightClientHeader) => void) {
    this.proofProvider?.lightClient!.emitter.on(LightclientEvent.lightClientOptimisticHeader, handler);
  }

  private async fetchAndVerifyAccount(address: string, erc20Contracts: ERC20Contract[]) {
    await this.waitForClientStarted();
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
    erc20Contracts: ERC20Contract[];
  }): Promise<VerifiedAccount> {
    const ethBalance = await this.web3!.eth.getBalance(address);
    const erc20Balances: Record<string, VerifiedBalance> = {};
    for (const erc20Contract of erc20Contracts) {
      const contract = new this.web3!.eth.Contract(balanceOfABI, erc20Contract.contractAddress, { dataInputFill: 'data' });
      console.log(contract.methods.balanceOf);
      let balance = await contract.methods.balanceOf().call();
      console.log(balance);
      // balance = parseFloat(formatUnits(hexToNumberString(contractBalance, erc20Contract.decimals)));
      erc20Balances[erc20Contract.contractAddress] = { balance: 0, verified: true };
    }

    return {
      balance: {
        ethBalance: {
          balance: Number(this.web3!.utils.fromWei(ethBalance, 'ether')),
          verified: true,
        },
        erc20Balances,
      },
      blockNumber: this.proofProvider?.getStatus().latest!,
    };
  }
}
