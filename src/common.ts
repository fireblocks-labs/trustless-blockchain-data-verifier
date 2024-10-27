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
    elRpcUrl: 'https://lodestar-mainnetrpc.chainsafe.io',
    initialCheckpoint: '0xe0a5ba7c4169ba13e3f6e0f77d82d6b509a96f46f7579d7bc798f5ea4e71d5dd',
  },
  [NetworkEnum.SEPOLIA]: {
    network: NetworkEnum.SEPOLIA,
    beaconApiUrl: 'https://lodestar-sepolia.chainsafe.io',
    elRpcUrl: 'https://lodestar-sepoliarpc.chainsafe.io',
    initialCheckpoint: '0x7ae62ac7e5b781b7635210f605dcc95767e8bdaa2684c6ba1a6a578dc7296519',
  },
};

export const ETH = 'ETH';
export const verificationStatusElementId = 'verification-status-id';
