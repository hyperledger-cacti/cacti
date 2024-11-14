import { Logger, LogLevelDesc } from "@hyperledger/cactus-common";
import {
  AdminApi,
  TransactionApi,
} from "../../main/typescript/generated/gateway-client/typescript-axios/api";
import { TransactRequest } from "../../main/typescript";
import { Configuration } from "../../main/typescript/generated/gateway-client/typescript-axios";
import fs from "fs-extra";
import path from "path";
import { expect } from "@jest/globals";
import { GatewayIdentity } from "../../main/typescript/core/types";
import { BesuTestEnvironment } from "./environments/besu-test-environment";
import { EthereumTestEnvironment } from "./environments/ethereum-test-environment";
import { FabricTestEnvironment } from "./environments/fabric-test-environment";

export { BesuTestEnvironment } from "./environments/besu-test-environment";
export { EthereumTestEnvironment } from "./environments/ethereum-test-environment";
export { FabricTestEnvironment } from "./environments/fabric-test-environment";

// Function overloads for creating different types of API clients
export function createClient(
  type: "AdminApi",
  address: string,
  port: number,
  logger: Logger,
): AdminApi;
export function createClient(
  type: "TransactionApi",
  address: string,
  port: number,
  logger: Logger,
): TransactionApi;

// Creates an API client instance for interacting with the gateway
export function createClient(
  type: "AdminApi" | "TransactionApi",
  address: string,
  port: number,
  logger: Logger,
): AdminApi | TransactionApi {
  const config = new Configuration({ basePath: `${address}:${port}` });
  logger.debug(config);

  if (type === "AdminApi") {
    return new AdminApi(config);
  } else if (type === "TransactionApi") {
    return new TransactionApi(config);
  } else {
    throw new Error("Invalid api type");
  }
}

// Sets up the necessary configuration and log files for running a SATP Gateway in Docker
// Creates files with unique timestamps or specified context
export function setupGatewayDockerFiles(
  gatewayIdentity: GatewayIdentity,
  logLevel: LogLevelDesc,
  counterPartyGateways: GatewayIdentity[],
  bridgesConfig: Record<string, unknown>[],
  fileContext?: string,
  gatewayKeyPair?: {
    privateKey: string;
    publicKey: string;
  },
): {
  configFile: string;
  outputLogFile: string;
  errorLogFile: string;
} {
  const jsonObject = {
    gid: gatewayIdentity,
    logLevel,
    counterPartyGateways,
    environment: "development",
    enableOpenAPI: true,
    bridgesConfig,
    gatewayKeyPair,
  };
  // Create a timestamp for the files if no context provided
  const context =
    fileContext ||
    new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");

  // creates the configuration file for the gateway setup
  const configDir = path.join(__dirname, `gateway-info/config`);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  const configFile = path.join(configDir, `gateway-config-${context}.json`);
  fs.writeFileSync(configFile, JSON.stringify(jsonObject, null, 2));
  expect(fs.existsSync(configFile)).toBe(true);

  // creates the files for logging the output and error:
  const logDir = path.join(__dirname, `gateway-info/logs`);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const outputLogFile = path.join(logDir, `gateway-logs-output-${context}.log`);
  const errorLogFile = path.join(logDir, `gateway-logs-error-${context}.log`);
  fs.writeFileSync(outputLogFile, "");
  fs.writeFileSync(errorLogFile, "");
  expect(fs.existsSync(outputLogFile)).toBe(true);
  expect(fs.existsSync(errorLogFile)).toBe(true);

  return {
    configFile,
    outputLogFile,
    errorLogFile,
  };
}

// Creates a TransactRequest for testing transactions
export function getTransactRequest(
  contextID: string,
  from: BesuTestEnvironment | EthereumTestEnvironment | FabricTestEnvironment,
  to: BesuTestEnvironment | EthereumTestEnvironment | FabricTestEnvironment,
  fromAmount: string,
  toAmount: string,
): TransactRequest {
  return {
    contextID,
    fromDLTNetworkID: from.network,
    toDLTNetworkID: to.network,
    fromAmount,
    toAmount,
    originatorPubkey: from.transactRequestPubKey,
    beneficiaryPubkey: to.transactRequestPubKey,
    sourceAsset: from.defaultAsset,
    receiverAsset: to.defaultAsset,
  };
}
