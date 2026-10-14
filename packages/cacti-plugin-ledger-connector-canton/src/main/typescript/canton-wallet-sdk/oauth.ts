import { validateCantonServiceUrl } from "../canton-service-url";
import type {
  CantonAuthConfig,
  ICantonInternalLogger,
  ICantonAccessTokenProvider,
  ICantonWalletSdkModules,
} from "./types";

export const DEFAULT_OAUTH_REQUEST_TIMEOUT_MS = 60_000;
export const MAX_OAUTH_RESPONSE_BYTES = 64 * 1024;

async function cancelResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch (_error: unknown) {
    // The original, sanitized request error is more useful to the caller.
  }
}

async function readBoundedJson(
  response: Response,
  operationName: string,
): Promise<unknown> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_OAUTH_RESPONSE_BYTES
    ) {
      await cancelResponseBody(response);
      throw new Error(
        `${operationName} response exceeded ${MAX_OAUTH_RESPONSE_BYTES} bytes.`,
      );
    }
  }

  if (!response.body) {
    throw new Error(`${operationName} response did not contain a body.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let body = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      byteLength += value.byteLength;
      if (byteLength > MAX_OAUTH_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error(
          `${operationName} response exceeded ${MAX_OAUTH_RESPONSE_BYTES} bytes.`,
        );
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(body) as unknown;
  } catch (_error: unknown) {
    throw new Error(`${operationName} response did not contain valid JSON.`);
  }
}

async function fetchBoundedJson(
  url: string,
  init: RequestInit,
  signal: AbortSignal,
  operationName: string,
): Promise<unknown> {
  try {
    const response = await fetch(url, {
      ...init,
      signal,
    });
    if (!response.ok) {
      await cancelResponseBody(response);
      throw new Error(`${operationName} request failed.`);
    }
    return await readBoundedJson(response, operationName);
  } catch (error: unknown) {
    if (signal.aborted) {
      throw new Error(`${operationName} request timed out.`);
    }
    throw error;
  }
}

/** RFC 6749 section 2.3.1 applies form encoding to each Basic component. */
function encodeOAuthBasicComponent(value: string): string {
  const encoded = new URLSearchParams([["value", value]]).toString();
  return encoded.slice("value=".length);
}

/**
 * Fetches OAuth client-credentials tokens without allowing the discovery
 * document to redirect the client secret to an untrusted endpoint.
 *
 * The Wallet SDK's built-in provider accepts `token_endpoint` verbatim. We
 * perform the discovery and token exchange here so the endpoint is checked
 * before the Basic credential is ever sent. The resulting token is handed to
 * the Wallet SDK's static provider so its JWT validation and auth-context
 * handling remain unchanged.
 */
export class ValidatedClientCredentialsTokenProvider
  implements ICantonAccessTokenProvider
{
  private readonly allowedTokenEndpointOrigins: ReadonlySet<string>;
  private cachedProvider?: ICantonAccessTokenProvider;
  private providerPromise?: Promise<ICantonAccessTokenProvider>;
  private disposed = false;
  private activeRequest?: AbortController;

  public constructor(
    private readonly auth: Extract<
      CantonAuthConfig,
      { method: "client_credentials" }
    >,
    private readonly logger: ICantonInternalLogger,
    private readonly authTokenProvider: ICantonWalletSdkModules["AuthTokenProvider"],
    private readonly allowInsecureLoopbackHttp: boolean,
    private readonly requestTimeoutMs: number,
  ) {
    if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
      throw new Error(
        "Canton OAuth request timeout must be a positive integer.",
      );
    }
    const discoveryOrigin = new URL(auth.configUrl).origin;
    const additionalOrigins = (auth.allowedTokenEndpointOrigins ?? []).map(
      (origin, index) =>
        new URL(
          validateCantonServiceUrl(
            origin,
            allowInsecureLoopbackHttp,
            `options.auth.allowedTokenEndpointOrigins[${index}]`,
          ),
        ).origin,
    );
    this.allowedTokenEndpointOrigins = new Set([
      discoveryOrigin,
      ...additionalOrigins,
    ]);
  }

  public async getAccessToken(): Promise<string> {
    const provider = await this.getProvider();
    return provider.getAccessToken();
  }

  public async getAuthContext(): Promise<{ userId?: string }> {
    const provider = await this.getProvider();
    return provider.getAuthContext();
  }

  private async getProvider(): Promise<ICantonAccessTokenProvider> {
    if (this.disposed) {
      throw new Error("Canton OAuth provider has been disposed.");
    }
    if (this.providerPromise) {
      return this.providerPromise;
    }
    const providerPromise = this.resolveProvider().finally(() => {
      if (this.providerPromise === providerPromise) {
        this.providerPromise = undefined;
      }
    });
    this.providerPromise = providerPromise;
    return providerPromise;
  }

  private async resolveProvider(): Promise<ICantonAccessTokenProvider> {
    if (this.cachedProvider) {
      try {
        // The static Wallet SDK provider checks the JWT expiry for us.
        await this.cachedProvider.getAccessToken();
        return this.cachedProvider;
      } catch (_error: unknown) {
        this.cachedProvider = undefined;
      }
    }

    const token = await this.fetchToken();
    if (this.disposed) {
      throw new Error("Canton OAuth provider has been disposed.");
    }
    const provider = new this.authTokenProvider(
      { method: "static", token },
      this.logger,
    );
    this.cachedProvider = provider;
    // Validate the returned token before exposing it to the ledger client.
    await provider.getAccessToken();
    return provider;
  }

  private async fetchToken(): Promise<string> {
    const abortController = new AbortController();
    this.activeRequest = abortController;
    const timeout = setTimeout(
      () => abortController.abort(),
      this.requestTimeoutMs,
    );
    try {
      const discovery = await fetchBoundedJson(
        this.auth.configUrl,
        { redirect: "error" },
        abortController.signal,
        "Canton OAuth discovery",
      );
      const tokenEndpoint =
        typeof discovery === "object" && discovery !== null
          ? (discovery as { token_endpoint?: unknown }).token_endpoint
          : undefined;
      if (typeof tokenEndpoint !== "string") {
        throw new Error(
          "Canton OAuth discovery did not provide a token endpoint.",
        );
      }

      const validatedTokenEndpoint = validateCantonServiceUrl(
        tokenEndpoint,
        this.allowInsecureLoopbackHttp,
        "Canton OAuth token endpoint",
      );
      if (
        !this.allowedTokenEndpointOrigins.has(
          new URL(validatedTokenEndpoint).origin,
        )
      ) {
        throw new Error(
          "Canton OAuth token endpoint is outside the configured trusted origins.",
        );
      }

      const encodedClientId = encodeOAuthBasicComponent(
        this.auth.credentials.clientId,
      );
      const encodedClientSecret = encodeOAuthBasicComponent(
        this.auth.credentials.clientSecret,
      );
      const credentials = Buffer.from(
        `${encodedClientId}:${encodedClientSecret}`,
        "utf8",
      ).toString("base64");
      const requestBody = new URLSearchParams({
        grant_type: "client_credentials",
      });
      if (this.auth.credentials.scope) {
        requestBody.set("scope", this.auth.credentials.scope);
      }
      if (this.auth.credentials.audience) {
        requestBody.set("audience", this.auth.credentials.audience);
      }
      const tokenResponse = await fetchBoundedJson(
        validatedTokenEndpoint,
        {
          method: "POST",
          redirect: "error",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
          },
          body: requestBody.toString(),
        },
        abortController.signal,
        "Canton OAuth token",
      );
      const token =
        typeof tokenResponse === "object" && tokenResponse !== null
          ? (tokenResponse as { access_token?: unknown }).access_token
          : undefined;
      if (typeof token !== "string" || token.length === 0) {
        throw new Error("Canton OAuth token response did not provide a token.");
      }
      return token;
    } finally {
      clearTimeout(timeout);
      if (this.activeRequest === abortController) {
        this.activeRequest = undefined;
      }
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.activeRequest?.abort();
    this.activeRequest = undefined;
    this.cachedProvider = undefined;
    this.providerPromise = undefined;
  }
}
