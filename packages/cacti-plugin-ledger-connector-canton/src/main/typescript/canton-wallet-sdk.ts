import { readFileSync } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

import type { Logger } from "@hyperledger-cacti/cactus-common";

import type { CantonCommand } from "./generated/openapi/typescript-axios";
import { importEsmModule } from "./import-esm-module";

/** OAuth client credentials used by the Wallet SDK token providers. */
export interface ICantonClientCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly scope: string | undefined;
  readonly audience: string | undefined;
}

/**
 * Ledger API authentication, mirroring the Wallet SDK's TokenProviderConfig.
 * It is declared here so that this package's type declarations do not depend
 * on importing ESM-only types from the SDK.
 */
export type CantonAuthConfig =
  | { readonly method: "static"; readonly token: string }
  | {
      readonly method: "self_signed";
      readonly issuer: string;
      readonly credentials: ICantonClientCredentials;
      readonly keyId?: string;
    }
  | {
      readonly method: "client_credentials";
      readonly configUrl: string;
      readonly credentials: ICantonClientCredentials;
    };

export interface ICantonSubmitRequest {
  actAs: string[];
  commands: CantonCommand[];
  commandId: string;
  readAs?: string[];
  synchronizerId?: string;
}

export interface ICantonActiveContractsRequest {
  parties: string[];
  filterByParty: true;
  templateIds?: string[];
  interfaceIds?: string[];
  offset: number;
  limit: number;
}

/** A Canton created event, as returned by the JSON Ledger API. */
export interface ICantonCreatedEvent {
  readonly contractId: string;
  readonly templateId: string;
  readonly createArgument: unknown;
  readonly witnessParties: readonly string[];
  readonly signatories: readonly string[];
  readonly observers?: readonly string[];
  readonly createdAt: string;
  readonly interfaceViews?: ReadonlyArray<{
    readonly interfaceId: string;
    readonly viewStatus: { readonly code: number; readonly message: string };
    readonly viewValue?: unknown;
  }>;
}

/** One entry of a JSON Ledger API active-contract response. */
export interface ICantonActiveContractEntry {
  readonly contractEntry?: {
    readonly JsActiveContract?: {
      readonly createdEvent: ICantonCreatedEvent;
      readonly synchronizerId: string;
    };
  };
}

export interface ICantonWalletSdk {
  readonly ledger: {
    ledgerEnd(): Promise<number>;
    readonly internal: {
      submit(request: ICantonSubmitRequest): Promise<{
        updateId: string;
        completionOffset: number;
      }>;
    };
    readonly acsReader: {
      /**
       * The uncached reader: one Ledger API active-contract request per call,
       * with `limit` forwarded to the ledger. The cached top-level reader is
       * deliberately not used. It keeps one snapshot per party/template pair
       * (fanning out requests and duplicating results), reuses snapshots
       * across different limits, and calls Set.prototype.union(), which
       * Node.js 20 does not provide.
       */
      readonly raw: {
        read(
          request: ICantonActiveContractsRequest,
        ): Promise<ICantonActiveContractEntry[]>;
      };
    };
  };
  readonly party: {
    list(): Promise<string[]>;
  };
}

export interface ICantonWalletSdkFactoryCreateOptions {
  auth: CantonAuthConfig;
  /** An absolute, already validated JSON Ledger API URL. */
  ledgerClientUrl: string;
}

export interface ICantonWalletSdkFactory {
  create(
    options: ICantonWalletSdkFactoryCreateOptions,
  ): Promise<ICantonWalletSdk>;
}

type CantonSdkLogLevel = "debug" | "error" | "info" | "trace" | "warn";

const SANITIZED_LOG_MESSAGE = "Canton Wallet SDK emitted a log entry.";

