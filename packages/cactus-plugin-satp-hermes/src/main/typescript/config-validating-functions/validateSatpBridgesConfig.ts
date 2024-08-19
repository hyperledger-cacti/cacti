import { SupportedChain } from "../core/types";
import {
  BesuConfig,
  EthereumConfig,
  FabricConfig,
  NetworkConfig,
} from "../types/blockchain-interaction";
import { isSupportedChain } from "./validateSatpGatewayIdentity";
import { isFabricConfigJSON } from "./bridges-config-validating-functions/validateFabricConfig";
import { createFabricOptions } from "./bridges-config-validating-functions/validateFabricOptions";
import { isBesuConfigJSON } from "./bridges-config-validating-functions/validateBesuConfig";
import { createBesuOptions } from "./bridges-config-validating-functions/validateBesuOptions";
import { isEthereumConfigJSON } from "./bridges-config-validating-functions/validateEthereumConfig";
import { createEthereumOptions } from "./bridges-config-validating-functions/validateEthereumOptions";
import { createBungeeOptions } from "./bridges-config-validating-functions/validateBungeeOptions";

export interface NetworkConfigJSON {
  network: SupportedChain;
}

// Type guard for NetworkConfigJSON
function isNetworkConfigJSON(obj: unknown): obj is NetworkConfigJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  if (!("network" in obj) || !isSupportedChain(objRecord.network)) {
    return false;
  }
  return (
    isFabricConfigJSON(objRecord) ||
    isBesuConfigJSON(objRecord) ||
    isEthereumConfigJSON(objRecord)
  );
}

// Type guard for an array of NetworkConfigJSON
function isNetworkConfigJSONArray(
  input: unknown,
): input is Array<NetworkConfigJSON> {
  return Array.isArray(input) && input.every(isNetworkConfigJSON);
}

export function validateSatpBridgesConfig(opts: {
  readonly configValue: unknown;
}): Array<NetworkConfig> {
  if (!opts || !opts.configValue) {
    return [];
  }

  if (!isNetworkConfigJSONArray(opts.configValue)) {
    throw new TypeError(
      "Invalid config.bridgesConfig: " + JSON.stringify(opts.configValue),
    );
  }

  const bridgesConfigParsed: NetworkConfig[] = [];
  opts.configValue.forEach((config) => {
    if (isFabricConfigJSON(config)) {
      console.log("Validating FabricConfig BungeeOptions...");
      const bungeeOptions = createBungeeOptions(config.bungeeOptions);
      console.log("FabricConfig BungeeOptions is valid.");
      console.log("Validating FabricConfig Options...");
      const fabricOptions = createFabricOptions(config.options);
      console.log("FabricConfig Options is valid.");

      const fabricConfig: FabricConfig = {
        network: config.network,
        signingCredential: config.signingCredential,
        channelName: config.channelName,
        contractName: config.contractName,
        options: fabricOptions,
        bungeeOptions: bungeeOptions,
        fabricAssets: config.fabricAssets,
        claimFormat: config.claimFormat,
      };

      bridgesConfigParsed.push(fabricConfig);
    } else if (isBesuConfigJSON(config)) {
      console.log("Validating BesuConfig BungeeOptions...");
      const bungeeOptions = createBungeeOptions(config.bungeeOptions);
      console.log("BesuConfig BungeeOptions is valid.");
      console.log("Validating BesuConfig Options...");
      const besuOptions = createBesuOptions(config.options);
      console.log("BesuConfig Options is valid.");

      const besuConfig: BesuConfig = {
        network: config.network,
        keychainId: config.keychainId,
        signingCredential: config.signingCredential,
        contractName: config.contractName,
        contractAddress: config.contractAddress,
        gas: config.gas,
        options: besuOptions,
        bungeeOptions: bungeeOptions,
        besuAssets: config.besuAssets,
        claimFormat: config.claimFormat,
      };

      bridgesConfigParsed.push(besuConfig);
    } else if (isEthereumConfigJSON(config)) {
      console.log("Validating EthereumConfig BungeeOptions...");
      const bungeeOptions = createBungeeOptions(config.bungeeOptions);
      console.log("EthereumConfig BungeeOptions is valid.");
      console.log("Validating EthereumConfig Options...");
      const besuOptions = createEthereumOptions(config.options);
      console.log("EthereumConfig Options is valid.");

      const ethereumConfig: EthereumConfig = {
        network: config.network,
        keychainId: config.keychainId,
        signingCredential: config.signingCredential,
        contractName: config.contractName,
        contractAddress: config.contractAddress,
        gas: config.gas,
        options: besuOptions,
        bungeeOptions: bungeeOptions,
        ethereumAssets: config.ethereumAssets,
        claimFormat: config.claimFormat,
      };

      bridgesConfigParsed.push(ethereumConfig);
    }
  });
  return bridgesConfigParsed;
}
