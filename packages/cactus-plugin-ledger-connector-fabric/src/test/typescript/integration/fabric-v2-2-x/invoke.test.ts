import { LogLevelDesc } from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import { v4 as uuidv4 } from "uuid";
import {
  DefaultEventHandlerStrategy,
  IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
  RunInvokeRequest,
} from "../../../../main/typescript";
import { DiscoveryOptions } from "fabric-network";

const logLevel: LogLevelDesc = "DEBUG";

describe("Invoke tests", () => {
  let ledger: FabricTestLedgerV1;

  const keychainId = uuidv4();
  const keychainEntryKey = "user2";

  let connector: PluginLedgerConnectorFabric;
  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.not.toThrow();
    ledger = new FabricTestLedgerV1({
      emitContainerLogs: true,
      publishAllPorts: true,
      imageName: DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
      imageVersion: FABRIC_25_LTS_AIO_IMAGE_VERSION,
      envVars: new Map([["FABRIC_VERSION", FABRIC_25_LTS_AIO_FABRIC_VERSION]]),
      logLevel,
    });
    await ledger.start({ omitPull: false });

    const connectionProfile = await ledger.getConnectionProfileOrg1();
    expect(connectionProfile).toBeTruthy(); // Check if connectionProfile is truthy
    const enrollAdminOut = await ledger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];
    const [userIdentity] = await ledger.enrollUser(adminWallet);
    const keychainInstanceId = uuidv4();
    const keychainEntryValue = JSON.stringify(userIdentity);
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: keychainInstanceId,
      keychainId,
      logLevel,
      backend: new Map([
        [keychainEntryKey, keychainEntryValue],
        ["some-other-entry-key", "some-other-entry-value"],
      ]),
    });

    const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });
    const discoveryOptions: DiscoveryOptions = {
      enabled: true,
      asLocalhost: true,
    };

    const pluginOptions: IPluginLedgerConnectorFabricOptions = {
      instanceId: uuidv4(),
      pluginRegistry,
      logLevel,
      connectionProfile,
      discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
      dockerNetworkName: ledger.getNetworkName(),
    };

    connector = new PluginLedgerConnectorFabric(pluginOptions);
  });

  afterAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.not.toThrow();
    await ledger.stop();
    await ledger.destroy();
  });
  test("should invoke chaincode", async () => {
    const req: RunInvokeRequest = {
      signingCredential: {
        keychainId,
        keychainRef: keychainEntryKey,
      },
      channelName: "mychannel",
      contractName: "basic",
      methodName: "GetAllAssets",
      params: [],
    };

    const res = await connector.invoke(req);
    expect(res.view.endorsedProposalResponses).toBeDefined();
    expect(res.view.endorsedProposalResponses?.length).toBe(2);
    console.log("Invoke result:", JSON.stringify(res, null, 2));
  });
});
