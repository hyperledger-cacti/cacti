import { LogLevelDesc, Logger } from "@hyperledger-cacti/cactus-common";
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
import { Address, GatewayIdentity } from "../../main/typescript/core/types";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../main/typescript/core/constants";
import { BesuTestEnvironment } from "./environments/besu-test-environment";
import { EthereumTestEnvironment } from "./environments/ethereum-test-environment";
import { FabricTestEnvironment } from "./environments/fabric-test-environment";
import knex, { Knex } from "knex";
import net from "net";
import Docker, { Container, ContainerInfo } from "dockerode";
import { Containers } from "@hyperledger-cacti/cactus-test-tooling/dist/lib/main/typescript/common/containers";
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

/**
 * Safely stops and removes a Docker container, logging but not throwing
 * on errors. Use this in afterAll blocks so one container's failure
 * doesn't prevent cleanup of the rest.
 */
export async function safeStopAndRemoveContainer(
  container: Container | undefined,
  label: string,
  log?: { warn: (msg: string, ...args: unknown[]) => void },
): Promise<void> {
  if (!container) return;
  try {
    await container.stop();
  } catch (err) {
    const msg = `safeStopAndRemoveContainer(${label}): stop failed`;
    if (log) log.warn(msg, err);
    else console.warn(msg, err);
  }
  try {
    await container.remove();
  } catch (err) {
    const msg = `safeStopAndRemoveContainer(${label}): remove failed`;
    if (log) log.warn(msg, err);
    else console.warn(msg, err);
  }
}

/** A single cleanup action: a label for logging and an async function. */
export interface CleanupTask {
  label: string;
  fn: () => Promise<unknown>;
}

/**
 * Runs every cleanup task in order, catching and collecting errors so that
 * one failure never prevents the remaining tasks from executing.
 * Returns the list of errors (empty on full success).
 *
 * Usage in afterAll:
 * ```ts
 * const errors = await runCleanup(log, [
 *   ...cleanupContainers({ db_local, db_remote }),
 *   ...cleanupEnvs({ besuEnv, ethereumEnv, fabricEnv }),
 * ]);
 * ```
 */
export async function runCleanup(
  log: { warn: (msg: string, ...args: unknown[]) => void },
  tasks: CleanupTask[],
): Promise<unknown[]> {
  const errors: unknown[] = [];
  for (const { label, fn } of tasks) {
    try {
      await fn();
    } catch (err) {
      errors.push(err);
      log.warn(`cleanup(${label}) failed`, err);
    }
  }
  if (errors.length > 0) {
    log.warn(`afterAll encountered ${errors.length} cleanup error(s)`);
  }
  return errors;
}

/**
 * Build cleanup tasks for Docker containers (stop + remove each).
 * Pass a record of `{ label: container | undefined }`.
 */
export function cleanupContainers(
  containers: Record<string, Container | undefined>,
): CleanupTask[] {
  const tasks: CleanupTask[] = [];
  for (const [label, c] of Object.entries(containers)) {
    if (!c) continue;
    tasks.push({ label: `${label}.stop`, fn: () => c.stop() });
    tasks.push({ label: `${label}.remove`, fn: () => c.remove() });
  }
  return tasks;
}

/**
 * Build cleanup tasks for test environments (tearDown each).
 * Pass a record of `{ label: env | undefined }`.
 */
export function cleanupEnvs(
  envs: Record<string, { tearDown: () => Promise<void> } | undefined>,
): CleanupTask[] {
  const tasks: CleanupTask[] = [];
  for (const [label, env] of Object.entries(envs)) {
    if (!env) continue;
    tasks.push({ label: `${label}.tearDown`, fn: () => env.tearDown() });
  }
  return tasks;
}

/**
 * Build cleanup tasks for gateway runner instances (stop + destroy each).
 * Pass a record of `{ label: runner | undefined }`.
 */
export function cleanupGatewayRunners(
  runners: Record<
    string,
    | { stop: () => Promise<unknown>; destroy: () => Promise<unknown> }
    | undefined
  >,
): CleanupTask[] {
  const tasks: CleanupTask[] = [];
  for (const [label, r] of Object.entries(runners)) {
    if (!r) continue;
    tasks.push({ label: `${label}.stop`, fn: () => r.stop() });
    tasks.push({ label: `${label}.destroy`, fn: () => r.destroy() });
  }
  return tasks;
}

