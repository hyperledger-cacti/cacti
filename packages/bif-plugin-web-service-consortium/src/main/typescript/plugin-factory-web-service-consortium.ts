import { PluginFactory } from "@hyperledger-labs/bif-core-api";
import {
  IPluginWebServiceConsortiumOptions,
  PluginWebServiceConsortium,
} from "./plugin-web-service-consortium";

export class PluginFactoryWebService extends PluginFactory<
  PluginWebServiceConsortium,
  IPluginWebServiceConsortiumOptions
> {
  async create(
    options: IPluginWebServiceConsortiumOptions
  ): Promise<PluginWebServiceConsortium> {
    return new PluginWebServiceConsortium(options);
  }
}
