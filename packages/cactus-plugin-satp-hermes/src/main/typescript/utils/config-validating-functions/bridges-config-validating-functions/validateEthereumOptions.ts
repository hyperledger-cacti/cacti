import { LogLevelDesc } from "@hyperledger/cactus-common";
import { isLogLevelDesc } from "../validateSatpLogLevel";
import {
  createPluginRegistry,
  isPluginRegistryOptionsJSON,
  PluginRegistryOptionsJSON,
} from "./validatePluginRegistryOptions";
import { IPluginLedgerConnectorEthereumOptions } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";

export interface EthereumOptionsJSON {
  instanceId: string;
  rpcApiHttpHost: string;
  rpcApiWsHost: string;
  pluginRegistryOptions: PluginRegistryOptionsJSON;
  logLevel?: LogLevelDesc;
}

export function isEthereumOptionsJSON(
  obj: unknown,
): obj is EthereumOptionsJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "instanceId" in obj &&
    typeof objRecord.instanceId === "string" &&
    (!("rpcApiHttpHost" in obj) ||
      typeof objRecord.rpcApiHttpHost === "string") &&
    (!("rpcApiWsHost" in obj) || typeof objRecord.rpcApiWsHost === "string") &&
    "pluginRegistryOptions" in obj &&
    isPluginRegistryOptionsJSON(objRecord.pluginRegistryOptions) &&
    (!("logLevel" in obj) || isLogLevelDesc(objRecord.logLevel))
  );
}

// Function to create IPluginLedgerConnectorEthereumOptions from EthereumOptionsJSON
export function createEthereumOptions(
  options: EthereumOptionsJSON,
): IPluginLedgerConnectorEthereumOptions {
  if (!options) {
    throw new TypeError(
      "Invalid options in EthereumConfig: " + JSON.stringify(options),
    );
  }

  const ethereumOptions: IPluginLedgerConnectorEthereumOptions = {
    instanceId: options.instanceId,
    rpcApiHttpHost: options.rpcApiHttpHost,
    rpcApiWsHost: options.rpcApiWsHost,
    pluginRegistry: createPluginRegistry(
      options.pluginRegistryOptions,
      options.logLevel,
    ),
    logLevel: options.logLevel,
  };

  return ethereumOptions;
}
