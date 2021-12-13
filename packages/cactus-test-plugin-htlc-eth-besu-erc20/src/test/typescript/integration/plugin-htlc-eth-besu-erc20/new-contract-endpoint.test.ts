import http from "http";
import type { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import "jest-extended";
import express from "express";
import bodyParser from "body-parser";
import {
  DefaultApi as BesuApi,
  IPluginHtlcEthBesuErc20Options,
  PluginFactoryHtlcEthBesuErc20,
  NewContractRequest,
  InitializeRequest,
  Web3SigningCredential,
  Configuration,
} from "@hyperledger/cactus-plugin-htlc-eth-besu-erc20";
import {
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import {
  BesuTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import HashTimeLockJSON from "../../../../../../cactus-plugin-htlc-eth-besu-erc20/src/main/solidity/contracts/HashedTimeLockContract.json";
import TestTokenJSON from "../../../solidity/token-erc20-contract/Test_Token.json";
const testCase = "Test new valid contract";

describe(testCase, () => {
  const logLevel: LogLevelDesc = "INFO";
  const estimatedGas = 6721975;
  const expiration = 2147483648;
  const besuTestLedger = new BesuTestLedger({ logLevel });
  const receiver = besuTestLedger.getGenesisAccountPubKey();
  const hashLock =
    "0x3c335ba7f06a8b01d0596589f73c19069e21c81e5013b91f408165d1bf623d32";
  const firstHighNetWorthAccount = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
  const privateKey =
    "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
  const connectorId = uuidv4();
  const web3SigningCredential: Web3SigningCredential = {
    ethAccount: firstHighNetWorthAccount,
    secret: privateKey,
    type: Web3SigningCredentialType.PrivateKeyHex,
  } as Web3SigningCredential;
  const expressApp = express();
  const keychainId = uuidv4();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  let addressInfo,
    rpcApiHttpHost: string,
    connector: PluginLedgerConnectorBesu,
    rpcApiWsHost: string,
    keychainPlugin: PluginKeychainMemory,
    address: string,
    port: number,
    factory: PluginFactoryLedgerConnector,
    apiHost,
    configuration,
    api: BesuApi;

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  afterAll(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  afterAll(async () => {
    await Servers.shutdown(server);
  });

  afterAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  beforeAll(async () => {
    await besuTestLedger.start();
    rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    expect(rpcApiHttpHost).toBeString();

    rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();
    expect(rpcApiWsHost).toBeString();
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId,
      // pre-provision keychain with mock backend holding the private key of the
      // test account that we'll reference while sending requests with the
      // signing credential pointing to this keychain entry.
      backend: new Map([
        [TestTokenJSON.contractName, JSON.stringify(TestTokenJSON)],
      ]),
      logLevel,
    });
    factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });
    connector = await factory.create({
      rpcApiHttpHost,
      rpcApiWsHost,
      logLevel,
      instanceId: connectorId,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });

    const listenOptions: IListenOptions = {
      hostname: "0.0.0.0",
      port: 0,
      server,
    };
    addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    ({ address, port } = addressInfo);
    apiHost = `http://${address}:${port}`;
    configuration = new Configuration({ basePath: apiHost });
    api = new BesuApi(configuration);
  });

  test(testCase, async () => {
    keychainPlugin.set(
      HashTimeLockJSON.contractName,
      JSON.stringify(HashTimeLockJSON),
    );

    const pluginRegistry = new PluginRegistry({});
    pluginRegistry.add(connector);
    const pluginOptions: IPluginHtlcEthBesuErc20Options = {
      instanceId: uuidv4(),
      logLevel,
      pluginRegistry,
    };

    const factoryHTLC = new PluginFactoryHtlcEthBesuErc20({
      pluginImportType: PluginImportType.Local,
    });
    const pluginHtlc = await factoryHTLC.create(pluginOptions);
    pluginRegistry.add(pluginHtlc);
    await pluginHtlc.getOrCreateWebServices();
    await pluginHtlc.registerWebServices(expressApp);

    const initRequest: InitializeRequest = {
      connectorId,
      keychainId,
      constructorArgs: [],
      web3SigningCredential,
      gas: estimatedGas,
    };
    const deployOut = await pluginHtlc.initialize(initRequest);
    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();
    const hashTimeLockAddress = deployOut.transactionReceipt
      .contractAddress as string;

    const deployOutToken = await connector.deployContract({
      contractName: TestTokenJSON.contractName,
      contractAbi: TestTokenJSON.abi,
      bytecode: TestTokenJSON.bytecode,
      web3SigningCredential,
      keychainId,
      constructorArgs: ["100", "token", "2", "TKN"],
      gas: estimatedGas,
    });
    expect(deployOutToken).toBeTruthy();
    expect(deployOutToken.transactionReceipt).toBeTruthy();
    expect(deployOutToken.transactionReceipt.contractAddress).toBeTruthy();
    const tokenAddress = deployOutToken.transactionReceipt
      .contractAddress as string;

    const { success } = await connector.invokeContract({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Send,
      methodName: "approve",
      params: [hashTimeLockAddress, "10"],
      gas: estimatedGas,
    });
    expect(success).toBe(true);

    const responseBalance = await connector.invokeContract({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "balanceOf",
      params: [firstHighNetWorthAccount],
    });
    expect(responseBalance.callOutput).toEqual("100");

    const { callOutput } = await connector.invokeContract({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "allowance",
      params: [firstHighNetWorthAccount, hashTimeLockAddress],
    });
    expect(callOutput).toEqual("10");

    const request: NewContractRequest = {
      contractAddress: hashTimeLockAddress,
      inputAmount: 10,
      outputAmount: 1,
      expiration,
      hashLock,
      tokenAddress,
      receiver,
      outputNetwork: "BTC",
      outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
      connectorId,
      keychainId,
      web3SigningCredential,
      gas: estimatedGas,
    };
    const res = await api.newContractV1(request);
    expect(res.status).toEqual(200);
  });

  test("Test new invalid contract with 0 inputAmount token for HTLC", async () => {
    keychainPlugin.set(
      HashTimeLockJSON.contractName,
      JSON.stringify(HashTimeLockJSON),
    );

    const pluginRegistry = new PluginRegistry({});
    pluginRegistry.add(connector);
    const pluginOptions: IPluginHtlcEthBesuErc20Options = {
      instanceId: uuidv4(),
      logLevel,
      pluginRegistry,
    };

    const factoryHTLC = new PluginFactoryHtlcEthBesuErc20({
      pluginImportType: PluginImportType.Local,
    });
    const pluginHtlc = await factoryHTLC.create(pluginOptions);
    pluginRegistry.add(pluginHtlc);
    await pluginHtlc.getOrCreateWebServices();
    await pluginHtlc.registerWebServices(expressApp);

    const initRequest: InitializeRequest = {
      connectorId,
      keychainId,
      constructorArgs: [],
      web3SigningCredential,
      gas: estimatedGas,
    };
    const deployOut = await pluginHtlc.initialize(initRequest);

    expect(deployOut).toBeTruthy();
    expect(deployOut.transactionReceipt).toBeTruthy();
    expect(deployOut.transactionReceipt.contractAddress).toBeTruthy();
    const hashTimeLockAddress = deployOut.transactionReceipt
      .contractAddress as string;

    const deployOutToken = await connector.deployContract({
      contractName: TestTokenJSON.contractName,
      contractAbi: TestTokenJSON.abi,
      bytecode: TestTokenJSON.bytecode,
      web3SigningCredential,
      keychainId,
      constructorArgs: ["100", "token", "2", "TKN"],
      gas: estimatedGas,
    });
    expect(deployOutToken).toBeTruthy();
    expect(deployOutToken.transactionReceipt).toBeTruthy();
    expect(deployOutToken.transactionReceipt.contractAddress).toBeTruthy();
    const tokenAddress = deployOutToken.transactionReceipt
      .contractAddress as string;

    const { success } = await connector.invokeContract({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Send,
      methodName: "approve",
      params: [hashTimeLockAddress, "10"],
      gas: estimatedGas,
    });
    expect(success).toBe(true);

    const responseBalance = await connector.invokeContract({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "balanceOf",
      params: [firstHighNetWorthAccount],
    });
    expect(responseBalance.callOutput).toEqual("100");

    const { callOutput } = await connector.invokeContract({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "allowance",
      params: [firstHighNetWorthAccount, hashTimeLockAddress],
    });
    expect(callOutput).toEqual("10");

    try {
      const request: NewContractRequest = {
        contractAddress: hashTimeLockAddress,
        inputAmount: 0,
        outputAmount: 0,
        expiration,
        hashLock,
        tokenAddress,
        receiver,
        outputNetwork: "BTC",
        outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
        connectorId,
        keychainId,
        web3SigningCredential,
        gas: estimatedGas,
      };
      const res = await api.newContractV1(request);
      expect(res.status).toEqual(400);
    } catch (error: any) {
      expect(error.response.status).toEqual(400);
    }
  });
});