/**
 * Build cleanup tasks for SATPGateway instances (shutdown each).
 * Pass a record of `{ label: gateway | undefined }`.
 */
export function cleanupGateways(
  gateways: Record<string, { shutdown: () => Promise<unknown> } | undefined>,
): CleanupTask[] {
  const tasks: CleanupTask[] = [];
  for (const [label, gw] of Object.entries(gateways)) {
    if (!gw) continue;
    tasks.push({ label: `${label}.shutdown`, fn: () => gw.shutdown() });
  }
  return tasks;
}

/**
 * Build cleanup tasks for Knex client instances (destroy each).
 * Pass a record of `{ label: client | undefined }`.
 */
export function cleanupKnexClients(
  clients: Record<string, { destroy: () => Promise<unknown> } | undefined>,
): CleanupTask[] {
  const tasks: CleanupTask[] = [];
  for (const [label, c] of Object.entries(clients)) {
    if (!c) continue;
    tasks.push({ label: `${label}.destroy`, fn: () => c.destroy() });
  }
  return tasks;
}

export const CI_TEST_TIMEOUT = 900000;
const testFilesDirectory = `${__dirname}/../../../cache/`;

/**
 * Lower bound (inclusive) of the "safe" port range we return from
 * `getFreePort` / `getFreePorts`. We exclude the well-known/privileged
 * range (0-1023) so the returned port can be bound by an unprivileged
 * process without `CAP_NET_BIND_SERVICE`.
 */
export const SAFE_PORT_MIN = 1024;

/**
 * Upper bound (inclusive) of valid TCP ports.
 */
export const SAFE_PORT_MAX = 65535;

/**
 * Returns true if `port` is a finite integer inside the unprivileged TCP
 * port range `[SAFE_PORT_MIN, SAFE_PORT_MAX]`.
 */
export function isSafePort(port: number): boolean {
  return (
    Number.isInteger(port) && port >= SAFE_PORT_MIN && port <= SAFE_PORT_MAX
  );
}

/**
 * Maximum number of attempts to probe the OS for a port inside the safe
 * range before giving up. In practice the OS ephemeral range is well above
 * 1024 on every supported platform, so a single attempt nearly always
 * suffices.
 */
const SAFE_PORT_MAX_ATTEMPTS = 16;

/**
 * Probe the OS once for a port assignment by binding a temporary server
 * on port 0. Resolves with the assigned port (which may or may not be in
 * the safe range) and the underlying server, which the caller is expected
 * to close.
 */
function probePort(): Promise<{ port: number; server: net.Server }> {
  return new Promise<{ port: number; server: net.Server }>(
    (resolve, reject) => {
      const srv = net.createServer();
      srv.unref();
      srv.on("error", reject);
      srv.listen(0, "127.0.0.1", () => {
        const addr = srv.address();
        if (!addr || typeof addr === "string") {
          srv.close(() => reject(new Error("probePort: no AddressInfo")));
          return;
        }
        resolve({ port: addr.port, server: srv });
      });
    },
  );
}

function closeServer(server: net.Server): Promise<void> {
  return new Promise<void>((resolve) => server.close(() => resolve()));
}

/**
 * Ask the OS for a free TCP port by binding a temporary server on port 0,
 * reading the assigned port, and immediately closing the socket. The
 * returned number is then handed to the gateway / CLI / test fixture which
 * remains the sole owner of port selection — the gateway core itself does
 * NOT pick ports.
 *
 * The returned port is guaranteed to be inside the unprivileged range
 * `[SAFE_PORT_MIN, SAFE_PORT_MAX]`. On the unlikely event the OS hands
 * back a privileged port, the probe is retried up to
 * `SAFE_PORT_MAX_ATTEMPTS` times.
 *
 * There is an inherent race between `close()` and the consumer binding the
 * port, but it is vastly less likely to collide than hardcoded constants
 * like 3010/3011/4010 across parallel test files.
 */
