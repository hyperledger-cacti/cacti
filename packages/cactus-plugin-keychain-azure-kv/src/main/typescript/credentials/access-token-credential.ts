import type { Logger, LogLevelDesc } from "@hyperledger-cacti/cactus-common";
import type { AccessToken, TokenCredential } from "@azure/identity";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { RefreshTokenCredential } from "./refresh-token-credential";

import { LoggerProvider } from "@hyperledger-cacti/cactus-common";

export interface IAccessTokenCredentialOptions {
  readonly logLevel?: Readonly<LogLevelDesc>;
  readonly accessToken: Readonly<AccessToken>;
}

/**
 * An overly simplistic credential implementation that is compatible with the
 * Azure Javascript SDK.
 * It doesn't handle refreshing the token, the caller is responsible for updating
 * the state of it to ensure that the token that it returns hasn't expired.
 *
 * Should be useful for local development scenarios for the most part since in
 * production you would most likely want to go with {@link RefreshTokenCredential}
 *
 * @see {@link RefreshTokenCredential}
 */
export class AccessTokenCredential implements TokenCredential {
  public static readonly CLASS_NAME = "AccessTokenCredential";

  private readonly log: Logger;

  public get className(): string {
    return AccessTokenCredential.CLASS_NAME;
  }

  constructor(private opts: Readonly<IAccessTokenCredentialOptions>) {
    const fn = `${this.className}#constructor()`;
    if (!opts) {
      throw new Error(`${fn} arg opts cannot be falsy.`);
    }
    const { accessToken, logLevel = "WARN" } = opts;
    if (!accessToken) {
      throw new Error(`${fn} arg opts.accessToken cannot be falsy.`);
    }
    const { expiresOnTimestamp, token } = accessToken;
    if (typeof token !== "string" || token.trim().length < 1) {
      throw new Error(`${fn} arg accessToken.token must be non-blank string.`);
    }
    if (!Number.isInteger(expiresOnTimestamp)) {
      throw new Error(`${fn} arg accessToken.expiresOnTimestamp must be int`);
    }

    this.log = LoggerProvider.getOrCreate({
      label: this.className,
      level: logLevel,
    });
    this.log.debug("Created instance OK.");
  }
  async getToken(): Promise<AccessToken | null> {
    this.log.debug("ENTER");
    return this.opts.accessToken;
  }
}
