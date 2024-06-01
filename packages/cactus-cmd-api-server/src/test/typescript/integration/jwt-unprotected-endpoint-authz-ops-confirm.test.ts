import { v4 as uuidv4 } from "uuid";
import { generateKeyPair, exportSPKI } from "jose";
import "jest-extended";
import expressJwt from "express-jwt";

import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  ApiServer,
  ConfigService,
  AuthorizationProtocol,
  IAuthorizationConfig,
} from "../../../main/typescript/public-api";

import { PluginLedgerConnectorStub } from "../fixtures/plugin-ledger-connector-stub/plugin-ledger-connector-stub";
import { UnprotectedActionEndpoint } from "../fixtures/plugin-ledger-connector-stub/web-services/unprotected-action-endpoint";

const testCase =
  "block unprotected endpoint if not confirmed by ops via deploy-time configuration";
const logLevel: LogLevelDesc = "TRACE";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: __filename,
});

test(testCase, async () => {
  try {
    const jwtKeyPair = await generateKeyPair("RS256", { modulusLength: 4096 });
    const jwtPublicKey = await exportSPKI(jwtKeyPair.publicKey);
    const expressJwtOptions: expressJwt.Params & { [key: string]: unknown } = {
      algorithms: ["RS256"],
      secret: jwtPublicKey,
      audience: uuidv4(),
      issuer: uuidv4(),
    };
    expect(expressJwtOptions).toBeTruthy();

    const authorizationConfig: IAuthorizationConfig = {
      unprotectedEndpointExemptions: [],
      expressJwtOptions,
      socketIoJwtOptions: { secret: jwtPublicKey },
    };

    const pluginRegistry = new PluginRegistry();
    const plugin = new PluginLedgerConnectorStub({
      logLevel,
      pluginRegistry,
      instanceId: uuidv4(),
    });
    pluginRegistry.add(plugin);

    const configService = new ConfigService();
    const apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.JSON_WEB_TOKEN;
    apiSrvOpts.authorizationConfigJson = authorizationConfig;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.plugins = [];
    const config = await configService.newExampleConfigConvict(apiSrvOpts);

    const apiServer = new ApiServer({
      config: config.getProperties(),
      pluginRegistry,
    });

    const eps = await plugin.getOrCreateWebServices();
    const epCsv = eps
      .filter((ep) => ep instanceof UnprotectedActionEndpoint)
      .map((ep) => ep.getPath())
      .join(",");
    const expectedMsg = `${ApiServer.E_NON_EXEMPT_UNPROTECTED_ENDPOINTS} ${epCsv}`;

    const startPromise = apiServer.start();

    await expect(startPromise).rejects.toHaveProperty(
      ["cause", "message"],
      expectedMsg,
    );
  } catch (ex) {
    log.error(ex);
    fail("Exception thrown during test execution, see above for details!");
  }
});
