import { ICactusPlugin } from "../../i-cactus-plugin";

export interface IPluginKVStorage extends ICactusPlugin {
  has(key: string): Promise<boolean>;
  get<T>(key: string): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  delete<T>(key: string): Promise<void>;
}
