import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IFabricSATPGatewayConstructorOptions,
  FabricSATPGateway,
} from "../core/fabric-satp-gateway";

export class PluginFactoryFabricSATPGateway extends PluginFactory<
  FabricSATPGateway,
  IFabricSATPGatewayConstructorOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IFabricSATPGatewayConstructorOptions,
  ): Promise<FabricSATPGateway> {
    return new FabricSATPGateway(pluginOptions);
  }
}
