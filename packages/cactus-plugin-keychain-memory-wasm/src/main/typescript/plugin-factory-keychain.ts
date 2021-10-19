import { v4 as uuidv4 } from "uuid";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactory } from "@hyperledger/cactus-core-api";

import {
  IPluginKeychainMemoryWasmOptions,
  PluginKeychainMemoryWasm,
} from "./plugin-keychain-memory-wasm";

import { createPluginFactory } from "./generated/wasm-pack/cactus_plugin_keychain_memory_wasm";

export class PluginFactoryKeychain extends PluginFactory<
  PluginKeychainMemoryWasm,
  IPluginKeychainMemoryWasmOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions?: IPluginKeychainMemoryWasmOptions,
  ): Promise<PluginKeychainMemoryWasm> {
    const instanceId = uuidv4();
    const keychainId = uuidv4();
    const logLevel = "TRACE";
    const wasmPluginFactory = await createPluginFactory();
    const wasmPlugin = await wasmPluginFactory.create({
      instanceId,
      keychainId,
    });

    const options = pluginOptions || {
      instanceId,
      keychainId,
      logLevel,
      wasmPlugin,
    };
    return new PluginKeychainMemoryWasm(options);
  }
}
