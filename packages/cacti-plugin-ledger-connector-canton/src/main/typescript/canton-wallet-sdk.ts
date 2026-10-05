import type { TokenProviderConfig } from "@canton-network/wallet-sdk" with { "resolution-mode": "import" };

import type { Logger } from "@hyperledger-cacti/cactus-common";

import type {
  ActiveContract,
  CantonCommand,
} from "./generated/openapi/typescript-axios";

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
  offset?: number;
  limit: number;
}

export interface ICantonWalletSdk {
  readonly ledger: {
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
        readJsContracts(
          request: ICantonActiveContractsRequest,
        ): Promise<Array<ActiveContract & Record<string, unknown>>>;
      };
    };
  };
  readonly party: {
    list(): Promise<string[]>;
  };
}

export interface ICantonWalletSdkFactoryCreateOptions {
  auth: TokenProviderConfig;
  ledgerClientUrl: URL | string;
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
    version: undefined,
    params: Record<string, unknown>,
  ): Promise<unknown>;
  postWithRetry(
    resource: string,
    body: unknown,
    version: undefined,
    params: Record<string, unknown>,
    additionalOptions: Record<string, unknown>,
  ): Promise<unknown>;
  patchWithRetry(
    resource: string,
    body: unknown,
    version: undefined,
    params: Record<string, unknown>,
  ): Promise<unknown>;
}

interface ICantonLedgerApiRequest {
  readonly method: string;
  readonly params?: {
    readonly requestMethod: "get" | "post" | "patch" | "delete";
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
    config: TokenProviderConfig,
    logger: ICantonInternalLogger,
  ) => ICantonAccessTokenProvider;
}

export type CantonWalletSdkModuleLoader =
  () => Promise<ICantonWalletSdkModules>;

// With "module": "CommonJS", TypeScript rewrites import() to require(). The
// Function constructor keeps a native dynamic import in the emitted code.
const importEsmModule = new Function(
  "specifier",
  "return import(specifier)",
) as (specifier: string) => Promise<unknown>;

async function loadCantonWalletSdk(): Promise<ICantonWalletSdkModules> {
  // The Canton packages must be loaded through their ESM entry points. The
  // CommonJS build is unusable: @canton-network/core-ledger-client 1.12.x
  // wraps require("openapi-fetch") with Node-mode ESM interop, so the client
  // factory resolves to the module namespace instead of a function and
  // SDK.create() throws on every Node.js version. Loading lazily also avoids
  // initializing SDK dependencies until the first ledger operation.
  //
  // The imports share a module graph and run one after another: concurrent
  // imports of overlapping graphs fail under Jest's VM module loader.
  const walletSdk = (await importEsmModule(
    "@canton-network/wallet-sdk",
  )) as Pick<ICantonWalletSdkModules, "SDK" | "CustomLogAdapter">;
  const ledgerClient = (await importEsmModule(
    "@canton-network/core-ledger-client",
  )) as Pick<ICantonWalletSdkModules, "LedgerClient">;
  const walletAuth = (await importEsmModule(
    "@canton-network/core-wallet-auth",
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
 * Equivalent of the Wallet SDK's LedgerProvider, which hardcodes a pino
 * logger that writes request paths and, at debug level, request bodies
 * straight to stdout. This provider gives the ledger client the connector's
 * severity-only logger instead.
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
      baseUrl: new URL(options.ledgerClientUrl.toString()),
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
