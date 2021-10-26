import { PluginFactoryKeychain } from "./plugin-factory-keychain";
import * as OpenApiJson from "../json/openapi.json";
import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";

export { OpenApiJson };

export * from "./generated/openapi/typescript-axios/index";

export {
  PluginKeychainMemoryWasm,
  IPluginKeychainMemoryWasmOptions,
} from "./plugin-keychain-memory-wasm";

export { PluginFactoryKeychain } from "./plugin-factory-keychain";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryKeychain> {
  return new PluginFactoryKeychain(pluginFactoryOptions);
}

export * as wasm from "./generated/wasm-pack/cactus_plugin_keychain_memory_wasm";
// export * as wasm_bg from "./generated/wasm-pack/cactus_plugin_keychain_memory_wasm_bg.wasm";
