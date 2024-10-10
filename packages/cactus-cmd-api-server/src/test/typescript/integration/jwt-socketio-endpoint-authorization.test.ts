import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { generateKeyPair, exportSPKI, SignJWT } from "jose";
import type { Params as ExpressJwtOptions } from "express-jwt";
import type { AuthorizeOptions as SocketIoJwtOptions } from "@thream/socketio-jwt";

import { Constants } from "@hyperledger/cactus-core-api";
import { IJoseFittingJwtParams } from "@hyperledger/cactus-common";

import {
  ApiServer,
  ConfigService,
  HealthCheckResponse,
  isHealthcheckResponse,
} from "../../../main/typescript/public-api";
import { ApiServerApiClient } from "../../../main/typescript/public-api";
import { ApiServerApiClientConfiguration } from "../../../main/typescript/public-api";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { AuthorizationProtocol } from "../../../main/typescript/config/authorization-protocol";
import { IAuthorizationConfig } from "../../../main/typescript/authzn/i-authorization-config";
import { lastValueFrom } from "rxjs";

const testCase = "API server enforces authorization for SocketIO endpoints";
describe("cmd-api-server:ApiServer", () => {
  let apiServer: ApiServer;
  let apiClientFixable: ApiServerApiClient;
  let apiHost: string;
  let validBearerToken: string;

  const logLevel: LogLevelDesc = "WARN";

  afterAll(async () => {
    apiServer.shutdown();
  });

  beforeAll(async () => {
    const jwtKeyPair = await generateKeyPair("RS256", { modulusLength: 4096 });
    const jwtPublicKey = await exportSPKI(jwtKeyPair.publicKey);
    const expressJwtOptions: ExpressJwtOptions & IJoseFittingJwtParams = {
      algorithms: ["RS256"],
      secret: jwtPublicKey,
      audience: uuidv4(),
      issuer: uuidv4(),
    };
    const socketIoJwtOptions: SocketIoJwtOptions = {
      secret: jwtPublicKey,
      algorithms: ["RS256"],
    };
    expect(expressJwtOptions).toBeTruthy();

    const authorizationConfig: IAuthorizationConfig = {
      unprotectedEndpointExemptions: [],
      expressJwtOptions,
      socketIoJwtOptions,
      socketIoPath: Constants.SocketIoConnectionPathV1,
    };

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
    apiSrvOpts.logLevel = logLevel;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.plugins = [];
    const config = await configService.newExampleConfigConvict(apiSrvOpts);

    apiServer = new ApiServer({
      config: config.getProperties(),
    });

    const startResponsePromise = apiServer.start();
    await expect(startResponsePromise).toResolve();
    const startResponse = await startResponsePromise;
    expect(startResponse).toBeTruthy();

    const addressInfoApi = (await startResponsePromise).addressInfoApi;
    const protocol = apiSrvOpts.apiTlsEnabled ? "https" : "http";
    const { address, port } = addressInfoApi;
    apiHost = `${protocol}://${address}:${port}`;

    const jwtPayload = {
      name: "Peter",
      location: "London",
      scope: "read:health",
    };
    const validJwt = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(expressJwtOptions.issuer)
      .setAudience(expressJwtOptions.audience)
      .sign(jwtKeyPair.privateKey);
    expect(validJwt).toBeTruthy();

    validBearerToken = `Bearer ${validJwt}`;
    expect(validBearerToken).toBeTruthy();

    apiClientFixable = new ApiServerApiClient(
      new ApiServerApiClientConfiguration({
        basePath: apiHost,
        baseOptions: { headers: { Authorization: "Mr. Invalid Token" } },
        logLevel,
        tokenProvider: {
          get: () => Promise.resolve(validBearerToken),
        },
      }),
    );
  });

  test(testCase, async () => {
    const apiClientBad = new ApiServerApiClient(
      new ApiServerApiClientConfiguration({
        basePath: apiHost,
        baseOptions: { headers: { Authorization: "Mr. Invalid Token" } },
        logLevel,
      }),
    );

    const apiClientGood = new ApiServerApiClient(
      new ApiServerApiClientConfiguration({
        basePath: apiHost,
        baseOptions: { headers: { Authorization: validBearerToken } },
        logLevel,
        tokenProvider: {
          get: () => Promise.resolve(validBearerToken),
        },
      }),
    );

    {
      const healthchecks = await apiClientBad.watchHealthcheckV1();

      const watchHealthcheckV1WithBadToken = new Promise((resolve, reject) => {
        healthchecks.subscribe({
          next: () => {
            resolve(new Error("Was authorized with an invalid token, bad."));
          },
          error: (ex: Error) => {
            reject(ex);
          },
          complete: () => {
            resolve(new Error("Was authorized with an invalid token, bad."));
          },
        });
      });

      await expect(watchHealthcheckV1WithBadToken).rejects.toHaveProperty(
        "message",
        "Format is Authorization: Bearer [token]",
      );
    }

    {
      const resHc = await apiClientGood.getHealthCheckV1();
      expect(resHc).toBeTruthy();
      expect(resHc.status).toEqual(200);
      expect(typeof resHc.data).toBe("object");
      expect(resHc.data.createdAt).toBeTruthy();
      expect(resHc.data.memoryUsage).toBeTruthy();
      expect(resHc.data.memoryUsage.rss).toBeTruthy();
      expect(resHc.data.success).toBeTruthy();
      expect(isHealthcheckResponse(resHc.data)).toBeTruthy();
    }

    {
      let idx = 0;
      const healthchecks = await apiClientFixable.watchHealthcheckV1();
      const sub = healthchecks.subscribe((next: HealthCheckResponse) => {
        idx++;
        if (idx > 2) {
          sub.unsubscribe();
        }
        expect(next).toBeTruthy();
        expect(typeof next).toBe("object");
        expect(next.createdAt).toBeTruthy();
        expect(next.memoryUsage).toBeTruthy();
        expect(next.memoryUsage.rss).toBeTruthy();
        expect(next.success).toBeTruthy();
        expect(isHealthcheckResponse(next)).toBeTrue();
      });

      const hcr = await lastValueFrom(healthchecks);
      expect(isHealthcheckResponse(hcr)).toBeTruthy();

      const resHc = await apiClientFixable.getHealthCheckV1();
      expect(resHc).toBeTruthy();
      expect(resHc.status).toEqual(200);
      expect(typeof resHc.data).toBe("object");
      expect(resHc.data.createdAt).toBeTruthy();
      expect(resHc.data.memoryUsage).toBeTruthy();
      expect(resHc.data.memoryUsage.rss).toBeTruthy();
      expect(resHc.data.success).toBeTruthy();
      expect(isHealthcheckResponse(resHc.data)).toBeTruthy();
    }
  });
});
