import { PluginFactory } from "@hyperledger/cactus-core-api";
import {
  IPluginConsortiumManualOptions,
  PluginConsortiumManual,
} from "./plugin-consortium-manual";

export class PluginFactoryWebService extends PluginFactory<
  PluginConsortiumManual,
  IPluginConsortiumManualOptions
> {
  async create(
    options: IPluginConsortiumManualOptions
  ): Promise<PluginConsortiumManual> {
    return new PluginConsortiumManual(options);
  }
}
