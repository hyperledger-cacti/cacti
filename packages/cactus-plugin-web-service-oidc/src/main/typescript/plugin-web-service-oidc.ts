import { Server } from "http";
import { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import { promisify } from "util";
import { Express } from "express";
import {
  Provider,
  Configuration as OidcProviderConfiguration,
  // Account,
  // AccountClaims,
  // ClaimsParameterMember,
  // FindAccount,
} from "oidc-provider";

import jose from "jose";

// FIXME implement real adapter with knex backing it
// tslint:disable: variable-name
// tslint:disable-next-line: no-var-requires
// const MemoryAdapter = require("oidc-provider/lib/adapters/memory_adapter");
// tslint:enable: variable-name

import {
  IPluginWebService,
  PluginAspect,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { OpenIdConfigurationEndpointV1 } from "./oidc/open-id-configuration-endpoint-v1";

export interface IWebAppOptions {
  port: number;
  hostname: string;
}

export interface IPluginWebServiceOidcOptions {
  issuer: string;
  /**
   * Permit the clients to access the OIDC provider endpints through unsecured (HTTP) protocol(s).
   */
  allowWithoutTls: boolean;

  /**
   * Permit the clients to specify redirect URIs that point to localhost
   */
  allowLocalhost: boolean;

  oidcProviderConfig: OidcProviderConfiguration;

  pluginRegistry: PluginRegistry;

  logLevel?: LogLevelDesc;

  webAppOptions?: IWebAppOptions;

  instanceId: string;
}

export class PluginWebServiceOidc implements IPluginWebService {
  public readonly instanceId: string;

  /**
   * FIXME - real implemenation is needed
   * @param email
   * @param password
   */
  async authenticate(
    email: string,
    password: string,
  ): Promise<string | undefined> {
    this.log.error(
      "FIXME DUMMY authentication being performed: ",
      email,
      password,
    );
    try {
      // const emailLC = String(email).toLowerCase();
      const account = { id: "some-fake-account-id" };

      return account.id;
    } catch (err) {
      return undefined;
    }
  }

  private readonly log: Logger;
  private httpServer: Server | SecureServer | null = null;

  constructor(public readonly options: IPluginWebServiceOidcOptions) {
    const fnTag = `PluginWebServiceOidc#constructor()`;
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    options.allowLocalhost = options.allowLocalhost === true;
    options.allowWithoutTls = options.allowWithoutTls === true;
    this.log = LoggerProvider.getOrCreate({
      label: "plugin-web-service-oidc",
      level: options.logLevel,
    });
    if (options.allowLocalhost) {
      this.log.warn("Allowed localhost URLs. Do NOT use this in production.");
    }
    if (options.allowWithoutTls) {
      this.log.warn("Allowed non-TLS URLs. Do NOT use this in production.");
    }
    Checks.nonBlankString(this.options.instanceId, `${fnTag} instanceId`);
    this.instanceId = this.options.instanceId;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down...`);
    const serverMaybe = this.getHttpServer();
    if (serverMaybe.isPresent()) {
      this.log.info(`Awaiting server.close() ...`);
      const server = serverMaybe.get();
      await promisify(server.close.bind(server))();
      this.log.info(`server.close() OK`);
    } else {
      this.log.info(`No HTTP server found, skipping...`);
    }
  }

  public async installWebServices(
    webApp: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const pkgName = this.getPackageName();
    this.log.info(`Installing web services for plugin ${pkgName}...`);

    const keystore = new jose.JWKS.KeyStore();

    Promise.all([
      keystore.generate("RSA", 2048, { use: "sig" }),
      keystore.generate("RSA", 2048, { use: "enc" }),
      keystore.generate("EC", "P-256", { use: "sig" }),
      keystore.generate("EC", "P-256", { use: "enc" }),
      // TODO: investigate this - maybe a Node v10 issue that is fixed in 12 and upwards?
      // packages/cactus-test-plugin-web-service-oidc/node_modules/jose/lib/help/runtime_support.js
      // for some reason the crypto module has "Sign" and "Verify" but not the lowercase versions...
      // keystore.generate('OKP', 'Ed25519', { use: 'sig' }),
    ]);
    // const jwks = keystore.toJWKS(true);

    /**
     * Performs a lookup in the database for users
     * @param ctx Contains the request, response and the app (Koa app internal to the OIDC provider library)
     * @param sub The username that was typed in on the login UI
     * @param token Can be an AccessToken | AuthorizationCode | DeviceCode | undefined
     */
    // const findAccount: FindAccount = async (
    //   ctx: any,
    //   sub: string,
    //   token?,
    // ): Promise<Account> => {
    //   this.log.debug("DUMMY findAccount implementation running...", {
    //     ctx,
    //     sub,
    //     token,
    //   });
    //   // FIXME look up account in the database
    //   const theAccount: Account = {
    //     accountId: "some-fake-account-id",
    //     claims: async (
    //       use: string,
    //       scope: string,
    //       claims: { [key: string]: ClaimsParameterMember | null },
    //       rejected: string[],
    //     ): Promise<AccountClaims> => {
    //       this.log.debug("DUMMY findAccount#claims()", {
    //         use,
    //         scope,
    //         claims,
    //         rejected,
    //       });
    //       const accountClaims: AccountClaims = {
    //         sub,
    //       };
    //       return accountClaims;
    //     },
    //   };

    //   return theAccount;
    // };

    const oidcProviderConfiguration: OidcProviderConfiguration = {
      ...this.options.oidcProviderConfig,
      // adapter: MemoryAdapter,
      // jwks,
      // findAccount,
      tokenEndpointAuthMethods: [
        "none",
        "client_secret_basic",
        "client_secret_jwt",
        "client_secret_post",
        "private_key_jwt",
      ],
    };

    const oidcProvider = new Provider(
      this.options.issuer,
      oidcProviderConfiguration,
    );

    if (this.options.allowLocalhost) {
      this.log.warn("Allowed localhost URLs. Do NOT use this in production.");
    }
    if (this.options.allowWithoutTls) {
      this.log.warn("Allowed non-TLS URLs. Do NOT use this in production.");
    }

    const { prototype } = ((oidcProvider.Client as unknown) as {
      Schema: {
        prototype: { invalidate: (message: string, code?: string) => void };
      };
    }).Schema;
    const { invalidate: originalInvalidateFn } = prototype;

    // override the validation logic of OIDC provider with our custom flags
    // so that we can support a development environment scenario where unsafe
    // things like http and localhost URIs are not frowned upon by the provider
    prototype.invalidate = (message: string, code?: string) => {
      // first we check if any of our overrides were specified by the user who
      // launched Cactus and if yes then we step in and wave errors through.
      if (
        (code === "implicit-force-https" && this.options.allowWithoutTls) ||
        (code === "implicit-forbid-localhost" && this.options.allowLocalhost)
      ) {
        return;
      }
      // if the error codes were different from what the ones we want to override
      // then we let the original validation logic commence by calling it.
      originalInvalidateFn.call(this, message);
    };

    const endpoints: IWebServiceEndpoint[] = [];
    const endpointOptions = { oidcProvider, hostPlugin: this };
    const endpoint = new OpenIdConfigurationEndpointV1(endpointOptions);

    webApp.use(`/api/v1/plugins/${pkgName}`, oidcProvider.callback);
    endpoints.push(endpoint);

    this.log.info(`Installed web services ${pkgName} OK`, { endpoints });
    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-web-service-oidc`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.WEB_SERVICE;
  }
}
