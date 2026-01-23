import { LogLevelDesc, Logger } from "@hyperledger/cactus-common";
import {
  AdminApi,
  OracleApi,
  TransactionApi,
} from "../../main/typescript/generated/gateway-client/typescript-axios/api";
import { TransactRequest } from "../../main/typescript";
import { Configuration } from "../../main/typescript/generated/gateway-client/typescript-axios";
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { expect } from "@jest/globals";
import { GatewayIdentity } from "../../main/typescript/core/types";
import { BesuTestEnvironment } from "./environments/besu-test-environment";
import { EthereumTestEnvironment } from "./environments/ethereum-test-environment";
import { FabricTestEnvironment } from "./environments/fabric-test-environment";
import knex, { Knex } from "knex";
import Docker, { Container, ContainerInfo } from "dockerode";
import { Containers } from "@hyperledger/cactus-test-tooling/src/main/typescript/common/containers";
import { EventEmitter } from "events";
import { ICrossChainMechanismsOptions } from "../../main/typescript/cross-chain-mechanisms/satp-cc-manager";
import { createMigrationSource } from "../../main/typescript/database/knex-migration-source";
import { ExtensionConfig } from "../../main/typescript/services/validation/config-validating-functions/validate-extensions";
import { TokenType as TransactAssetType } from "../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";

// Re-export centralized database configuration for tests
export {
  createEnhancedKnexConfig,
  createEnhancedPgConfig,
  createEnhancedSqliteConfig,
  COMMON_POOL_CONFIG,
  SQLITE_POOL_CONFIG,
} from "../../main/typescript/database/db-config";

export { BesuTestEnvironment } from "./environments/besu-test-environment";
export { EthereumTestEnvironment } from "./environments/ethereum-test-environment";
export { FabricTestEnvironment } from "./environments/fabric-test-environment";

export const CI_TEST_TIMEOUT = 900000;
const testFilesDirectory = `${__dirname}/../../../cache/`;

export function getTestConfigFilesDirectory(basePath: string): string {
  const testFilesDirectoryConfig = `${__dirname}/../../../cache/${basePath}/config`;
  if (!fs.existsSync(testFilesDirectoryConfig)) {
    fs.mkdirSync(testFilesDirectoryConfig, { recursive: true });
  }
  return testFilesDirectoryConfig;
}

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
export function createClient(
  type: "OracleApi",
  address: string,
  port: number,
  logger: Logger,
): OracleApi;

// Creates an API client instance for interacting with the gateway
export function createClient(
  type: "AdminApi" | "TransactionApi" | "OracleApi",
  address: string,
  port: number,
  logger: Logger,
): AdminApi | TransactionApi | OracleApi {
  const config = new Configuration({ basePath: `${address}:${port}` });
  logger.debug(config);

  if (type === "AdminApi") {
    return new AdminApi(config);
  } else if (type === "TransactionApi") {
    return new TransactionApi(config);
  } else if (type === "OracleApi") {
    return new OracleApi(config);
  } else {
    throw new Error("Invalid api type");
  }
}

// Sets up the necessary configuration and log files for running a SATP Gateway in Docker
// Creates configuration and related data in memory without saving to files
export function generateGatewayConfig(
  gatewayIdentity: GatewayIdentity,
  logLevel: LogLevelDesc,
  counterPartyGateways: GatewayIdentity[],
  enableCrashRecovery: boolean = false,
  ontologiesPath: string,
  ccConfig?: ICrossChainMechanismsOptions,
  localRepository?: Knex.Config,
  remoteRepository?: Knex.Config,
  gatewayKeyPair?: {
    privateKey: string;
    publicKey: string;
  },
): {
  config: object;
  logs: string;
  database: string;
  ontologies: object;
} {
  const jsonObject = {
    gid: gatewayIdentity,
    logLevel,
    counterPartyGateways,
    localRepository,
    remoteRepository,
    environment: "development",
    ccConfig,
    gatewayKeyPair,
    enableCrashRecovery: enableCrashRecovery,
    ontologyPath: ontologiesPath,
  };

  const logs = "Logs would be generated here.";
  const database = "Database configuration would be here.";
  const ontologies = { message: "Ontologies data would be here." };

  return {
    config: jsonObject,
    logs,
    database,
    ontologies,
  };
}
export interface GatewayDockerConfig {
  gatewayIdentity: GatewayIdentity;
  logLevel: LogLevelDesc;
  counterPartyGateways: GatewayIdentity[];
  enableCrashRecovery?: boolean;
  ccConfig?: ICrossChainMechanismsOptions;
  localRepository?: Knex.Config;
  remoteRepository?: Knex.Config;
  gatewayId?: string;
  fileContext?: string;
  gatewayKeyPair?: {
    privateKey: string;
    publicKey: string;
  };
  extensions?: ExtensionConfig[];
}

