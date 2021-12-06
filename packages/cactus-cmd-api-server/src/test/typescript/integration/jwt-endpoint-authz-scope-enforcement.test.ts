import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { generateKeyPair, exportSPKI, SignJWT } from "jose";
import expressJwt from "express-jwt";
import axios, { Method } from "axios";
import { StatusCodes } from "http-status-codes";

import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  ApiServer,
  ConfigService,
  AuthorizationProtocol,
  IAuthorizationConfig,
} from "../../../main/typescript/public-api";

import { PluginLedgerConnectorStub } from "../fixtures/plugin-ledger-connector-stub/plugin-ledger-connector-stub";
import { RunTransactionEndpoint } from "../fixtures/plugin-ledger-connector-stub/web-services/run-transaction-endpoint";
import { DeployContractEndpoint } from "../fixtures/plugin-ledger-connector-stub/web-services/deploy-contract-endpoint";
import { UnprotectedActionEndpoint } from "../fixtures/plugin-ledger-connector-stub/web-services/unprotected-action-endpoint";

const testCase =
  "API server enforces scope requirements on top of generic authz";
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

    const unprotectedActionEp = new UnprotectedActionEndpoint({
      connector: {} as PluginLedgerConnectorStub,
      logLevel,
    });

    const authorizationConfig: IAuthorizationConfig = {
      unprotectedEndpointExemptions: [unprotectedActionEp.getPath()],
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
    test.onFinish(async () => await apiServer.shutdown());

    const startResponse = apiServer.start();
    await t.doesNotReject(
      startResponse,
      "failed to start API server with dynamic plugin imports configured for it...",
    );
    t.ok(startResponse, "startResponse truthy OK");

    const addressInfoApi = (await startResponse).addressInfoApi;
    const protocol = apiSrvOpts.apiTlsEnabled ? "https" : "http";
    const { address, port } = addressInfoApi;
    const apiHost = `${protocol}://${address}:${port}`;

    const jwtPayload = {
      name: "Peter",
      location: "London",
      scope: [...RunTransactionEndpoint.OAUTH2_SCOPES],
    };

    const token = await new SignJWT(jwtPayload)
      .setProtectedHeader({
        alg: "RS256",
      })
      .setIssuer(expressJwtOptions.issuer)
      .setAudience(expressJwtOptions.audience)
      .sign(jwtKeyPair.privateKey);

    const runTxEp = new RunTransactionEndpoint({
      connector: {} as PluginLedgerConnectorStub,
      logLevel,
    });
    const req1 = {
      requestId: uuidv4(),
    };
    const res1 = await axios.request({
      data: req1,
      url: `${apiHost}${runTxEp.getPath()}`,
      method: runTxEp.getVerbLowerCase() as Method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    t.ok(res1, "stub run tx response truthy OK");
    t.equal(res1.status, 200, "stub run tx response status === 200 OK");
    t.equal(typeof res1.data, "object", "typeof res1.data is 'object' OK");
    t.ok(typeof res1.data.data, "res1.data.data truthy OK");
    t.ok(typeof res1.data.data.requestId, "res1.data.data.requestId truthy OK");
    t.equal(
      res1.data.data.requestId,
      req1.requestId,
      "res1.data.requestId === req1.requestId OK",
    );

    try {
      const deployContractEp = new DeployContractEndpoint({
        connector: {} as PluginLedgerConnectorStub,
        logLevel,
      });
      await axios.request({
        url: `${apiHost}${deployContractEp.getPath()}`,
        method: deployContractEp.getVerbLowerCase() as Method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      t.fail("deploy contract response status === 403 FAIL");
    } catch (out) {
      t.ok(out, "error thrown for forbidden endpoint truthy OK");
      t.ok(out.response, "deploy contract response truthy OK");
      t.equal(
        out.response.status,
        StatusCodes.FORBIDDEN,
        "deploy contract response status === 403 OK",
      );
      t.notok(out.response.data.data, "out.response.data.data falsy OK");
      t.notok(out.response.data.success, "out.response.data.success falsy OK");
    }
    t.end();
  } catch (ex) {
    log.error(ex);
    t.fail("Exception thrown during test execution, see above for details!");
    throw ex;
  }
});
