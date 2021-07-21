import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginVerifierCcOptions,
  PluginVerifierCc,
} from "./plugin-ledger-verifier-cc";

export class PluginFactoryVerifier extends PluginFactory<
  PluginVerifierCc,
  IPluginVerifierCcOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginVerifierCcOptions,
  ): Promise<PluginVerifierCc> {
    return new PluginVerifierCc(pluginOptions);
  }
}