export function setupGatewayDockerFiles(config: GatewayDockerConfig): {
  configPath: string;
  logsPath: string;
  ontologiesPath: string;
} {
  const {
    gatewayIdentity,
    logLevel,
    counterPartyGateways,
    enableCrashRecovery = false,
    ccConfig,
    localRepository,
    remoteRepository,
    gatewayKeyPair,
    extensions,
  } = config;

  const jsonObject = {
    gid: gatewayIdentity,
    logLevel,
    counterPartyGateways,
    localRepository: localRepository
      ? ({
          client: localRepository.client,
          connection: localRepository.connection,
        } as Knex.Config)
      : undefined,
    remoteRepository: remoteRepository
      ? ({
          client: remoteRepository.client,
          connection: remoteRepository.connection,
        } as Knex.Config)
      : undefined,
    environment: "development",
    ccConfig,
    keyPair: gatewayKeyPair,
    enableCrashRecovery: enableCrashRecovery,
    ontologyPath: "/opt/cacti/satp-hermes/ontologies",
    extensions,
  };

  const directory = testFilesDirectory;
  const configDir = path.join(
    directory,
    `gateway-info-${gatewayIdentity.id}/config`,
  );

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  const configFilePath = path.join(configDir, "config.json");
  fs.writeFileSync(configFilePath, JSON.stringify(jsonObject, null, 2));
  expect(fs.existsSync(configFilePath)).toBe(true);

  const logDir = path.join(
    directory,
    `gateway-info-${gatewayIdentity.id}/logs`,
  );
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const ontologiesDir = path.join(
    directory,
    `gateway-info-${gatewayIdentity.id}/ontologies`,
  );
  if (!fs.existsSync(ontologiesDir)) {
    fs.mkdirSync(ontologiesDir, { recursive: true });
  }

  const sourceOntologiesDir = path.join(__dirname, "../ontologies");
  if (fs.existsSync(sourceOntologiesDir)) {
    fs.copySync(sourceOntologiesDir, ontologiesDir);
  } else {
    throw new Error(
      `Source ontologies directory does not exist: ${sourceOntologiesDir}`,
    );
  }

  return {
    configPath: configDir,
    logsPath: logDir,
    ontologiesPath: ontologiesDir,
  };
}

// Creates a TransactRequest for testing transactions
export function getTransactRequest(
  contextID: string,
  from: BesuTestEnvironment | EthereumTestEnvironment | FabricTestEnvironment,
  to: BesuTestEnvironment | EthereumTestEnvironment | FabricTestEnvironment,
  fromAmount: string,
  toAmount: string,
  assetType?: TransactAssetType,
): TransactRequest {
  if (assetType === undefined) {
    return {
      contextID,
      sourceAsset: { ...from.defaultAsset, amount: fromAmount },
      receiverAsset: { ...to.defaultAsset, amount: toAmount },
    };
  } else {
    switch (assetType) {
      case TransactAssetType.NONSTANDARD_FUNGIBLE:
        return {
          contextID,
          sourceAsset: { ...from.defaultAsset, amount: fromAmount },
          receiverAsset: { ...to.defaultAsset, amount: toAmount },
        };
      case TransactAssetType.NONSTANDARD_NONFUNGIBLE:
        return {
          contextID,
          sourceAsset: { ...from.nonFungibleDefaultAsset, amount: fromAmount },
          receiverAsset: { ...to.nonFungibleDefaultAsset, amount: toAmount },
        };
      default:
        throw new Error(`Unsupported asset type: ${assetType}`);
    }
  }
}

export interface PGDatabaseConfig {
  toUseInDocker?: boolean;
  network?: string;
  postgresUser?: string;
  postgresPassword?: string;
  postgresDB?: string;
}

