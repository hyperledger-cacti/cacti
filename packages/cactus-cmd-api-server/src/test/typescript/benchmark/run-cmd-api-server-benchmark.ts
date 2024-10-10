import path from "path";
import { EOL } from "os";

import * as Benchmark from "benchmark";
import { v4 as uuidv4 } from "uuid";
import type { AuthorizeOptions as SocketIoJwtOptions } from "@thream/socketio-jwt";
import type { Params as ExpressJwtOptions } from "express-jwt";
import { SignJWT, exportSPKI, generateKeyPair } from "jose";
import { RuntimeError } from "run-time-error-cjs";
import * as grpc from "@grpc/grpc-js";
import fse from "fs-extra";

import { LogLevelDesc } from "@hyperledger/cactus-common";

import { IJoseFittingJwtParams } from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Constants } from "@hyperledger/cactus-core-api";

import {
  ApiServer,
  ApiServerApiClient,
  ApiServerApiClientConfiguration,
  AuthorizationProtocol,
  ConfigService,
  IAuthorizationConfig,
} from "../../../main/typescript/public-api";

import { default_service, empty } from "../../../main/typescript/public-api";

const LOG_TAG =
  "[packages/cactus-cmd-api-server/src/test/typescript/benchmark/run-cmd-api-server-benchmark.ts]";

const createTestInfrastructure = async (opts: {
  readonly logLevel: LogLevelDesc;
}): Promise<{
  readonly httpApi: ApiServerApiClient;
  readonly grpcCredentials: grpc.ChannelCredentials;
  readonly grpcHost: string;
  readonly apiServer: ApiServer;
}> => {
  const logLevel = opts.logLevel || "DEBUG";

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

  const authorizationConfig: IAuthorizationConfig = {
    unprotectedEndpointExemptions: [],
    expressJwtOptions,
    socketIoJwtOptions,
    socketIoPath: Constants.SocketIoConnectionPathV1,
  };

  const pluginsPath = path.join(
    __dirname,
    "../../../../../../", // walk back up to the project root
    "packages/cactus-cmd-api-server/src/test/typescript/benchmark/run-cmd-api-server-benchmark/", // the dir path from the root
    uuidv4(), // then a random directory to ensure proper isolation
  );
  const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

  const pluginRegistry = new PluginRegistry({ logLevel });

  const configService = new ConfigService();

  const apiSrvOpts = await configService.newExampleConfig();
  apiSrvOpts.logLevel = logLevel;
  apiSrvOpts.pluginManagerOptionsJson = pluginManagerOptionsJson;
  apiSrvOpts.authorizationProtocol = AuthorizationProtocol.JSON_WEB_TOKEN;
  apiSrvOpts.authorizationConfigJson = authorizationConfig;
  apiSrvOpts.configFile = "";
  apiSrvOpts.apiCorsDomainCsv = "*";
  apiSrvOpts.apiPort = 0;
  apiSrvOpts.cockpitPort = 0;
  apiSrvOpts.grpcPort = 0;
  apiSrvOpts.crpcPort = 0;
  apiSrvOpts.apiTlsEnabled = false;
  apiSrvOpts.grpcMtlsEnabled = false;
  apiSrvOpts.plugins = [];

  const config = await configService.newExampleConfigConvict(apiSrvOpts);

  const apiServer = new ApiServer({
    config: config.getProperties(),
    pluginRegistry,
  });

  apiServer.initPluginRegistry({ pluginRegistry });
  const startResponsePromise = apiServer.start();

  const { addressInfoApi, addressInfoGrpc } = await startResponsePromise;
  const protocol = apiSrvOpts.apiTlsEnabled ? "https" : "http";
  const { address, port } = addressInfoApi;
  const apiHost = `${protocol}://${address}:${port}`;

  const grpcHost = `${addressInfoGrpc.address}:${addressInfoGrpc.port}`;

  const jwtPayload = {
    name: "Peter",
    location: "London",
    scope: "read:spec",
  };
  const validJwt = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(expressJwtOptions.issuer)
    .setAudience(expressJwtOptions.audience)
    .sign(jwtKeyPair.privateKey);

  const validBearerToken = `Bearer ${validJwt}`;

  const apiClient = new ApiServerApiClient(
    new ApiServerApiClientConfiguration({
      basePath: apiHost,
      baseOptions: { headers: { Authorization: validBearerToken } },
      logLevel,
    }),
  );

  const grpcCredentials = grpc.credentials.createInsecure();

  return {
    grpcCredentials,
    httpApi: apiClient,
    grpcHost,
    apiServer,
  };
};

