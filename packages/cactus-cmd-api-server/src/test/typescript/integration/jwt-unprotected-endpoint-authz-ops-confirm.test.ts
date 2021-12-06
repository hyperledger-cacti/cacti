import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { generateKeyPair, exportSPKI } from "jose";
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

const testCase =
  "block unprotected endpoint if not confirmed by ops via deploy-time configuration";
const logLevel: LogLevelDesc = "TRACE";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: __filename,
});

test(testCase, async (t: Test) => {
  try {
    const jwtKeyPair = await generateKeyPair("RS256", { modulusLength: 4096 });
    const jwtPublicKey = await exportSPKI(jwtKeyPair.publicKey);
    const expressJwtOptions: expressJwt.Options = {
      algorithms: ["RS256"],
      secret: jwtPublicKey,
      audience: uuidv4(),
      issuer: uuidv4(),
    };
    t.ok(expressJwtOptions, "Express JWT config truthy OK");

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
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.plugins = [];
    const config = await configService.newExampleConfigConvict(apiSrvOpts);

    const apiServer = new ApiServer({
      config: config.getProperties(),
      pluginRegistry,
    });

    const mainAssertion =
      "API server refuses to start when non-exempt unprotected endpoints are present OK";
    await t.rejects(
      apiServer.start(),
      new RegExp(ApiServer.E_NON_EXEMPT_UNPROTECTED_ENDPOINTS),
      mainAssertion,
    );
    t.end();
  } catch (ex) {
    log.error(ex);
    t.fail("Exception thrown during test execution, see above for details!");
    throw ex;
  }
});
