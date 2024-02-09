import { PluginFactoryKeychain } from "./plugin-factory-keychain.js";
import * as OpenApiJson from "../json/openapi.json";
import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";

export { OpenApiJson };

export * from "./generated/openapi/typescript-axios/index.js";

export {
  PluginKeychainMemoryWasm,
  IPluginKeychainMemoryWasmOptions,
} from "./plugin-keychain-memory-wasm.js";

export { PluginFactoryKeychain } from "./plugin-factory-keychain.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryKeychain> {
  return new PluginFactoryKeychain(pluginFactoryOptions);
}

export * as wasm from "./generated/wasm-pack/cactus_plugin_keychain_memory_wasm.js";
// export * as wasm_bg from "./generated/wasm-pack/cactus_plugin_keychain_memory_wasm_bg.wasm.js";
