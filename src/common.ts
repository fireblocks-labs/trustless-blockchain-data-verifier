import { LightClientVerifierInitArgs } from './LightClientVerifier';

export const Actions = {
  headerUpdate: 'headerUpdate',
  verifyBalances: 'verifyBalances',
  configUpdate: 'configUpdate',
};

export const configStorageName = 'config';
export const runningStorageName = 'running';

export const initialConfig: LightClientVerifierInitArgs = {
  network: 'mainnet',
  beaconApiUrl: 'https://lodestar-mainnet.chainsafe.io',
  elRpcUrl: 'https://rpc.ankr.com/eth',
  initialCheckpoint: '0x7fd9dccecb5fc37db1b9a12607795d4777635aa10ac774a07e871086a004c775',
};

export const ETH = 'ETH';
export const verificationStatusElementId = 'verification-status-id';
