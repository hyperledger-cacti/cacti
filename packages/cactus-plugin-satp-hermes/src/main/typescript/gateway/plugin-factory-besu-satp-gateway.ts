import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IBesuSatpGatewayConstructorOptions,
  BesuSatpGateway,
} from "./besu-satp-gateway";

export class PluginFactoryBesuSatpGateway extends PluginFactory<
  BesuSatpGateway,
  IBesuSatpGatewayConstructorOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IBesuSatpGatewayConstructorOptions,
  ): Promise<BesuSatpGateway> {
    return new BesuSatpGateway(pluginOptions);
  }
}
