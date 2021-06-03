import { PluginImportType } from "./generated/openapi/typescript-axios/index";

/**
 * The base interface for describing the object that is to be passed in to all
 * the `createPluginFactory()` functions that all plugin packages must expose.
 *
 */
export interface IPluginFactoryOptions {
  /**
   * The original plugin import type that the API server received via configuration
   * (via ENV, CLI or FILE).
   * The `type` property of the plugin import can be used by the different
   * `createPluginFactory()` implementations to determine the kind of factory
   * they need to return. For example:
   *
   * 1. For `LOCAL` type of plugin imports, the factory returned will construct
   * the actual plugin implementation class (e.g. directly instantiate it)
   *
   * 2. For `REMOTE` type of plugin imports, the factory returned will create an
   * API client object, configured to point to an arbitrary implementation of
   * the plugin over the network (which is how we enable/unlock the possibility
   * to have language independent plugin implementations since by specifying
   * `REMOTE` when importing a plugin, you can provide a network host where a
   * plugin is deployed that was implemented in your preferred programming
   * language rather than Typescript/Javascript for example.)
   *
   * Important note:
   * When specifying `REMOTE` as the plugin import type, you still need to also
   * specify the `packageName` property pointing to an npm package that has the
   * API client class definition and the corresponding factory in it. The local
   * implementation however does not have to be present in that npm package,
   * which is the whole point.
   *
   * To provide a specific example of the above case: Writing a ledger connector
   * plugin in a non-NodeJS language (Rust, Go, Java, etc.) can be done in the
   * following way:
   * 1. Define the API client for your plugin in Typescript (only needed if
   * not already defined for the ledger of your choice)
   * We recommend auto-generating this after having written a platform/language
   * netural OpenAPI spec file first. This API client doesn't provide any
   * actual implementation of your plugin, it just maps method names of your
   * plugin to HTTP requests that your actual plugin implementation (in your
   * language of choice) will have to be able to service.
   * 2. Write the actual code of your plugin in your language of choice.
   * 3. Profit.
   *
   * Also note: If you are re-implementing a connector plugin in a different
   * language that already has an implementation in NodeJS/Typescript, then
   * you can skip the step above that has you publish the npm package with the
   * API client class and really only have to work in your language of choice.
   */
  pluginImportType: PluginImportType;
}
