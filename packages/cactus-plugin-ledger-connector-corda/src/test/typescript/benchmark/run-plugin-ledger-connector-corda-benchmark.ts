import path from "path";
import { EOL } from "os";
import { v4 as internalIpV4 } from "internal-ip";
import * as Benchmark from "benchmark";

import { v4 as uuidv4 } from "uuid";
import fse from "fs-extra";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";

import {
  IPluginLedgerConnectorCordaOptions,
  PluginLedgerConnectorCorda,
} from "../../../main/typescript/plugin-ledger-connector-corda";
import {
  CordappDeploymentConfig,
  DefaultApi as CordaApi,
  DeployContractJarsV1Request,
} from "../../../main/typescript/generated/openapi/typescript-axios/index";

import {
  IListenOptions,
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  CordaTestLedger,
  SampleCordappEnum,
  CordaConnectorContainer,
} from "@hyperledger/cactus-test-tooling";

const LOG_TAG =
  "[packages/cactus-plugin-ledger-connector-corda/src/test/typescript/benchmark/run-plugin-ledger-connector-corda-benchmark.ts]";

const createTestInfrastructure = async (opts: {
  readonly logLevel: LogLevelDesc;
}) => {
  const logLevel = opts.logLevel || "DEBUG";

  const ledger = new CordaTestLedger({
    imageName: "ghcr.io/hyperledger/cactus-corda-4-8-all-in-one-obligation",
    imageVersion: "2021-08-31--feat-889",
    logLevel,
  });
  await ledger.start();

  const corDappsDirPartyA = await ledger.getCorDappsDirPartyA();
  const corDappsDirPartyB = await ledger.getCorDappsDirPartyB();

  await ledger.logDebugPorts();
  const partyARpcPort = await ledger.getRpcAPublicPort();
  const partyBRpcPort = await ledger.getRpcBPublicPort();

  const sshConfig = await ledger.getSshConfig();

  const jarFiles = await ledger.pullCordappJars(
    SampleCordappEnum.BASIC_CORDAPP,
  );
  console.log(`Fetched ${jarFiles.length} cordapp jars OK`);

  const internalIpOrUndefined = await internalIpV4();
  const internalIp = internalIpOrUndefined as string;

  // TODO: parse the gradle build files to extract the credentials?
  const partyARpcUsername = "user1";
  const partyARpcPassword = "password";
  const partyBRpcUsername = partyARpcUsername;
  const partyBRpcPassword = partyARpcPassword;
  const springAppConfig = {
    logging: {
      level: {
        root: "INFO",
        "net.corda": "INFO",
        "org.hyperledger.cactus": "DEBUG",
      },
    },
    cactus: {
      corda: {
        node: { host: internalIp },
        rpc: {
          port: partyARpcPort,
          username: partyARpcUsername,
          password: partyARpcPassword,
        },
      },
    },
  };
  const springApplicationJson = JSON.stringify(springAppConfig);
  const envVarSpringAppJson = `SPRING_APPLICATION_JSON=${springApplicationJson}`;

  const connector = new CordaConnectorContainer({
    logLevel,
    imageName: "ghcr.io/hyperledger/cactus-connector-corda-server",
    imageVersion: "2021-11-23--feat-1493",
    envVars: [envVarSpringAppJson],
  });
  await connector.start();
  await connector.logDebugPorts();

  const apiUrl = await connector.getApiLocalhostUrl();
  const pluginOptions: IPluginLedgerConnectorCordaOptions = {
    instanceId: uuidv4(),
    corDappsDir: corDappsDirPartyA,
    sshConfigAdminShell: sshConfig,
    apiUrl,
  };

  const plugin = new PluginLedgerConnectorCorda(pluginOptions);

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
    server,
  };

  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const { address, port } = addressInfo;
  const apiHost = `http://${address}:${port}`;

  const apiConfig = new Configuration({ basePath: apiHost });
  const apiClient = new CordaApi(apiConfig);

  await plugin.getOrCreateWebServices();
  await plugin.registerWebServices(expressApp);

  const hostKeyEntry = "not-used-right-now-so-this-does-not-matter... ;-(";

  const cdcA: CordappDeploymentConfig = {
    cordappDir: corDappsDirPartyA,
    cordaNodeStartCmd: "supervisorctl start corda-a",
    cordaJarPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantA/corda.jar",
    nodeBaseDirPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantA/",
    rpcCredentials: {
      hostname: internalIp,
      port: partyARpcPort,
      username: partyARpcUsername,
      password: partyARpcPassword,
    },
    sshCredentials: {
      hostKeyEntry,
      hostname: internalIp,
      password: "root",
      port: sshConfig.port as number,
      username: sshConfig.username as string,
    },
  };

  const cdcB: CordappDeploymentConfig = {
    cordappDir: corDappsDirPartyB,
    cordaNodeStartCmd: "supervisorctl start corda-b",
    cordaJarPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantB/corda.jar",
    nodeBaseDirPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantB/",
    rpcCredentials: {
      hostname: internalIp,
      port: partyBRpcPort,
      username: partyBRpcUsername,
      password: partyBRpcPassword,
    },
    sshCredentials: {
      hostKeyEntry,
      hostname: internalIp,
      password: "root",
      port: sshConfig.port as number,
      username: sshConfig.username as string,
    },
  };

  const cordappDeploymentConfigs: CordappDeploymentConfig[] = [cdcA, cdcB];
  const depReq: DeployContractJarsV1Request = {
    jarFiles,
    cordappDeploymentConfigs,
  };

  return {
    httpApi: apiClient,
    apiServer: plugin,
    connector,
    depReq,
    ledger,
  };
};

