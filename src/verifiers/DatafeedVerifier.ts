import { formatUnits } from 'ethers';
import { hexToNumberString } from 'web3-utils';
import { ContractCallResults, ContractCallContext } from 'ethereum-multicall';
import { Verifier } from './Verifier';

const DATAFEED_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        name: 'decimals',
        type: 'uint8',
      },
    ],
    payable: false,
    type: 'function',
  },
];

export type Datafeed = {
  address: string;
  answer: number;
};

export type DatafeedVerificationInput = {
  datafeedsToVerify: Datafeed[];
  roundingDigits?: number;
};

export type DatafeedVerificationResults = {
  results: Record<string, DatafeedVerificationResult>;
  blockNumber: number;
};

export type DatafeedVerificationResult = {
  address: string;
  expectedAnswer: number;
  returnedAnswer: number | undefined;
  isEqual: boolean;
  isVerified: boolean;
};

export class DatafeedVerifier extends Verifier {
  public async verify(dataToVerify: DatafeedVerificationInput): Promise<DatafeedVerificationResults> {
    return this.verifyDatafeeds(dataToVerify);
  }

  public async verifyDatafeeds({
    datafeedsToVerify,
    roundingDigits,
  }: DatafeedVerificationInput): Promise<DatafeedVerificationResults> {
    const datafeedResults: DatafeedVerificationResults = { results: {}, blockNumber: await this.lightclient.getLatestBlockNum() };

    const contractCallContext: ContractCallContext[] = datafeedsToVerify.map((datafeed) => {
      return {
        reference: datafeed.address,
        contractAddress: datafeed.address,
        abi: DATAFEED_ABI,
        calls: [
          { reference: 'latestRoundData', methodName: 'latestRoundData', methodParameters: [] },
          { reference: 'decimals', methodName: 'decimals', methodParameters: [] },
        ],
      };
    });

    const results: ContractCallResults = await this.lightclient.multicall!.call(contractCallContext);

    for (const [datafeedAddress, result] of Object.entries(results.results)) {
      if (result && result.callsReturnContext) {
        // @ts-ignore
        const latestRoundDataResult = result.callsReturnContext.find((call) => call.reference === 'latestRoundData');
        // @ts-ignore
        const decimalsResult = result.callsReturnContext.find((call) => call.reference === 'decimals');

        const datafeed = datafeedsToVerify.find((datafeed) => datafeed.address === datafeedAddress);

        if (latestRoundDataResult?.success && decimalsResult?.success) {
          const decimals = decimalsResult?.returnValues[0];
          const answer = parseFloat(formatUnits(hexToNumberString(latestRoundDataResult?.returnValues[1].hex), decimals));

          datafeedResults.results[datafeedAddress] = {
            address: datafeedAddress,
            expectedAnswer: datafeed!.answer,
            returnedAnswer: answer,
            isEqual: this.areNumbersEqualUpToNDigits(datafeed!.answer, answer, roundingDigits),
            isVerified: true,
          };
        } else {
          datafeedResults.results[datafeedAddress] = {
            address: datafeedAddress,
            expectedAnswer: datafeed!.answer,
            returnedAnswer: 0,
            isEqual: false,
            isVerified: false,
          };
        }
      }
    }

    return datafeedResults;
  }
}
