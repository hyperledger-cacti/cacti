import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { StellarTestLedger } from "@hyperledger/cactus-test-tooling";
import { Network } from "stellar-plus/lib/stellar-plus";
import { NetworkConfig } from "stellar-plus/lib/stellar-plus/network";
import { pluginName } from "..";
import { PluginFactoryLedgerConnector } from "../../../../../main/typescript/plugin-factory-ledger-connector";
import { Constants, PluginImportType } from "@hyperledger/cactus-core-api";
import { PluginLedgerConnectorStellar } from "../../../../../main/typescript/plugin-ledger-connector-stellar";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { v4 as uuidV4 } from "uuid";
import { loadWasmFile } from "../../../../../main/typescript/utils";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { Server as SocketIoServer } from "socket.io";
import { AddressInfo } from "net";
import {
  StellarApiClient,
  StellarApiClientOptions,
} from "../../../../../main/typescript/api-client/stellar-api-client";
import { DefaultAccountHandler } from "stellar-plus/lib/stellar-plus/account";
import { K_CACTUS_STELLAR_TOTAL_TX_COUNT } from "../../../../../main/typescript/prometheus-exporter/metrics";

const testCaseName = pluginName + " / deploys contracts";
const deployContractFnTag = `PluginLedgerConnectorStellar#deployContract()`;

