import { LedgerType } from "@hyperledger/cactus-core-api";

export function calculateGasPriceEth(
  gasUsed: number,
  effectiveGasPrice: string | undefined,
): number {
  if (!gasUsed || !effectiveGasPrice) {
    return 0;
  }
  const gasPrice = parseFloat(effectiveGasPrice);
  return gasUsed * gasPrice;
}

export function calculateCarbonFootPrintFabric(
  peers: string[] | undefined,
): number {
  if (!peers) {
    return 0;
  }
  return peers.length * CarbonFootPrintConstants(LedgerType.Fabric2);
}
export function calculateCarbonFootPrintBesu(): number {
  return CarbonFootPrintConstants(LedgerType.Besu2X);
}

export const CarbonFootPrintConstants = (ledger: LedgerType): number => {
  switch (ledger) {
    case LedgerType.Besu2X:
      return 0.00018;

    case LedgerType.Besu1X:
      return 0.00018;

    case LedgerType.Fabric2:
      return 0.00018;

    default:
      return 0;
  }
};
