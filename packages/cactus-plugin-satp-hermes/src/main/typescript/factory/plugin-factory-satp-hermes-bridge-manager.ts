import { validateOrReject } from "class-validator";
import {
  type IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  SATPCrossChainManager,
  type ISATPBridgesOptions,
} from "../cross-chain-mechanisms/satp-cc-manager";

export class PluginFactorySATPBridge extends PluginFactory<
  SATPCrossChainManager,
  ISATPBridgesOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: ISATPBridgesOptions,
  ): Promise<SATPCrossChainManager> {
    const manager = new SATPCrossChainManager(pluginOptions);
    try {
      const validationOptions = pluginOptions.validationOptions;
      await validateOrReject(manager, validationOptions);
      return manager;
    } catch (errors) {
      throw new Error(
        `Caught promise rejection (validation failed). Errors: ${errors}`,
      );
    }
  }
}
