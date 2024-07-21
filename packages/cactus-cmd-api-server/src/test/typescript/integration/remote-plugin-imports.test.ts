import "jest-extended";

import {
  CactusKeychainVaultServer,
  Containers,
  K_DEFAULT_VAULT_DEV_ROOT_TOKEN,
  K_DEFAULT_VAULT_HTTP_PORT,
  VaultTestServer,
} from "@hyperledger/cactus-test-tooling";

import { DefaultApi } from "@hyperledger/cactus-plugin-keychain-vault";
import {
  Configuration,
  PluginImportAction,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import path from "path";
import { randomUUID } from "crypto";
import { ConfigService } from "../../../main/typescript/config/config-service";
import { AuthorizationProtocol } from "../../../main/typescript/config/authorization-protocol";
import { ApiServer } from "../../../main/typescript/api-server";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";

describe("ApiServer", () => {
  const key = randomUUID();
  const expected = randomUUID();

  const logLevel: LogLevelDesc = "INFO";

  const log = LoggerProvider.getOrCreate({
    label: "remote-plugin-imports.test.ts",
    level: logLevel,
  });

  const configService = new ConfigService();

  const pluginsPath = path.join(
    __dirname, // start at the current file's path
    "../../../../../../", // walk back up to the project root
    ".tmp/test/cmd-api-server/remote-plugin-imports_test", // the dir path from the root
    randomUUID(), // then a random directory to ensure proper isolation
  );

  const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });
  const vaultTestContainer = new VaultTestServer({});

  let apiServer: ApiServer;
  let pluginContainer: CactusKeychainVaultServer;

  afterAll(async () => {
    await apiServer.shutdown();
  });

  afterAll(async () => {
    await vaultTestContainer.stop();
    await vaultTestContainer.destroy();
  });

  afterAll(async () => {
    await pluginContainer.stop();
    await pluginContainer.destroy();
  });

  beforeAll(async () => {
    await vaultTestContainer.start();
  });

  it("can install plugin-keychain-vault from npm", async () => {
    const cId = await Containers.getById(vaultTestContainer.containerId);
    const vaultIpAddr = await Containers.getContainerInternalIp(cId);
    log.debug(`Container VaultTestServer has IPv4: ${vaultIpAddr}`);

    const hostPortVault = await vaultTestContainer.getHostPortHttp();
    log.debug(`Container VaultTestServer (Port=${hostPortVault}) started OK`);
    const vaultHost = `http://${vaultIpAddr}:${K_DEFAULT_VAULT_HTTP_PORT}`;

    pluginContainer = new CactusKeychainVaultServer({
      envVars: [
        `VAULT_HOST=${vaultHost}`,
        `VAULT_TOKEN=${K_DEFAULT_VAULT_DEV_ROOT_TOKEN}`,
        "HOST=0.0.0.0:8080",
      ],
    });
    await pluginContainer.start();

    const hostPort = await pluginContainer.getHostPortHttp();
    log.debug(`CactusKeychainVaultServer (Port=${hostPort}) started OK`);

    const configuration = new Configuration({
      basePath: `http://127.0.0.1:${hostPort}`,
    });
    const apiClient = new DefaultApi(configuration);

    const apiSrvOpts = await configService.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.plugins = [
      {
        packageName: "@hyperledger/cactus-plugin-keychain-vault",
        type: PluginImportType.Remote,
        action: PluginImportAction.Install,
        options: {
          keychainId: "_keychainId_",
          instanceId: "_instanceId_",
          remoteConfig: configuration,
        },
      },
    ];
    const config = await configService.newExampleConfigConvict(apiSrvOpts);

    apiServer = new ApiServer({
      config: config.getProperties(),
    });

    await expect(apiServer.start()).toResolve();

    await apiClient.setKeychainEntryV1({ key, value: expected });

    const {
      data: { value: actual },
    } = await apiClient.getKeychainEntryV1({ key });

    expect(actual).toEqual(expected);
  });
});
