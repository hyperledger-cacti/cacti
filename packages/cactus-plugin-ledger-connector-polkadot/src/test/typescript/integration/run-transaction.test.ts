import { AddressInfo } from "net";
import http from "http";
import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import express from "express";

import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { Configuration, PluginImportType } from "@hyperledger/cactus-core-api";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  PluginLedgerConnectorPolkadot,
  IPluginLedgerConnectorPolkadotOptions,
  DefaultApi as PolkadotApi,
  Web3SigningCredentialType,
  PluginFactoryLedgerConnector,
} from "../../../main/typescript/public-api";
import { K_CACTUS_POLKADOT_TOTAL_TX_COUNT } from "../../../main/typescript/prometheus-exporter/metrics";
import { SubstrateTestLedger } from "../../../../../cactus-test-tooling/src/main/typescript/substrate-test-ledger/substrate-test-ledger";

describe("PluginLedgerConnectorPolkadot", () => {
  const logLevel: LogLevelDesc = "TRACE";

  const DEFAULT_WSPROVIDER = "ws://127.0.0.1:9944";
  const instanceId = "test-polkadot-connector";
  const ledgerOptions = {
    publishAllPorts: false,
    logLevel: "INFO" as LogLevelDesc,
    emitContainerLogs: true,
  };
  const ledger = new SubstrateTestLedger(ledgerOptions);
  const expressApp = express();
  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: false }));
  const server = http.createServer(expressApp);
  let addressInfo: AddressInfo,
    address: string,
    port: number,
    apiHost: string,
    plugin: PluginLedgerConnectorPolkadot,
    keychainEntryKey: string,
    keychainEntryValue: string,
    keychainPlugin: PluginKeychainMemory,
    apiClient: PolkadotApi,
    apiConfig: Configuration;

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).toResolve();
  });

  afterAll(async () => {
    await ledger.stop();
    await plugin.shutdownConnectionToSubstrate();
  });

  afterAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  afterAll(async () => await Servers.shutdown(server));

  beforeAll(async () => {
    const ledgerContainer = await ledger.start();
    expect(ledgerContainer).toBeTruthy();
    keychainEntryKey = uuidv4();
    keychainEntryValue = "//Alice";
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      // pre-provision keychain with mock backend holding the private key of the
      // test account that we'll reference while sending requests with the
      // signing credential pointing to this keychain entry.
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });

    const connectorOptions: IPluginLedgerConnectorPolkadotOptions = {
      logLevel: logLevel,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
      wsProviderUrl: DEFAULT_WSPROVIDER,
      instanceId: instanceId,
    };

    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });

    plugin = await factory.create(connectorOptions);
    await plugin.onPluginInit();

    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server,
    };
    addressInfo = await Servers.listen(listenOptions);
    ({ address, port } = addressInfo);
    apiHost = `http://${address}:${port}`;
    apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new PolkadotApi(apiConfig);
    await plugin.registerWebServices(expressApp);
    await plugin.getOrCreateWebServices();
  });

  test("transact using pre-signed transaction", async () => {
    const { Keyring } = await import("@polkadot/api");

    const keyring = new Keyring({ type: "sr25519" });
    const alicePair = keyring.createFromUri("//Alice");
    const bobPair = keyring.createFromUri("//Bob");

    const infoForSigningTransaction = await apiClient.getTransactionInfo({
      accountAddress: alicePair.address,
      transactionExpiration: 500,
    });
    expect(infoForSigningTransaction.status).toEqual(200);
    const response = infoForSigningTransaction.data;
    expect(response).toBeTruthy();
    const nonce = response.responseContainer.response_data.nonce;
    expect(nonce).toBeTruthy();
    const blockHash = response.responseContainer.response_data.blockHash;
    expect(blockHash).toBeTruthy();
    const era = response.responseContainer.response_data.era;
    expect(era).toBeTruthy();

    const signingOptions = {
      nonce: nonce,
      blockHash: blockHash,
      era: era,
    };

    const transaction = await apiClient.getRawTransaction({
      to: bobPair.address,
      value: 20,
    });
    expect(transaction).toBeTruthy();
    expect(
      transaction.data.responseContainer.response_data.rawTransaction,
    ).toBeTruthy();
    const rawTransaction =
      transaction.data.responseContainer.response_data.rawTransaction;

    const signedTransactionResponse = await apiClient.signRawTransaction({
      rawTransaction: rawTransaction,
      mnemonic: "//Alice",
      signingOptions,
    });
    expect(signedTransactionResponse.data.success).toBeTrue();
    expect(signedTransactionResponse.data.signedTransaction).toBeTruthy();
    const signedTransaction = signedTransactionResponse.data.signedTransaction;
    const TransactionDetails = await apiClient.runTransaction({
      web3SigningCredential: { type: Web3SigningCredentialType.None },
      transactionConfig: {
        transferSubmittable: signedTransaction,
      },
    });
    expect(TransactionDetails.status).toEqual(200);
    const transactionResponse = TransactionDetails.data;
    expect(transactionResponse).toBeTruthy();
    expect(transactionResponse.success).toBeTrue();
    expect(transactionResponse.txHash).toBeTruthy();
    expect(transactionResponse.blockHash).toBeTruthy();
  });

  test("transact by omiting mnemonic string", async () => {
    const { Keyring } = await import("@polkadot/api");

    const keyring = new Keyring({ type: "sr25519" });
    const bobPair = keyring.createFromUri("//Bob");
    const TransactionDetails = apiClient.runTransaction({
      web3SigningCredential: {
        type: Web3SigningCredentialType.MnemonicString,
        mnemonic: "",
      },
      transactionConfig: {
        to: bobPair.address,
        value: 30,
      },
    });

    await expect(TransactionDetails).rejects.toHaveProperty(
      ["response", "status"],
      400,
    );
  });

  test("transact using passing mnemonic string", async () => {
    const { Keyring } = await import("@polkadot/api");

    const keyring = new Keyring({ type: "sr25519" });
    const bobPair = keyring.createFromUri("//Bob");
    const TransactionDetails = await apiClient.runTransaction({
      web3SigningCredential: {
        type: Web3SigningCredentialType.MnemonicString,
        mnemonic: "//Alice",
      },
      transactionConfig: {
        to: bobPair.address,
        value: 30,
      },
    });
    expect(TransactionDetails.status).toEqual(200);
    const transactionResponse = TransactionDetails.data;
    expect(transactionResponse).toBeTruthy();
    expect(transactionResponse.success).toBeTrue();
    expect(transactionResponse.txHash).toBeTruthy();
    expect(transactionResponse.blockHash).toBeTruthy();
  });

  test("transact using passing cactus keychain ref", async () => {
    const { Keyring } = await import("@polkadot/api");

    const keyring = new Keyring({ type: "sr25519" });
    const bobPair = keyring.createFromUri("//Bob");
    const TransactionDetails = await apiClient.runTransaction({
      web3SigningCredential: {
        type: Web3SigningCredentialType.CactusKeychainRef,
        keychainEntryKey: keychainEntryKey,
        keychainId: keychainPlugin.getKeychainId(),
      },
      transactionConfig: {
        to: bobPair.address,
        value: 30,
      },
    });
    expect(TransactionDetails.status).toEqual(200);
    const transactionResponse = TransactionDetails.data;
    expect(transactionResponse).toBeTruthy();
    expect(transactionResponse.success).toBeTrue();
    expect(transactionResponse.txHash).toBeTruthy();
    expect(transactionResponse.blockHash).toBeTruthy();
  });

  test("get prometheus exporter metrics", async () => {
    const res = await apiClient.getPrometheusMetrics();
    const promMetricsOutput =
      "# HELP " +
      K_CACTUS_POLKADOT_TOTAL_TX_COUNT +
      " Total transactions executed\n" +
      "# TYPE " +
      K_CACTUS_POLKADOT_TOTAL_TX_COUNT +
      " gauge\n" +
      K_CACTUS_POLKADOT_TOTAL_TX_COUNT +
      '{type="' +
      K_CACTUS_POLKADOT_TOTAL_TX_COUNT +
      '"} 3';
    expect(res).toBeTruthy();
    expect(res.data).toBeTruthy();
    expect(res.status).toEqual(200);
    expect(res.data).toContain(promMetricsOutput);
  });
});