/** The subset of the pino logger interface used by Canton SDK internals. */
interface ICantonInternalLogger {
  trace(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  fatal(...args: unknown[]): void;
  child(bindings: Record<string, unknown>): ICantonInternalLogger;
}

interface ICantonAccessTokenProvider {
  getAccessToken(): Promise<string>;
  getAuthContext(): Promise<{ userId?: string }>;
}

interface ICantonLedgerClient {
  getWithRetry(
    resource: string,
    retryOptions: undefined,
    params: Record<string, unknown>,
  ): Promise<unknown>;
  postWithRetry(
    resource: string,
    body: unknown,
    retryOptions: undefined,
    params: Record<string, unknown>,
    additionalOptions: Record<string, unknown>,
  ): Promise<unknown>;
  patchWithRetry(
    resource: string,
    body: unknown,
    retryOptions: undefined,
    params: Record<string, unknown>,
  ): Promise<unknown>;
}

interface ICantonLedgerApiRequest {
  readonly method: string;
  readonly params?: {
    readonly requestMethod: string;
    readonly resource: string;
    readonly path?: unknown;
    readonly query?: unknown;
    readonly body?: unknown;
    readonly headers?: Record<string, string>;
  };
}

export interface ICantonWalletSdkModules {
  readonly SDK: {
    create(options: {
      ledgerProvider: unknown;
      logAdapter: unknown;
    }): Promise<unknown>;
  };
  readonly CustomLogAdapter: new (
    logFunction: (
      level: CantonSdkLogLevel,
      context: Record<string, unknown>,
      message?: string,
    ) => void,
  ) => unknown;
  readonly LedgerClient: new (options: {
    baseUrl: URL;
    logger: ICantonInternalLogger;
    accessTokenProvider: ICantonAccessTokenProvider;
  }) => ICantonLedgerClient;
  readonly AuthTokenProvider: new (
    config: CantonAuthConfig,
    logger: ICantonInternalLogger,
  ) => ICantonAccessTokenProvider;
}

export type CantonWalletSdkModuleLoader =
  () => Promise<ICantonWalletSdkModules>;

/**
 * Resolves the ES module entry point of `packageName` as seen from
 * `fromFile`, using Node's resolution rules. Resolving relative to the SDK's
 * own files guarantees the connector uses exactly the package copies the
 * Wallet SDK uses, even when an installation contains several versions.
 */
function resolveEsmEntry(packageName: string, fromFile: string): string {
  const commonJsEntry = createRequire(fromFile).resolve(packageName);
  let directory = dirname(commonJsEntry);
  for (;;) {
    const manifestPath = join(directory, "package.json");
    let manifest: { name?: unknown; exports?: unknown } | undefined;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch (_error: unknown) {
      manifest = undefined;
    }
    if (manifest?.name === packageName) {
      const rootExport = (manifest.exports as Record<string, unknown>)?.["."];
      const importEntry =
        rootExport && typeof rootExport === "object"
          ? (rootExport as Record<string, unknown>).import
          : undefined;
      if (typeof importEntry !== "string") {
        throw new Error(`${packageName} does not declare an ESM entry point.`);
      }
      return pathToFileURL(join(directory, importEntry)).href;
    }
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error(`Cannot locate the package root of ${packageName}.`);
    }
    directory = parent;
  }
}

async function loadCantonWalletSdk(): Promise<ICantonWalletSdkModules> {
  // The Canton packages must be loaded through their ESM entry points. Their
  // CommonJS builds are unusable: @canton-network/core-ledger-client 1.12.x
  // wraps require("openapi-fetch") with Node-mode ESM interop, so the client
  // factory resolves to the module namespace instead of a function and
  // SDK.create() throws on every Node.js version. Loading lazily also avoids
  // initializing SDK dependencies until the first ledger operation.
  const walletSdkUrl = resolveEsmEntry(
    "@canton-network/wallet-sdk",
    __filename,
  );
  const walletSdkPath = fileURLToPath(walletSdkUrl);
  const providerUrl = resolveEsmEntry(
    "@canton-network/core-provider-ledger",
    walletSdkPath,
  );
  // The imports share a module graph and run one after another: concurrent
  // imports of overlapping graphs fail under Jest's VM module loader.
  const walletSdk = (await importEsmModule(walletSdkUrl)) as Pick<
    ICantonWalletSdkModules,
    "SDK" | "CustomLogAdapter"
  >;
  const ledgerClient = (await importEsmModule(
    resolveEsmEntry(
      "@canton-network/core-ledger-client",
      fileURLToPath(providerUrl),
    ),
  )) as Pick<ICantonWalletSdkModules, "LedgerClient">;
  const walletAuth = (await importEsmModule(
    resolveEsmEntry("@canton-network/core-wallet-auth", walletSdkPath),
  )) as Pick<ICantonWalletSdkModules, "AuthTokenProvider">;
  return {
    SDK: walletSdk.SDK,
    CustomLogAdapter: walletSdk.CustomLogAdapter,
    LedgerClient: ledgerClient.LedgerClient,
    AuthTokenProvider: walletAuth.AuthTokenProvider,
  };
}

/**
 * Creates a logger for Canton SDK internals that forwards only the severity.
 * Context and message values can contain credentials, HTTP payloads, or party
 * data, so they are never passed to Cacti's logger.
 */
