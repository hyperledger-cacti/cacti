import { PluginAspect } from "./plugin-aspect";

/**
 * This is the common base for all other plugin interface definitions to have as a parent.
 */
export interface ICactusPlugin {
  /**
   * Returns the NodeJS/npm package name of the plugin which is used to identify
   * plugin instances at runtime and differentiate them from other types of plugins.
   *
   * Important: This is not just uniqely identifying the plugin aspect, but the
   * implementation as well.
   * For example a plugin aspect would we `ledger-connector` or `storage` and
   * implementations are the ones within those
   * aspects such as `plugin-ledger-connector-besu` or
   * `plugin-storage-kv-in-memory`.
   * Also important: There can be two plugin instances that have the same
   * package name and yet serve different purposes in cases like when you have
   * two ledger connector plugins connecting to the same kind of ledger, but
   * different instances of it (e.g. two companies both have their own private
   * Hyperledger Besu deployment)
   */
  getPackageName(): string;

  /**
   * Returns the aspect of which this plugin implementation belongs to such as the aspect of `ledger-connector` or
   * `storage` for example.
   * There can be any number of plugin implementations for each aspect.
   */
  getAspect(): PluginAspect;
}

export function isICactusPlugin(
  pluginInstance: any
): pluginInstance is ICactusPlugin {
  return typeof pluginInstance?.getPackageName === "function";
}