const main = async (opts: { readonly argv: Readonly<Array<string>> }) => {
  const logLevel: LogLevelDesc = "WARN";

  const gitRootPath = path.join(
    __dirname,
    "../../../../../../", // walk back up to the project root
  );

  console.log("%s gitRootPath=%s", LOG_TAG, gitRootPath);

  const DEFAULT_OUTPUT_FILE_RELATIVE_PATH =
    ".tmp/benchmark-results/cmd-api-server/run-cmd-api-server-benchmark.ts.log";

  const relativeOutputFilePath =
    opts.argv[2] === undefined
      ? DEFAULT_OUTPUT_FILE_RELATIVE_PATH
      : opts.argv[2];

  console.log(
    "%s DEFAULT_OUTPUT_FILE_RELATIVE_PATH=%s",
    LOG_TAG,
    DEFAULT_OUTPUT_FILE_RELATIVE_PATH,
  );

  console.log("%s opts.argv[2]=%s", LOG_TAG, opts.argv[2]);

  console.log("%s relativeOutputFilePath=%s", LOG_TAG, relativeOutputFilePath);

  const absoluteOutputFilePath = path.join(gitRootPath, relativeOutputFilePath);

  console.log("%s absoluteOutputFilePath=%s", LOG_TAG, absoluteOutputFilePath);

  const absoluteOutputDirPath = path.dirname(absoluteOutputFilePath);
  console.log("%s absoluteOutputDirPath=%s", LOG_TAG, absoluteOutputDirPath);

  await fse.mkdirp(absoluteOutputDirPath);
  console.log("%s mkdir -p OK: %s", LOG_TAG, absoluteOutputDirPath);

  const { apiServer, httpApi, grpcHost, grpcCredentials } =
    await createTestInfrastructure({ logLevel });

  const minSamples = 100;
  const suite = new Benchmark.Suite({});

  const cycles: string[] = [];

  await new Promise((resolve, reject) => {
    suite
      .add("cmd-api-server_HTTP_GET_getOpenApiSpecV1", {
        defer: true,
        minSamples,
        fn: async function (deferred: Benchmark.Deferred) {
          await httpApi.getOpenApiSpecV1();
          deferred.resolve();
        },
      })
      .add("cmd-api-server_gRPC_GetOpenApiSpecV1", {
        defer: true,
        minSamples,
        fn: async function (deferred: Benchmark.Deferred) {
          const grpcClient =
            new default_service.org.hyperledger.cactus.cmd_api_server.DefaultServiceClient(
              grpcHost,
              grpcCredentials,
            );

          await new Promise<default_service.org.hyperledger.cactus.cmd_api_server.GetOpenApiSpecV1Response>(
            (resolve, reject) => {
              const req = new empty.google.protobuf.Empty();
              grpcClient.GetOpenApiSpecV1(req, (err3, value) => {
                if (err3) {
                  reject(err3);
                } else if (value) {
                  resolve(value);
                } else {
                  reject(
                    new RuntimeError("Response object received is falsy."),
                  );
                }
              });
            },
          );

          grpcClient.close();
          deferred.resolve();
        },
      })
      .on("cycle", (event: { target: unknown }) => {
        // Output benchmark result by converting benchmark result to string
        // Example line on stdout:
        // cmd-api-server_HTTP_GET_getOpenApiSpecV1 x 1,020 ops/sec ±2.25% (177 runs sampled)
        const cycle = String(event.target);
        console.log("%s Benchmark.js CYCLE: %s", LOG_TAG, cycle);
        cycles.push(cycle);
      })
      .on("complete", function () {
        console.log("%s Benchmark.js COMPLETE.", LOG_TAG);
        resolve(suite);
      })
      .on("error", (ex: unknown) => {
        console.log("%s Benchmark.js ERROR: %o", LOG_TAG, ex);
        reject(ex);
      })
      .run();
  });

  const data = cycles.join(EOL);
  console.log("%s Writing results...", LOG_TAG);
  await fse.writeFile(absoluteOutputFilePath, data, { encoding: "utf-8" });
  console.log("%s Wrote results to %s", LOG_TAG, absoluteOutputFilePath);

  await apiServer.shutdown();
  console.log("%s Shut down API server OK", LOG_TAG);
};

main({ argv: process.argv }).catch((ex: unknown) => {
  console.error("%s process crashed with:", LOG_TAG, ex);
  process.exit(1);
});
