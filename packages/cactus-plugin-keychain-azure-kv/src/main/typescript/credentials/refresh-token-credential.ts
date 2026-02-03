import type { TokenCredential } from "@azure/identity";
import type { AccessToken } from "@azure/core-auth";
import { PublicClientApplication } from "@azure/msal-node";

import type { Logger, LogLevelDesc } from "@hyperledger-cacti/cactus-common";
import { LoggerProvider } from "@hyperledger-cacti/cactus-common";

export interface IRefreshTokenCredentialOptions {
  readonly logLevel?: Readonly<LogLevelDesc>;
  readonly clientId: Readonly<string>;
  readonly authority: Readonly<string>;
  readonly refreshToken: Readonly<string>;
  readonly resource: Readonly<string>;
  readonly scopes?: ReadonlyArray<string>;
}

export class RefreshTokenCredential implements TokenCredential {
  public static readonly CLASS_NAME = "RefreshTokenCredential";

  private readonly log: Logger;
  private readonly scopes: ReadonlyArray<string>;

  public get className(): string {
    return RefreshTokenCredential.CLASS_NAME;
  }
  private readonly msalClient: Readonly<PublicClientApplication>;

  constructor(private readonly opts: Readonly<IRefreshTokenCredentialOptions>) {
    const fn = `${this.className}#constructor()`;
    if (!opts) {
      throw new Error(`${fn} - arg opts cannot be falsy.`);
    }
    const { authority, clientId, refreshToken, resource, scopes } = opts;
    const { logLevel = "DEBUG" } = opts;

    // verify that the required arguments were passed in
    if (!authority) {
      throw new Error(`${fn} - arg opts.authority cannot be falsy.`);
    }
    if (!clientId) {
      throw new Error(`${fn} - arg opts.clientId cannot be falsy.`);
    }
    if (!refreshToken) {
      throw new Error(`${fn} - arg opts.refreshToken cannot be falsy.`);
    }
    if (!resource) {
      throw new Error(`${fn} - arg opts.resource cannot be falsy.`);
    }

    // verify that the arguments are of string type
    if (typeof authority !== "string") {
      throw new Error(`${fn} - arg opts.authority must be string.`);
    }
    if (typeof clientId !== "string") {
      throw new Error(`${fn} - arg opts.clientId must be string.`);
    }
    if (typeof refreshToken !== "string") {
      throw new Error(`${fn} - arg opts.refreshToken must be string.`);
    }
    if (typeof resource !== "string") {
      throw new Error(`${fn} - arg opts.resource must be string.`);
    }

    // Verify if the strings are empty or only contain whitespaces
    if (clientId.trim().length < 1) {
      throw new Error(`${fn} - arg opts.clientId cannot be blank.`);
    }
    if (refreshToken.trim().length < 1) {
      throw new Error(`${fn} - arg opts.refreshToken cannot be blank.`);
    }
    if (authority.trim().length < 1) {
      throw new Error(`${fn} - arg opts.authority cannot be blank.`);
    }
    if (resource.trim().length < 1) {
      throw new Error(`${fn} - arg opts.resource cannot be blank.`);
    }

    this.scopes = Array.isArray(scopes)
      ? scopes
      : [`${this.opts.resource}/.default`];

    if (this.scopes.some((s) => typeof s !== "string")) {
      throw new Error(`${fn} - arg opts.scopes must be an array of strings.`);
    }

    this.log = LoggerProvider.getOrCreate({
      label: this.className,
      level: logLevel,
    });
    this.log.debug("Creating PublicClientApplication...");

    this.msalClient = new PublicClientApplication({
      auth: {
        clientId,
        authority,
        clientSecret: refreshToken,
      },
    });
    this.log.debug("Creating PublicClientApplication OK");
    this.log.debug("EXIT");
  }

  async getToken(): Promise<AccessToken | null> {
    const fn = `${this.className}#getToken()`;
    const result = await this.msalClient.acquireTokenByRefreshToken({
      refreshToken: this.opts.refreshToken,
      scopes: this.scopes as string[],
    });
    if (!result) {
      throw new Error(`${fn} acquireTokenByRefreshToken() returned falsy.`);
    }
    const fiveMinutesInMs = 300 * 1000;
    const defaultExpiry = new Date().getTime() + fiveMinutesInMs;
    const { accessToken, expiresOn } = result;

    // According to the Azure SDK documentation the access tokens are good for
    // at least 5 minutes and up to 60. If we didn't get an expiry we'll play
    // it safe and assume the shortest expiry possible.
    const expiresOnTimestamp = expiresOn ? expiresOn.getTime() : defaultExpiry;

    return {
      expiresOnTimestamp,
      token: accessToken,
      tokenType: "Bearer",
    };
  }
}