describe(testCaseName, () => {
  const logLevel: LogLevelDesc = "TRACE";
  const stellarTestLedger = new StellarTestLedger({ logLevel });
  let networkConfig: NetworkConfig;
  let wasmBuffer: Buffer;
  let connector: PluginLedgerConnectorStellar;
  let server: http.Server;
  let apiClient: StellarApiClient;
  const contractIdPattern = /^C[A-Z0-9]{55}$/;
  const wasmHashPattern = /^[a-f0-9]{64}$/;

  beforeAll(async () => {
    // Load the WASM file for the
    // `hello_world`example contract.
    wasmBuffer = await loadWasmFile(
      "./packages/cacti-plugin-ledger-connector-stellar/src/test/rust/demo-contract/hello_world.wasm",
    );
    expect(wasmBuffer).toBeDefined();

    await stellarTestLedger.start();
    networkConfig = Network.CustomNet(
      await stellarTestLedger.getNetworkConfiguration(),
    );

    expect(networkConfig.horizonUrl).toBeDefined();
    expect(networkConfig.networkPassphrase).toBeDefined();
    expect(networkConfig.rpcUrl).toBeDefined();
    expect(networkConfig.friendbotUrl).toBeDefined();

    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });

    connector = await factory.create({
      networkConfig,
      pluginRegistry: new PluginRegistry({}),
      instanceId: uuidV4(),
    });

    await connector.onPluginInit();

    expect(connector).toBeInstanceOf(PluginLedgerConnectorStellar);

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    server = http.createServer(expressApp);

    const wsApi = new SocketIoServer(server, {
      path: Constants.SocketIoConnectionPathV1,
    });

    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;

    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    console.log(
      `Metrics URL: ${apiHost}/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/get-prometheus-exporter-metrics`,
    );
    const stellarApiClientOptions = new StellarApiClientOptions({
      basePath: apiHost,
    });
    apiClient = new StellarApiClient(stellarApiClientOptions);
    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);
  });

  afterAll(async () => {
    await stellarTestLedger.stop();
    await stellarTestLedger.destroy();
    await Servers.shutdown(server);
  });

  describe("core features", () => {
    it("should deploy a contract to the ledger with just the WASM file", async () => {
      const deployerAccount = new DefaultAccountHandler({ networkConfig });
      await deployerAccount.initializeWithFriendbot();

      const res = await connector.deployContract({
        wasmBuffer: wasmBuffer.toString("base64"),
        transactionInvocation: {
          header: {
            source: deployerAccount.getPublicKey(),
            fee: 100,
            timeout: 30,
          },
          signers: [deployerAccount.getSecretKey()],
        },
      });

      expect(res).toBeDefined();
      expect(res.contractId).toMatch(contractIdPattern);
      expect(res.wasmHash).toMatch(wasmHashPattern);
    });

    it("should deploy a contract to the ledger using the WASM hash of a previously deployed contract", async () => {
      const deployerAccount = new DefaultAccountHandler({ networkConfig });
      await deployerAccount.initializeWithFriendbot();
      const responseFromDeployedWasm = await connector.deployContract({
        wasmBuffer: wasmBuffer.toString("base64"),
        transactionInvocation: {
          header: {
            source: deployerAccount.getPublicKey(),
            fee: 100,
            timeout: 30,
          },
          signers: [deployerAccount.getSecretKey()],
        },
      });
      const { contractId, wasmHash } = responseFromDeployedWasm;

      const responseFromDeployedWasmHash = await connector.deployContract({
        wasmHash,
        transactionInvocation: {
          header: {
            source: deployerAccount.getPublicKey(),
            fee: 100,
            timeout: 30,
          },
          signers: [deployerAccount.getSecretKey()],
        },
      });

      expect(responseFromDeployedWasmHash).toBeDefined();
      expect(responseFromDeployedWasmHash.wasmHash).toMatch(wasmHashPattern);
      expect(responseFromDeployedWasmHash.wasmHash).toBe(wasmHash);
      expect(responseFromDeployedWasmHash.contractId).toMatch(
        contractIdPattern,
      );
      expect(responseFromDeployedWasmHash.contractId).not.toBe(contractId);
    });
  });

  describe("Error handling", () => {
    it("should throw if the wasm upload fails", async () => {
      const deployerAccount = new DefaultAccountHandler({ networkConfig });
      await deployerAccount.initializeWithFriendbot();

      await expect(
        connector.deployContract({
          wasmBuffer: wasmBuffer.toString("base64"),
          transactionInvocation: {
            header: {
              source: "MOCKED_PK",
              fee: 100,
              timeout: 30,
            },
            signers: [deployerAccount.getSecretKey()],
          },
        }),
      ).rejects.toThrow(`${deployContractFnTag} Failed to upload wasm.`);
    });

    it("should throw if the wasmHash deploy fails", async () => {
      const deployerAccount = new DefaultAccountHandler({ networkConfig });
      await deployerAccount.initializeWithFriendbot();
      const responseFromDeployedWasm = await connector.deployContract({
        wasmBuffer: wasmBuffer.toString("base64"),
        transactionInvocation: {
          header: {
            source: deployerAccount.getPublicKey(),
            fee: 100,
            timeout: 30,
          },
          signers: [deployerAccount.getSecretKey()],
        },
      });
      const wasmHash = responseFromDeployedWasm.wasmHash;

      await expect(
        connector.deployContract({
          wasmHash,
          transactionInvocation: {
            header: {
              source: "MOCKED_PK",
              fee: 100,
              timeout: 30,
            },
            signers: [deployerAccount.getSecretKey()],
          },
        }),
      ).rejects.toThrow(`${deployContractFnTag} Failed to deploy contract.`);
    });
  });

  describe("Prometheus", () => {
    it("should provide transaction metrics", async () => {
      const promMetricsOutput =
        "# HELP " +
        K_CACTUS_STELLAR_TOTAL_TX_COUNT +
        " Total transactions executed\n" +
        "# TYPE " +
        K_CACTUS_STELLAR_TOTAL_TX_COUNT +
        " gauge\n" +
        K_CACTUS_STELLAR_TOTAL_TX_COUNT +
        '{type="' +
        K_CACTUS_STELLAR_TOTAL_TX_COUNT +
        '"} 4';

      const res = await apiClient.getPrometheusMetricsV1();

      expect(res).toBeDefined();
      expect(res.data.includes(promMetricsOutput)).toBe(true);
    });
  });
});
