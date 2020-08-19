import { PluginFactory } from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorCordaOptions,
  PluginLedgerConnectorCorda,
} from "./plugin-ledger-connector-corda";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorCorda,
  IPluginLedgerConnectorCordaOptions
> {
  async create(
    options: IPluginLedgerConnectorCordaOptions
  ): Promise<PluginLedgerConnectorCorda> {
    return new PluginLedgerConnectorCorda(options);
  }
}
