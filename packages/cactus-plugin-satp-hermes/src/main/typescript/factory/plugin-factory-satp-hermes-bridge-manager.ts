import { validateOrReject } from "class-validator";
import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  SATPBridgesManager,
  ISATPBridgesOptions,
} from "../gol/satp-bridges-manager";

export class PluginFactorySATPBridge extends PluginFactory<
  SATPBridgesManager,
  ISATPBridgesOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: ISATPBridgesOptions,
  ): Promise<SATPBridgesManager> {
    const manager = new SATPBridgesManager(pluginOptions);
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
