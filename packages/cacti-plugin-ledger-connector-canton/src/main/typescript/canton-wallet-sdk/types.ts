import type { CantonCommand } from "../generated/openapi/typescript-axios";

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
      /** Additional trusted origins for providers whose token endpoint is
       * hosted separately from the discovery document. */
      readonly allowedTokenEndpointOrigins?: readonly string[];
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
  /** Releases factory-owned transport and authentication resources. */
  dispose?(): Promise<void>;
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
  /** Cancels factory-owned OAuth work and prevents further ledger requests. */
  signal?: AbortSignal;
  auth: CantonAuthConfig;
  /** An absolute, already validated JSON Ledger API URL. */
  ledgerClientUrl: string;
  /** Allows HTTP only for explicitly enabled loopback development services. */
  allowInsecureLoopbackHttp?: boolean;
  /** Deadline shared by the complete OAuth discovery and token exchange. */
  oauthRequestTimeoutMs?: number;
}

export interface ICantonWalletSdkFactory {
  create(
    options: ICantonWalletSdkFactoryCreateOptions,
  ): Promise<ICantonWalletSdk>;
}

export type CantonSdkLogLevel = "debug" | "error" | "info" | "trace" | "warn";

/** The subset of the pino logger interface used by Canton SDK internals. */
export interface ICantonInternalLogger {
  trace(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  fatal(...args: unknown[]): void;
  child(bindings: Record<string, unknown>): ICantonInternalLogger;
}

export interface ICantonAccessTokenProvider {
  getAccessToken(): Promise<string>;
  getAuthContext(): Promise<{ userId?: string }>;
}

export interface ICantonLedgerClient {
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

export interface ICantonLedgerApiRequest {
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
