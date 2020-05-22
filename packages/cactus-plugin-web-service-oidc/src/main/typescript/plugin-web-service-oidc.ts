import { Server } from "http";
import { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import { promisify } from "util";
import express, { Express } from "express";
import bodyParser from "body-parser";
import ejs from "ejs";
import {
  Provider,
  Configuration as OidcProviderConfiguration,
} from "oidc-provider";

import {
  IPluginWebService,
  PluginAspect,
  PluginRegistry,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { OpenIdConfigurationEndpointV1 } from "./oidc/open-id-configuration-endpoint-v1";

export const INTERACTION_TEMPLATE_EJS: string = `<!DOCTYPE html>
<html >
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <title>Sign-in</title>
    <style>
      @import url(https://fonts.googleapis.com/css?family=Roboto:400,100);

      body {
        font-family: 'Roboto', sans-serif;
        margin-top: 25px;
        margin-bottom: 25px;
      }

      .login-card {
        padding: 40px;
        padding-top: 0px;
        padding-bottom: 10px;
        width: 274px;
        background-color: #F7F7F7;
        margin: 0 auto 10px;
        border-radius: 2px;
        box-shadow: 0px 2px 2px rgba(0, 0, 0, 0.3);
        overflow: hidden;
      }

      .login-card + .login-card {
        padding-top: 10px;
      }

      .login-card h1 {
        font-weight: 100;
        text-align: center;
        font-size: 2.3em;
      }

      .login-card [type=submit] {
        width: 100%;
        display: block;
        margin-bottom: 10px;
        position: relative;
      }

      .login-card input[type=text], input[type=email], input[type=password] {
        height: 44px;
        font-size: 16px;
        width: 100%;
        margin-bottom: 10px;
        -webkit-appearance: none;
        background: #fff;
        border: 1px solid #d9d9d9;
        border-top: 1px solid #c0c0c0;
        padding: 0 8px;
        box-sizing: border-box;
        -moz-box-sizing: border-box;
      }

      .login {
        text-align: center;
        font-size: 14px;
        font-family: 'Arial', sans-serif;
        font-weight: 700;
        height: 36px;
        padding: 0 8px;
      }

      .login-submit {
        border: 0px;
        color: #fff;
        text-shadow: 0 1px rgba(0,0,0,0.1);
        background-color: #4d90fe;
      }

      .login-card a {
        text-decoration: none;
        color: #666;
        font-weight: 400;
        text-align: center;
        display: inline-block;
        opacity: 0.6;
      }

      .login-help {
        width: 100%;
        text-align: center;
        font-size: 12px;
      }

      .login-client-image img {
        margin-bottom: 20px;
        display: block;
        margin-left: auto;
        margin-right: auto;
        width: 20%;
      }

      .login-card input[type=checkbox] {
        margin-bottom: 10px;
      }

      .login-card label {
        color: #999;
      }

      ul {
        font-weight: 100;
        padding-left: 1em;
        list-style-type: circle;
      }

      li + ul, ul + li, li + li {
        padding-top: 0.3em;
      }

      button {
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div class="login-card">
      <h1><%= title %></h1>
      <div class="login-client-image">
        <% if (client.logoUri) { %><img src="<%= client.logoUri %>"><% } %>
      </div>

      <ul>
      <% if ([details.scopes.accepted, details.scopes.rejected, details.claims.accepted, details.claims.rejected].every(({ length }) => length === 0)) { %>
        <li>this is a new authorization</li>
      <% } %>

      <% if ([details.scopes.new, details.claims.new].every(({ length }) => length === 0)) { %>
        <li>the client is asking you to confirm previously given authorization</li>
      <% } %>

      <% newScopes = new Set(details.scopes.new); newScopes.delete('openid'); newScopes.delete('offline_access') %>
      <% if (newScopes.size) { %>
        <li>scopes:</li>
        <ul>
          <% newScopes.forEach((scope) => { %>
            <li><%= scope %></li>
          <% }) %>
        </ul>
      <% } %>

      <% newClaims = new Set(details.claims.new); ['sub', 'sid', 'auth_time', 'acr', 'amr', 'iss'].forEach(Set.prototype.delete.bind(newClaims)) %>
      <% if (newClaims.size) { %>
        <li>claims:</li>
        <ul>
          <% newClaims.forEach((claim) => { %>
            <li><%= claim %></li>
          <% }) %>
        </ul>
      <% } %>

      <% if (params.scope && params.scope.includes('offline_access')) { %>
        <li>
        the client is asking to have offline access to this authorization
          <% if (!details.scopes.new.includes('offline_access')) { %>
            (which you've previously granted)
          <% } %>
        </li>
      <% } %>

      </ul>

      <form autocomplete="off" action="/interaction/<%= uid %>/confirm" method="post">
        <button autofocus type="submit" class="login login-submit">Continue</button>
      </form>
      <div class="login-help">
        <a href="/interaction/<%= uid %>/abort">[ Cancel ]</a>
        <% if (client.tosUri) { %>
          <a href="<%= client.tosUri %>">[ Terms of Service ]</a>
        <% } %>
        <% if (client.policyUri) { %>
          <a href="<%= client.policyUri %>">[ Privacy Policy ]</a>
        <% } %>
      </div>
    </div>
  </body>
</html>
`;

export const LOGIN_TEMPLATE_EJS: string = `<!DOCTYPE html>
<html >
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <title>Sign-in</title>
    <style>
      @import url(https://fonts.googleapis.com/css?family=Roboto:400,100);

      body {
        font-family: 'Roboto', sans-serif;
        margin-top: 25px;
        margin-bottom: 25px;
      }

      .login-card {
        padding: 40px;
        padding-top: 0px;
        padding-bottom: 10px;
        width: 274px;
        background-color: #F7F7F7;
        margin: 0 auto 10px;
        border-radius: 2px;
        box-shadow: 0px 2px 2px rgba(0, 0, 0, 0.3);
        overflow: hidden;
      }

      .login-card + .login-card {
        padding-top: 10px;
      }

      .login-card h1 {
        font-weight: 100;
        text-align: center;
        font-size: 2.3em;
      }

      .login-card h1 + p {
        font-weight: 100;
        text-align: center;
      }

      .login-card [type=submit] {
        width: 100%;
        display: block;
        margin-bottom: 10px;
        position: relative;
      }

      .login-card input[type=text], input[type=email], input[type=password] {
        height: 44px;
        font-size: 16px;
        width: 100%;
        margin-bottom: 10px;
        -webkit-appearance: none;
        background: #fff;
        border: 1px solid #d9d9d9;
        border-top: 1px solid #c0c0c0;
        padding: 0 8px;
        box-sizing: border-box;
        -moz-box-sizing: border-box;
      }

      .login {
        text-align: center;
        font-size: 14px;
        font-family: 'Arial', sans-serif;
        font-weight: 700;
        height: 36px;
        padding: 0 8px;
      }

      .login-submit {
        border: 0px;
        color: #fff;
        text-shadow: 0 1px rgba(0,0,0,0.1);
        background-color: #4d90fe;
      }

      .login-card a {
        text-decoration: none;
        color: #666;
        font-weight: 400;
        text-align: center;
        display: inline-block;
        opacity: 0.6;
      }

      .login-help {
        width: 100%;
        text-align: center;
        font-size: 12px;
      }

      .login-client-image img {
        margin-bottom: 20px;
        display: block;
        margin-left: auto;
        margin-right: auto;
        width: 20%;
      }

      .login-card input[type=checkbox] {
        margin-bottom: 10px;
      }

      .login-card label {
        color: #999;
      }

      ul {
        font-weight: 100;
        padding-left: 1em;
        list-style-type: circle;
      }

      li + ul, ul + li, li + li {
        padding-top: 0.3em;
      }

      button {
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div class="login-card">
      <h1><%= title %></h1>
      <% if (flash) { %>
        <p><%= flash %></p>
      <% } %>
      <form autocomplete="off" action="/interaction/<%= uid %>/login" method="post">
        <input required type="email" id="email" name="email" class="email" placeholder="Enter an email" <% if (!params.login_hint) { %>autofocus="on"<% } else { %> value="<%= params.login_hint %>" <% } %>>
        <input required type="password" id="password" name="password" class="password" placeholder="and password" <% if (params.login_hint) { %>autofocus="on"<% } %>>

        <button type="submit" id="submit" class="login login-submit">Sign-in</button>
      </form>
      <div class="login-help">
        <a href="/interaction/<%= uid %>/abort">[ Cancel ]</a>
        <% if (client.tosUri) { %>
          <a href="<%= client.tosUri %>">[ Terms of Service ]</a>
        <% } %>
        <% if (client.policyUri) { %>
          <a href="<%= client.policyUri %>">[ Privacy Policy ]</a>
        <% } %>
      </div>
    </div>
  </body>
</html>
`;

export interface IWebAppOptions {
  port: number;
  hostname: string;
}

export interface IPluginWebServiceOidcOptions {
  issuer: string;
  oidcProviderConfig: OidcProviderConfiguration;
  pluginRegistry: PluginRegistry;
  logLevel?: LogLevelDesc;
  webAppOptions?: IWebAppOptions;
}

export class PluginWebServiceOidc implements IPluginWebService {
  static async authenticate(email: string, password: string) {
    try {
      const lowercased = String(email).toLowerCase();
      const account = { id: "some-fake-account-id" };

      return account.id;
    } catch (err) {
      return undefined;
    }
  }

  private readonly log: Logger;
  private httpServer: Server | SecureServer | null = null;

  constructor(public readonly options: IPluginWebServiceOidcOptions) {
    if (!options) {
      throw new Error(`PluginWebServiceOidc#ctor options falsy.`);
    }
    this.log = LoggerProvider.getOrCreate({
      label: "plugin-web-service-oidc",
      level: this.options.logLevel,
    });
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
    expressApp: any
  ): Promise<IWebServiceEndpoint[]> {
    this.log.info(`Installing web services for plugin ${this.getId()}...`);
    const webApp: Express = this.options.webAppOptions ? express() : expressApp;

    // presence of webAppOptions implies that caller wants the plugin to configure it's own express instance on a custom
    // host/port to listen on
    if (this.options.webAppOptions) {
      this.log.info(`Creating dedicated HTTP server...`);
      const { port, hostname } = this.options.webAppOptions;

      webApp.use(bodyParser.json({ limit: "50mb" }));

      const address = await new Promise((resolve, reject) => {
        const httpServer = webApp.listen(port, hostname, (err: any) => {
          if (err) {
            reject(err);
            this.log.error(`Failed to create dedicated HTTP server`, err);
          } else {
            this.httpServer = httpServer;
            const theAddress = this.httpServer.address();
            resolve(theAddress);
          }
        });
      });
      this.log.info(`Creation of HTTP server OK`, { address });
    }

    const oidcProvider = new Provider(
      this.options.issuer,
      this.options.oidcProviderConfig
    );
    const endpoints: IWebServiceEndpoint[] = [];
    const pluginId = this.getId();
    const path = `/api/v1/plugins/${pluginId}/.well-known/openid-configuration`;
    const endpointOptions = { oidcProvider, hostPlugin: this, path };
    const endpoint = new OpenIdConfigurationEndpointV1(endpointOptions);

    webApp.get("/interaction/:uid", async (req: any, res: any, next: any) => {
      try {
        const details = await oidcProvider.interactionDetails(req, res);
        const { uid, prompt, params } = details;

        const client = await oidcProvider.Client.find(params.client_id);

        if (prompt.name === "login") {
          return res.send(
            ejs.render(LOGIN_TEMPLATE_EJS, {
              client,
              uid,
              details: prompt.details,
              params,
              title: "Sign-in",
              flash: undefined,
            })
          );
        }

        return res.send(
          ejs.render("interaction", {
            client,
            uid,
            details: prompt.details,
            params,
            title: "Authorize",
          })
        );
      } catch (err) {
        return next(err);
      }
    });

    const bodyParserUrl = bodyParser.urlencoded({ extended: false });

    webApp.post(
      "/interaction/:uid/login",
      bodyParserUrl,
      async (req: any, res: any, next: any) => {
        try {
          const { uid, prompt, params } = await oidcProvider.interactionDetails(
            req,
            res
          );
          const client = await oidcProvider.Client.find(params.client_id);

          const accountId = await PluginWebServiceOidc.authenticate(
            req.body.email,
            req.body.password
          );

          if (!accountId) {
            res.send(
              ejs.render(LOGIN_TEMPLATE_EJS, {
                client,
                uid,
                details: prompt.details,
                params: {
                  ...params,
                  login_hint: req.body.email,
                },
                title: "Sign-in",
                flash: "Invalid email or password.",
              })
            );
            return;
          }

          const result = {
            login: {
              account: accountId,
            },
          };

          await oidcProvider.interactionFinished(req, res, result, {
            mergeWithLastSubmission: false,
          });
        } catch (err) {
          next(err);
        }
      }
    );

    webApp.post(
      "/interaction/:uid/confirm",
      bodyParserUrl,
      async (req: any, res: any, next: any) => {
        try {
          const result = {
            consent: {
              // rejectedScopes: [], // < uncomment and add rejections here
              // rejectedClaims: [], // < uncomment and add rejections here
            },
          };
          await oidcProvider.interactionFinished(req, res, result, {
            mergeWithLastSubmission: true,
          });
        } catch (err) {
          next(err);
        }
      }
    );

    webApp.get(
      "/interaction/:uid/abort",
      async (req: any, res: any, next: any) => {
        try {
          const result = {
            error: "access_denied",
            error_description: "End-User aborted interaction",
          };
          await oidcProvider.interactionFinished(req, res, result, {
            mergeWithLastSubmission: false,
          });
        } catch (err) {
          next(err);
        }
      }
    );

    webApp.use(`/api/v1/plugins/${pluginId}`, oidcProvider.callback);
    endpoints.push(endpoint);
    this.log.info(`Registered endpoint at ${path}`);

    this.log.info(`Installed web services for plugin ${this.getId()} OK`, {
      endpoints,
    });
    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public getId(): string {
    return `@hyperledger/cactus-plugin-web-service-oidc`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.WEB_SERVICE;
  }
}