const main = async (opts: { readonly argv: Readonly<Array<string>> }) => {
  const logLevel: LogLevelDesc = "INFO";

  const { apiServer, httpApi, connector, depReq, ledger } =
    await createTestInfrastructure({ logLevel });

  const level = apiServer.options.logLevel || "INFO";
  const label = apiServer.className;
  const log: Logger = LoggerProvider.getOrCreate({ level, label });

  try {
    const gitRootPath = path.join(
      __dirname,
      "../../../../../../", // walk back up to the project root
    );

    log.info("%s gitRootPath=%s", LOG_TAG, gitRootPath);

    const DEFAULT_OUTPUT_FILE_RELATIVE_PATH =
      ".tmp/benchmark-results/plugin-ledger-connector-corda/run-plugin-ledger-connector-corda-benchmark.ts.log";

    const relativeOutputFilePath =
      opts.argv[2] === undefined
        ? DEFAULT_OUTPUT_FILE_RELATIVE_PATH
        : opts.argv[2];

    log.info(
      "%s DEFAULT_OUTPUT_FILE_RELATIVE_PATH=%s",
      LOG_TAG,
      DEFAULT_OUTPUT_FILE_RELATIVE_PATH,
    );

    log.info("%s opts.argv[2]=%s", LOG_TAG, opts.argv[2]);

    log.info("%s relativeOutputFilePath=%s", LOG_TAG, relativeOutputFilePath);

    const absoluteOutputFilePath = path.join(
      gitRootPath,
      relativeOutputFilePath,
    );

    log.info("%s absoluteOutputFilePath=%s", LOG_TAG, absoluteOutputFilePath);

    const absoluteOutputDirPath = path.dirname(absoluteOutputFilePath);
    log.info("%s absoluteOutputDirPath=%s", LOG_TAG, absoluteOutputDirPath);

    await fse.mkdirp(absoluteOutputDirPath);
    log.info("%s mkdir -p OK: %s", LOG_TAG, absoluteOutputDirPath);

    const minSamples = 100;
    const suite = new Benchmark.Suite({});

    const cycles: string[] = [];

    await new Promise((resolve, reject) => {
      suite
        .add("plugin-ledger-connector-corda_HTTP_GET_deployContractJarsV1", {
          defer: true,
          minSamples,
          fn: async function (deferred: Benchmark.Deferred) {
            await httpApi.deployContractJarsV1(depReq);
            deferred.resolve();
          },
        })
        .on("cycle", (event: { target: unknown }) => {
          // Output benchmark result by converting benchmark result to string
          // Example line on stdout:
          // plugin-ledger-connector-corda_HTTP_GET_deployContractJarsV1 x 1,020 ops/sec ±2.25% (177 runs sampled)
          const cycle = String(event.target);
          log.info("%s Benchmark.js CYCLE: %s", LOG_TAG, cycle);
          cycles.push(cycle);
        })
        .on("complete", function () {
          log.info("%s Benchmark.js COMPLETE.", LOG_TAG);
          resolve(suite);
        })
        .on("error", async (ex: unknown) => {
          log.info("%s Benchmark.js ERROR: %o", LOG_TAG, ex);
          reject(ex);
        })
        .run();
    });

    const data = cycles.join(EOL);
    log.info("%s Writing results...", LOG_TAG);
    await fse.writeFile(absoluteOutputFilePath, data, { encoding: "utf-8" });
    log.info("%s Wrote results to %s", LOG_TAG, absoluteOutputFilePath);
  } finally {
    await apiServer.shutdown();
    log.info("%s Shut down API server OK", LOG_TAG);

    await connector.stop();
    await connector.destroy();
    await ledger.stop();
    await ledger.destroy();
  }
};

main({ argv: process.argv })
  .then(async () => {
    console.log("%s Script execution completed successfully", LOG_TAG);
    process.exit(1);
  })
  .catch((ex) => {
    console.error("%s process crashed with:", LOG_TAG, ex);
    process.exit(1);
  });
