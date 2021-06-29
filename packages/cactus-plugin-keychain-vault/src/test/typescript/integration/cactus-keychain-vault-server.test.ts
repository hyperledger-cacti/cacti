import { v4 as uuidv4 } from "uuid";

import {
  CactusKeychainVaultServer,
  Containers,
  K_DEFAULT_VAULT_DEV_ROOT_TOKEN,
  K_DEFAULT_VAULT_HTTP_PORT,
  VaultTestServer,
} from "@hyperledger/cactus-test-tooling";

import { Configuration, DefaultApi } from "../../../main/typescript/public-api";

describe("CactusKeychainVaultServer", () => {
  const vaultTestContainer = new VaultTestServer({});
  let pluginContainer: CactusKeychainVaultServer;

  beforeAll(async () => {
    await vaultTestContainer.start();
    const ci = await Containers.getById(vaultTestContainer.containerId);
    const vaultIpAddr = await Containers.getContainerInternalIp(ci);

    const vaultHost = `http://${vaultIpAddr}:${K_DEFAULT_VAULT_HTTP_PORT}`;

    pluginContainer = new CactusKeychainVaultServer({
      envVars: [
        `VAULT_HOST=${vaultHost}`,
        `VAULT_TOKEN=${K_DEFAULT_VAULT_DEV_ROOT_TOKEN}`,
        "HOST=0.0.0.0:8080",
      ],
    });
    await pluginContainer.start();
  });

  afterAll(async () => {
    await vaultTestContainer.stop();
    await vaultTestContainer.destroy();
    await pluginContainer.stop();
    await pluginContainer.destroy();
  });

  it("Accessible fromm API client", async () => {
    const hostPort = await pluginContainer.getHostPortHttp();

    const configuration = new Configuration({
      basePath: `http://localhost:${hostPort}`,
    });
    const apiClient = new DefaultApi(configuration);

    const key = uuidv4();
    const expected = uuidv4();

    await apiClient.setKeychainEntry({ key, value: expected });
    const {
      data: { value: actual },
    } = await apiClient.getKeychainEntry({ key });

    expect(actual).toEqual(expected);
  });
});
