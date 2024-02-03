import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { SubstrateTestLedger } from "../../../../../cactus-test-tooling/src/main/typescript/substrate-test-ledger/substrate-test-ledger";
import metadata from "../../rust/fixtures/ink/metadata.json";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import express from "express";
import http from "http";
import {
  PluginLedgerConnectorPolkadot,
  IPluginLedgerConnectorPolkadotOptions,
  DefaultApi as PolkadotApi,
  Web3SigningCredentialType,
  PolkadotContractInvocationType,
  PluginFactoryLedgerConnector,
} from "../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { AddressInfo } from "net";
import { Configuration, PluginImportType } from "@hyperledger/cactus-core-api";
import "jest-extended";

const testCase = "invoke contract with all invocation types";
describe(testCase, () => {
  const logLevel: LogLevelDesc = "TRACE";

  const DEFAULT_WSPROVIDER = "ws://127.0.0.1:9944";
  const instanceId = "test-polkadot-connector";
  const ledgerOptions = {
    publishAllPorts: false,
    logLevel: logLevel,
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
    apiConfig: Configuration,
    contractAddress: string;

  const proofSize = 131072;
  const refTime = 6219235328;
  const gasLimit = {
    refTime,
    proofSize,
  };
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
    keychainEntryValue = "//Bob";
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
  beforeAll(async () => {
    const rawWasm = await fs.readFile(
      "packages/cactus-plugin-ledger-connector-polkadot/src/test/rust/fixtures/ink/flipper.wasm",
    );
    const result = await apiClient.deployContractInk({
      wasm: rawWasm.toString("base64"),
      metadata: JSON.stringify(metadata),
      gasLimit: gasLimit,
      storageDepositLimit: null,
      salt: new Uint8Array().toString(),
      web3SigningCredential: {
        type: Web3SigningCredentialType.MnemonicString,
        mnemonic: "//Alice",
      },
      params: [false],
    });
    expect(result).toBeTruthy();
    expect(result.data.success).toBeTrue;
    expect(result.data.contractAddress).toBeTruthy();
    if (!result.data.contractAddress) {
      throw new Error("contract address cannot be undefined");
    }
    contractAddress = result.data.contractAddress;
  });
  test("invalid methodName contract invocation", async () => {
    const result = apiClient.invokeContract({
      invocationType: PolkadotContractInvocationType.Send,
      contractAddress,
      gasLimit,
      metadata: JSON.stringify(metadata),
      methodName: "invalid",
      accountAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", //Alice account address
      web3SigningCredential: {
        type: Web3SigningCredentialType.CactusKeychainRef,
        keychainEntryKey: keychainEntryKey,
        keychainId: keychainPlugin.getKeychainId(),
      },
    });
    await expect(result).rejects.toHaveProperty(["response", "status"], 400);
  });
  test("query ink! contract", async () => {
    const result = await apiClient.invokeContract({
      invocationType: PolkadotContractInvocationType.Query,
      contractAddress,
      gasLimit,
      metadata: JSON.stringify(metadata),
      methodName: "get",
      accountAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", //Alice account address
      web3SigningCredential: {
        type: Web3SigningCredentialType.None,
      },
    });
    expect(result).toBeTruthy();
    expect(result.data.success).toBeTrue;
    expect(result.data.callOutput).toBeTruthy();
  });
  test("flip() invocation", async () => {
    const result = await apiClient.invokeContract({
      invocationType: PolkadotContractInvocationType.Send,
      contractAddress,
      gasLimit,
      metadata: JSON.stringify(metadata),
      methodName: "flip",
      accountAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", //Alice account address
      web3SigningCredential: {
        type: Web3SigningCredentialType.CactusKeychainRef,
        keychainEntryKey: keychainEntryKey,
        keychainId: keychainPlugin.getKeychainId(),
      },
    });
    expect(result).toBeTruthy();
    expect(result.data.success).toBeTrue;
    expect(result.data.blockHash).toBeTruthy();
    expect(result.data.txHash).toBeTruthy();
  });
});
