import { LogLevelDesc, Secp256k1Keys } from "@hyperledger/cactus-common";
import { IPluginBungeeHermesOptions } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/plugin-bungee-hermes";
import { isLogLevelDesc } from "../validateSatpLogLevel";
import {
  createPluginRegistry,
  isPluginRegistryOptionsJSON,
  PluginRegistryOptionsJSON,
} from "./validatePluginRegistryOptions";
import { iskeyPairJSON } from "../validateKeyPairJSON";
import { ClaimFormat } from "../../../generated/proto/cacti/satp/v02/common/message_pb";

export interface BungeeOptionsJSON {
  instanceId: string;
  pluginRegistryOptions?: PluginRegistryOptionsJSON;
  keyPair?: { privateKey: string; publicKey: string };
  logLevel?: LogLevelDesc;
  disableSignalHandlers?: true;
}

// Type guard for ClaimFormat
export function isClaimFormat(obj: unknown): obj is ClaimFormat {
  if (typeof obj !== "number") {
    return false;
  }
  return Object.values(ClaimFormat).includes(obj);
}

// Type guard for BungeeOptionsJSON
export function isBungeeOptionsJSON(obj: unknown): obj is BungeeOptionsJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "instanceId" in obj &&
    typeof objRecord.instanceId === "string" &&
    (!("pluginRegistryOptions" in obj) ||
      isPluginRegistryOptionsJSON(objRecord.pluginRegistryOptions)) &&
    (!("keyPair" in obj) || iskeyPairJSON(objRecord.keyPair)) &&
    (!("logLevel" in obj) || isLogLevelDesc(objRecord.logLevel)) &&
    (!("disableSignalHandlers" in obj) ||
      objRecord.disableSignalHandlers === true)
  );
}

// Function to create IPluginBungeeHermesOptions from BungeeOptionsJSON
export function createBungeeOptions(
  options: BungeeOptionsJSON,
): IPluginBungeeHermesOptions {
  if (!options) {
    throw new TypeError(
      "Invalid bungeeOptions in NetworkConfig: " + JSON.stringify(options),
    );
  }

  return {
    instanceId: options.instanceId,
    pluginRegistry: createPluginRegistry(
      options.pluginRegistryOptions,
      options.logLevel,
    ),
    keyPair:
      options.keyPair?.privateKey && options.keyPair?.publicKey
        ? {
            privateKey: Buffer.from(options.keyPair.privateKey, "hex"),
            publicKey: Buffer.from(options.keyPair.publicKey, "hex"),
          }
        : Secp256k1Keys.generateKeyPairsBuffer(),
    logLevel: options.logLevel,
    disableSignalHandlers: options.disableSignalHandlers,
  };
}
