import { LogLevelDesc } from "@hyperledger/cactus-common";
import { isLogLevelDesc } from "../validate-satp-log-level";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

export interface KeychainBackendEntry {
  keychainEntry: string;
  keychainEntryValue: string;
}

export interface KeychainOptionsJSON {
  instanceId: string;
  keychainId: string;
  logLevel?: LogLevelDesc;
  backend?: KeychainBackendEntry[];
  contractName?: string;
  contractString?: string;
}

export interface PluginRegistryOptionsJSON {
  logLevel?: LogLevelDesc;
  plugins?: KeychainOptionsJSON[];
}

// Type guard for the KeychainBackendEntry
function isKeychainBackendEntry(obj: unknown): obj is KeychainBackendEntry {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "keychainEntry" in obj &&
    typeof objRecord.keychainEntry === "string" &&
    "keychainEntryValue" in obj &&
    typeof objRecord.keychainEntryValue === "string"
  );
}

// Type guard for an array of KeychainBackendEntry
function isKeychainBackendEntryArray(
  input: unknown,
): input is Array<KeychainBackendEntry> {
  return Array.isArray(input) && input.every(isKeychainBackendEntry);
}

// Type guard for KeychainOptionsJSON
function isKeychainOptionsJSON(obj: unknown): obj is KeychainOptionsJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "instanceId" in obj &&
    typeof objRecord.instanceId === "string" &&
    "keychainId" in obj &&
    typeof objRecord.keychainId === "string" &&
    (!("logLevel" in obj) || isLogLevelDesc(objRecord.logLevel)) &&
    (!("backend" in obj) || isKeychainBackendEntryArray(objRecord.backend)) &&
    (!("contractName" in obj) || typeof objRecord.contractName === "string") &&
    (!("contractString" in obj) || typeof objRecord.contractString === "string")
  );
}

// Type guard for an array of KeychainOptionsJSON
function isKeychainOptionsJSONArray(
  input: unknown,
): input is Array<KeychainOptionsJSON> {
  return Array.isArray(input) && input.every(isKeychainOptionsJSON);
}

// Type guard for PluginRegistryOptionsJSON
export function isPluginRegistryOptionsJSON(
  obj: unknown,
): obj is PluginRegistryOptionsJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    (!("logLevel" in obj) || isLogLevelDesc(objRecord.logLevel)) &&
    (!("plugins" in obj) || isKeychainOptionsJSONArray(objRecord.plugins))
  );
}

type KeyValuePair = [string, string];

// Function to create PluginRegistry from PluginRegistryOptionsJSON
export function createPluginRegistry(
  pluginRegistryOptions?: PluginRegistryOptionsJSON,
  logLevel?: LogLevelDesc,
): PluginRegistry {
  if (
    pluginRegistryOptions === undefined ||
    pluginRegistryOptions.plugins === undefined
  ) {
    return new PluginRegistry();
  }

  const plugins: PluginKeychainMemory[] = [];
  pluginRegistryOptions.plugins.forEach(async (pluginJSON) => {
    const entryValuesArray: KeyValuePair[] = [];
    pluginJSON.backend?.forEach((entry) => {
      entryValuesArray.push([entry.keychainEntry, entry.keychainEntryValue]);
    });
    const backend: Map<string, string> = new Map(entryValuesArray);
    const newPluginKeychainMemory = new PluginKeychainMemory({
      instanceId: pluginJSON.instanceId,
      keychainId: pluginJSON.keychainId,
      logLevel,
      backend,
    });
    if (pluginJSON.contractName && pluginJSON.contractString) {
      await newPluginKeychainMemory.set(
        pluginJSON.contractName,
        pluginJSON.contractString,
      );
    }
    plugins.push(newPluginKeychainMemory);
  });
  return new PluginRegistry({
    plugins: plugins,
  });
}
