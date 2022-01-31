import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  generateKeyPair,
  exportPKCS8,
  SignJWT,
  GenerateKeyPairResult,
} from "jose";
import expressJwt from "express-jwt";
import "jest-extended";

import {
  ApiServer,
  ConfigService,
  ICactusApiServerOptions,
  isHealthcheckResponse,
} from "../../../main/typescript/public-api";
import { DefaultApi as ApiServerApi } from "../../../main/typescript/public-api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { Configuration } from "@hyperledger/cactus-core-api";
import { AuthorizationProtocol } from "../../../main/typescript/config/authorization-protocol";
import { IAuthorizationConfig } from "../../../main/typescript/authzn/i-authorization-config";

const testCase = "API server enforces authorization rules when configured";
const logLevel: LogLevelDesc = "TRACE";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: __filename,
});

describe(testCase, () => {
  let apiServer: ApiServer,
    expressJwtOptions: expressJwt.Options,
    jwtKeyPair: GenerateKeyPairResult,
    apiSrvOpts: ICactusApiServerOptions;

  beforeAll(async () => {
    const pluginsPath = path.join(
      __dirname, // start at the current file's path
      "../../../../../../", // walk back up to the project root
      ".tmp/test/cmd-api-server/jwt-endpoint-authorization_test", // the dir path from the root
      uuidv4(), // then a random directory to ensure proper isolation
    );
    jwtKeyPair = await generateKeyPair("RS256", {
      modulusLength: 4096,
    });
    const jwtPrivateKeyPem = await exportPKCS8(jwtKeyPair.privateKey);
    expressJwtOptions = {
      algorithms: ["RS256"],
      secret: jwtPrivateKeyPem,
      audience: uuidv4(),
      issuer: uuidv4(),
    };

    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });
    const authorizationConfig: IAuthorizationConfig = {
      unprotectedEndpointExemptions: [],
      expressJwtOptions,
      socketIoJwtOptions: {
        secret: jwtPrivateKeyPem,
      },
    };
    const configService = new ConfigService();
    apiSrvOpts = await configService.newExampleConfig();
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

    apiServer = new ApiServer({
      config: config.getProperties(),
    });
  });
  afterAll(async () => await apiServer.shutdown());

  test(testCase, async () => {
    try {
      expect(expressJwtOptions).toBeTruthy();

      const jwtPayload = { name: "Peter", location: "London" };
      const tokenGood = await new SignJWT(jwtPayload)
        .setProtectedHeader({
          alg: "RS256",
        })
        .setIssuer(expressJwtOptions.issuer)
        .setAudience(expressJwtOptions.audience)
        .sign(jwtKeyPair.privateKey);
      // const tokenBad = JWT.sign(jwtPayload, jwtKeyPair);

      const startResponse = apiServer.start();
      await expect(startResponse).not.toReject;
      expect(startResponse).toBeTruthy();

      const addressInfoApi = (await startResponse).addressInfoApi;
      const protocol = apiSrvOpts.apiTlsEnabled ? "https" : "http";
      const { address, port } = addressInfoApi;
      const apiHost = `${protocol}://${address}:${port}`;

      const baseOptions = { headers: { Authorization: `Bearer ${tokenGood}` } };
      const conf = new Configuration({ basePath: apiHost, baseOptions });
      const apiClient = new ApiServerApi(conf);
      const resHc = await apiClient.getHealthCheckV1();
      expect(resHc).toBeTruthy();
      expect(resHc.status).toEqual(200);
      expect(typeof resHc.data).toBeTruthy();
      expect(resHc.data.createdAt).toBeTruthy();
      expect(resHc.data.memoryUsage).toBeTruthy();
      expect(resHc.data.memoryUsage.rss).toBeTruthy();
      expect(resHc.data.success).toBeTruthy();
      expect(isHealthcheckResponse(resHc.data)).toBe(true);
    } catch (ex) {
      log.error(ex);
      fail("Exception thrown during test execution, see above for details!");
      throw ex;
    }
  });
});
