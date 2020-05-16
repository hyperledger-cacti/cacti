import { PluginAspect } from "./plugin-aspect";

/**
 * This is the common base for all other plugin interface definitions to have as a parent.
 *
 */
export interface ICactusPlugin {
  /**
   * Returns the ID of the plugin which is a string uniquely identifying the plugin among other plugins so that they can
   * be managed separately without conflicts or runtime errors.
   * Important: This is not just uniqely identifying the plugin aspect, but the implementation as well.
   * For example a plugin aspect would we `ledger-connector` or `storage` and implementations are the ones within those
   * aspects such as `plugin-ledger-connector-besu` or `plugin-storage-kv-in-memory`.
   */
  getId(): string;

  /**
   * Returns the aspect of which this plugin implementation belongs to such as the aspect of `ledger-connector` or
   * `storage` for example.
   * There can be any number of plugin implementations for each aspect.
   */
  getAspect(): PluginAspect;
}

export function isICactusPlugin(
  pluginInstance: ICactusPlugin
): pluginInstance is ICactusPlugin {
  return typeof pluginInstance.getId === "function";
}
