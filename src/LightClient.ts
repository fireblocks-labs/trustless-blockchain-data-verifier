import { NetworkEnum } from './common';
import { NetworkName } from '@lodestar/prover';
import { LightclientEvent } from '@lodestar/light-client';

import { allForks } from '@lodestar/types';
import Web3 from 'web3';
import { createVerifiedExecutionProvider, LCTransport, Web3jsProvider, ProofProvider } from '@lodestar/prover';
import { Multicall } from 'ethereum-multicall';

export type LightClientInitArgs = {
  network: NetworkEnum;
  elRpcUrl: string;
  beaconApiUrl: string;
  initialCheckpoint: string;
};

export class LightClient {
  public web3: Web3 | undefined;
  private network: NetworkName;
  private beaconApiUrl: string;
  private initialCheckpoint: string;
  private elRpcUrl: string;
  public provider: Web3jsProvider | undefined;
  public proofProvider: ProofProvider | undefined;
  public multicall: Multicall | undefined;

  constructor({ network, elRpcUrl, beaconApiUrl, initialCheckpoint }: LightClientInitArgs) {
    this.elRpcUrl = elRpcUrl;
    this.beaconApiUrl = beaconApiUrl;
    this.network = network;
    this.initialCheckpoint = initialCheckpoint;
  }

  public async initialize() {
    const { provider, proofProvider } = createVerifiedExecutionProvider(new Web3.providers.HttpProvider(this.elRpcUrl), {
      transport: LCTransport.Rest,
      urls: [this.beaconApiUrl],
      network: this.network as NetworkName,
      wsCheckpoint: this.initialCheckpoint,
    });
    this.provider = provider;
    this.proofProvider = proofProvider;
    this.web3 = new Web3(provider);
    this.multicall = new Multicall({
      web3Instance: this.web3,
      tryAggregate: true,
      multicallCustomContractAddress: '0xca11bde05977b3631167028862be2a173976ca11', // Getting multicall address from network fails
    });
    await this.waitForClientToStart();
  }

  public async stop() {
    await this.proofProvider?.lightClient?.stop();
  }

  public async waitForClientToStart(): Promise<void> {
    await this.proofProvider?.waitToBeReady();
  }

  public setOptimisticHeaderHook(handler: (newHeader: allForks.LightClientHeader) => void) {
    this.proofProvider?.lightClient!.emitter.on(LightclientEvent.lightClientOptimisticHeader, handler);
  }

  public async getLatestBlockNum() {
    return (await this.proofProvider?.getExecutionPayload('latest'))!.blockNumber;
  }
}
