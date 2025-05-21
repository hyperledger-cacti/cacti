import { isFabricConfigJSON } from "./bridges-config-validating-functions/validate-fabric-config";
import { createFabricOptions } from "./bridges-config-validating-functions/validate-fabric-options";
import { isBesuConfigJSON } from "./bridges-config-validating-functions/validate-besu-config";
import { createBesuOptions } from "./bridges-config-validating-functions/validate-besu-options";
import { isEthereumConfigJSON } from "./bridges-config-validating-functions/validate-ethereum-config";
import { createEthereumOptions } from "./bridges-config-validating-functions/validate-ethereum-options";
import { ICrossChainMechanismsOptions } from "../../../cross-chain-mechanisms/satp-cc-manager";
import { INetworkOptions } from "../../../cross-chain-mechanisms/bridge/bridge-types";
import { IFabricLeafNeworkOptions } from "../../../cross-chain-mechanisms/bridge/leafs/fabric-leaf";
import { IBesuLeafNeworkOptions } from "../../../cross-chain-mechanisms/bridge/leafs/besu-leaf";
import { IEthereumLeafNeworkOptions } from "../../../cross-chain-mechanisms/bridge/leafs/ethereum-leaf";

export interface NetworkOptionsJSON {
  networkIdentification: NetworkId;
}

export interface NetworkId {
  id: string;
  ledgerType: string;
}

function isNetworkId(obj: unknown): obj is NetworkId {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "ledgerType" in obj &&
    "id" in obj &&
    typeof obj.id === "string" &&
    typeof obj.ledgerType === "string"
  );
}

// Type guard for NetworkConfigJSON
function NetworkOptionsJSON(obj: unknown): obj is NetworkOptionsJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const objRecord = obj as Record<string, unknown>;
  return (
    isNetworkId(objRecord.networkIdentification) &&
    (isFabricConfigJSON(objRecord) ||
      isBesuConfigJSON(objRecord) ||
      isEthereumConfigJSON(objRecord))
  );
}

function NetworkOptionsJSONArray(obj: unknown): obj is NetworkOptionsJSON[] {
  return Array.isArray(obj) && obj.every((item) => NetworkOptionsJSON(item));
}

// Type guard for CCConfigJSON
function isCCConfigJSON(obj: unknown): obj is ICrossChainMechanismsOptions {
  return (
    typeof obj === "object" &&
    obj !== null &&
    (("bridgeConfig" in obj && NetworkOptionsJSONArray(obj.bridgeConfig)) ||
      ("oracleConfig" in obj && NetworkOptionsJSONArray(obj.oracleConfig)))
  );
}

function createBridgeConfig(
  configs: NetworkOptionsJSON[] | undefined = [],
): INetworkOptions[] {
  const bridgesConfigParsed: INetworkOptions[] = [];

  configs.forEach((config) => {
    if (isFabricConfigJSON(config)) {
      const fabricOptions = createFabricOptions(config.connectorOptions);

      const fabricConfig = {
        networkIdentification: config.networkIdentification,
        userIdentity: config.userIdentity,
        connectorOptions: fabricOptions,
        channelName: config.channelName,
        targetOrganizations: config.targetOrganizations,
        caFile: config.caFile,
        ccSequence: config.ccSequence,
        orderer: config.orderer,
        ordererTLSHostnameOverride: config.ordererTLSHostnameOverride,
        connTimeout: config.connTimeout,
        signaturePolicy: config.signaturePolicy,
        mspId: config.mspId,
        wrapperContractName: config.wrapperContractName,
        leafId: config.leafId,
        keyPair:
          config.keyPair === undefined
            ? undefined
            : {
                publicKey: Buffer.from(config.keyPair.publicKey, "hex"),
                privateKey: Buffer.from(config.keyPair.privateKey, "hex"),
              },
        claimFormats: config.claimFormats,
      } as Partial<IFabricLeafNeworkOptions> & INetworkOptions;

      bridgesConfigParsed.push(fabricConfig);
    } else if (isBesuConfigJSON(config)) {
      const besuOptions = createBesuOptions(config.connectorOptions);
      const besuConfig = {
        networkIdentification: config.networkIdentification,
        signingCredential: config.signingCredential,
        connectorOptions: besuOptions,
        leafId: config.leafId,
        keyPair:
          config.keyPair === undefined
            ? undefined
            : {
                publicKey: Buffer.from(config.keyPair.publicKey, "hex"),
                privateKey: Buffer.from(config.keyPair.privateKey, "hex"),
              },
        claimFormats: config.claimFormats,
        wrapperContractAddress: config.wrapperContractAddress,
        wrapperContractName: config.wrapperContractName,
        gas: config.gas,
      } as Partial<IBesuLeafNeworkOptions> & INetworkOptions;

      bridgesConfigParsed.push(besuConfig);
    } else if (isEthereumConfigJSON(config)) {
      const ethereumOptions = createEthereumOptions(config.connectorOptions);

      const ethereumConfig = {
        networkIdentification: config.networkIdentification,
        signingCredential: config.signingCredential,
        connectorOptions: ethereumOptions,
        leafId: config.leafId,
        keyPair:
          config.keyPair === undefined
            ? undefined
            : {
                publicKey: Buffer.from(config.keyPair.publicKey, "hex"),
                privateKey: Buffer.from(config.keyPair.privateKey, "hex"),
              },
        claimFormats: config.claimFormats,
        wrapperContractAddress: config.wrapperContractAddress,
        wrapperContractName: config.wrapperContractName,
        gasConfig: config.gasConfig,
      } as Partial<IEthereumLeafNeworkOptions> & INetworkOptions;

      bridgesConfigParsed.push(ethereumConfig);
    }
  });
  return bridgesConfigParsed;
}

export function validateCCConfig(opts: {
  readonly configValue: unknown;
}): ICrossChainMechanismsOptions {
  if (!opts || !opts.configValue) {
    return {
      bridgeConfig: [],
      oracleConfig: [],
    };
  }

  if (!isCCConfigJSON(opts.configValue)) {
    throw new TypeError(
      "Invalid config.bridgesConfig || config.oracleConfig: " +
        JSON.stringify(opts.configValue),
    );
  }

  if (
    !NetworkOptionsJSONArray(opts.configValue.bridgeConfig) &&
    !NetworkOptionsJSONArray(opts.configValue.oracleConfig)
  ) {
    throw new TypeError(
      "Invalid config.bridgesConfig && config.oracleConfig: " +
        JSON.stringify(opts.configValue),
    );
  }

  return {
    bridgeConfig: createBridgeConfig(opts.configValue.bridgeConfig),
    oracleConfig: createBridgeConfig(opts.configValue.oracleConfig),
  };
}
