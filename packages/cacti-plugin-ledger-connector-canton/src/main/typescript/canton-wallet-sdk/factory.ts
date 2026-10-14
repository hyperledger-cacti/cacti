import type { Logger } from "@hyperledger-cacti/cactus-common";
import type {
  ICantonWalletSdk,
  ICantonWalletSdkFactory,
  ICantonWalletSdkFactoryCreateOptions,
  CantonWalletSdkModuleLoader,
  ICantonAccessTokenProvider,
} from "./types";
import { loadCantonWalletSdk } from "./modules";
import {
  ValidatedClientCredentialsTokenProvider,
  DEFAULT_OAUTH_REQUEST_TIMEOUT_MS,
} from "./oauth";
import { createSeverityOnlyLogger, SANITIZED_LOG_MESSAGE } from "./logging";
import { CantonLedgerProvider } from "./ledger-provider";

/** Revokes credentials without retaining the underlying provider after disposal. */
class RevocableAccessTokenProvider implements ICantonAccessTokenProvider {
  public constructor(
    private provider: ICantonAccessTokenProvider | undefined,
  ) {}

  private getProvider(): ICantonAccessTokenProvider {
    if (!this.provider) {
      throw new Error("Canton authentication provider has been disposed.");
    }
    return this.provider;
  }

  public async getAccessToken(): Promise<string> {
    const token = await this.getProvider().getAccessToken();
    this.getProvider();
    return token;
  }

  public async getAuthContext(): Promise<{ userId?: string }> {
    const authContext = await this.getProvider().getAuthContext();
    this.getProvider();
    return authContext;
  }

  public dispose(): void {
    this.provider = undefined;
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
    const lifecycleSignal = options.signal;
    if (lifecycleSignal?.aborted) {
      throw new Error("Canton Wallet SDK initialization was cancelled.");
    }
    const { AuthTokenProvider, CustomLogAdapter, LedgerClient, SDK } =
      await this.moduleLoader();
    const logAdapter = new CustomLogAdapter((level) => {
      this.log[level](SANITIZED_LOG_MESSAGE);
    });
    const internalLogger = createSeverityOnlyLogger(this.log);
    let configuredTokenProvider: ICantonAccessTokenProvider | undefined =
      options.auth.method === "client_credentials"
        ? new ValidatedClientCredentialsTokenProvider(
            options.auth,
            internalLogger,
            AuthTokenProvider,
            options.allowInsecureLoopbackHttp === true,
            options.oauthRequestTimeoutMs ?? DEFAULT_OAUTH_REQUEST_TIMEOUT_MS,
          )
        : new AuthTokenProvider(options.auth, internalLogger);
    const accessTokenProvider = new RevocableAccessTokenProvider(
      configuredTokenProvider,
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

    let sdk: ICantonWalletSdk | undefined;
    let disposed = false;
    let disposalPromise: Promise<void> | undefined;
    const dispose = (): Promise<void> => {
      if (disposalPromise) {
        return disposalPromise;
      }
      const currentSdk = sdk;
      disposed = true;
      sdk = undefined;
      lifecycleSignal?.removeEventListener("abort", onAbort);
      ledgerProvider.dispose();
      accessTokenProvider.dispose();
      if (
        configuredTokenProvider instanceof
        ValidatedClientCredentialsTokenProvider
      ) {
        configuredTokenProvider.dispose();
      }
      configuredTokenProvider = undefined;
      disposalPromise = Promise.resolve().then(() => currentSdk?.dispose?.());
      return disposalPromise;
    };
    const onAbort = (): void => {
      void dispose().catch(() => undefined);
    };
    lifecycleSignal?.addEventListener("abort", onAbort, { once: true });
    if (lifecycleSignal?.aborted) {
      await dispose();
      throw new Error("Canton Wallet SDK initialization was cancelled.");
    }

    try {
      const createdSdk = (await SDK.create({
        ledgerProvider,
        logAdapter,
      })) as ICantonWalletSdk;
      if (disposed) {
        await createdSdk.dispose?.();
        throw new Error("Canton Wallet SDK initialization was cancelled.");
      }
      sdk = createdSdk;
      const getSdk = (): ICantonWalletSdk => {
        if (!sdk) {
          throw new Error("Canton Wallet SDK has been disposed.");
        }
        return sdk;
      };
      // Expose only the connector's supported surface, so unused SDK namespaces
      // and caches can be released after shutdown. SDK 1.5.3 has no public
      // transport close method; the credential/provider gates are revoked here.
      return {
        get ledger() {
          return getSdk().ledger;
        },
        get party() {
          return getSdk().party;
        },
        dispose,
      };
    } catch (error: unknown) {
      await dispose();
      throw error;
    }
  }
}
