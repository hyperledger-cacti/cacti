import "jest-extended";
import { v4 as uuidv4 } from "uuid";

import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  CactusKeychainVaultServer,
  Containers,
  K_DEFAULT_VAULT_DEV_ROOT_TOKEN,
  K_DEFAULT_VAULT_HTTP_PORT,
  VaultTestServer,
} from "@hyperledger/cactus-test-tooling";

import {
  DefaultApi,
  PluginFactoryKeychain,
} from "@hyperledger/cactus-plugin-keychain-vault";
import {
  Configuration,
  IPluginKeychain,
  PluginImportType,
} from "@hyperledger/cactus-core-api";

const testCase = "NodeJS API server + Rust plugin work together";

describe(testCase, () => {
  let vaultTestContainer: VaultTestServer;
  let apiServer: ApiServer;
  let pluginContainer: any;

  afterAll(async () => {
    await vaultTestContainer.stop();
    await vaultTestContainer.destroy();
    await apiServer.shutdown();
    await pluginContainer.stop();
    await pluginContainer.destroy();
  });

  test(testCase, async () => {
    vaultTestContainer = new VaultTestServer({});
    await vaultTestContainer.start();

    const ci = await Containers.getById(vaultTestContainer.containerId);
    const vaultIpAddr = await Containers.getContainerInternalIp(ci);
    console.log(`Container VaultTestServer has IPv4: ${vaultIpAddr}`);

    const hostPortVault = await vaultTestContainer.getHostPortHttp();
    console.log(`Container VaultTestServer (Port=${hostPortVault}) started OK`);

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
    console.log(`CactusKeychainVaultServer (Port=${hostPort}) started OK`);

    const configuration = new Configuration({
      basePath: `http://127.0.0.1:${hostPort}`,
    });
    const apiClient = new DefaultApi(configuration);

    const configService = new ConfigService();
    const apiServerOptions = await configService.newExampleConfig();
    apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = 0;
    apiServerOptions.cockpitPort = 0;
    apiServerOptions.grpcPort = 0;
    apiServerOptions.crpcPort = 0;
    apiServerOptions.apiTlsEnabled = false;
    apiServerOptions.plugins = [];
    const config =
      await configService.newExampleConfigConvict(apiServerOptions);

    const factory = new PluginFactoryKeychain({
      pluginImportType: PluginImportType.Remote,
    });

    const plugin: IPluginKeychain = await factory.create({
      keychainId: "_keychainId_",
      instanceId: "_instanceId_",
      remoteConfig: configuration,
    });

    const pluginRegistry = new PluginRegistry({ plugins: [plugin] });

    apiServer = new ApiServer({
      config: config.getProperties(),
      pluginRegistry,
    });

    const startResponse = apiServer.start();
    expect(startResponse).toBeTruthy();
    await expect(startResponse).not.toReject();

    const key = uuidv4();
    const expected = uuidv4();

    await apiClient.setKeychainEntryV1({ key, value: expected });
    const {
      data: { value: actual },
    } = await apiClient.getKeychainEntryV1({ key });

    expect(actual).toBe(expected);
  });
});
