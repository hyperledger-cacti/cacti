import "jest-extended";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";
import { v4 as uuidv4 } from "uuid";
import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  DefaultEventHandlerStrategy,
  FabricSigningCredentialType,
  IVaultConfig,
  PluginLedgerConnectorFabric,
  IIdentityData,
  FabricContractInvocationType,
} from "../../../../main/typescript/public-api";
import { DiscoveryOptions } from "fabric-network";

const logLevel: LogLevelDesc = "INFO";
import {
  Containers,
  VaultTestServer,
  K_DEFAULT_VAULT_HTTP_PORT,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
  DEFAULT_FABRIC_2_AIO_IMAGE_NAME,
  FABRIC_25_LTS_AIO_IMAGE_VERSION,
  FABRIC_25_LTS_AIO_FABRIC_VERSION,
} from "@hyperledger/cactus-test-tooling";
import { v4 as internalIpV4 } from "internal-ip";
import axios from "axios";

// test scenario
// - enroll registrar (both using default identity and vault(p256) identity)
// - register 2 client (using registrar identity)
// - enroll 1st client using default identity
// - enroll 2nd client using vault identity(p384)
// - make invoke (InitLedger) using 1st client
// - make invoke (TransferAsset) using 2nd client (p384) client
// - make query ("ReadAsset") using registrar(p256)
// Logger setup

const log: Logger = LoggerProvider.getOrCreate({
  label: "run-transaction-with-identities.test",
  level: logLevel,
});

