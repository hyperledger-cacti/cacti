import { ICactusPlugin } from "../i-cactus-plugin";

/**
 * Common interface to be implemented by classes that act as plugins behind
 * keychains.
 */
export interface IPluginKeychain extends ICactusPlugin {
  /**
   * Returns the unique identifier of the keychain pointed to (or backed) by
   * this `IPluginKeychain` instance.
   * This therefore does not uniquely identify the plugin instance itself, but
   * its backend instead.
   * Useful for being able to reference keychains by their IDs in deployment
   * scenarios when there are multiple keychain backends for different sets of
   * secrets.
   */
  getKeychainId(): string;

  has(key: string): Promise<boolean>;
  get(key: string): Promise<string>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
