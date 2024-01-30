import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  SATPGateway,
  SATPGatewayConfig,
} from "../gateway-refactor";
import { validateOrReject } from "class-validator";

export class PluginFactorySATPGateway extends PluginFactory<
  SATPGateway,
  SATPGatewayConfig,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: SATPGatewayConfig,
  ): Promise<SATPGateway> {
    const coordinator = new SATPGateway(pluginOptions);

    try {
      const validationOptions = pluginOptions.validationOptions;
      await validateOrReject(coordinator, validationOptions);
      return coordinator;
    } catch (errors) {
      throw new Error(
        `Caught promise rejection (validation failed). Errors: ${errors}`,
      );
    }
  }
}
