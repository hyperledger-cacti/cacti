import { createHmac, randomUUID } from "crypto";
import os from "os";
import path from "path";

import {
  Bools,
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
  safeStringifyException,
} from "@hyperledger-cacti/cactus-common";
import axios from "axios";
import compareVersions from "compare-versions";
import Docker, { Container, ContainerInspectInfo } from "dockerode";
import execa from "execa";
import fs from "fs-extra";
import yaml from "js-yaml";
import { RuntimeError } from "run-time-error-cjs";

import { ITestLedger } from "../i-test-ledger";

// Official Canton LocalNet 0.8.1 release commit:
// https://github.com/digital-asset/decentralized-canton-sync/commit/fb3c8c8a9259e98cdeb1cffc0cc77eaa7cc69e52
export const CANTON_LOCALNET_VERSION = "0.8.1";
export const CANTON_LOCALNET_SOURCE_REVISION =
  "fb3c8c8a9259e98cdeb1cffc0cc77eaa7cc69e52";

export const CANTON_LOCALNET_APP_PROVIDER_PORTS = Object.freeze({
  adminApi: 3902,
  jsonLedgerApi: 3975,
  ledgerApi: 3901,
});

const CANTON_LOCALNET_ASSET_PATHS = Object.freeze([
  "compose.env",
  "compose.yaml",
  "conf/canton/app-provider/app-auth.conf",
  "conf/canton/app-provider/app.conf",
  "conf/canton/app-user/app-auth.conf",
  "conf/canton/app-user/app.conf",
  "conf/canton/app.conf",
  "conf/canton/sv/app-auth.conf",
  "conf/canton/sv/app.conf",
  "conf/console/app-provider/app-auth.conf",
  "conf/console/app-provider/app.conf",
  "conf/console/app-synchronizer.sc",
  "conf/console/app-user/app-auth.conf",
  "conf/console/app-user/app.conf",
  "conf/console/app.conf",
  "conf/console/sv/app-auth.conf",
  "conf/console/sv/app.conf",
  "conf/nginx/app-provider.conf",
  "conf/nginx/app-user.conf",
  "conf/nginx/nginx.conf",
  "conf/nginx/sv.conf",
  "conf/nginx/swagger-ui/cors-headers.conf",
  "conf/nginx/swagger-ui/cors-options-headers.conf",
  "conf/splice/app-provider/app-auth.conf",
  "conf/splice/app-provider/app.conf",
  "conf/splice/app-user/app-auth.conf",
  "conf/splice/app-user/app.conf",
  "conf/splice/app.conf",
  "conf/splice/sv/app-auth.conf",
  "conf/splice/sv/app.conf",
  "docker/canton/health-check.sh",
  "docker/console/Dockerfile",
  "docker/console/entrypoint.sh",
  "docker/postgres/postgres-entrypoint.sh",
  "docker/splice/health-check.sh",
  "env/alpha-protocol-version.env",
  "env/app-provider-auth-on.env",
  "env/app-user-auth-on.env",
  "env/common.env",
  "env/postgres.env",
  "env/splice.env",
  "env/sv-auth-on.env",
  "resource-constraints.yaml",
]);

const EXECUTABLE_LOCALNET_ASSETS = new Set([
  "docker/canton/health-check.sh",
  "docker/console/entrypoint.sh",
  "docker/postgres/postgres-entrypoint.sh",
  "docker/splice/health-check.sh",
]);

const MINIMUM_DOCKER_COMPOSE_VERSION = "2.20.2";
const SOURCE_MARKER_FILE = ".cacti-canton-localnet-source";
// Per-instance Compose file generated from the pinned upstream compose.yaml.
const GENERATED_COMPOSE_FILE = "compose.cacti.yaml";

export interface ICantonTestLedgerOptions {
  readonly cacheDirectory?: string;
  readonly emitContainerLogs?: boolean;
  readonly logLevel?: LogLevelDesc;
  readonly startTimeoutMs?: number;
}

export interface ICantonTestLedgerConnectionInfo {
  readonly adminApiAddress: string;
  readonly jsonLedgerApiHost: string;
  readonly ledgerApiAddress: string;
  readonly ledgerApiAuthToken: string;
}

