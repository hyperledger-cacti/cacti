// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import { AddressInfo } from "net";
import jose from "jose";
import { Issuer, generators } from "openid-client";
import { ClientMetadata } from "oidc-provider";
import puppeteer, { Request as PuppeteerRequest } from "puppeteer";
import { Logger, LoggerProvider, Servers } from "@hyperledger/cactus-common";
import {
  ApiServer,
  ConfigService,
  ICactusApiServerOptions,
} from "@hyperledger/cactus-cmd-api-server";

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  Configuration,
  DefaultApi as ApiApiServer,
} from "@hyperledger/cactus-cmd-api-server";

import { ApiClient } from "@hyperledger/cactus-api-client";

import {
  DefaultApi as ApiOidc,
  PluginWebServiceOidc,
  IPluginWebServiceOidcOptions,
} from "@hyperledger/cactus-plugin-web-service-oidc";

LoggerProvider.setLogLevel("TRACE");
const log: Logger = LoggerProvider.getOrCreate({
  label: "test-plug-in-to-api-server-and-authenticate",
});

tap.test("can authenticate/authorize via API server", async (assert: any) => {
  // 2. Instantiate plugin registry which will be used by the web service plugin
  const pluginRegistry = new PluginRegistry({ plugins: [] });

  // 3. Instantiate HTTP servers for API and cockpit in advance to know what the randomly assigned ports will be
  // prior to calling the start() method of the API server object down below.
  // This is necessary because we are assembling the OIDC web service plugin also prior to creating the
  // ApiServer object and we need to know the port numbers for that as well.

  // use port 3000 for cockpit, if available, random otherwise
  const httpServerCockpit = await Servers.startOnPreferredPort(3000);
  const addressInfoCockpit = httpServerCockpit.address() as AddressInfo;
  const cockpitUrl = `http://${addressInfoCockpit.address}:${addressInfoCockpit.port}`;
  log.debug(`AddressInfoCockpit: `, addressInfoCockpit);
  log.debug(`Cockpit URL: `, cockpitUrl);

  const httpServerApi = await Servers.startOnPreferredPort(4000);

  const addressInfoApi = httpServerApi.address() as AddressInfo;
  log.debug(`AddressInfoApi: `, addressInfoApi);
  const apiUrl = `http://${addressInfoApi.address}:${addressInfoApi.port}`;
  log.debug(`API URL: ${apiUrl}`);

  assert.ok(
    addressInfoCockpit.port !== addressInfoApi.port,
    "API/Cockpit ports are separate.",
  );

  // 4. Instantiate the web service oidc plugin which will host itself on a new TCP port for isolation/security
  // Note that if we omitted the `webAppOptions` object that the web service plugin would default to installing itself
  // on the default port of the API server. This allows for flexibility in deployments.

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
  const jwks = keystore.toJWKS(true);

  const issuer = apiUrl;
  const responseType = "code";
  const cockpitCallbackUri = `${cockpitUrl}/oauth2/callback`;
  const oidcClientMetadata: ClientMetadata = {
    client_id: "foo",
    client_secret: "bar",
    redirect_uris: [
      cockpitCallbackUri,
      `http://127.0.0.1:4200`,
      `http://localhost:4200`, // good for testing the cockpit with ng serve
    ],
    response_types: [responseType],
    scope: "openid email profile",
    formats: {
      AccessToken: "jwt",
    },
    grant_types: ["authorization_code"],
    features: {
      encryption: { enabled: true },
      introspection: { enabled: true },
      revocation: { enabled: true },

      // disable the packaged interactions
      devInteractions: { enabled: false },
    },

    // let's tell oidc-provider you also support the email scope, which will contain email and
    // email_verified claims
  };

  log.info(JSON.stringify(oidcClientMetadata, null, 4));

  oidcClientMetadata.jwks = jwks;

  (oidcClientMetadata.findAccount = (ctx: any, id: any) => {
    log.debug(`findAccount() `, { ctx, id });
    // This would ideally be just a check whether the account is still in your storage
    const account = { email: "fake-email@example.com", email_verified: true };
    if (!account) {
      return undefined;
    }

    return {
      accountId: id,
      // and this claims() method would actually query to retrieve the account claims
      async claims() {
        return {
          sub: id,
          email: account.email,
          email_verified: account.email_verified,
        };
      },
    };
  }),
    // let's tell oidc-provider where our own interactions will be
    // setting a nested route is just good practice so that users
    // don't run into weird issues with multiple interactions open
    // at a time.
    (oidcClientMetadata.interactions = {
      url(ctx: any) {
        log.debug(`iteractions:URL: `, ctx);
        return `/interaction/${ctx.oidc.uid}`;
      },
    });

  const options: IPluginWebServiceOidcOptions = {
    instanceId: "PluginWebServiceOidc_1",
    pluginRegistry,
    allowLocalhost: true,
    allowWithoutTls: true,
    issuer,
    logLevel: "TRACE",
    oidcProviderConfig: {
      scopes: ["openid", "email", "profile"],
      clients: [oidcClientMetadata],
    },
  };
  const webServiceOidcPlugin = new PluginWebServiceOidc(options);
  pluginRegistry.add(webServiceOidcPlugin);

  // 4. Create the API Server object that we embed in this test
  const configService = new ConfigService();
  const cactusApiServerOptions: ICactusApiServerOptions = configService.newExampleConfig();
  cactusApiServerOptions.configFile = ""; // means no config file to load
  cactusApiServerOptions.apiCorsDomainCsv = "*";
  cactusApiServerOptions.apiPort = addressInfoApi.port;
  const config = configService.newExampleConfigConvict(cactusApiServerOptions);

  const apiServer = new ApiServer({
    config: config.getProperties(),
    httpServerApi,
    httpServerCockpit,
    pluginRegistry,
  });

  // Comment this out if you want to keep running the API server (and the test case with the debugger)
  // Really good for debugging the OIDC flow with an actual browser to see how it works under the hood.
  assert.tearDown(() => apiServer.shutdown());

  // 5. Start the API server which is now listening on port A and it's healthcheck works through the main SDK
  await apiServer.start();

  // 6. Instantiate the main SDK dynamically with whatever port the API server ended up bound to (port 0)
  const configuration = new Configuration({ basePath: apiUrl });
  const api = new ApiClient(configuration)
    .extendWith(ApiOidc)
    .extendWith(ApiApiServer);

  // 7. Issue an API call to the API server via the main SDK verifying that the SDK and the API server both work
  const healthcheckResp = await api.getHealthCheck();
  assert.ok(healthcheckResp, "HealthCheckResponse received OK");
  assert.ok(healthcheckResp.data, "body OK");
  assert.ok(healthcheckResp.data.success, "body.success OK");
  assert.ok(healthcheckResp.data.memoryUsage, "body.memoryUsage OK");
  assert.ok(healthcheckResp.data.createdAt, "body.createdAt OK");

  const oidcConfigResp = await api.apiV1PluginsHyperledgerCactusPluginWebServiceOidcWellKnownOpenidConfigurationGet();
  assert.ok(oidcConfigResp, "OIDC config response OK");
  const oidcProviderMetadata: any = oidcConfigResp.data;
  assert.ok(oidcProviderMetadata, "OIDC config response data OK");
  log.debug(`OIDC Configuration: `, oidcConfigResp.data);

  const issuerCactus = new Issuer(oidcProviderMetadata);

  const client = new issuerCactus.Client({
    client_id: "foo",
    client_secret: "bar",
    redirect_uris: [cockpitCallbackUri],
    response_types: ["code"],
    // id_token_signed_response_alg (default "RS256")
    // token_endpoint_auth_method (default "client_secret_basic")
  }); // => Client
  assert.ok(client, "OpenID Client Issuer Cactus OK");

  const codeVerifier = generators.codeVerifier();

  const codeChallenge = generators.codeChallenge(codeVerifier);
  assert.ok(codeChallenge, "OpenID code challange OK");

  const authorizationRedirectUri = client.authorizationUrl({
    scope: oidcClientMetadata.scope,
    // resource: 'http://localhost:4000/',
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  assert.ok(
    authorizationRedirectUri,
    `authorizationRedirectUri OK: ${authorizationRedirectUri}`,
  );

  // use this line instead of the one below it if you want to do a step by step visual debugging where you can look at
  // the chrome instance in slow motion and with the chrome dev tools enabled. Helped me a *lot* when writing this test.
  // const browser = await puppeteer.launch({ headless: false, slowMo: 100, devtools: true });

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setRequestInterception(true);

  const callbackUrlWithCodePromise = new Promise<string>((resolve) => {
    page.on("request", async (req: PuppeteerRequest) => {
      const aUrl = req.url();
      if (aUrl.includes(`oauth2/callback`)) {
        log.debug(`Puppeteer Request: `, aUrl);
        resolve(aUrl);
      }
      req.continue();
    });
  });

  page.setCacheEnabled(false);
  await page.goto(authorizationRedirectUri, {
    timeout: 5000,
    waitUntil: "networkidle2",
  });

  // Useful if you just want a screenshot at a certain point
  // await page.screenshot({ path: "./screenshot-of-login-page.png", type: "png" });
  await page.type(`input[name="login"]`, "myemail@example.com");
  await page.type(`input[name="password"]`, "password");
  await page.click(`button[type="submit"]`);
  const btnContinue = await page.waitForXPath(
    '//button[contains(text(),"Continue")]',
    { visible: true },
  );
  await btnContinue.click();

  const callbackUrlWithCode = await callbackUrlWithCodePromise;
  browser.close();
  const params = client.callbackParams(callbackUrlWithCode);
  assert.ok(params, "client.callbackParams() OK");

  const tokenSet = await client.callback(cockpitCallbackUri, params, {
    code_verifier: codeVerifier,
  }); // => Promise
  assert.ok(tokenSet, "Received token set OK");
  log.debug("received and validated tokens %j", tokenSet);

  assert.ok(tokenSet.access_token, "token set has access token OK");

  const userinfo = await client.userinfo(tokenSet); // => Promise
  log.debug("userinfo %j", userinfo);
  assert.ok(userinfo, "Obtined user info OK");

  // log.debug('validated ID Token claims %j', tokenSet.claims());

  assert.end();
});
