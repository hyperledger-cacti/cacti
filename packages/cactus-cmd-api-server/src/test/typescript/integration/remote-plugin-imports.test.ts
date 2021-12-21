import { v4 as uuidv4 } from "uuid";
import "jest-extended";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "../../../main/typescript/public-api";
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

const testCase = "NodeJS API server + Rust plugin work together";
describe(testCase, () => {
  let apiServer: ApiServer,
    pluginContainer: CactusKeychainVaultServer,
    apiClient: DefaultApi;
  const vaultTestContainer = new VaultTestServer({});

  afterAll(() => apiServer.shutdown());

  afterAll(async () => {
    await pluginContainer.stop();
    await pluginContainer.destroy();
  });

  afterAll(async () => {
    await vaultTestContainer.stop();
    await vaultTestContainer.destroy();
  });
  beforeAll(async () => {
    await vaultTestContainer.start();
    const pluginsPath = path.join(
      __dirname, // start at the current file's path
      "../../../../../../", // walk back up to the project root
      ".tmp/test/cmd-api-server/remote-plugin-imports_test", // the dir path from the root
      uuidv4(), // then a random directory to ensure proper isolation
    );
    const pluginManagerOptionsJson = JSON.stringify({ pluginsPath });

    const ci = await Containers.getById(vaultTestContainer.containerId);
    const vaultIpAddr = await Containers.getContainerInternalIp(ci);
    const configService = new ConfigService();
    const apiServerOptions = await configService.newExampleConfig();
    apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    apiServerOptions.pluginManagerOptionsJson = pluginManagerOptionsJson;
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = 0;
    apiServerOptions.cockpitPort = 0;
    apiServerOptions.grpcPort = 0;
    apiServerOptions.apiTlsEnabled = false;

    const config = await configService.newExampleConfigConvict(
      apiServerOptions,
    );

    apiServer = new ApiServer({
      config: config.getProperties(),
    });

    // const hostPortVault = await vaultTestContainer.getHostPortHttp();
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

    const configuration = new Configuration({
      basePath: `http://localhost:${hostPort}`,
    });
    apiClient = new DefaultApi(configuration);

    apiServerOptions.plugins = [
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

    await expect(apiServer.start()).not.toReject;
  });
  test(testCase, async () => {
    const key = uuidv4();
    const expected = uuidv4();

    await apiClient.setKeychainEntryV1({ key, value: expected });
    const {
      data: { value: actual },
    } = await apiClient.getKeychainEntryV1({ key });

    expect(actual).toEqual(expected);
  });
});
