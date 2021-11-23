import { Optional } from "typescript-optional";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  ICactusPlugin,
  IPluginKeychain,
  isICactusPlugin,
  isIPluginKeychain,
} from "@hyperledger/cactus-core-api";

/**
 * This interface describes the constructor options object that can be used to provide configuration parameters to
 * the `PluginRegistry` class instances.
 */
export interface IPluginRegistryOptions {
  logLevel?: LogLevelDesc;
  plugins?: ICactusPlugin[];
}

/**
 * The plugin registry exists so that plugins can use other plugins as their dependencies in a convenient way where
 * we can pass around the plugin registry itself as a simplified and not overly opinionated inversion of control
 * container.
 * Did consider using libraries made for this specific purpose but they are quite heavy handed and usually require
 * decorators on classes. Also, they do not work with interfaces so we also intend to avoid being forced to use actual
 * classes in place of the interfaces currently describing the plugin architecture.
 */
export class PluginRegistry {
  public static readonly CLASS_NAME = "PluginRegistry";
  public readonly plugins: ICactusPlugin[];
  public readonly log: Logger;

  public get className(): string {
    return PluginRegistry.CLASS_NAME;
  }

  constructor(public readonly options: IPluginRegistryOptions = {}) {
    const fnTag = `PluginRegistry#constructor()`;
    if (!options) {
      throw new TypeError(`${fnTag} options falsy`);
    }
    if (options.plugins && !Array.isArray(options.plugins)) {
      throw new TypeError(`${fnTag} options.plugins truthy but non-Array`);
    }
    this.plugins = options.plugins || [];

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.log.debug(`Instantiated ${this.className} OK`);
  }

  public getPlugins(): ICactusPlugin[] {
    return this.plugins;
  }

  /**
   * Same as `findOneById()` but throws instead of returning an `EMPTY` `Optional`
   * when the plugin does not exist in the registry.
   *
   * @param instanceId The `instanceId` of the plugin that you are looking to obtain an instance of from the registry.
   * @throws If there is no plugin in the registry by the `instanceId` specificed.
   */
  public getOneById<T extends ICactusPlugin>(instanceId: string): T {
    Checks.nonBlankString(instanceId, "instanceId");
    return this.findOneById(instanceId).orElseThrow(
      () => new Error(`Plugin ${instanceId} not present in registry`),
    ) as T;
  }

  public findOneById<T extends ICactusPlugin>(instanceId: string): Optional<T> {
    Checks.nonBlankString(instanceId, "instanceId");
    const plugin = this.getPlugins().find(
      (p) => p.getInstanceId() === instanceId,
    );
    return Optional.ofNullable(plugin as T);
  }

  /**
   * The main difference between this method and `findOneByPackageName` is that this throws an Error if there was nothing to
   * return. It is recommended to use this method over `findOneByPackageName` if you have a hard dependency on a certain
   * plugin being loaded for your code.
   *
   * @param packageName The package name of the plugin that you are looking to obtain an instance of from the registry.
   * @throws If there is no plugin in the registry by the package name specificed.
   */
  public getOneByPackageName<T extends ICactusPlugin>(packageName: string): T {
    return this.findOneByPackageName(packageName).orElseThrow(
      () => new Error(`Plugin ${packageName} not present in registry`),
    ) as T;
  }

  public findOneByPackageName<T extends ICactusPlugin>(
    packageName: string,
  ): Optional<T> {
    const plugin = this.getPlugins().find(
      (p) => p.getPackageName() === packageName,
    );
    return Optional.ofNullable(plugin as T);
  }

  public findManyByPackageName<T extends ICactusPlugin>(
    packageName: string,
  ): T[] {
    return this.getPlugins().filter(
      (p) => p.getPackageName() === packageName,
    ) as T[];
  }

  public findOneByKeychainId<T extends IPluginKeychain>(keychainId: string): T {
    const fnTag = "PluginRegistry#findOneByKeychainId()";
    if (typeof keychainId !== "string" || keychainId.trim().length < 1) {
      throw new Error(`${fnTag} need keychainId arg as non-blank string.`);
    }

    const plugin = this.plugins
      .filter((p) => isIPluginKeychain(p))
      .find((p) => (p as IPluginKeychain).getKeychainId() === keychainId);

    return Optional.ofNullable(plugin as T).orElseThrow(
      () => new Error(`${fnTag} No keychain found for ID ${keychainId}`),
    );
  }

  public hasByPackageName(packageName: string): boolean {
    return this.findOneByPackageName(packageName).isPresent();
  }

  public deleteByPackageName(packageName: string): [number] {
    let deleteCount = 0;
    this.plugins.forEach((p, i) => {
      if (p.getPackageName() === packageName) {
        this.plugins.splice(i, 1);
        deleteCount++;
      }
    });
    return [deleteCount];
  }

  public add(plugin: ICactusPlugin, replaceOnConflict = false): [number] {
    if (!isICactusPlugin(plugin)) {
      throw new Error(`PluginRegistry#add() plugin not an ICactusPlugin`);
    }
    const pkgName = plugin.getPackageName();
    const hasConfclit = this.hasByPackageName(pkgName);
    if (hasConfclit && !replaceOnConflict) {
      throw new Error(`PluginRegistry#add() already have plugin: ${pkgName}`);
    }
    let deleteCount = 0;
    if (replaceOnConflict) {
      [deleteCount] = this.deleteByPackageName(plugin.getPackageName());
    }
    this.getPlugins().push(plugin);
    return [deleteCount];
  }
}
