import { AddressInfo } from "net";
import { pluginName } from "..";
import {
  StellarApiClient,
  StellarApiClientOptions,
} from "../../../../../main/typescript/api-client/stellar-api-client";
import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginFactoryLedgerConnector } from "../../../../../main/typescript/plugin-factory-ledger-connector";
import { loadWasmFile } from "../../../../../main/typescript/utils";
import { StellarTestLedger } from "@hyperledger/cactus-test-tooling";
import { NetworkConfig } from "stellar-plus/lib/stellar-plus/network";
import { PluginLedgerConnectorStellar } from "../../../../../main/typescript/plugin-ledger-connector-stellar";
import http from "http";
import { Network } from "stellar-plus/lib/stellar-plus";
import { Constants, PluginImportType } from "@hyperledger/cactus-core-api";
import { v4 as uuidV4 } from "uuid";
import express from "express";
import { Server as SocketIoServer } from "socket.io";
import bodyParser from "body-parser";
import { DefaultAccountHandler } from "stellar-plus/lib/stellar-plus/account";
import { K_CACTUS_STELLAR_TOTAL_TX_COUNT } from "../../../../../main/typescript/prometheus-exporter/metrics";
import {
  GetNameArgs,
  GetNameByIndexArgs,
  SayHelloArgs,
  SayHelloToArgs,
  SayHelloToResponse,
  SetNameArgs,
  spec as helloWorldSpec,
  methods,
} from "../../../../rust/demo-contract/spec";

const testCaseName = pluginName + " / run soroban transactions";
const runSorobanTransactionFnTag = `PluginLedgerConnectorStellar#invokeContract()`;

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

  describe("before deploy", () => {
    it("should fail to invoke a contract Id that isn't deployed yet", async () => {
      const invokerAccount = new DefaultAccountHandler({ networkConfig });
      await invokerAccount.initializeWithFriendbot();

      await expect(
        connector.runSorobanTransaction({
          contractId:
            "CBHYOXSMPOW7PF7OGDCOSMZT45356INSNX4DGWDRUAMTAZMZ5DXZEAAU",
          method: methods.sayHello,
          methodArgs: {} as SayHelloArgs,
          specXdr: helloWorldSpec,
          readOnly: false,
          transactionInvocation: {
            header: {
              source: invokerAccount.getPublicKey(),
              fee: 100,
              timeout: 30,
            },
            signers: [invokerAccount.getSecretKey()],
          },
        }),
      ).rejects.toThrow(
        `${runSorobanTransactionFnTag} Failed to invoke contract. `,
      );
    });

    it("should fail to read from a contract Id that isn't deployed yet", async () => {
      const invokerAccount = new DefaultAccountHandler({ networkConfig });
      await invokerAccount.initializeWithFriendbot();

      await expect(
        connector.runSorobanTransaction({
          contractId:
            "CBHYOXSMPOW7PF7OGDCOSMZT45356INSNX4DGWDRUAMTAZMZ5DXZEAAU",
          method: methods.sayHello,
          methodArgs: {} as SayHelloArgs,
          specXdr: helloWorldSpec,
          readOnly: true,
          transactionInvocation: {
            header: {
              source: invokerAccount.getPublicKey(),
              fee: 100,
              timeout: 30,
            },
            signers: [invokerAccount.getSecretKey()],
          },
        }),
      ).rejects.toThrow(
        `${runSorobanTransactionFnTag} Failed to read contract. `,
      );
    });
  });

  describe("after deploy", () => {
    let contractId: string;
    let adminAccount: DefaultAccountHandler;

    beforeAll(async () => {
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

      adminAccount = new DefaultAccountHandler({ networkConfig });

      expect(res).toBeDefined();
      expect(res.contractId).toMatch(contractIdPattern);
      expect(res.wasmHash).toMatch(wasmHashPattern);
      await expect(
        adminAccount.initializeWithFriendbot(),
      ).resolves.toBeUndefined();

      contractId = res.contractId as string;
    });

    it("should not submit a failing transaction", async () => {
      // Try to invoke a method with the wrong args
      await expect(
        connector.runSorobanTransaction({
          contractId,
          method: methods.sayHelloTo,
          methodArgs: {
            index: 0,
          } as GetNameByIndexArgs,
          specXdr: helloWorldSpec,
          readOnly: false,
          transactionInvocation: {
            header: {
              source: adminAccount.getPublicKey(),
              fee: 100,
              timeout: 30,
            },
            signers: [adminAccount.getSecretKey()],
          },
        }),
      ).rejects.toThrow(
        `${runSorobanTransactionFnTag} Failed to invoke contract. `,
      );
    });

    it("should invoke a contract function to alter the ledger state", async () => {
      const res = await connector.runSorobanTransaction({
        contractId,
        method: methods.setName,
        methodArgs: {
          name: "Fifo",
        } as SetNameArgs,
        specXdr: helloWorldSpec,
        readOnly: false,
        transactionInvocation: {
          header: {
            source: adminAccount.getPublicKey(),
            fee: 100,
            timeout: 30,
          },
          signers: [adminAccount.getSecretKey()],
        },
      });

      expect(res).toBeDefined();
      expect(res).toHaveProperty("result");
    });

    it("should invoke a contract function and return the output", async () => {
      const res = await connector.runSorobanTransaction({
        contractId,
        method: methods.getName,
        methodArgs: {} as GetNameArgs,
        specXdr: helloWorldSpec,
        readOnly: false,
        transactionInvocation: {
          header: {
            source: adminAccount.getPublicKey(),
            fee: 100,
            timeout: 30,
          },
          signers: [adminAccount.getSecretKey()],
        },
      });

      expect(res).toBeDefined();
      expect(res).toHaveProperty("result");
      expect(res.result).toEqual("CaptainCacti");
    });

    it("should simulate a contract function invocation to read a state from the ledger", async () => {
      const expected = ["Hello", "Fifo"] as SayHelloToResponse;

      const res = await connector.runSorobanTransaction({
        contractId,
        method: methods.sayHelloTo,
        methodArgs: {
          to: "Fifo",
        } as SayHelloToArgs,
        specXdr: helloWorldSpec,
        readOnly: true,
        transactionInvocation: {
          header: {
            source: adminAccount.getPublicKey(),
            fee: 100,
            timeout: 30,
          },
          signers: [adminAccount.getSecretKey()],
        },
      });
      expect(res).toBeDefined();
      expect(res).toHaveProperty("result");
      expect(res.result).toEqual(expected);
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