function createSeverityOnlyLogger(log: Logger): ICantonInternalLogger {
  const logger: ICantonInternalLogger = {
    trace: () => log.trace(SANITIZED_LOG_MESSAGE),
    debug: () => log.debug(SANITIZED_LOG_MESSAGE),
    info: () => log.info(SANITIZED_LOG_MESSAGE),
    warn: () => log.warn(SANITIZED_LOG_MESSAGE),
    error: () => log.error(SANITIZED_LOG_MESSAGE),
    fatal: () => log.error(SANITIZED_LOG_MESSAGE),
    child: () => logger,
  };
  return logger;
}

const MISSING_USER_ID_CAUSE = "The submitted request is missing a user-id";

/**
 * Implements the Wallet SDK's ledger provider contract (`request()`), which
 * SDK.create() accepts as `ledgerProvider`. It is used instead of the SDK's
 * own LedgerProvider, which hardcodes a pino logger that writes request paths
 * and, at debug level, request bodies straight to stdout.
 */
export class CantonLedgerProvider {
  public constructor(
    private readonly client: ICantonLedgerClient,
    private readonly accessTokenProvider: ICantonAccessTokenProvider,
  ) {}

  public async request(args: ICantonLedgerApiRequest): Promise<unknown> {
    if (args.method !== "ledgerApi" || !args.params) {
      throw new Error(`Unsupported method: ${args.method}`);
    }
    const { params } = args;
    const ledgerParams: Record<string, unknown> = {};
    if ("path" in params) {
      ledgerParams.path = params.path;
    }
    if ("query" in params) {
      ledgerParams.query = params.query;
    }
    switch (params.requestMethod) {
      case "get":
        return this.getWithUserIdFallback(params.resource, ledgerParams);
      case "post": {
        const headers = params.headers ?? {
          "Content-Type": "application/json",
        };
        const additionalOptions =
          headers["Content-Type"] === "application/octet-stream"
            ? { bodySerializer: (body: unknown) => body, headers }
            : { headers };
        return this.client.postWithRetry(
          params.resource,
          params.body ?? {},
          undefined,
          ledgerParams,
          additionalOptions,
        );
      }
      case "patch":
        return this.client.patchWithRetry(
          params.resource,
          params.body ?? {},
          undefined,
          ledgerParams,
        );
      default:
        // The SDK's own provider does not support other methods either.
        throw new Error(
          `Unsupported request method: ${String(params.requestMethod)}`,
        );
    }
  }

  /**
   * SDK.create() falls back to the user ID in the access token when the
   * ledger cannot resolve the authenticated user, but only for a provider it
   * created itself. This keeps that behavior for the injected provider.
   */
  private async getWithUserIdFallback(
    resource: string,
    ledgerParams: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      return await this.client.getWithRetry(resource, undefined, ledgerParams);
    } catch (error: unknown) {
      const cause = (error as { cause?: unknown } | undefined)?.cause;
      if (
        resource !== "/v2/authenticated-user" ||
        typeof cause !== "string" ||
        !cause.includes(MISSING_USER_ID_CAUSE)
      ) {
        throw error;
      }
      const userId = await this.accessTokenProvider
        .getAuthContext()
        .then((authContext) => authContext.userId)
        .catch(() => undefined);
      return userId ? { user: { id: userId } } : undefined;
    }
  }
}

export class CantonWalletSdkFactory implements ICantonWalletSdkFactory {
  public constructor(
    private readonly log: Logger,
    private readonly moduleLoader: CantonWalletSdkModuleLoader = loadCantonWalletSdk,
  ) {}

  public async create(
    options: ICantonWalletSdkFactoryCreateOptions,
  ): Promise<ICantonWalletSdk> {
    const { AuthTokenProvider, CustomLogAdapter, LedgerClient, SDK } =
      await this.moduleLoader();
    const logAdapter = new CustomLogAdapter((level) => {
      this.log[level](SANITIZED_LOG_MESSAGE);
    });
    const internalLogger = createSeverityOnlyLogger(this.log);
    const accessTokenProvider = new AuthTokenProvider(
      options.auth,
      internalLogger,
    );
    const ledgerClient = new LedgerClient({
      baseUrl: new URL(options.ledgerClientUrl),
      logger: internalLogger,
      accessTokenProvider,
    });
    const ledgerProvider = new CantonLedgerProvider(
      ledgerClient,
      accessTokenProvider,
    );

    const sdk = await SDK.create({ ledgerProvider, logAdapter });
    return sdk as ICantonWalletSdk;
  }
}
