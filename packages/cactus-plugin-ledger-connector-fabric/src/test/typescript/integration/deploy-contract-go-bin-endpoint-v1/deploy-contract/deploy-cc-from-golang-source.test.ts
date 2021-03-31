import { AddressInfo } from "net";
import http from "http";

import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";

import express from "express";
import bodyParser from "body-parser";

import {
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  DefaultEventHandlerStrategy,
  FabricContractInvocationType,
  PluginLedgerConnectorFabric,
} from "../../../../../main/typescript/public-api";

import { HELLO_WORLD_CONTRACT_GO_SOURCE } from "../../../fixtures/go/hello-world-contract-fabric-v14/hello-world-contract-go-source";

import {
  DefaultApi as FabricApi,
  FabricSigningCredential,
} from "../../../../../main/typescript/public-api";

import { IPluginLedgerConnectorFabricOptions } from "../../../../../main/typescript/plugin-ledger-connector-fabric";

import { DiscoveryOptions } from "fabric-network";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

const testCase = "deploys contract from go source";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didnt throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    imageName: "hyperledger/cactus-fabric-all-in-one",
    imageVersion: "2021-03-02-ssh-hotfix",
  });
  await ledger.start();
  t.doesNotThrow(() => ledger.getContainer(), "Container is set OK");
  const ledgerContainer = ledger.getContainer();
  t.ok(ledgerContainer, "ledgerContainer truthy OK");
  t.ok(ledgerContainer.id, "ledgerContainer.id truthy OK");

  const tearDown = async () => {
    await ledger.stop();
    await ledger.destroy();
  };

  test.onFinish(tearDown);

  const connectionProfile = await ledger.getConnectionProfileOrg1();
  t.ok(connectionProfile, "getConnectionProfileOrg1() out truthy OK");

  const enrollAdminOut = await ledger.enrollAdmin();
  const adminWallet = enrollAdminOut[1];
  const [userIdentity] = await ledger.enrollUser(adminWallet);
  const sshConfig = await ledger.getSshConfig();

  const keychainInstanceId = uuidv4();
  const keychainId = uuidv4();
  const keychainEntryKey = "user2";
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

  // these below mirror how the fabric-samples sets up the configuration
  const org1Env = {
    CORE_PEER_LOCALMSPID: "Org1MSP",
    CORE_PEER_ADDRESS: "peer0.org1.example.com:7051",
    CORE_PEER_MSPCONFIGPATH:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp",
    CORE_PEER_TLS_ROOTCERT_FILE:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt",
    ORDERER_TLS_ROOTCERT_FILE:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem",
  };

  // these below mirror how the fabric-samples sets up the configuration
  const org2Env = {
    CORE_PEER_LOCALMSPID: "Org2MSP",
    CORE_PEER_ADDRESS: "peer0.org2.example.com:9051",
    CORE_PEER_MSPCONFIGPATH:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp",
    CORE_PEER_TLS_ROOTCERT_FILE:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt",
    ORDERER_TLS_ROOTCERT_FILE:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem",
  };

  const pluginOptions: IPluginLedgerConnectorFabricOptions = {
    instanceId: uuidv4(),
    dockerBinary: "/usr/local/bin/docker",
    pluginRegistry,
    cliContainerEnv: org1Env,
    sshConfig,
    logLevel,
    connectionProfile,
    discoveryOptions,
    eventHandlerOptions: {
      strategy: DefaultEventHandlerStrategy.NETWORKSCOPEALLFORTX,
    },
  };
  const plugin = new PluginLedgerConnectorFabric(pluginOptions);

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "localhost",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const { port } = addressInfo;
  test.onFinish(async () => await Servers.shutdown(server));

  await plugin.installWebServices(expressApp);
  const apiUrl = `http://localhost:${port}`;

  const apiClient = new FabricApi({ basePath: apiUrl });
  const res = await apiClient.deployContractGoSourceV1({
    targetPeerAddresses: ["peer0.org1.example.com:7051"],
    tlsRootCertFiles:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt",
    policyDslSource: "AND('Org1MSP.member','Org2MSP.member')",
    channelId: "mychannel",
    chainCodeVersion: "1.0.0",
    constructorArgs: { Args: ["john", "99"] },
    goSource: {
      body: Buffer.from(HELLO_WORLD_CONTRACT_GO_SOURCE).toString("base64"),
      filename: "hello-world.go",
    },
    moduleName: "hello-world",
    targetOrganizations: [org1Env, org2Env],
    pinnedDeps: ["github.com/hyperledger/fabric@v1.4.8"],
  });

  const {
    installationCommandResponse,
    instantiationCommandResponse,
    success,
  } = res.data;

  t.comment(`CC installation out: ${installationCommandResponse.stdout}`);
  t.comment(`CC installation err: ${installationCommandResponse.stderr}`);
  t.comment(`CC instantiation out: ${instantiationCommandResponse.stdout}`);
  t.comment(`CC instantiation err: ${instantiationCommandResponse.stderr}`);

  t.equal(res.status, 200, "res.status === 200 OK");
  t.true(success, "res.data.success === true");

  // FIXME - without this wait it randomly fails with an error claiming that
  // the endorsment was impossible to be obtained. The fabric-samples script
  // does the same thing, it just waits 10 seconds for good measure so there
  // might not be a way for us to avoid doing this, but if there is a way we
  // absolutely should not have timeouts like this, anywhere...
  await new Promise((resolve) => setTimeout(resolve, 20000));

  const testKey = uuidv4();
  const testValue = uuidv4();
  const signingCredential: FabricSigningCredential = {
    keychainId,
    keychainRef: keychainEntryKey,
  };

  const setRes = await apiClient.runTransactionV1({
    contractName: "hello-world",
    channelName: "mychannel",
    params: [testKey, testValue],
    methodName: "set",
    invocationType: FabricContractInvocationType.SEND,
    signingCredential,
  });
  t.ok(setRes, "setRes truthy OK");
  t.true(setRes.status > 199 && setRes.status < 300, "setRes status 2xx OK");
  t.comment(`HelloWorld.set() ResponseBody: ${JSON.stringify(setRes.data)}`);

  const getRes = await apiClient.runTransactionV1({
    contractName: "hello-world",
    channelName: "mychannel",
    params: [testKey],
    methodName: "get",
    invocationType: FabricContractInvocationType.CALL,
    signingCredential,
  });
  t.ok(getRes, "getRes truthy OK");
  t.true(getRes.status > 199 && setRes.status < 300, "getRes status 2xx OK");
  t.comment(`HelloWorld.get() ResponseBody: ${JSON.stringify(getRes.data)}`);
  t.equal(getRes.data.functionOutput, testValue, "get returns UUID OK");
  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didnt throw OK");
  t.end();
});
