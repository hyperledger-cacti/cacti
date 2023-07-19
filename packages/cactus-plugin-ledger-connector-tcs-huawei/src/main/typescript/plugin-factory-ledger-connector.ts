import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorTcsHuaweiOptions,
  PluginLedgerConnectorTcsHuawei,
} from "./plugin-ledger-connector-tcs-huawei";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorTcsHuawei,
  IPluginLedgerConnectorTcsHuaweiOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorTcsHuaweiOptions,
  ): Promise<PluginLedgerConnectorTcsHuawei> {
    return new PluginLedgerConnectorTcsHuawei(pluginOptions);
  }
}
