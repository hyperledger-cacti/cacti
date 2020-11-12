import { IPluginKVStorage } from "../storage/key-value/i-plugin-kv-storage";

/**
 * Common interface to be implemented by classes that act as plugins behind
 * keychains.
 */
export interface IPluginKeychain extends IPluginKVStorage {
  rotateEncryptionKeys(): Promise<void>;
  getEncryptionAlgorithm(): string;
  /**
   * Returns the unique identifier of the keychain pointed to (or backed) by
   * this `IPluginKeychain` instance.
   * This therefore does not uniqely identify the plugin instance itself, but
   * its backend instead.
   * Useful for being able to reference keychains by their IDs in deployment
   * scenarios when there are multiple keychain backends for different sets of
   * secrets.
   */
  getKeychainId(): string;
}
