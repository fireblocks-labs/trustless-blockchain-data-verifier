import { LightClientVerifierInitArgs } from './LightClientVerifier';

export const Actions = {
  headerUpdate: 'headerUpdate',
  verifyBalances: 'verifyBalances',
  configUpdate: 'configUpdate',
  wakeUp: 'wakeUp',
};

export const configStorageName = 'config';
export const runningStatusStorageName = 'runningStatus';

export enum NetworkEnum {
  MAINNET = 'mainnet',
  SEPOLIA = 'sepolia',
}

export type RunningStatusType = Record<NetworkEnum, boolean>;
export type ConfigType = Record<string, LightClientVerifierInitArgs>;

export const initialConfig: ConfigType = {
  [NetworkEnum.MAINNET]: {
    network: NetworkEnum.MAINNET,
    beaconApiUrl: 'https://lodestar-mainnet.chainsafe.io',
    elRpcUrl: 'https://rpc.ankr.com/eth',
    initialCheckpoint: '0xa6cbf3c03584f667535f96d01cf812a8969980d1bf833cd8b50d9d4c76d042c4',
  },
  [NetworkEnum.SEPOLIA]: {
    network: NetworkEnum.SEPOLIA,
    beaconApiUrl: 'https://lodestar-sepolia.chainsafe.io',
    elRpcUrl: 'https://rpc.ankr.com/eth_sepolia',
    initialCheckpoint: '0xab875ab6dacfd60a71956012cbc7c00e5dd0326f592f273b632f83daaae86459',
  },
};

export const ETH = 'ETH';
export const verificationStatusElementId = 'verification-status-id';
