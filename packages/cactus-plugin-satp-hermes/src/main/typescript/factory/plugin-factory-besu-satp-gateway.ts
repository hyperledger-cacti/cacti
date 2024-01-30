import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IBesuSATPGatewayConstructorOptions,
  BesuSATPGateway,
} from "../core/besu-satp-gateway";

export class PluginFactoryBesuSATPGateway extends PluginFactory<
  BesuSATPGateway,
  IBesuSATPGatewayConstructorOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IBesuSATPGatewayConstructorOptions,
  ): Promise<BesuSATPGateway> {
    return new BesuSATPGateway(pluginOptions);
  }
}
