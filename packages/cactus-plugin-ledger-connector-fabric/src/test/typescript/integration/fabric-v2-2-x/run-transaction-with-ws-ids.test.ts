import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import test, { Test } from "tape-promise/tape";
import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";
import { v4 as uuidv4 } from "uuid";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  DefaultEventHandlerStrategy,
  FabricSigningCredentialType,
  IWebSocketConfig,
  PluginLedgerConnectorFabric,
  IIdentityData,
  FabricContractInvocationType,
} from "../../../../main/typescript/public-api";
import { DiscoveryOptions } from "fabric-network";

const logLevel: LogLevelDesc = "ERROR";
import {
  Containers,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
  WsTestServer,
  WS_IDENTITY_HTTP_PORT,
} from "@hyperledger/cactus-test-tooling";
import { v4 as internalIpV4 } from "internal-ip";
import { WsWallet } from "ws-wallet";
import { WsIdentityClient } from "ws-identity-client";

// test scenario
// - enroll registrar (both using default identity and webSocket(p256) identity)
// - register 2 client (using registrar identity)
// - enroll 1st client using default identity
// - enroll 2nd client using web socket identity(p384)
// - make invoke (InitLedger) using 1st client
// - make invoke (TransferAsset) using 2nd client (p384) client
// - make query ("ReadAsset") using registrar(p256)
test("run-transaction-with-ws-ids", async (t: Test) => {
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

  test.onFinish(async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  const wsTestContainer = new WsTestServer({});
  await wsTestContainer.start();
  await ledger.start();

  const connectionProfile = await ledger.getConnectionProfileOrg1();
  t.ok(connectionProfile, "getConnectionProfileOrg1() out truthy OK");

  const registrarKey = "registrar";
  const client2Key = "client-ws";
  const keychainInstanceId = uuidv4();
  const keychainId = uuidv4();

  const ci = await Containers.getById(wsTestContainer.containerId);
  const wsIpAddr = await internalIpV4();
  const hostPort = await Containers.getPublicPort(WS_IDENTITY_HTTP_PORT, ci);

  const wsUrl = `http://${wsIpAddr}:${hostPort}`;

  const wsConfig: IWebSocketConfig = {
    endpoint: wsUrl,
    pathPrefix: "/identity",
  };

  // external web-socket client
  const wsAdmin = new WsWallet({
    keyName: "admin",
    logLevel,
    strictSSL: false,
  });

  // external web-socket client
  const wsUser = new WsWallet({
    keyName: "user",
    logLevel,
    strictSSL: false,
  });

  test.onFinish(async () => {
    await wsTestContainer.stop();
    await wsTestContainer.destroy();
    await wsAdmin.close();
    await wsUser.close();
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
    FabricSigningCredentialType.WsX509,
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
    webSocketConfig: wsConfig,
  };

  const plugin = new PluginLedgerConnectorFabric(pluginOptions);

  const wsIdClient = new WsIdentityClient({
    apiVersion: "v1",
    endpoint: wsUrl,
    rpDefaults: {
      strictSSL: false,
    },
  });

  t.test("with-webSocketKey", async (t: Test) => {
    let webSocketKeyAdmin, webSocketKeyUser;
    {
      const { sessionId, url } = JSON.parse(
        await wsIdClient.write(
          "session/new",
          {
            pubKeyHex: wsAdmin.getPubKeyHex(),
            keyName: wsAdmin.keyName,
          },
          {},
        ),
      );
      webSocketKeyAdmin = await wsAdmin.open(sessionId, url);
    }

    {
      // enroll registrar using ws identity
      await plugin.enroll(
        {
          keychainId: keychainId,
          keychainRef: registrarKey + "-ws",
          type: FabricSigningCredentialType.WsX509,
          webSocketKey: webSocketKeyAdmin,
        },
        {
          enrollmentID: "admin",
          enrollmentSecret: "adminpw",
          mspId: "Org1MSP",
          caId: "ca.org1.example.com",
        },
      );
      const rawCert = await keychainPlugin.get(registrarKey + "-ws");
      t.ok(rawCert);
      const certData = JSON.parse(rawCert) as IIdentityData;
      t.equal(certData.type, FabricSigningCredentialType.WsX509);
      t.notok(certData.credentials.privateKey);
    }
    {
      // register a client using registrar's ws identity
      const secret = await plugin.register(
        {
          keychainId: keychainId,
          keychainRef: registrarKey + "-ws",
          type: FabricSigningCredentialType.WsX509,
          webSocketKey: webSocketKeyAdmin,
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
      const { sessionId, url } = JSON.parse(
        await wsIdClient.write(
          "session/new",
          {
            pubKeyHex: wsUser.getPubKeyHex(),
            keyName: wsUser.keyName,
          },
          {},
        ),
      );
      webSocketKeyUser = await wsUser.open(sessionId, url);
    }
    {
      // enroll client2 using ws identity
      await plugin.enroll(
        {
          keychainId: keychainId,
          keychainRef: client2Key,
          type: FabricSigningCredentialType.WsX509,
          webSocketKey: webSocketKeyUser,
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
      t.equal(type, FabricSigningCredentialType.WsX509, "Cert is X509 OK");
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
          keychainRef: client2Key,
          type: FabricSigningCredentialType.WsX509,
          webSocketKey: webSocketKeyUser,
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
          type: FabricSigningCredentialType.WsX509,
          webSocketKey: webSocketKeyUser,
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
      const resp = await plugin.transact({
        signingCredential: {
          keychainId: keychainId,
          keychainRef: registrarKey + "-ws",
          type: FabricSigningCredentialType.WsX509,
          webSocketKey: webSocketKeyAdmin,
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
