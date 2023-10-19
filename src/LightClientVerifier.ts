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

const externalAddressStorageHash = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';
const externalAddressCodeHash = '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470';

export type ERC20Contract = {
  contractAddress: string;
  balanceMappingIndex: number;
  decimals: number;
  symbol: string;
};

type ParsedAccount = {
  type: string;
  balance: VerifiedAccountBalance;
  nonce: string;
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
  public client: Lightclient | undefined;

  constructor({ network, elRpcUrl, beaconApiUrl, erc20Contracts, initialCheckpoint }: LightClientVerifierInitArgs) {
    this.elRpcUrl = elRpcUrl;
    this.beaconApiUrl = beaconApiUrl;
    this.network = network;
    this.erc20Contracts = erc20Contracts;
    this.initialCheckpoint = initialCheckpoint;
    this.web3 = new Web3(elRpcUrl);
    this.stateManager = new DefaultStateManager();
    this.client = undefined;
  }

  public async verifyBalances(
    accountsToVerify: AccountsToVerify,
    ethRoundingDigits?: number,
    tokenRoundingDigits?: number,
  ): Promise<BalanceVerificationResult> {
    const accountsResult: Record<string, BalanceComparisonAtBlock> = {};
    if (this.client === undefined) {
      throw Error('Call initializeFromCheckpointStr first');
    }
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
    await this.initializeFromCheckpointStr(this.initialCheckpoint);
    if (this.client) {
      await this.waitForClientStarted(this.client);
    }
  }

  public async stop() {
    return this.client?.stop();
  }

  public async initializeFromCheckpointStr(checkpointRootHex: string) {
    if (!checkpointRootHex.startsWith('0x')) {
      throw Error('Root must start with 0x');
    }
    const checkpointRoot = fromHexString(checkpointRootHex);
    if (checkpointRoot.length !== 32) {
      throw Error(`Root must be 32 bytes long: ${checkpointRoot.length}`);
    }

    const { genesisData, chainConfig } = {
      genesisData: networkGenesis[this.network],
      chainConfig: networksChainConfig[this.network],
    };

    const config = createChainForkConfig(chainConfig);

    this.client = await Lightclient.initializeFromCheckpointRoot({
      config,
      logger: getLcLoggerConsole({ logDebug: true }),
      transport: new LightClientRestTransport(getClient({ urls: [this.beaconApiUrl] }, { config })),
      genesisData,
      checkpointRoot,
    });

    this.client.start();
  }

  private async waitForClientStarted(client: Lightclient): Promise<void> {
    while (client.status !== RunStatusCode.started) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  public setOptimisticHeaderHook(handler: (newHeader: allForks.LightClientHeader) => void) {
    if (this.client !== undefined) {
      this.client.emitter.on(LightclientEvent.lightClientOptimisticHeader, handler);
    }
  }

  public getLatestFinalized() {
    const latestBeacon = this.client?.getFinalized().beacon;
    if (!latestBeacon) {
      throw Error('Failed to get latest beacon header');
    }
    const latestFinalizedBlockRoot = ssz.phase0.BeaconBlockHeader.hashTreeRoot(latestBeacon);
    return toHexString(latestFinalizedBlockRoot);
  }

  public getLatest() {
    const latest = this.client?.getHead();
    return latest;
  }

  private async fetchAndVerifyAccount(address: string, erc20Contracts: ERC20Contract[]) {
    if (this.client === undefined) {
      throw Error('Call initializeFromCheckpointStr first');
    }
    await this.waitForClientStarted(this.client);

    const head = this.client.getHead();
    const blockRes = await /* tslint:disable-next-line */
    (this.client['transport'].api as Api).beacon.getBlockV2(head?.beacon.slot);
    ApiError.assert(blockRes);

    const block = blockRes.response.data as bellatrix.SignedBeaconBlock;
    const executionPayload = block.message.body.executionPayload;
    // If the merge not complete, executionPayload would not exists
    if (!executionPayload) {
      throw Error('Waiting for executionPayload');
    }

    const verifiedAccount = await this.fetchAndVerifyAddressBalances({
      web3: this.web3,
      executionPayload,
      address,
      erc20Contracts,
    });

    return verifiedAccount;
  }

  private async fetchAndVerifyAddressBalances({
    web3,
    executionPayload,
    address,
    erc20Contracts,
  }: {
    web3: Web3 | undefined;
    executionPayload: bellatrix.ExecutionPayload;
    address: string;
    erc20Contracts: ERC20Contract[];
  }): Promise<ParsedAccount> {
    if (!web3) throw Error(`No valid connection to EL`);
    const params: [string, string[], number] = [address, [], executionPayload.blockNumber];
    const stateRoot = toHexString(executionPayload.stateRoot);
    const readonlyProof = await web3.eth.getProof(...params);
    const proof: any = { ...readonlyProof };
    const { balance, nonce } = proof;

    proof.nonce = numberToHex(proof.nonce);
    proof.balance = numberToHex(proof.balance);
    proof.address = address;

    const proofStateRoot = toHexString(keccak256(toBuffer(proof.accountProof[0])));

    let ethVerified =
      stateRoot === proofStateRoot &&
      (proof.codeHash !== externalAddressCodeHash || proof.storageHash === externalAddressStorageHash) &&
      (await this.stateManager.verifyProof(proof));

    const erc20Balances: Record<string, VerifiedBalance> = {};

    for (const erc20Contract of erc20Contracts) {
      const balanceSlot = web3.utils.keccak256(
        defaultAbiCoder.encode(['address', 'uint'], [address, erc20Contract.balanceMappingIndex]),
      );
      const readonlyContractProof = await web3.eth.getProof(
        erc20Contract.contractAddress,
        [balanceSlot],
        executionPayload.blockNumber,
      );
      const contractProof: any = {
        ...readonlyContractProof,
        storageProof: readonlyContractProof.storageProof.map((entry) => ({
          ...entry,
          value: numberToHex(entry.value),
        })),
      };
      if (contractProof.codeHash === externalAddressCodeHash) {
        throw Error(`No contract deployed at ${erc20Contract.contractAddress} for ${erc20Contract.symbol}`);
      }
      const contractProofStateRoot = toHexString(keccak256(toBuffer(contractProof.accountProof[0])));
      // Verify the proof, web3 converts nonce and balance into number strings, however
      // ethereumjs verify proof requires them in the original hex format
      contractProof.nonce = numberToHex(contractProof.nonce);
      contractProof.balance = numberToHex(contractProof.balance);
      contractProof.address = erc20Contract.contractAddress;

      let verified =
        stateRoot === contractProofStateRoot &&
        contractProof.storageProof[0]?.key === balanceSlot &&
        (await this.stateManager.verifyProof(contractProof));

      const balance = parseFloat(
        formatUnits(hexToNumberString(contractProof.storageProof[0]?.value.toString() ?? '0x0'), erc20Contract.decimals),
      );
      if (verified) {
        erc20Balances[erc20Contract.contractAddress] = { balance, verified };
      }
    }

    return {
      balance: {
        ethBalance: { balance: Number(web3.utils.fromWei(balance, 'ether')), verified: ethVerified },
        erc20Balances,
      },
      nonce,
      type: proof.codeHash === externalAddressCodeHash ? 'external' : 'contract',
      blockNumber: executionPayload.blockNumber,
    };
  }
}