export async function getFreePort(): Promise<number> {
  let lastUnsafe: number | undefined;
  for (let attempt = 0; attempt < SAFE_PORT_MAX_ATTEMPTS; attempt++) {
    const { port, server } = await probePort();
    await closeServer(server);
    if (isSafePort(port)) return port;
    lastUnsafe = port;
  }
  throw new Error(
    `getFreePort: could not obtain a safe port (>= ${SAFE_PORT_MIN}) ` +
      `after ${SAFE_PORT_MAX_ATTEMPTS} attempts; last port=${lastUnsafe}`,
  );
}

/**
 * Attempts to bind a temporary server on the given TCP port to confirm
 * that the port is currently free. Returns true if the bind succeeded
 * and was closed cleanly, false otherwise. Intended for tests that need
 * to assert that a port returned by `getFreePort` / `getFreePorts` is
 * actually usable.
 */
export async function isPortBindable(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.once("error", () => resolve(false));
    srv.listen(port, "127.0.0.1", () => {
      srv.close(() => resolve(true));
    });
  });
}

/**
 * Convenience wrapper that returns `count` distinct free ports. Used by
 * tests that need to bind several gateway sockets (server, client, OAPI)
 * without colliding with each other or with other parallel test files.
 *
 * Every returned port is guaranteed to be inside the unprivileged range
 * `[SAFE_PORT_MIN, SAFE_PORT_MAX]`. Probes that land on a privileged port
 * are discarded and retried up to `SAFE_PORT_MAX_ATTEMPTS` times per slot.
 */
export async function getFreePorts(count: number): Promise<number[]> {
  const ports: number[] = [];
  const seen = new Set<number>();
  // Open all probe sockets at once so the OS hands us distinct ports.
  const servers: net.Server[] = [];
  try {
    for (let i = 0; i < count; i++) {
      let chosen: number | undefined;
      let lastUnsafe: number | undefined;
      for (let attempt = 0; attempt < SAFE_PORT_MAX_ATTEMPTS; attempt++) {
        const { port: p, server } = await probePort();
        if (!isSafePort(p)) {
          lastUnsafe = p;
          await closeServer(server);
          continue;
        }
        if (seen.has(p)) {
          // Keep the socket open to force the OS to hand us a new port
          // on the next probe, then discard this duplicate.
          servers.push(server);
          continue;
        }
        servers.push(server);
        chosen = p;
        break;
      }
      if (chosen === undefined) {
        throw new Error(
          `getFreePorts: could not obtain a safe port (>= ${SAFE_PORT_MIN}) ` +
            `for slot ${i} after ${SAFE_PORT_MAX_ATTEMPTS} attempts; ` +
            `last unsafe port=${lastUnsafe}`,
        );
      }
      seen.add(chosen);
      ports.push(chosen);
    }
  } finally {
    await Promise.all(servers.map(closeServer));
  }
  return ports;
}

/**
 * Result of {@link makeGatewayIdentityWithFreePorts}: a fully-populated
 * `GatewayIdentity` plus the three ports that were assigned, exposed so
 * the calling test can assert them on the gateway instance after init.
 */
export interface GatewayIdentityWithFreePorts {
  identity: GatewayIdentity;
  serverPort: number;
  clientPort: number;
  oapiPort: number;
}

/**
 * Build a {@link GatewayIdentity} with three fresh OS-assigned ports for
 * the gateway server, client, and OAPI sockets. Port selection is the
 * caller's responsibility — never the gateway's — so each integration
 * test picks its own free ports up front rather than relying on hardcoded
 * defaults that collide across parallel suites and leak across describe
 * blocks on EVM-revert failures.
 *
 * Optional overrides allow individual tests to customize identity fields
 * (e.g. `id`, `name`, `address`) while still receiving safe ports.
 */
