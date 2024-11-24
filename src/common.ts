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
    initialCheckpoint: '0x304105ef531815d24abb052fe9a5b8faa1ad993f30e807d0b023b024497eca94',
  },
  [NetworkEnum.SEPOLIA]: {
    network: NetworkEnum.SEPOLIA,
    beaconApiUrl: 'https://lodestar-sepolia.chainsafe.io',
    elRpcUrl: 'https://lodestar-sepoliarpc.chainsafe.io',
    initialCheckpoint: '0x9ade80126d01e706c7fa5e2ea0196bf53d13ed74dee3b0a03460aac4952eec93',
  },
};

export const ETH = 'ETH';
export const verificationStatusElementId = 'verification-status-id';
