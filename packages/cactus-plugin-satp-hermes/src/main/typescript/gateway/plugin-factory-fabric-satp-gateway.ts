import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IFabricSatpGatewayConstructorOptions,
  FabricSatpGateway,
} from "./fabric-satp-gateway";

export class PluginFactoryFabricSatpGateway extends PluginFactory<
  FabricSatpGateway,
  IFabricSatpGatewayConstructorOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IFabricSatpGatewayConstructorOptions,
  ): Promise<FabricSatpGateway> {
    return new FabricSatpGateway(pluginOptions);
  }
}
