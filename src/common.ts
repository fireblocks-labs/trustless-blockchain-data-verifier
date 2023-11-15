import erc20Contracts from '../public/erc20Contracts.json';

import { LightClientVerifierInitArgs } from './LightClientVerifier';

export const Actions = {
  headerUpdate: 'headerUpdate',
  verifyBalances: 'verifyBalances',
  configUpdate: 'configUpdate',
  wakeUp: 'wakeUp',
};

export const configStorageName = 'config';
export const runningStorageName = 'running';

export const initialConfig: LightClientVerifierInitArgs = {
  network: 'mainnet',
  beaconApiUrl: 'https://lodestar-mainnet.chainsafe.io',
  elRpcUrl: 'https://lodestar-mainnetrpc.chainsafe.io',
  initialCheckpoint: '0x8db70aac95f3a33616ab938e060fc7615b5e254634d13cd014a2c838fddc33a1',
  erc20Contracts,
};

export const ETH = 'ETH';
export const verificationStatusElementId = 'verification-status-id';
