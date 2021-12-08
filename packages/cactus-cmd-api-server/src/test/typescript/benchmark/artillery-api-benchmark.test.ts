import { promisify } from "util";
import { unlinkSync, readFileSync } from "fs";

import { exec } from "child_process";
import path from "path";

import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { generateKeyPair, exportPKCS8 } from "jose";

import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";

import {
  PluginImportType,
  ConsortiumDatabase,
  PluginImportAction,
} from "@hyperledger/cactus-core-api";

import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
  Configuration,
} from "../../../main/typescript/public-api";

import { DefaultApi as ApiServerApi } from "../../../main/typescript/public-api";

const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "logger-test",
});

const shell_exec = promisify(exec);

const artilleryScriptLocation =
  "./packages/cactus-cmd-api-server/src/test/resources/artillery/benchmark-script.yaml";
const logLevel: LogLevelDesc = "INFO";

test("Start API server, and run Artillery benchmark test.", async (t: Test) => {
  const keyPair = await generateKeyPair("ES256K");
  const keyPairPem = await exportPKCS8(keyPair.privateKey);
  const db: ConsortiumDatabase = {
    cactusNode: [],
    consortium: [],
    consortiumMember: [],
    ledger: [],
    pluginInstance: [],
  };

  log.info("Generating Config...");

  const pluginsPath = path.join(
    __dirname, // start at the current file's path
    "../../../../../../", // walk back up to the project root
    ".tmp/test/cmd-api-server/artillery-api-benchmark_test", // the dir path from the root
    uuidv4(), // then a random directory to ensure proper isolation
  );
  const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

  const configService = new ConfigService();
  const apiServerOptions = await configService.newExampleConfig();
  apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
  apiServerOptions.pluginManagerOptionsJson = pluginManagerOptionsJson;
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = 4000;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.grpcPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  apiServerOptions.logLevel = "info";
  apiServerOptions.plugins = [
    {
      packageName: "@hyperledger/cactus-plugin-keychain-memory",
      type: PluginImportType.Local,
      action: PluginImportAction.Install,
      options: {
        instanceId: uuidv4(),
        keychainId: uuidv4(),
        logLevel,
      },
    },
    {
      packageName: "@hyperledger/cactus-plugin-consortium-manual",
      type: PluginImportType.Local,
      action: PluginImportAction.Install,
      options: {
        instanceId: uuidv4(),
        keyPairPem: keyPairPem,
        consortiumDatabase: db,
      },
    },
  ];

  const config = await configService.newExampleConfigConvict(apiServerOptions);

  log.info("Creating API Server...");
  const apiServer = new ApiServer({
    config: config.getProperties(),
  });

  log.info("Starting API Server...");

  const startResponse = apiServer.start();

  test.onFinish(() => {
    apiServer.shutdown();
  });

  await t.doesNotReject(
    startResponse,
    "failed to start API server with dynamic plugin imports configured for it...",
  );
  t.ok(startResponse, "startResponse truthy OK");

  const addressInfoApi = (await startResponse).addressInfoApi;
  const protocol = apiServerOptions.apiTlsEnabled ? "https" : "http";
  const { address, port } = addressInfoApi;
  const apiHost = `${protocol}://${address}:${port}`;

  const clientConfig = new Configuration({ basePath: apiHost });

  const apiClient = new ApiServerApi(clientConfig);

  const res = await apiClient.getPrometheusMetricsV1();

  t.equal(res.status, 200);

  // Sets apihost in process env variables to artillery script can read it.
  process.env.apiHost = apiHost;
  await fireArtilleryCommand(t);

  // Reading in Artillery JSON output
  let report = null;
  try {
    const jsonString = readFileSync("./report.json");
    report = JSON.parse(jsonString.toString());
    log.debug(report);
  } catch (err) {
    log.error(
      `Could not parse the artillery report JSON from the file system`,
      err,
    );
  }

  if (report == null) {
    t.fail("Test failed, cannot find Artillery report.");
  } else {
    const avgLatency = report.aggregate.latency.median;
    log.info(`Average Latency: ${avgLatency}`);
    t.assert(avgLatency < 5, "Average latency should be less than 10");
    // Removing report after processing.
    try {
      unlinkSync("./report.json");
    } catch (err) {
      log.error(`Could not remove report.json from filesystem.`, err);
    }
  }
});

async function fireArtilleryCommand(t: Test) {
  try {
    const artilleryCommand = `artillery run ${artilleryScriptLocation} --output report.json`;
    await shell_exec(artilleryCommand);
  } catch (err) {
    log.error(`Failed to run artillery execution.`, err);
    t.fail(`Test failed. Err: ${err}`);
  }
}
