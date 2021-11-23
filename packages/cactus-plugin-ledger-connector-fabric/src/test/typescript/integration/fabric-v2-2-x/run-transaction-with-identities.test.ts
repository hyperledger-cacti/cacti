import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import test, { Test } from "tape-promise/tape";
import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";
import { v4 as uuidv4 } from "uuid";
import { LogLevelDesc } from "@hyperledger/cactus-common";
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

const logLevel: LogLevelDesc = "TRACE";
import {
  Containers,
  VaultTestServer,
  K_DEFAULT_VAULT_HTTP_PORT,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
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
test("run-transaction-with-identities", async (t: Test) => {
  test.onFailure(async () => {
    await Containers.logDiagnostics({ logLevel });
  });

  const ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
    envVars: new Map([["FABRIC_VERSION", "2.2.0"]]),
    logLevel,
  });

  const tearDown = async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  };

  test.onFinish(tearDown);
  await ledger.start();

  const connectionProfile = await ledger.getConnectionProfileOrg1();
  t.ok(connectionProfile, "getConnectionProfileOrg1() out truthy OK");

  const registrarKey = "registrar";
  const client1Key = "client-default-";
  const client2Key = "client-vault";
  const keychainInstanceId = uuidv4();
  const keychainId = uuidv4();
  /////
  const vaultTestContainer = new VaultTestServer({});
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
  const testToken = "myroot";
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
  test.onFinish(async () => {
    await vaultTestContainer.stop();
    await vaultTestContainer.destroy();
  });
  ///
  const keychainPlugin = new PluginKeychainMemory({
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
    sshConfig: {},
    cliContainerEnv: {},
    peerBinary: "not-required",
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
  const plugin = new PluginLedgerConnectorFabric(pluginOptions);
  t.test("with-vaultKey", async (t: Test) => {
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
      t.ok(rawCert);
      const certData = JSON.parse(rawCert) as IIdentityData;
      t.equal(certData.type, FabricSigningCredentialType.X509);
      t.ok(certData.credentials.privateKey);
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
      t.ok(rawCert);
      const certData = JSON.parse(rawCert) as IIdentityData;
      t.equal(certData.type, FabricSigningCredentialType.VaultX509);
      t.notok(certData.credentials.privateKey);
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
      t.equal(secret, "pw");
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
      t.equal(secret, "pw");
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
      t.ok(rawCert);
      const certData = JSON.parse(rawCert) as IIdentityData;
      t.equal(certData.type, FabricSigningCredentialType.X509);
      t.ok(certData.credentials.privateKey);
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
      t.ok(rawCert, "rawCert truthy OK");
      const { type, credentials } = JSON.parse(rawCert) as IIdentityData;
      const { privateKey } = credentials;
      t.equal(type, FabricSigningCredentialType.VaultX509, "Cert is X509 OK");
      t.notok(privateKey, "certData.credentials.privateKey falsy OK");
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
    t.ok(out, "deploy Basic2 command output truthy OK");
    t.comment("Output of Basic2 contract deployment below:");
    t.comment(out);
    {
      // make invoke InitLedger using a client1 client
      const resp = await plugin.transact({
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
      t.true(resp.success, "InitLedger tx for Basic2 success===true OK");
    }
    {
      // make invoke TransferAsset using a client2 client
      const resp = await plugin.transact({
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
      t.true(resp.success, "TransferAsset asset1 client2 success true OK");
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
      t.true(resp.success);
      const asset = JSON.parse(resp.functionOutput);
      t.equal(asset.owner, "client2");
    }
    t.end();
  });
  t.end();
});
