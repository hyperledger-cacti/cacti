import http from "http";
import { AddressInfo } from "net";
import "jest-extended";

import { v4 as uuidv4 } from "uuid";

import bodyParser from "body-parser";
import express from "express";

import {
  Containers,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  IListenOptions,
  LogLevelDesc,
  Servers,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  PluginLedgerConnectorFabric,
  DefaultApi as FabricApi,
  RunTransactionRequest,
  FabricContractInvocationType,
  DefaultEventHandlerStrategy,
  FabricSigningCredential,
} from "../../../../main/typescript/public-api";

import { K_CACTUS_FABRIC_TOTAL_TX_COUNT } from "../../../../main/typescript/prometheus-exporter/metrics";

import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";
import { DiscoveryOptions } from "fabric-network";
import { Configuration } from "@hyperledger/cactus-core-api";

/**
 * Use this to debug issues with the fabric node SDK
 * ```sh
 * export HFC_LOGGING='{"debug":"console","info":"console"}'
 * ```
 */

const testCase = "runs tx on a Fabric v2.2.0 ledger";

describe(testCase, () => {
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const logLevel: LogLevelDesc = "TRACE";
  const level = "INFO";
  const label = "fabric run transaction test";
  const log = LoggerProvider.getOrCreate({ level, label });
  const ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    logLevel,
    imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
    imageVersion: "2021-09-02--fix-876-supervisord-retries",
    envVars: new Map([
      ["FABRIC_VERSION", "2.2.0"],
      ["CA_VERSION", "1.4.9"],
    ]),
  });
  let addressInfo,
    address: string,
    port: number,
    apiHost,
    apiConfig,
    apiClient: FabricApi;
  expect(ledger).toBeTruthy();
  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  afterAll(async () => {
    await ledger.stop();
    await ledger.destroy();
  });
  afterAll(async () => await Servers.shutdown(server));

  afterAll(async () => {
    await Containers.logDiagnostics({ logLevel });
  });
  afterAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  beforeAll(async () => {
    await ledger.start();

    const listenOptions: IListenOptions = {
      hostname: "localhost",
      port: 0,
      server,
    };
    addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    ({ address, port } = addressInfo);
    apiHost = `http://${address}:${port}`;

    apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new FabricApi(apiConfig);
  });

  test(testCase, async () => {
    const enrollAdminOut = await ledger.enrollAdmin();
    const adminWallet = enrollAdminOut[1];
    const [userIdentity] = await ledger.enrollUser(adminWallet);

    const connectionProfile = await ledger.getConnectionProfileOrg1();

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

    const pluginOptions: IPluginLedgerConnectorFabricOptions = {
      instanceId: uuidv4(),
      pluginRegistry,
      sshConfig,
      cliContainerEnv: {},
      peerBinary: "/fabric-samples/bin/peer",
      logLevel,
      connectionProfile,
      discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    };
    const plugin = new PluginLedgerConnectorFabric(pluginOptions);

    await plugin.getOrCreateWebServices();
    await plugin.registerWebServices(expressApp);

    const assetId = "asset277";
    const assetOwner = uuidv4();

    const channelName = "mychannel";
    const contractName = "basic";
    const signingCredential: FabricSigningCredential = {
      keychainId,
      keychainRef: keychainEntryKey,
    };
    {
      const res = await apiClient.runTransactionV1({
        signingCredential,
        channelName,
        contractName,
        invocationType: FabricContractInvocationType.Call,
        methodName: "GetAllAssets",
        params: [],
      } as RunTransactionRequest);
      expect(res).toBeTruthy();
      expect(res.data).toBeTruthy();
      expect(res.status).toEqual(200);
      expect(() => JSON.parse(res.data.functionOutput)).not.toThrow();
    }
    {
      const req: RunTransactionRequest = {
        signingCredential,
        channelName,
        invocationType: FabricContractInvocationType.Send,
        contractName,
        methodName: "CreateAsset",
        params: [assetId, "yellow", "11", assetOwner, "199"],
      };

      const res = await apiClient.runTransactionV1(req);
      expect(res.data.transactionId).toBeTruthy();
      expect(res).toBeTruthy();
      expect(res.data).toBeTruthy();
      expect(res.status).toEqual(200);

      const res2 = await apiClient.getTransactionReceiptByTxIDV1({
        signingCredential,
        channelName,
        contractName: "qscc",
        invocationType: FabricContractInvocationType.Call,
        methodName: "GetBlockByTxID",
        params: [channelName, res.data.transactionId],
      } as RunTransactionRequest);

      expect(res2).toBeTruthy();
      log.info(res2.data);
    }

    {
      const res = await apiClient.runTransactionV1({
        signingCredential,
        channelName,
        contractName,
        invocationType: FabricContractInvocationType.Call,
        methodName: "GetAllAssets",
        params: [],
      } as RunTransactionRequest);
      expect(res).toBeTruthy();
      expect(res.data).toBeTruthy();
      expect(res.status).toEqual(200);
      const assets = JSON.parse(res.data.functionOutput);
      const asset277 = assets.find((c: { ID: string }) => c.ID === assetId);
      expect(asset277).toBeTruthy();
      expect(asset277.owner).toBeTruthy();
      expect(asset277.owner).toEqual(assetOwner);
    }

    {
      const res = await apiClient.getPrometheusMetricsV1();
      const promMetricsOutput =
        "# HELP " +
        K_CACTUS_FABRIC_TOTAL_TX_COUNT +
        " Total transactions executed\n" +
        "# TYPE " +
        K_CACTUS_FABRIC_TOTAL_TX_COUNT +
        " gauge\n" +
        K_CACTUS_FABRIC_TOTAL_TX_COUNT +
        '{type="' +
        K_CACTUS_FABRIC_TOTAL_TX_COUNT +
        '"} 3';
      expect(res).toBeTruthy();
      expect(res.data).toBeTruthy();
      expect(res.status).toEqual(200);
      expect(res.data.includes(promMetricsOutput)).toBeTrue();
    }

    {
      const req: RunTransactionRequest = {
        signingCredential,
        gatewayOptions: {
          identity: keychainEntryKey,
          wallet: {
            json: keychainEntryValue,
          },
        },
        channelName,
        invocationType: FabricContractInvocationType.Send,
        contractName,
        methodName: "CreateAsset",
        params: ["asset388", "green", "111", assetOwner, "299"],
        endorsingPeers: ["org1.example.com", "Org2MSP"],
      };

      const res = await apiClient.runTransactionV1(req);
      expect(res).toBeTruthy();
      expect(res.data).toBeTruthy();
      expect(res.status).toEqual(200);
    }

    {
      const res = await apiClient.runTransactionV1({
        gatewayOptions: {
          connectionProfile,
          discovery: discoveryOptions,
          eventHandlerOptions: {
            strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
            commitTimeout: 300,
            endorseTimeout: 300,
          },
          identity: keychainEntryKey,
          wallet: {
            json: keychainEntryValue,
          },
        },
        signingCredential,
        channelName,
        contractName,
        invocationType: FabricContractInvocationType.Call,
        methodName: "GetAllAssets",
        params: [],
      } as RunTransactionRequest);
      expect(res).toBeTruthy();
      expect(res.data).toBeTruthy();
      expect(res.status).toEqual(200);
      const assets = JSON.parse(res.data.functionOutput);
      const asset277 = assets.find((c: { ID: string }) => c.ID === assetId);
      expect(asset277).toBeTruthy();
      expect(asset277.owner).toBeTruthy();
      expect(asset277.owner).toEqual(assetOwner);
    }
  });
});