interface IComposeDocument {
  services?: Record<string, Record<string, unknown>>;
}

type LifecycleState = "idle" | "starting" | "running" | "stopped";

const DEFAULTS = Object.freeze({
  cacheDirectory: path.join(
    os.tmpdir(),
    "hyperledger-cacti",
    "canton-localnet",
  ),
  emitContainerLogs: false,
  logLevel: "INFO" as LogLevelDesc,
  startTimeoutMs: 15 * 60 * 1000,
});

const DOCKER_ENVIRONMENT_VARIABLES = Object.freeze([
  "DOCKER_CONFIG",
  "DOCKER_CONTEXT",
  "DOCKER_HOST",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
  "HOME",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "PATH",
  "PATHEXT",
  "SSH_AUTH_SOCK",
  "SystemRoot",
  "TEMP",
  "TMP",
  "TMPDIR",
  "USERPROFILE",
  "XDG_CONFIG_HOME",
  "http_proxy",
  "https_proxy",
  "no_proxy",
]);

const APP_PROVIDER_AUDIENCE = "https://canton.network.global";
const APP_PROVIDER_LEDGER_API_USER = "ledger-api-user";
const APP_PROVIDER_UNSAFE_JWT_SECRET = "unsafe";

export const CANTON_TEST_LEDGER_DEFAULT_OPTIONS = DEFAULTS;

/**
 * Starts a pinned Canton LocalNet deployment for integration tests.
 *
 * LocalNet is a Docker Compose application rather than a single image. Each
 * instance therefore receives an isolated Compose project, network, volumes,
 * temporary configuration directory, and dynamically assigned host ports.
 */
export class CantonTestLedger implements ITestLedger {
  public static readonly CLASS_NAME = "CantonTestLedger";

  private static readonly assetPreparations = new Map<
    string,
    Promise<string>
  >();

  private readonly cacheDirectory: string;
  private readonly emitContainerLogs: boolean;
  private readonly log: Logger;
  private readonly projectName: string;
  private readonly startTimeoutMs: number;

  private composeDirectory?: string;
  private container?: Container;
  private lifecycleQueue: Promise<void> = Promise.resolve();
  private ownsComposeProject = false;
  private state: LifecycleState = "idle";

  public constructor(options: ICantonTestLedgerOptions = {}) {
    const fnTag = `${CantonTestLedger.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} options`);

    if (
      options.cacheDirectory !== undefined &&
      options.cacheDirectory.trim().length === 0
    ) {
      throw new TypeError(`${fnTag} cacheDirectory cannot be blank.`);
    }

    this.startTimeoutMs = options.startTimeoutMs ?? DEFAULTS.startTimeoutMs;
    if (!Number.isSafeInteger(this.startTimeoutMs) || this.startTimeoutMs < 1) {
      throw new TypeError(
        `${fnTag} startTimeoutMs must be a positive safe integer.`,
      );
    }

