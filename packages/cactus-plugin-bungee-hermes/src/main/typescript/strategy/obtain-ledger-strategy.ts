import { Logger } from "@hyperledger/cactus-common";
import { State } from "../view-creation/state";

export interface NetworkDetails {
  connectorApiPath: string;
  participant: string;
}
export interface ObtainLedgerStrategy {
  log: Logger;

  generateLedgerStates(
    stateIds: string[],
    networkDetails: NetworkDetails,
  ): Promise<Map<string, State>>;
}