export async function createPGDatabase(
  config: PGDatabaseConfig,
): Promise<{ config: Knex.Config; container: Container }> {
  const {
    network,
    postgresUser = "postgres",
    postgresPassword = "password",
    postgresDB = "my_database",
  } = config;

  const fnTag = "createPGDatabase()";
  const docker = new Docker();

  const imageFqn = "postgres:17.2";

  console.debug(`Pulling container image ${imageFqn} ...`);
  await Containers.pullImage(imageFqn, {}, "DEBUG");
  console.debug(`Pulled ${imageFqn} OK. Starting container...`);

  console.debug(`Starting container with image: ${imageFqn}...`);

  if (network) {
    const networks = await docker.listNetworks();
    const networkExists = networks.some((n) => n.Name === network);
    if (!networkExists) {
      await docker.createNetwork({
        Name: network,
        Driver: "bridge",
      });
    }
  }

  const hostConfig: Docker.HostConfig = {
    PublishAllPorts: true,
    Binds: [],
    NetworkMode: network,
  };

  const healthCheck = {
    test: [
      "CMD-SHELL",
      `sh -c 'pg_isready -h localhost -d ${postgresDB} -U ${postgresUser} -p 5432'`,
    ],
    interval: 1000000,
    timeout: 60000000,
    retries: 30,
    startPeriod: 1000000,
  };

  const container = new Promise<Container>((resolve, reject) => {
    const eventEmitter: EventEmitter = docker.run(
      imageFqn,
      [],
      [],
      {
        ExposedPorts: {
          ["5432/tcp"]: {},
        },
        HostConfig: hostConfig,
        Healthcheck: healthCheck,
        Env: [
          `POSTGRES_USER=${postgresUser}`,
          `POSTGRES_PASSWORD=${postgresPassword}`,
          `POSTGRES_DB=${postgresDB}`,
        ],
      },
      {},
      (err: unknown) => {
        if (err) {
          reject(err);
        }
      },
    );

    eventEmitter.once("start", async (container: Container) => {
      console.debug(`Started container OK. Waiting for healthcheck...`);

      try {
        const startedAt = Date.now();
        let isHealthy = false;
        do {
          if (Date.now() >= startedAt + 60000) {
            throw new Error(`${fnTag} timed out (${60000}ms)`);
          }

          const containerInfos = await docker.listContainers({});
          const containerInfo = containerInfos.find(
            (ci) => ci.Id === container.id,
          );
          let status;
          try {
            status = ((await containerInfo) as ContainerInfo).Status;
          } catch {
            continue;
          }

          isHealthy = status.endsWith("(healthy)");
          if (!isHealthy) {
            await new Promise((resolve2) => setTimeout(resolve2, 1000));
          }
        } while (!isHealthy);
        console.debug(`Healthcheck passing OK.`);
        resolve(container);
      } catch (ex) {
        reject(ex);
      }
    });
  });

  const containerData = await docker
    .getContainer((await container).id)
    .inspect();

  const migrationSource = await createMigrationSource();

  return {
    config: {
      client: "pg",
      connection: {
        host: containerData.NetworkSettings.Networks[network || "bridge"]
          .IPAddress,
        user: postgresUser,
        password: postgresPassword,
        database: postgresDB,
        port: 5432,
        ssl: false,
      },
      migrations: {
        migrationSource: migrationSource,
      },
    } as Knex.Config,
    container: await container,
  };
}

export async function setupDBTable(config: Knex.Config): Promise<void> {
  const knexInstanceClient = knex(config);
  try {
    await knexInstanceClient.migrate.latest();
  } finally {
    // Properly release connections to avoid pool exhaustion
    await knexInstanceClient.destroy();
  }
}

/**
 * Creates an enhanced Knex configuration with optimized pool and timeout settings
 * to prevent connection pool exhaustion and handle concurrent database operations.
 *
 * @deprecated Use createEnhancedKnexConfig or createEnhancedPgConfig from db-config instead
 * @param config - Base Knex configuration
 * @returns Enhanced Knex configuration with timeout settings
 */
export { createEnhancedKnexConfig as createEnhancedTimeoutConfig } from "../../main/typescript/database/db-config";

export interface IContractJson {
  abi: any;
  bytecode: {
    object: string;
  };
}

export function startDockerComposeService(
  composeFilePath: string,
  serviceName: string,
) {
  if (!fs.existsSync(composeFilePath)) {
    throw new Error(`Compose file does not exist at ${composeFilePath}`);
  }
  execSync(`docker compose -f ${composeFilePath} up -d ${serviceName}`, {
    stdio: "inherit",
  });
}

export function stopDockerComposeService(
  composeFilePath: string,
  serviceName: string,
) {
  if (!fs.existsSync(composeFilePath)) {
    throw new Error(`Compose file does not exist at ${composeFilePath}`);
  }
  execSync(`docker compose -f ${composeFilePath} stop ${serviceName}`, {
    stdio: "inherit",
  });
  execSync(`docker compose -f ${composeFilePath} rm -f ${serviceName}`, {
    stdio: "inherit",
  });
}