export async function makeGatewayIdentityWithFreePorts(
  overrides: Partial<GatewayIdentity> = {},
): Promise<GatewayIdentityWithFreePorts> {
  const [serverPort, clientPort, oapiPort] = await getFreePorts(3);
  const identity = {
    id: "mockID",
    name: "CustomGateway",
    version: [
      {
        Core: SATP_CORE_VERSION,
        Architecture: SATP_ARCHITECTURE_VERSION,
        Crash: SATP_CRASH_VERSION,
      },
    ],
    proofID: "mockProofID10",
    address: "http://localhost" as Address,
    gatewayServerPort: serverPort,
    gatewayClientPort: clientPort,
    gatewayOapiPort: oapiPort,
    ...overrides,
  } as GatewayIdentity;
  return { identity, serverPort, clientPort, oapiPort };
}

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

  // Log the absolute path for debugging Docker mount issues
  const absoluteConfigDir = path.resolve(configDir);
  console.log(
    `[setupGatewayDockerFiles] Config directory (absolute): ${absoluteConfigDir}`,
  );
  console.log(`[setupGatewayDockerFiles] Config file path: ${configFilePath}`);
  console.log(
    `[setupGatewayDockerFiles] Config file exists: ${fs.existsSync(configFilePath)}`,
  );
  // List the contents to verify
  console.log(
    `[setupGatewayDockerFiles] Config dir contents: ${JSON.stringify(fs.readdirSync(absoluteConfigDir))}`,
  );

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
    configPath: path.resolve(configDir),
    logsPath: path.resolve(logDir),
    ontologiesPath: path.resolve(ontologiesDir),
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

export interface PGDatabaseResult {
  /** Config using localhost:<mapped_host_port> — use from Jest process */
  hostConfig: Knex.Config;
  /** Config using <internal_ip>:5432 — use for inter-container comms */
  networkConfig: Knex.Config;
  container: Container;
  /** @deprecated Use hostConfig for host-side or networkConfig for containers */
  config: Knex.Config;
}

/**
 * Polls a TCP socket until a connection to PostgreSQL succeeds from the host,
 * confirming that Docker's port mapping is actually reachable — not just that
 * pg_isready passed inside the container.
 */
async function waitForPgHostConnectivity(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise<boolean>((resolve) => {
      const sock = net.createConnection({ host, port });
      sock.once("connect", () => {
        sock.destroy();
        resolve(true);
      });
      sock.once("error", () => resolve(false));
      sock.setTimeout(2000, () => {
        sock.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`PG not reachable at ${host}:${port} after ${timeoutMs}ms`);
}

export async function createPGDatabase(
  config: PGDatabaseConfig,
): Promise<PGDatabaseResult> {
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

  const dockerHostConfig: Docker.HostConfig = {
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
        HostConfig: dockerHostConfig,
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
        const PG_READY_TIMEOUT_MS = 180_000;
        let isHealthy = false;
        do {
          if (Date.now() >= startedAt + PG_READY_TIMEOUT_MS) {
            throw new Error(`${fnTag} timed out (${PG_READY_TIMEOUT_MS}ms)`);
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

  const resolvedContainer = await container;
  const containerData = await docker
    .getContainer(resolvedContainer.id)
    .inspect();

  const internalIp =
    containerData.NetworkSettings.Networks[network || "bridge"].IPAddress;
  const pgPortBindings = containerData.NetworkSettings.Ports["5432/tcp"];
  const mappedHostPort = parseInt(pgPortBindings[0].HostPort, 10);

  // Verify actual host-to-PG TCP connectivity before returning
  await waitForPgHostConnectivity("127.0.0.1", mappedHostPort, 30_000);

  const migrationSource = await createMigrationSource();

  const hostConfig: Knex.Config = {
    client: "pg",
    connection: {
      host: "127.0.0.1",
      port: mappedHostPort,
      user: postgresUser,
      password: postgresPassword,
      database: postgresDB,
      ssl: false,
    },
    migrations: {
      migrationSource: migrationSource,
    },
  };

  const networkConfig: Knex.Config = {
    client: "pg",
    connection: {
      host: internalIp,
      port: 5432,
      user: postgresUser,
      password: postgresPassword,
      database: postgresDB,
      ssl: false,
    },
    migrations: {
      migrationSource: migrationSource,
    },
  };

  return {
    hostConfig,
    networkConfig,
    config: hostConfig,
    container: resolvedContainer,
  };
}

export async function setupDBTable(config: Knex.Config): Promise<void> {
  const maxRetries = 3;
  const retryDelayMs = 3000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const knexInstanceClient = knex(config);
    try {
      await knexInstanceClient.migrate.latest();
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(
        `setupDBTable attempt ${attempt}/${maxRetries} failed, retrying...`,
        (err as Error).message,
      );
      await new Promise((r) => setTimeout(r, retryDelayMs));
    } finally {
      await knexInstanceClient.destroy();
    }
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
