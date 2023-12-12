import { ActionRejectedError } from 'ethers';
import { LightClientInitArgs } from './LightClient';

export enum Actions {
  headerUpdate = 'headerUpdate',
  verify = 'verify',
  configUpdate = 'configUpdate',
  wakeUp = 'wakeUp',
}

export enum VerificationTypeEnum {
  BALANCES = 'balances',
  DATAFEEDS = 'datafeeds',
}

export type VerificationRequest = {
  network: NetworkEnum;
  type: VerificationTypeEnum;
  dataToVerify: any;
};

export type VerificationResult = {
  network: NetworkEnum;
  type: VerificationTypeEnum;
  result: any;
  errorMsg: string;
};

export type VerificationRequestMessage = {
  action: Actions;
  requests: VerificationRequest[];
};

export type VerificationResponseMessage = {
  results: VerificationResult[];
};

export const configStorageName = 'config';
export const runningStatusStorageName = 'runningStatus';

export enum NetworkEnum {
  MAINNET = 'mainnet',
  SEPOLIA = 'sepolia',
}

export type RunningStatusType = Record<NetworkEnum, boolean>;
export type ConfigType = Record<string, LightClientInitArgs>;

export const initialConfig: ConfigType = {
  [NetworkEnum.MAINNET]: {
    network: NetworkEnum.MAINNET,
    beaconApiUrl: 'https://lodestar-mainnet.chainsafe.io',
    elRpcUrl: 'https://rpc.ankr.com/eth',
    initialCheckpoint: '0x1ac9b5a6f645a829e41d9615b00a97cc459e7454b180a75914fdbae5cce0f62b',
  },
  [NetworkEnum.SEPOLIA]: {
    network: NetworkEnum.SEPOLIA,
    beaconApiUrl: 'https://lodestar-sepolia.chainsafe.io',
    elRpcUrl: 'https://rpc.ankr.com/eth_sepolia',
    initialCheckpoint: '0x2cc9518c2aa5dce850be5e0a541da73ef173b2930b7d6d354430bdd0ac0e68b8',
  },
};

export const ETH = 'ETH';
export const verificationStatusElementId = 'verification-status-id';
