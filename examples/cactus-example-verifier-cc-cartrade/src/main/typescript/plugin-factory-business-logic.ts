import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";

import {
  IPluginBusinessLogicCartradeOptions,
  PluginBusinessLogicCartrade,
} from "./plugin-business-logic-cartrade";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginBusinessLogicCartrade,
  IPluginBusinessLogicCartradeOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginBusinessLogicCartradeOptions,
  ): Promise<PluginBusinessLogicCartrade> {
    return new PluginBusinessLogicCartrade(pluginOptions);
  }
}
