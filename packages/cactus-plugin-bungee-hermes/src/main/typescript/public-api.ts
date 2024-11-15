import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryBungeeHermes } from "./plugin-factory-bungee-hermes";

export { isMergePolicyValueArray } from "./view-merging/merge-policies";
export { isPrivacyPolicyValueArray } from "./view-creation/privacy-policies";

export {
  PluginBungeeHermes,
  IPluginBungeeHermesOptions,
} from "./plugin-bungee-hermes";

export async function createBungeePluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryBungeeHermes> {
  return new PluginFactoryBungeeHermes(pluginFactoryOptions);
}
