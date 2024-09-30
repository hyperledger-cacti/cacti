import { randomUUID as uuidv4 } from "node:crypto";
import path from "node:path";

import "jest-extended";
import { generateKeyPair, exportPKCS8 } from "jose";
import { StatusCodes } from "http-status-codes";

import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  ConsortiumDatabase,
  ICactusPlugin,
  IPluginConsortium,
  PluginImport,
  PluginImportAction,
  PluginImportType,
} from "@hyperledger/cactus-core-api";

import { ApiServer } from "../../../../main/typescript/api-server";
import { K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS } from "../../../../main/typescript/prometheus-exporter/metrics";
import { DefaultApi as ApiServerApi } from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { ConfigService } from "../../../../main/typescript/config/config-service";
import { AuthorizationProtocol } from "../../../../main/typescript/config/authorization-protocol";
import { Configuration } from "../../../../main/typescript/generated/openapi/typescript-axios";

describe("ApiServer", () => {
  const logLevel: LogLevelDesc = "INFO";
  const keychainId = uuidv4();
  const consortiumPluginInstanceId = uuidv4();

  const pluginsPath = path.join(
    __dirname, // start at the current file's path
    "../../../../../../../", // walk back up to the project root
    ".tmp/test/cmd-api-server/install-basic-plugin-consortium-manual_test", // the dir path from the root
    uuidv4(), // then a random directory to ensure proper isolation
  );

  const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

  let pluginImports: PluginImport[];

  const configService = new ConfigService();

  let apiServer: ApiServer;
  let apiClient: ApiServerApi;

  beforeAll(async () => {
    // Adding a new plugin to update the prometheus metric K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS
    const keyPair = await await generateKeyPair("ES256K");
    const keyPairPem = await exportPKCS8(keyPair.privateKey);
    const db: ConsortiumDatabase = {
      cactusNode: [],
      consortium: [],
      consortiumMember: [],
      ledger: [],
      pluginInstance: [],
    };

    pluginImports = [
      {
        packageName: "@hyperledger/cactus-plugin-keychain-memory",
        type: PluginImportType.Local,
        action: PluginImportAction.Install,
        options: {
          instanceId: uuidv4(),
          keychainId,
          logLevel,
        },
      },
      {
        packageName: "@hyperledger/cactus-plugin-consortium-manual",
        type: PluginImportType.Local,
        action: PluginImportAction.Install,
        options: {
          instanceId: consortiumPluginInstanceId,
          keyPairPem: keyPairPem,
          consortiumDatabase: db,
        },
      },
    ];

    const apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.logLevel = logLevel;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.plugins = pluginImports;
    const config = await configService.newExampleConfigConvict(apiSrvOpts);

    apiServer = new ApiServer({
      config: config.getProperties(),
    });

    const startResponse = apiServer.start();
    await expect(startResponse).toResolve();

    const addressInfoApi = (await startResponse).addressInfoApi;
    const protocol = apiSrvOpts.apiTlsEnabled ? "https" : "http";
    const { address, port } = addressInfoApi;
    const apiHost = `${protocol}://${address}:${port}`;

    const apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new ApiServerApi(apiConfig);
  });

  afterAll(async () => {
    await apiServer.shutdown();
  });

  it("can install plugin-consortium-manual", async () => {
    {
      const res = await apiClient.getPrometheusMetricsV1();
      const promMetricsOutput =
        "# HELP " +
        K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
        " Total number of plugins imported\n" +
        "# TYPE " +
        K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
        " gauge\n" +
        K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
        '{type="' +
        K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
        '"} 2';

      expect(res).toMatchObject({
        status: StatusCodes.OK,
        data: expect.stringContaining(promMetricsOutput),
      });
    }

    const pluginRegistry = await apiServer.getOrInitPluginRegistry();

    // this is not a working plugin but we are just testing the monitoring so
    // it's okay for this particular test case. Do not copy this to other test
    // cases or if you do remove right after you copied it ;-)
    pluginRegistry.plugins.push({} as ICactusPlugin);

    {
      const res = await apiClient.getPrometheusMetricsV1();
      const promMetricsOutput =
        "# HELP " +
        K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
        " Total number of plugins imported\n" +
        "# TYPE " +
        K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
        " gauge\n" +
        K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
        '{type="' +
        K_CACTUS_API_SERVER_TOTAL_PLUGIN_IMPORTS +
        '"} 3';

      expect(res).toMatchObject({
        status: StatusCodes.OK,
        data: expect.stringContaining(promMetricsOutput),
      });
    }
    // clean up after ourselves,
    // e.g. remove the dummy plugin instance we just pushed
    pluginRegistry.plugins.pop();

    const keychain = pluginRegistry.findOneByKeychainId(keychainId);

    const hasX1 = await keychain.has("x");
    expect(hasX1).toBeFalse();

    await keychain.set("x", "y");

    const hasX2 = await keychain.has("x");
    expect(hasX2).toBeTrue();

    type DummyConsortiumPlugin = IPluginConsortium<
      unknown,
      unknown,
      unknown,
      unknown
    >;

    // TODO - use the new getOneById implementation once
    // https://github.com/hyperledger/cactus/issues/1197
    // has been resolved
    const consortiumPlugin = pluginRegistry
      .getPlugins()
      .find(
        (it) => it.getInstanceId() === consortiumPluginInstanceId,
      ) as DummyConsortiumPlugin;

    expect(consortiumPlugin).toBeTruthy();
    expect(consortiumPlugin).toBeObject();

    // FIXME - uncomment this once https://github.com/hyperledger/cactus/issues/1199
    // has been resolved (and also published to npm)
    // const nodeJwsRes = await consortiumPlugin.getNodeJws({});
    // t.ok(nodeJwsRes, "nodeJwsRes truthy OK");
  });
});
