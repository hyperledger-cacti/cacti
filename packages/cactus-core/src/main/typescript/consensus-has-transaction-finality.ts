import {
  ConsensusAlgorithmFamily,
  ConsensusAlgorithmFamiliesWithTxFinality,
  ConsensusAlgorithmFamiliesWithOutTxFinality,
} from "@hyperledger/cactus-core-api";

export function consensusHasTransactionFinality(
  consensusAlgorithmFamily: ConsensusAlgorithmFamily,
): boolean {
  const isInConsensusAlgorithmFamiliesWithTxFinality = (Object.values(
    ConsensusAlgorithmFamiliesWithTxFinality,
  ) as string[]).includes(consensusAlgorithmFamily.toString());

  const isInConsensusAlgorithmFamiliesWithOutTxFinality = (Object.values(
    ConsensusAlgorithmFamiliesWithOutTxFinality,
  ) as string[]).includes(consensusAlgorithmFamily.toString());

  const unrecognizedConsensusAlgorithmFamily =
    !isInConsensusAlgorithmFamiliesWithTxFinality &&
    !isInConsensusAlgorithmFamiliesWithOutTxFinality;

  if (unrecognizedConsensusAlgorithmFamily) {
    throw new Error(
      `Unrecognized consensus algorithm family: ${consensusAlgorithmFamily}`,
    );
  }
  return isInConsensusAlgorithmFamiliesWithTxFinality;
}
