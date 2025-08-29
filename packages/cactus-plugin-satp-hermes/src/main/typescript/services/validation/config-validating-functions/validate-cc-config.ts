import fs from "fs-extra";

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
import {
  DeploymentTargetOrganization,
  FileBase64,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import path from "path";
import { Logger } from "@hyperledger/cactus-common";

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
function NetworkOptionsJSON(
  obj: unknown,
  log: Logger,
): obj is NetworkOptionsJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const objRecord = obj as Record<string, unknown>;
  return (
    isNetworkId(objRecord.networkIdentification) &&
    (isFabricConfigJSON(objRecord, log) ||
      isBesuConfigJSON(objRecord) ||
      isEthereumConfigJSON(objRecord))
  );
}

function NetworkOptionsJSONArray(
  obj: unknown,
  log: Logger,
): obj is NetworkOptionsJSON[] {
  return (
    Array.isArray(obj) && obj.every((item) => NetworkOptionsJSON(item, log))
  );
}

// Type guard for CCConfigJSON
function isCCConfigJSON(
  obj: unknown,
  log: Logger,
): obj is ICrossChainMechanismsOptions {
  return (
    typeof obj === "object" &&
    obj !== null &&
    (("bridgeConfig" in obj &&
      NetworkOptionsJSONArray(obj.bridgeConfig, log)) ||
      ("oracleConfig" in obj && NetworkOptionsJSONArray(obj.oracleConfig, log)))
  );
}

