import { IPluginKVStorage } from "../storage/key-value/i-plugin-kv-storage";

export interface IPluginKeychain extends IPluginKVStorage {
  rotateEncryptionKeys(): Promise<void>;
  getEncryptionAlgorithm(): string;
}
