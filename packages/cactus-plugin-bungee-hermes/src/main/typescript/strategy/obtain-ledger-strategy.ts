import { Logger } from "@hyperledger/cactus-common";
import { State } from "../view-creation/state";
import { IPluginLedgerConnector } from "@hyperledger/cactus-core-api/src/main/typescript/plugin/ledger-connector/i-plugin-ledger-connector";

export interface NetworkDetails {
  connectorApiPath?: string;
  connector?: IPluginLedgerConnector<unknown, unknown, unknown, unknown>;
  participant: string;
}
export interface ObtainLedgerStrategy {
  log: Logger;

  generateLedgerStates(
    stateIds: string[],
    networkDetails: NetworkDetails,
  ): Promise<Map<string, State>>;
}
