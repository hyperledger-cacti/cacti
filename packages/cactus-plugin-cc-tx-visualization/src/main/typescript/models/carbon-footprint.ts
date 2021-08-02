import { LedgerType } from "@hyperledger/cactus-core-api";

export function calculateGasPriceBesu(gasUsed: number): number {
  if (!gasUsed) {
    return 0;
  }
  return getGasPrice() * gasUsed;
}

// The conversion rate gwei-dollar can be dynamic
export function gweiToDollar(gwei: number): number | string {
  if (!gwei) {
    return 0;
  }
  return (gwei * 0.00000255).toFixed(2);
}

// This value can be retrieved dynamically; 1 gas = 30 gwei
export function getGasPrice(): number {
  return 30;
}
// price per gwei
export function gasToDollar(gwei: number): number {
  return gwei * 0.005899;
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

    case LedgerType.Fabric14X:
      return 0.00018;
    default:
      return 0;
  }
};