async function createBridgeConfig(
  configs: NetworkOptionsJSON[] | undefined = [],
  log: Logger,
): Promise<INetworkOptions[]> {
  const bridgesConfigParsed: INetworkOptions[] = [];

  for (const config of configs) {
    if (isFabricConfigJSON(config, log)) {
      const fabricOptions = createFabricOptions(config.connectorOptions);

      // Read the CA file from the provided path, if available

      if (config.caFilePath && !fs.existsSync(config.caFilePath)) {
        throw new Error(`CA file not found at path: ${config.caFilePath}`);
      }

      const caFile =
        config.caFilePath !== undefined
          ? fs.readFileSync(config.caFilePath).toString()
          : undefined;

      if (config.coreYamlFilePath && !fs.existsSync(config.coreYamlFilePath)) {
        throw new Error(
          `Core YAML file not found at path: ${config.coreYamlFilePath}`,
        );
      }
      const coreYamlFile = {
        filename: "core.yaml",
        body:
          config.coreYamlFilePath !== undefined &&
          fs.existsSync(config.coreYamlFilePath)
            ? fs.readFileSync(config.coreYamlFilePath).toString("base64")
            : undefined,
      } as FileBase64;

      const targetOrganizations: DeploymentTargetOrganization[] = [];

      for (const org of config.targetOrganizations || []) {
        if (typeof org === "object" && org !== null) {
          if (
            !(
              "CORE_PEER_LOCALMSPID" in org &&
              "CORE_PEER_ADDRESS" in org &&
              "CORE_PEER_MSPCONFIG_PATH" in org &&
              "CORE_PEER_TLS_ROOTCERT_PATH" in org &&
              "ORDERER_TLS_ROOTCERT_PATH" in org
            )
          ) {
            throw new TypeError(
              "Invalid target organization in config: " + JSON.stringify(org),
            );
          }

          if (!fs.existsSync(org.CORE_PEER_TLS_ROOTCERT_PATH)) {
            throw new Error(
              `TLS root cert path not found for organization: ${org.CORE_PEER_LOCALMSPID} at path: ${org.CORE_PEER_TLS_ROOTCERT_PATH}`,
            );
          }

          const peertlsRootCert =
            org.CORE_PEER_TLS_ROOTCERT_PATH !== undefined
              ? fs.readFileSync(org.CORE_PEER_TLS_ROOTCERT_PATH).toString()
              : undefined;

          if (
            org.ORDERER_TLS_ROOTCERT_PATH &&
            !fs.existsSync(org.ORDERER_TLS_ROOTCERT_PATH)
          ) {
            throw new Error(
              `Orderer TLS root cert path not found for organization: ${org.CORE_PEER_LOCALMSPID} at path: ${org.ORDERER_TLS_ROOTCERT_PATH}`,
            );
          }

          const ordererTlsRootCert =
            org.ORDERER_TLS_ROOTCERT_PATH !== undefined
              ? fs.readFileSync(org.ORDERER_TLS_ROOTCERT_PATH).toString()
              : undefined;

          if (!fs.existsSync(org.CORE_PEER_MSPCONFIG_PATH)) {
            throw new Error(
              `MSP config path not found for organization: ${org.CORE_PEER_LOCALMSPID} at path: ${org.CORE_PEER_MSPCONFIG_PATH}`,
            );
          }

          // Recursively collect all files in the MSP config directory, preserving relative paths
          const mspConfigFiles: FileBase64[] = await collectFiles(
            org.CORE_PEER_MSPCONFIG_PATH,
          );

          if (ordererTlsRootCert === undefined) {
            throw new Error(
              `Orderer TLS root cert path is required for organization: ${org.CORE_PEER_LOCALMSPID}`,
            );
          }

          if (peertlsRootCert === undefined) {
            throw new Error(
              `Peer TLS root cert path is required for organization: ${org.CORE_PEER_LOCALMSPID}`,
            );
          }

          targetOrganizations.push({
            CORE_PEER_LOCALMSPID: org.CORE_PEER_LOCALMSPID,
            CORE_PEER_ADDRESS: org.CORE_PEER_ADDRESS,
            CORE_PEER_MSPCONFIG: mspConfigFiles,
            CORE_PEER_TLS_ROOTCERT: peertlsRootCert,
            ORDERER_TLS_ROOTCERT: ordererTlsRootCert,
          });
        } else {
          throw new TypeError(
            "Invalid target organization in config: " + JSON.stringify(org),
          );
        }
      }

      const fabricConfig = {
        networkIdentification: config.networkIdentification,
        userIdentity: config.userIdentity,
        connectorOptions: fabricOptions,
        channelName: config.channelName,
        targetOrganizations: targetOrganizations,
        caFile,
        coreYamlFile,
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
  }
  return bridgesConfigParsed;
}

async function collectFiles(
  dir: string,
  relativePath = "",
): Promise<FileBase64[]> {
  const fnTag = `validate-cc-config#collectFiles()`;
  console.debug(`${fnTag} ENTER - dir=%s, relativePath=%s`, dir, relativePath);
  const files: FileBase64[] = [];
  const entries = await fs.promises.readdir(dir, {
    withFileTypes: true,
  });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath, relPath)));
    } else if (entry.isFile()) {
      const fileBuffer = await fs.promises.readFile(fullPath);
      const parts = relPath.split(path.sep);
      const filename = parts.pop()!;
      const filepath = parts.length ? parts.join("/") : undefined;
      console.debug(
        `Collecting file: ${filename} from path: ${fullPath} with relative path: ${relPath}`,
      );
      files.push({
        filename,
        body: fileBuffer.toString("base64"),
        filepath,
      });
    }
  }
  return files;
}

export async function validateCCConfig(
  opts: {
    readonly configValue: unknown;
  },
  log: Logger,
): Promise<ICrossChainMechanismsOptions> {
  if (!opts || !opts.configValue) {
    return {
      bridgeConfig: [],
      oracleConfig: [],
    };
  }

  if (!isCCConfigJSON(opts.configValue, log)) {
    throw new TypeError(
      "Invalid config.bridgesConfig || config.oracleConfig: " +
        JSON.stringify(opts.configValue),
    );
  }

  if (
    "bridgeConfig" in opts.configValue &&
    !NetworkOptionsJSONArray(opts.configValue.bridgeConfig, log)
  ) {
    throw new TypeError(
      "Invalid config.bridgesConfig && config.oracleConfig: " +
        JSON.stringify(opts.configValue),
    );
  }

  if (
    "oracleConfig" in opts.configValue &&
    !NetworkOptionsJSONArray(opts.configValue.oracleConfig, log)
  ) {
    throw new TypeError(
      "Invalid config.bridgesConfig && config.oracleConfig: " +
        JSON.stringify(opts.configValue),
    );
  }

  return {
    bridgeConfig: await createBridgeConfig(opts.configValue.bridgeConfig, log),
    oracleConfig: await createBridgeConfig(opts.configValue.oracleConfig, log),
  };
}
