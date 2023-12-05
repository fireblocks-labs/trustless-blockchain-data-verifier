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
    initialCheckpoint: '0x1f0f89c698b3649728b0b0c4c7a6d2c43844a816333d748e081924fe2e8d755c',
  },
  [NetworkEnum.SEPOLIA]: {
    network: NetworkEnum.SEPOLIA,
    beaconApiUrl: 'https://lodestar-sepolia.chainsafe.io',
    elRpcUrl: 'https://rpc.ankr.com/eth_sepolia',
    initialCheckpoint: '0x7501fdbc70d80c6702025a4c90eaf7b06fa86d451963c9bf6fcbd2e083cbd12a',
  },
};

export const ETH = 'ETH';
export const verificationStatusElementId = 'verification-status-id';
