import { LightClient } from '../LightClient';
import { VerificationResult } from '../common';

export abstract class Verifier {
  public lightclient: LightClient;

  constructor(lightclient: LightClient) {
    this.lightclient = lightclient;
  }

  abstract verify(dataToVerify: any): any;

  public areNumbersEqualUpToNDigits(num1: number, num2: number, roundingDigits?: number): boolean {
    if (!roundingDigits) {
      return num1 === num2;
    }
    const multiplier = Math.pow(10, roundingDigits);
    const roundedNum1 = Math.round(num1 * multiplier) / multiplier;
    const roundedNum2 = Math.round(num2 * multiplier) / multiplier;
    return roundedNum1 === roundedNum2;
  }
}
