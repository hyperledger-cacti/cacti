import { PluginFactory } from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
} from "./plugin-ledger-connector-besu";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorBesu,
  IPluginLedgerConnectorBesuOptions
> {
  async create(
    options: IPluginLedgerConnectorBesuOptions
  ): Promise<PluginLedgerConnectorBesu> {
    return new PluginLedgerConnectorBesu(options);
  }
}
