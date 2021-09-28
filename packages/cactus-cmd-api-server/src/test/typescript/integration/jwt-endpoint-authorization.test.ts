import path from "path";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { generateKeyPair, exportPKCS8, SignJWT } from "jose";
import expressJwt from "express-jwt";

import {
  ApiServer,
  ConfigService,
  isHealthcheckResponse,
} from "../../../main/typescript/public-api";
import { DefaultApi as ApiServerApi } from "../../../main/typescript/public-api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { Configuration } from "@hyperledger/cactus-core-api";
import { AuthorizationProtocol } from "../../../main/typescript/config/authorization-protocol";
import { IAuthorizationConfig } from "../../../main/typescript/authzn/i-authorization-config";
import axios from "axios";
import { RuntimeError } from "run-time-error";

const testCase = "API server enforces authorization rules when configured";
const logLevel: LogLevelDesc = "TRACE";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: __filename,
});

test(testCase, async (t: Test) => {
  try {
    const jwtKeyPair = await generateKeyPair("RS256", { modulusLength: 4096 });
    const jwtPrivateKeyPem = await exportPKCS8(jwtKeyPair.privateKey);
    const expressJwtOptions: expressJwt.Options = {
      algorithms: ["RS256"],
      secret: jwtPrivateKeyPem,
      audience: uuidv4(),
      issuer: uuidv4(),
    };
    t.ok(expressJwtOptions, "Express JWT config truthy OK");

    const jwtPayload = { name: "Peter", location: "London" };
    const tokenGood = await new SignJWT(jwtPayload)
      .setProtectedHeader({
        alg: "RS256",
      })
      .setIssuer(expressJwtOptions.issuer)
      .setAudience(expressJwtOptions.audience)
      .sign(jwtKeyPair.privateKey);
    // const tokenBad = JWT.sign(jwtPayload, jwtKeyPair);

    const authorizationConfig: IAuthorizationConfig = {
      unprotectedEndpointExemptions: [],
      expressJwtOptions,
      socketIoJwtOptions: {
        secret: jwtPrivateKeyPem,
      },
    };

    const pluginsPath = path.join(
      __dirname, // start at the current file's path
      "../../../../../../", // walk back up to the project root
      ".tmp/test/cmd-api-server/jwt-endpoint-authorization_test", // the dir path from the root
      uuidv4(), // then a random directory to ensure proper isolation
    );
    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

    const configService = new ConfigService();
    const apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.JSON_WEB_TOKEN;
    apiSrvOpts.pluginManagerOptionsJson = pluginManagerOptionsJson;
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

    const baseOptions = { headers: { Authorization: `Bearer ${tokenGood}` } };
    const conf = new Configuration({ basePath: apiHost, baseOptions });
    const apiClient = new ApiServerApi(conf);
    const resHc = await apiClient.getHealthCheckV1();
    t.ok(resHc, "healthcheck response truthy OK");
    t.equal(resHc.status, 200, "healthcheck response status === 200 OK");
    t.equal(typeof resHc.data, "object", "typeof resHc.data is 'object' OK");
    t.ok(resHc.data.createdAt, "resHc.data.createdAt truthy OK");
    t.ok(resHc.data.memoryUsage, "resHc.data.memoryUsage truthy OK");
    t.ok(resHc.data.memoryUsage.rss, "resHc.data.memoryUsage.rss truthy OK");
    t.ok(resHc.data.success, "resHc.data.success truthy OK");
    t.true(isHealthcheckResponse(resHc.data), "isHealthcheckResponse OK");
    t.end();
  } catch (ex: unknown) {
    if (axios.isAxiosError(ex)) {
      log.error(ex);
      t.fail("Exception thrown during test execution, see above for details!");
      throw ex;
    } else if (ex instanceof Error) {
      throw new RuntimeError("unexpected exception", ex);
    } else {
      throw new RuntimeError(
        "unexpected exception with incorrect type",
        JSON.stringify(ex),
      );
    }
  }
});
