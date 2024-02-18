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
    initialCheckpoint: '0x64672149c9c675b08248ce0c55812a4d438c822007d1dd0a52f2e641e6654804',
  },
  [NetworkEnum.SEPOLIA]: {
    network: NetworkEnum.SEPOLIA,
    beaconApiUrl: 'https://lodestar-sepolia.chainsafe.io',
    elRpcUrl: 'https://rpc.ankr.com/eth_sepolia',
    initialCheckpoint: '0xcbb4f810a0f0c55cfecfb778aae9b28f91ec5dd73101c79b3ee8ee3b62036f11',
  },
};

export const ETH = 'ETH';
export const verificationStatusElementId = 'verification-status-id';
