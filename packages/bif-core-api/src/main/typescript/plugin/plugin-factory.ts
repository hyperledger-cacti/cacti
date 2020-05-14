export abstract class PluginFactory<T, K> {
  async abstract create(options: K): Promise<T>;
}