describe("Run transaction with identities", () => {
  const registrarKey = "registrar";
  const client1Key = "client-default-";
  const client2Key = "client-vault";
  const keychainInstanceId = uuidv4();
  const keychainId = uuidv4();
  let plugin: PluginLedgerConnectorFabric;
  let ledger: FabricTestLedgerV1;
  let vaultTestContainer: VaultTestServer;
  let keychainPlugin: PluginKeychainMemory;
  const testToken = "myroot";
  beforeAll(async () => {
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
    expect(connectionProfile).toBeTruthy();

    vaultTestContainer = new VaultTestServer({});
    await vaultTestContainer.start();

    const ci = await Containers.getById(vaultTestContainer.containerId);
    const vaultIpAddr = await internalIpV4();
    const hostPort = await Containers.getPublicPort(
      K_DEFAULT_VAULT_HTTP_PORT,
      ci,
    );
    const vaultHost = `http://${vaultIpAddr}:${hostPort}`;

    /////
    const vaultConfig: IVaultConfig = {
      endpoint: vaultHost,
      transitEngineMountPath: "/transit",
    };

    {
      // mount engine and create some test keys
      const vaultHTTPClient = axios.create({
        baseURL: vaultConfig.endpoint + "/v1",
        headers: {
          "X-Vault-Token": testToken,
        },
      });
      await vaultHTTPClient.post(
        "/sys/mounts" + vaultConfig.transitEngineMountPath,
        { type: "transit" },
      );
      await vaultHTTPClient.post(
        vaultConfig.transitEngineMountPath + "/keys/" + registrarKey,
        {
          type: "ecdsa-p256",
        },
      );
      await vaultHTTPClient.post(
        vaultConfig.transitEngineMountPath + "/keys/" + client2Key,
        {
          type: "ecdsa-p384",
        },
      );
    }
    ///
    keychainPlugin = new PluginKeychainMemory({
      instanceId: keychainInstanceId,
      keychainId: keychainId,
      logLevel,
    });
    const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

    const discoveryOptions: DiscoveryOptions = {
      enabled: true,
      asLocalhost: true,
    };
    const supportedIdentity: FabricSigningCredentialType[] = [
      FabricSigningCredentialType.VaultX509,
      FabricSigningCredentialType.X509,
    ];
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
      supportedIdentity,
      vaultConfig: vaultConfig,
    };
    plugin = new PluginLedgerConnectorFabric(pluginOptions);
  });
  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
    await vaultTestContainer.stop();
    await vaultTestContainer.destroy();
  });
  test(`test with-vaultKey`, async () => {
    {
      // enroll registrar using default identity
      await plugin.enroll(
        {
          keychainId: keychainId,
          keychainRef: registrarKey + "-x.509",
          type: FabricSigningCredentialType.X509,
        },
        {
          enrollmentID: "admin",
          enrollmentSecret: "adminpw",
          mspId: "Org1MSP",
          caId: "ca.org1.example.com",
        },
      );

      const rawCert = await keychainPlugin.get(registrarKey + "-x.509");
      expect(rawCert).toBeTruthy();
      const certData = JSON.parse(rawCert) as IIdentityData;
      expect(certData.type).toEqual(FabricSigningCredentialType.X509);
      expect(certData.credentials.privateKey).toBeTruthy();
    }
    {
      // enroll registrar using vault identity
      await plugin.enroll(
        {
          keychainId: keychainId,
          keychainRef: registrarKey + "-vault",
          type: FabricSigningCredentialType.VaultX509,
          vaultTransitKey: {
            token: testToken,
            keyName: registrarKey,
          },
        },
        {
          enrollmentID: "admin",
          enrollmentSecret: "adminpw",
          mspId: "Org1MSP",
          caId: "ca.org1.example.com",
        },
      );

      const rawCert = await keychainPlugin.get(registrarKey + "-vault");
      expect(rawCert).toBeTruthy();
      const certData = JSON.parse(rawCert) as IIdentityData;
      expect(certData.type).toEqual(FabricSigningCredentialType.VaultX509);
      expect(certData.credentials.privateKey).toBeFalsy();
    }
    {
      // register a client1 using registrar's default x509 identity
      const secret = await plugin.register(
        {
          keychainId: keychainId,
          keychainRef: registrarKey + "-x.509",
        },
        {
          enrollmentID: client1Key,
          enrollmentSecret: "pw",
          affiliation: "org1.department1",
        },
        "ca.org1.example.com",
      );
      expect(secret).toEqual("pw");
    }
    {
      // register a client using registrar's vault identity
      const secret = await plugin.register(
        {
          keychainId: keychainId,
          keychainRef: registrarKey + "-vault",
          type: FabricSigningCredentialType.VaultX509,
          vaultTransitKey: {
            token: testToken,
            keyName: registrarKey,
          },
        },
        {
          enrollmentID: client2Key,
          enrollmentSecret: "pw",
          affiliation: "org1.department1",
        },
        "ca.org1.example.com",
      );
      expect(secret).toEqual("pw");
    }
    {
      // enroll client client1 registered above
      await plugin.enroll(
        {
          keychainId: keychainId,
          keychainRef: client1Key,
        },
        {
          enrollmentID: client1Key,
          enrollmentSecret: "pw",
          mspId: "Org1MSP",
          caId: "ca.org1.example.com",
        },
      );

      const rawCert = await keychainPlugin.get(client1Key);
      expect(rawCert).toBeTruthy();
      const certData = JSON.parse(rawCert) as IIdentityData;
      expect(certData.type).toEqual(FabricSigningCredentialType.X509);
      expect(certData.credentials.privateKey).toBeTruthy();
    }
    {
      // enroll client2 using vault identity
      await plugin.enroll(
        {
          keychainId: keychainId,
          keychainRef: client2Key,
          type: FabricSigningCredentialType.VaultX509,
          vaultTransitKey: {
            token: testToken,
            keyName: client2Key,
          },
        },
        {
          enrollmentID: client2Key,
          enrollmentSecret: "pw",
          mspId: "Org1MSP",
          caId: "ca.org1.example.com",
        },
      );

      const rawCert = await keychainPlugin.get(client2Key);
      expect(rawCert).toBeTruthy();
      const { type, credentials } = JSON.parse(rawCert) as IIdentityData;
      const { privateKey } = credentials;
      expect(type).toEqual(FabricSigningCredentialType.VaultX509);
      expect(privateKey).toBeFalsy();
    }

    // Temporary workaround here: Deploy a second contract because the default
    // one is being hammered with "InitLedger" transactions by the container's
    // own healthcheck (see healthcheck.sh in the fabric-all-in-one folder).
    // The above makes it so that transactions are triggering multiversion
    // concurrency control errors.
    // Deploying a fresh new contract here as a quick workaround resolves that
    // problem, the real fix is to make the health check use a tx that does not
    // commit instead just reads something which should still prove that the
    // AIO legder is up and running fine but it won't cause this issue anymore.
    const contractName = "basic2";
    const cmd = [
      "./network.sh",
      "deployCC",
      "-ccn",
      contractName,
      "-ccp",
      "../asset-transfer-basic/chaincode-go",
      "-ccl",
      "go",
    ];

    const container = ledger.getContainer();
    const timeout = 180000; // 3 minutes
    const cwd = "/fabric-samples/test-network/";
    const out = await Containers.exec(container, cmd, timeout, logLevel, cwd);
    expect(out).toBeTruthy();
    log.info("Output of Basic2 contract deployment below:");
    log.info(out);

    {
      // make invoke InitLedger using a client1 client
      await plugin.transact({
        signingCredential: {
          keychainId: keychainId,
          keychainRef: client1Key,
        },
        channelName: "mychannel",
        contractName,
        invocationType: FabricContractInvocationType.Send,
        methodName: "InitLedger",
        params: [],
      });
    }
    {
      // make invoke TransferAsset using a client2 client
      await plugin.transact({
        signingCredential: {
          keychainId: keychainId,
          keychainRef: client2Key,
          type: FabricSigningCredentialType.VaultX509,
          vaultTransitKey: {
            token: testToken,
            keyName: client2Key,
          },
        },
        channelName: "mychannel",
        contractName,
        invocationType: FabricContractInvocationType.Send,
        methodName: "TransferAsset",
        params: ["asset1", "client2"],
      });
    }
    {
      // make query ReadAsset using a registrar client
      const resp = await plugin.transact({
        signingCredential: {
          keychainId: keychainId,
          keychainRef: registrarKey + "-vault",
          type: FabricSigningCredentialType.VaultX509,
          vaultTransitKey: {
            token: testToken,
            keyName: registrarKey,
          },
        },
        channelName: "mychannel",
        contractName,
        invocationType: FabricContractInvocationType.Call,
        methodName: "ReadAsset",
        params: ["asset1"],
      });
      const asset = JSON.parse(resp.functionOutput);
      expect(asset.Owner).toEqual("client2");
    }
  });
});
