export abstract class PluginFactory<T, K> {
  abstract async create(options: K): Promise<T>;
}
