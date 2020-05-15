import { Optional } from "typescript-optional";
import { ICactusPlugin, isICactusPlugin } from "../plugin/i-cactus-plugin";
import { PluginAspect } from "../plugin/plugin-aspect";

/**
 * This interface describes the constructor options object that can be used to provide configuration parameters to
 * the `PluginRegistry` class instances.
 */
export interface IPluginRegistryOptions {
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
  public readonly plugins: ICactusPlugin[];

  constructor(public readonly options: IPluginRegistryOptions = {}) {
    if (!options) {
      throw new TypeError(`PluginRegistry#ctor options falsy`);
    }
    if (options.plugins && !Array.isArray(options.plugins)) {
      throw new TypeError(
        `PluginRegistry#ctor options.plugins truthy but non-Array`
      );
    }
    this.plugins = options.plugins || [];
  }

  public getPlugins(): ICactusPlugin[] {
    return this.plugins;
  }

  /**
   * The main difference between this method and `findOneById` is that this throws an Error if there was nothing to
   * return. It is recommended to use this method over `findOneById` if you have a hard dependency on a certain
   * plugin being loaded for your code.
   *
   * @param id The ID of the plugin that you are looking to obtain an instance of from the registry.
   * @throws If there is no plugin in the registry by the ID specificed.
   */
  public getOneById<T extends ICactusPlugin>(id: string): T {
    return this.findOneById(id).orElseThrow(
      () => new Error(`Plugin ${id} not present in registry`)
    ) as T;
  }

  public getOneByAspect<T extends ICactusPlugin>(aspect: PluginAspect): T {
    return this.findOneByAspect(aspect).orElseThrow(
      () => new Error(`No plugin with aspect: ${aspect}`)
    ) as T;
  }

  public findOneById<T extends ICactusPlugin>(pluginId: string): Optional<T> {
    const plugin = this.getPlugins().find((p) => p.getId() === pluginId);
    return Optional.ofNullable(plugin as T);
  }

  public findManyById<T extends ICactusPlugin>(id: string): T[] {
    return this.getPlugins().filter((p) => p.getId() === id) as T[];
  }

  public findOneByAspect<T extends ICactusPlugin>(
    aspect: PluginAspect
  ): Optional<T> {
    const plugin = this.getPlugins().find((p) => p.getAspect() === aspect);
    return Optional.ofNullable(plugin as T);
  }

  public findManyByAspect<T extends ICactusPlugin>(aspect: PluginAspect): T[] {
    return this.getPlugins().filter((p) => p.getAspect() === aspect) as T[];
  }

  public hasByAspect(aspect: PluginAspect): boolean {
    return this.findOneByAspect(aspect).isPresent();
  }

  public hasById(id: string): boolean {
    return this.findOneById(id).isPresent();
  }

  public deleteById(id: string): [number] {
    let deleteCount: number = 0;
    this.plugins.forEach((p, i) => {
      if (p.getId() === id) {
        this.plugins.splice(i, 1);
        deleteCount++;
      }
    });
    return [deleteCount];
  }

  public add(
    plugin: ICactusPlugin,
    replaceOnConflict: boolean = false
  ): [number] {
    if (!isICactusPlugin(plugin)) {
      throw new Error(`PluginRegistry#add() plugin not an ICactusPlugin`);
    }
    const id = plugin.getId();
    const hasConfclit = this.hasById(id);
    if (hasConfclit && !replaceOnConflict) {
      throw new Error(`PluginRegistry#add() already have plugin: ${id}`);
    }
    let deleteCount: number = 0;
    if (replaceOnConflict) {
      [deleteCount] = this.deleteById(plugin.getId());
    }
    this.getPlugins().push(plugin);
    return [deleteCount];
  }
}