    this.cacheDirectory = path.resolve(
      options.cacheDirectory ?? DEFAULTS.cacheDirectory,
    );
    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : DEFAULTS.emitContainerLogs;
    this.log = LoggerProvider.getOrCreate({
      label: CantonTestLedger.CLASS_NAME,
      level: options.logLevel ?? DEFAULTS.logLevel,
    });
    this.projectName = `cacti-canton-${randomUUID()}`;
  }

  public get className(): string {
    return CantonTestLedger.CLASS_NAME;
  }

  public getContainer(): Container {
    if (!this.container) {
      throw new Error(
        `${this.className}#getContainer() LocalNet has not been started.`,
      );
    }
    return this.container;
  }

  public getProjectName(): string {
    return this.projectName;
  }

  public async getConnectionInfo(): Promise<ICantonTestLedgerConnectionInfo> {
    if (this.state !== "running") {
      throw new Error(
        `${this.className} is not running; connection details are unavailable.`,
      );
    }
    const inspectInfo = await this.getContainer().inspect();
    const adminApiPort = this.getHostPort(
      inspectInfo,
      CANTON_LOCALNET_APP_PROVIDER_PORTS.adminApi,
    );
    const jsonLedgerApiPort = this.getHostPort(
      inspectInfo,
      CANTON_LOCALNET_APP_PROVIDER_PORTS.jsonLedgerApi,
    );
    const ledgerApiPort = this.getHostPort(
      inspectInfo,
      CANTON_LOCALNET_APP_PROVIDER_PORTS.ledgerApi,
    );
    return {
      adminApiAddress: `127.0.0.1:${adminApiPort}`,
      jsonLedgerApiHost: `http://127.0.0.1:${jsonLedgerApiPort}`,
      ledgerApiAddress: `127.0.0.1:${ledgerApiPort}`,
      ledgerApiAuthToken: this.createLedgerApiAuthToken(),
    };
  }

  public start(): Promise<Container> {
    return this.enqueueLifecycleOperation(() => this.startInternal());
  }

  public stop(): Promise<void> {
    return this.enqueueLifecycleOperation(() => this.stopInternal());
  }

  public destroy(): Promise<void> {
    return this.enqueueLifecycleOperation(() => this.destroyInternal());
  }

  protected createDockerClient(): Docker {
    return new Docker();
  }

  protected async downloadAsset(relativePath: string): Promise<Buffer> {
    const baseUrl =
      "https://raw.githubusercontent.com/digital-asset/" +
      "decentralized-canton-sync";
    const url =
      `${baseUrl}/${CANTON_LOCALNET_SOURCE_REVISION}/` +
      `cluster/compose/localnet/${relativePath}`;
    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await axios.get<ArrayBuffer>(url, {
          maxContentLength: 1024 * 1024,
          responseType: "arraybuffer",
          timeout: 60_000,
        });
        return Buffer.from(response.data);
      } catch (ex) {
        if (attempt >= 3) {
          throw ex;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  protected async execDocker(
    args: readonly string[],
    timeoutMs?: number,
  ): Promise<string> {
    const result = await execa("docker", [...args], {
      all: true,
      cwd: this.composeDirectory,
      env: this.getDockerEnvironment(),
      extendEnv: false,
      ...(timeoutMs === undefined ? {} : { timeout: timeoutMs }),
    });
    if (result.all) {
      this.log.debug(result.all);
    }
    return result.stdout.trim();
  }

  protected getDockerEnvironment(): NodeJS.ProcessEnv {
    const environment: NodeJS.ProcessEnv = {};
    for (const variable of DOCKER_ENVIRONMENT_VARIABLES) {
      if (process.env[variable] !== undefined) {
        environment[variable] = process.env[variable];
      }
    }
    if (this.composeDirectory) {
      Object.assign(environment, {
        APP_PROVIDER_PROFILE: "on",
        // The test ledger exposes the app-provider participant. LocalNet still
        // needs the SV to host its synchronizer, but starting the unrelated
        // app-user participant and validator needlessly increases CI load.
        APP_USER_PROFILE: "off",
        DOCKER_NETWORK: `${this.projectName}-network`,
        IMAGE_TAG: CANTON_LOCALNET_VERSION,
        LOCALNET_DIR: this.composeDirectory,
        LOCALNET_ENV_DIR: path.join(this.composeDirectory, "env"),
        // Splice requires <alphanumeric organization>-<alphanumeric function>-<integer>.
        // Compose projects are already isolated, so this need not contain the UUID.
        PARTY_HINT: "cacti-test-1",
        SV_PROFILE: "on",
        TEST_PORT: "127.0.0.1::",
      });
    }
    return environment;
  }

  protected waitForHealthPollInterval(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 5_000));
  }

  private enqueueLifecycleOperation<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    const result = this.lifecycleQueue.then(operation, operation);
    this.lifecycleQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async startInternal(): Promise<Container> {
    const fnTag = `${this.className}#start()`;
    if (this.composeDirectory) {
      await this.destroyInternal();
    }

    this.state = "starting";
    try {
      await this.assertDockerClientCompatibility();
      await this.assertDockerComposeVersion();
      const sourceDirectory = await this.resolveLocalNetSourceDirectory();
      this.composeDirectory =
        await this.createComposeWorkspace(sourceDirectory);

      await this.execDocker(
        [...this.getComposeArgs(), "config", "--quiet"],
        2 * 60 * 1000,
      );

      // From this point onward, Compose may have created resources even when
      // `up` ultimately fails, so failure cleanup must run `down`.
      this.ownsComposeProject = true;
      await this.execDocker(
        [
          ...this.getComposeArgs(),
          "up",
          "--detach",
          "postgres",
          "canton",
          "splice",
        ],
        this.startTimeoutMs + 30_000,
      );
      await this.waitForServicesHealthy(["postgres", "canton", "splice"]);

      const containerId = await this.execDocker(
        [...this.getComposeArgs(), "ps", "--quiet", "canton"],
        2 * 60 * 1000,
      );
      Checks.nonBlankString(containerId, `${fnTag} Canton container ID`);

      this.container = this.createDockerClient().getContainer(containerId);
      const inspectInfo = await this.container.inspect();
      if (!inspectInfo.State.Running) {
        throw new Error(`${fnTag} Canton container is not running.`);
      }

      if (this.emitContainerLogs) {
        const logs = await this.execDocker(
          [
            ...this.getComposeArgs(),
            "logs",
            "--no-color",
            "--tail",
            "200",
            "postgres",
            "canton",
            "splice",
          ],
          2 * 60 * 1000,
        );
        this.log.info(logs);
      }

      this.state = "running";
      return this.container;
    } catch (ex) {
      this.log.error(`${fnTag} failed: %s`, safeStringifyException(ex));
      await this.logStartupFailure();
      await this.cleanupAfterFailedStart();
      throw new RuntimeError(`${fnTag} failed.`, ex);
    }
  }

  private async stopInternal(): Promise<void> {
    if (!this.ownsComposeProject || !this.composeDirectory) {
      return;
    }
    await this.execDocker([...this.getComposeArgs(), "stop"], 2 * 60 * 1000);
    this.state = "stopped";
  }

  private async destroyInternal(): Promise<void> {
    const composeDirectory = this.composeDirectory;
    if (this.ownsComposeProject && composeDirectory) {
      // Preserve the project metadata if Compose fails so destroy() can be
      // retried without orphaning containers, networks, or volumes.
      await this.execDocker(
        [...this.getComposeArgs(), "down", "--volumes", "--remove-orphans"],
        2 * 60 * 1000,
      );
    }

    this.container = undefined;
    this.ownsComposeProject = false;
    this.state = "idle";
    if (composeDirectory) {
      await fs.remove(composeDirectory);
    }
    this.composeDirectory = undefined;
  }

  private async logStartupFailure(): Promise<void> {
    if (!this.ownsComposeProject || !this.composeDirectory) {
      return;
    }

    try {
      const spliceContainerId = await this.execDocker(
        [...this.getComposeArgs(), "ps", "--all", "--quiet", "splice"],
        2 * 60 * 1000,
      );
      if (spliceContainerId) {
        const state = await this.execDocker(
          ["inspect", "--format", "{{json .State}}", spliceContainerId],
          2 * 60 * 1000,
        );
        this.log.error("Canton LocalNet Splice state:\n%s", state);
      }
    } catch (inspectError) {
      this.log.warn(
        "Could not inspect Canton LocalNet Splice state: %s",
        safeStringifyException(inspectError),
      );
    }

    try {
      const spliceLogs = await this.execDocker(
        [
          ...this.getComposeArgs(),
          "logs",
          "--no-color",
          "--tail",
          "1000",
          "splice",
        ],
        2 * 60 * 1000,
      );
      if (spliceLogs) {
        this.log.error("Canton LocalNet Splice startup logs:\n%s", spliceLogs);
      }

      const dependencyLogs = await this.execDocker(
        [
          ...this.getComposeArgs(),
          "logs",
          "--no-color",
          "--tail",
          "100",
          "postgres",
          "canton",
        ],
        2 * 60 * 1000,
      );
      if (dependencyLogs) {
        this.log.error(
          "Canton LocalNet dependency startup logs:\n%s",
          dependencyLogs,
        );
      }
    } catch (logsError) {
      this.log.warn(
        "Could not collect Canton LocalNet startup logs: %s",
        safeStringifyException(logsError),
      );
    }
  }

  private async cleanupAfterFailedStart(): Promise<void> {
    try {
      await this.destroyInternal();
    } catch (cleanupError) {
      this.log.error(
        "Canton LocalNet cleanup failed: %s",
        safeStringifyException(cleanupError),
      );
    }
  }

  private async assertDockerClientCompatibility(): Promise<void> {
    const dockerContext = process.env.DOCKER_CONTEXT?.trim();
    const dockerHost = process.env.DOCKER_HOST?.trim();
    if (dockerContext && dockerContext !== "default") {
      throw new Error(
        `Docker context "${dockerContext}" is not supported because Docker ` +
          "Compose and Dockerode could target different daemons. Unset " +
          "DOCKER_CONTEXT and use DOCKER_HOST instead.",
      );
    }

    if (dockerContext && dockerHost) {
      throw new Error(
        "DOCKER_CONTEXT and DOCKER_HOST cannot be used together because " +
          "Docker Compose prioritizes the context while Dockerode uses the " +
          "host.",
      );
    }

    if (
      dockerHost &&
      !dockerHost.startsWith("unix://") &&
      !dockerHost.startsWith("npipe://")
    ) {
      throw new Error(
        `Remote DOCKER_HOST "${dockerHost}" is not supported because ` +
          "CantonTestLedger publishes connection details on 127.0.0.1. " +
          "Use a local unix:// or npipe:// Docker endpoint.",
      );
    }

    if (!dockerContext && !dockerHost) {
      const activeContext = await this.execDocker(["context", "show"], 30_000);
      if (activeContext !== "default") {
        throw new Error(
          `Docker context "${activeContext}" is not supported because ` +
            "Dockerode would inspect the default daemon. Select the default " +
            "context or configure DOCKER_HOST.",
        );
      }
    }
  }

  private async assertDockerComposeVersion(): Promise<void> {
    // Do not attach a timeout to the availability probe. Execa otherwise keeps
    // its timeout handle alive after an immediate ENOENT spawn failure.
    await this.execDocker(["--version"]);
    const versionOutput = await this.execDocker(
      ["compose", "version", "--short"],
      30_000,
    );
    const version = versionOutput.replace(/^v/, "").trim();
    if (!compareVersions.validate(version)) {
      throw new Error(`Could not parse Docker Compose version "${version}".`);
    }
    if (compareVersions.compare(version, MINIMUM_DOCKER_COMPOSE_VERSION, "<")) {
      throw new Error(
        `Docker Compose ${MINIMUM_DOCKER_COMPOSE_VERSION} or newer is ` +
          `required; found ${version}.`,
      );
    }
  }

  private async waitForServicesHealthy(
    serviceNames: readonly string[],
  ): Promise<void> {
    const containers = await Promise.all(
      serviceNames.map(async (serviceName) => {
        const containerId = await this.execDocker(
          [...this.getComposeArgs(), "ps", "--all", "--quiet", serviceName],
          2 * 60 * 1000,
        );
        Checks.nonBlankString(
          containerId,
          `${this.className} ${serviceName} container ID`,
        );
        return {
          container: this.createDockerClient().getContainer(containerId),
          serviceName,
        };
      }),
    );
    const deadline = Date.now() + this.startTimeoutMs;
    let statuses = "";

    while (Date.now() < deadline) {
      const inspections = await Promise.all(
        containers.map(({ container }) => container.inspect()),
      );
      statuses = inspections
        .map((inspection, index) => {
          const state = inspection.State;
          return (
            `${containers[index].serviceName}=` +
            `${state.Health?.Status ?? (state.Running ? "running" : "stopped")}`
          );
        })
        .join(", ");
      if (
        inspections.every(
          ({ State }) => State.Running && State.Health?.Status === "healthy",
        )
      ) {
        return;
      }
      await this.waitForHealthPollInterval();
    }

    throw new Error(
      `${this.className} services did not become healthy within ` +
        `${this.startTimeoutMs}ms (${statuses}).`,
    );
  }

  private getComposeArgs(): string[] {
    Checks.nonBlankString(
      this.composeDirectory,
      `${this.className} Compose directory`,
    );
    const composeDirectory = this.composeDirectory as string;
    return [
      "compose",
      "--ansi",
      "never",
      "--project-name",
      this.projectName,
      "--env-file",
      path.join(composeDirectory, "compose.env"),
      "--env-file",
      path.join(composeDirectory, "env", "common.env"),
      "--file",
      path.join(composeDirectory, GENERATED_COMPOSE_FILE),
      "--file",
      path.join(composeDirectory, "resource-constraints.yaml"),
      "--profile",
      "sv",
      "--profile",
      "app-provider",
    ];
  }

  private async resolveLocalNetSourceDirectory(): Promise<string> {
    const targetDirectory = path.join(
      this.cacheDirectory,
      String(process.pid),
      CANTON_LOCALNET_SOURCE_REVISION,
    );
    const existingPreparation =
      CantonTestLedger.assetPreparations.get(targetDirectory);
    if (existingPreparation) {
      return await existingPreparation;
    }

    const preparation = this.prepareCachedLocalNetAssets(targetDirectory);
    CantonTestLedger.assetPreparations.set(targetDirectory, preparation);
    try {
      return await preparation;
    } finally {
      if (
        CantonTestLedger.assetPreparations.get(targetDirectory) === preparation
      ) {
        CantonTestLedger.assetPreparations.delete(targetDirectory);
      }
    }
  }

  private async prepareCachedLocalNetAssets(
    targetDirectory: string,
  ): Promise<string> {
    const expectedMarker =
      `${CANTON_LOCALNET_VERSION}\n` + `${CANTON_LOCALNET_SOURCE_REVISION}\n`;
    const markerPath = path.join(targetDirectory, SOURCE_MARKER_FILE);
    const cachedMarker = await fs
      .readFile(markerPath, "utf8")
      .catch(() => undefined);
    if (cachedMarker === expectedMarker) {
      try {
        await this.assertLocalNetDirectory(targetDirectory);
        return targetDirectory;
      } catch (cacheError) {
        this.log.warn(
          "Replacing an incomplete Canton LocalNet cache: %s",
          safeStringifyException(cacheError),
        );
      }
    }

    await fs.ensureDir(path.dirname(targetDirectory));
    await fs.remove(targetDirectory);
    const temporaryDirectory = await fs.mkdtemp(
      path.join(
        path.dirname(targetDirectory),
        `${CANTON_LOCALNET_SOURCE_REVISION}.partial-`,
      ),
    );
    try {
      for (
        let offset = 0;
        offset < CANTON_LOCALNET_ASSET_PATHS.length;
        offset += 6
      ) {
        const batch = CANTON_LOCALNET_ASSET_PATHS.slice(offset, offset + 6);
        await Promise.all(
          batch.map(async (relativePath) => {
            const contents = await this.downloadAsset(relativePath);
            const destination = path.join(temporaryDirectory, relativePath);
            await fs.outputFile(destination, contents, {
              mode: EXECUTABLE_LOCALNET_ASSETS.has(relativePath)
                ? 0o755
                : 0o644,
            });
          }),
        );
      }
      await fs.writeFile(
        path.join(temporaryDirectory, SOURCE_MARKER_FILE),
        expectedMarker,
        "utf8",
      );
      await this.assertLocalNetDirectory(temporaryDirectory);

      try {
        await fs.move(temporaryDirectory, targetDirectory, {
          overwrite: false,
        });
      } catch (ex) {
        const competingMarker = await fs
          .readFile(markerPath, "utf8")
          .catch(() => undefined);
        if (competingMarker !== expectedMarker) {
          throw ex;
        }
      }
      await this.assertLocalNetDirectory(targetDirectory);
      return targetDirectory;
    } finally {
      await fs.remove(temporaryDirectory);
    }
  }

  private async assertLocalNetDirectory(directory: string): Promise<void> {
    const stats = await fs.stat(directory).catch(() => undefined);
    if (!stats?.isDirectory()) {
      throw new Error(`Canton LocalNet directory not found: ${directory}`);
    }
    await Promise.all(
      CANTON_LOCALNET_ASSET_PATHS.map(async (relativePath) => {
        const assetPath = path.join(directory, relativePath);
        const assetStats = await fs.stat(assetPath).catch(() => undefined);
        if (!assetStats?.isFile()) {
          throw new Error(`Canton LocalNet asset not found: ${assetPath}`);
        }
      }),
    );
  }

  private async createComposeWorkspace(
    sourceDirectory: string,
  ): Promise<string> {
    const workspaceRoot = path.join(
      os.tmpdir(),
      "hyperledger-cacti",
      "canton-localnet-workspaces",
    );
    await fs.ensureDir(workspaceRoot);
    const workspace = await fs.mkdtemp(
      path.join(workspaceRoot, `${this.projectName}-`),
    );
    try {
      await fs.copy(sourceDirectory, workspace, {
        errorOnExist: true,
        overwrite: false,
      });
      await this.writeCactiComposeFile(workspace);
      return workspace;
    } catch (ex) {
      await fs.remove(workspace);
      throw ex;
    }
  }

  private async writeCactiComposeFile(workspace: string): Promise<void> {
    const sourcePath = path.join(workspace, "compose.yaml");
    const source = await fs.readFile(sourcePath, "utf8");
    const document = yaml.load(source) as IComposeDocument | undefined;
    if (!document?.services || typeof document.services !== "object") {
      throw new Error(`Invalid Canton LocalNet Compose file: ${sourcePath}`);
    }

    for (const service of Object.values(document.services)) {
      delete service.container_name;
    }
    // The upstream images default stdout to DEBUG. Bounding their log volume
    // prevents I/O contention during the resource-intensive LocalNet startup.
    for (const serviceName of ["canton", "splice"]) {
      const service = document.services[serviceName];
      if (!service) {
        throw new Error(
          `Canton LocalNet Compose service not found: ${serviceName}`,
        );
      }
      const environment = service.environment;
      if (Array.isArray(environment)) {
        environment.push("LOG_LEVEL_STDOUT=INFO");
      } else if (environment && typeof environment === "object") {
        Object.assign(environment, { LOG_LEVEL_STDOUT: "INFO" });
      } else {
        service.environment = { LOG_LEVEL_STDOUT: "INFO" };
      }
    }
    await fs.writeFile(
      path.join(workspace, GENERATED_COMPOSE_FILE),
      yaml.dump(document, { lineWidth: 120, noRefs: false }),
      "utf8",
    );
  }

  private createLedgerApiAuthToken(): string {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: object): string =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const header = encode({ alg: "HS256", typ: "JWT" });
    const payload = encode({
      aud: APP_PROVIDER_AUDIENCE,
      exp: now + 60 * 60,
      iat: now,
      sub: APP_PROVIDER_LEDGER_API_USER,
    });
    const unsignedToken = `${header}.${payload}`;
    const signature = createHmac("sha256", APP_PROVIDER_UNSAFE_JWT_SECRET)
      .update(unsignedToken)
      .digest("base64url");
    return `${unsignedToken}.${signature}`;
  }

  private getHostPort(
    inspectInfo: ContainerInspectInfo,
    internalPort: number,
  ): number {
    const bindings = inspectInfo.NetworkSettings.Ports[`${internalPort}/tcp`];
    if (bindings?.length !== 1) {
      throw new Error(
        `${this.className} port ${internalPort}/tcp must have exactly one ` +
          `published binding; found ${bindings?.length ?? 0}.`,
      );
    }
    const [binding] = bindings;
    if (!binding.HostPort) {
      throw new Error(
        `${this.className} port ${internalPort}/tcp is not published.`,
      );
    }
    if (binding.HostIp !== "127.0.0.1") {
      throw new Error(
        `${this.className} port ${internalPort}/tcp is exposed on ` +
          `${binding.HostIp || "all interfaces"}; expected IPv4 loopback only.`,
      );
    }
    const hostPort = Number(binding.HostPort);
    if (!Number.isSafeInteger(hostPort) || hostPort < 1 || hostPort > 65_535) {
      throw new Error(
        `${this.className} port ${internalPort}/tcp has invalid host port ` +
          `"${binding.HostPort}".`,
      );
    }
    return hostPort;
  }
}
