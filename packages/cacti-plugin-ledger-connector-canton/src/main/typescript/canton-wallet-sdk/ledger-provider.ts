import type {
  ICantonLedgerClient,
  ICantonAccessTokenProvider,
  ICantonLedgerApiRequest,
} from "./types";

/** Canton exposes authentication failures as structured JsCantonError values. */
function isInvalidToken(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "INVALID_TOKEN"
  );
}

/**
 * Implements the Wallet SDK's ledger provider contract (`request()`), which
 * SDK.create() accepts as `ledgerProvider`. It is used instead of the SDK's
 * own LedgerProvider, which hardcodes a pino logger that writes request paths
 * and, at debug level, request bodies straight to stdout.
 */
export class CantonLedgerProvider {
  private disposed = false;
  public constructor(
    private readonly client: ICantonLedgerClient,
    private readonly accessTokenProvider: ICantonAccessTokenProvider,
  ) {}

  public async request(args: ICantonLedgerApiRequest): Promise<unknown> {
    if (this.disposed) {
      throw new Error("Canton ledger provider has been disposed.");
    }
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
      if (resource !== "/v2/authenticated-user" || !isInvalidToken(error)) {
        throw error;
      }
      const userId = await this.accessTokenProvider
        .getAuthContext()
        .then((authContext) => authContext.userId)
        .catch(() => undefined);
      if (!userId) {
        throw error;
      }
      // Revalidate on the participant instead of synthesizing an authenticated
      // user from a token. Expired/invalid credentials and missing user rights
      // must still be rejected, even when the token contains a user ID.
      return this.client.getWithRetry("/v2/users/{user-id}", undefined, {
        path: { "user-id": userId },
      });
    }
  }

  public dispose(): void {
    this.disposed = true;
  }
}
