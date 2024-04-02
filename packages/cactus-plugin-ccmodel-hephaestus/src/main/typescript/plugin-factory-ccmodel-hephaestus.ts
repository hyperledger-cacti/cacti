import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginCcModelHephaestusOptions,
  CcModelHephaestus,
} from "./plugin-ccmodel-hephaestus";

export class PluginFactoryWebService extends PluginFactory<
  CcModelHephaestus,
  IPluginCcModelHephaestusOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginCcModelHephaestusOptions,
  ): Promise<CcModelHephaestus> {
    return new CcModelHephaestus(pluginOptions);
  }
}
