import { validateOrReject } from "class-validator";
import { SATPBridgeOptions } from "../core/types";
import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import { SATPBridgesManager } from "../gol/satp-bridges-manager";

export class PluginFactorySATPBridge extends PluginFactory<
  SATPBridgesManager,
  SATPBridgeOptions,
  IPluginFactoryOptions
> {
  async create(pluginOptions: SATPBridgeOptions): Promise<SATPBridgesManager> {
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
