import {
  ConsensusAlgorithmFamily,
  ConsensusAlgorithmFamiliesWithTxFinality,
  ConsensusAlgorithmFamiliesWithOutTxFinality,
} from "@hyperledger/cactus-core-api";

import { BadRequestError } from "http-errors-enhanced-cjs";

export function consensusHasTransactionFinality(
  consensusAlgorithmFamily: ConsensusAlgorithmFamily,
): boolean {
  const woTxFinalityValues = Object.values(
    ConsensusAlgorithmFamiliesWithOutTxFinality,
  );
  const withTxFinalityValues = Object.values(
    ConsensusAlgorithmFamiliesWithTxFinality,
  );

  const acceptedValues = [...woTxFinalityValues, ...withTxFinalityValues];
  const acceptedValuesCsv = acceptedValues.join(",");

  const isInConsensusAlgorithmFamiliesWithTxFinality = (
    Object.values(ConsensusAlgorithmFamiliesWithTxFinality) as string[]
  ).includes(consensusAlgorithmFamily.toString());

  const isInConsensusAlgorithmFamiliesWithOutTxFinality = (
    Object.values(ConsensusAlgorithmFamiliesWithOutTxFinality) as string[]
  ).includes(consensusAlgorithmFamily.toString());

  const unrecognizedConsensusAlgorithmFamily =
    !isInConsensusAlgorithmFamiliesWithTxFinality &&
    !isInConsensusAlgorithmFamiliesWithOutTxFinality;

  if (unrecognizedConsensusAlgorithmFamily) {
    throw new BadRequestError(
      `Unrecognized consensus algorithm family: ${consensusAlgorithmFamily}`,
      {
        acceptedValuesCsv,
      },
    );
  }
  return isInConsensusAlgorithmFamiliesWithTxFinality;
}
