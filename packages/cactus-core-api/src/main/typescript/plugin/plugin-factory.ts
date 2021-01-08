import { IPluginFactoryOptions } from "../i-plugin-factory-options";
export abstract class PluginFactory<T, K, C extends IPluginFactoryOptions> {
  constructor(public readonly options: C) {}

  abstract create(options: K): Promise<T>;
}
