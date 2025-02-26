import { LedgerType } from "@hyperledger/cactus-core-api";

// TODO implement network identification draft
export interface NetworkId {
  id: string;
  ledgerType: LedgerType;
}
