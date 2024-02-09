import { IPluginFactoryOptions } from "./i-plugin-factory-options.js";
import { ICactusPlugin } from "./plugin/i-cactus-plugin.js";
import { PluginFactory } from "./plugin/plugin-factory.js";

/**
 * This is the function that each plugin npm package must export under the name
 * `"createPluginFactory"` so that the API server can perform the automatic
 * wiring of the plugin once a plugin import has been placed in the configuration
 * of it (API server) via either ENV, CLI or a config file.
 */
export type PluginFactoryFactory = (
  pluginFactoryOptions: IPluginFactoryOptions,
) => Promise<PluginFactory<ICactusPlugin, unknown, IPluginFactoryOptions>>;
