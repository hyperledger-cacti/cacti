import http from "http";
import { AddressInfo } from "net";
import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import bodyParser from "body-parser";
import {
  DefaultApi as BesuApi,
  IPluginHtlcEthBesuErc20Options,
  NewContractRequest,
  PluginFactoryHtlcEthBesuErc20,
  RefundRequest,
  InitializeRequest,
  Configuration,
} from "@hyperledger/cactus-plugin-htlc-eth-besu-erc20";
import {
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  Web3SigningCredential,
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
  BESU_TEST_LEDGER_DEFAULT_OPTIONS,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import TestTokenJSON from "../../../solidity/token-erc20-contract/Test_Token.json";
import DemoHelperJSON from "../../../solidity/token-erc20-contract/DemoHelpers.json";
import HashTimeLockJSON from "../../../../../../cactus-plugin-htlc-eth-besu-erc20/src/main/solidity/contracts/HashedTimeLockContract.json";
const testCase = "Test refund endpoint";
describe(testCase, () => {
  const logLevel: LogLevelDesc = "TRACE";
  const estimatedGas = 6721975;
  const receiver = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
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
  const keychainId = uuidv4();
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const besuTestLedger = new BesuTestLedger({
    logLevel,
    envVars: [...BESU_TEST_LEDGER_DEFAULT_OPTIONS.envVars, "BESU_LOGGING=ALL"],
  });
  const server = http.createServer(expressApp);
  let addressInfo,
    address: string,
    port: number,
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

  afterAll(async () => await Servers.shutdown(server));
  afterAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });
  beforeAll(async () => {
    await besuTestLedger.start();

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

  test("Test invalid refund with invalid time", async () => {
    const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();
    const keychainPlugin = new PluginKeychainMemory({
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
    keychainPlugin.set(
      DemoHelperJSON.contractName,
      JSON.stringify(DemoHelperJSON),
    );
    keychainPlugin.set(
      HashTimeLockJSON.contractName,
      JSON.stringify(HashTimeLockJSON),
    );

    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });

    const pluginRegistry = new PluginRegistry({});
    const connector: PluginLedgerConnectorBesu = await factory.create({
      rpcApiHttpHost,
      rpcApiWsHost,
      logLevel,
      instanceId: connectorId,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });

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

    const deployOutDemo = await connector.deployContract({
      contractName: DemoHelperJSON.contractName,
      contractAbi: DemoHelperJSON.abi,
      bytecode: DemoHelperJSON.bytecode,
      web3SigningCredential,
      keychainId,
      constructorArgs: [],
      gas: estimatedGas,
    });
    expect(deployOutDemo).toBeTruthy();
    expect(deployOutDemo.transactionReceipt).toBeTruthy();
    expect(deployOutDemo.transactionReceipt.contractAddress).toBeTruthy();

    const { success } = await connector.invokeContract({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Send,
      methodName: "approve",
      params: [hashTimeLockAddress, "10"],
      gas: estimatedGas,
    });
    expect(success).toBeTruthy();

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
      contractName: DemoHelperJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "getTimestamp",
      params: [],
    });
    expect(callOutput).toBeTruthy();
    let timestamp = 0;
    timestamp = callOutput as number;
    timestamp = +timestamp + +10;

    const responseAllowance = await connector.invokeContract({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "allowance",
      params: [firstHighNetWorthAccount, hashTimeLockAddress],
    });
    expect(responseAllowance.callOutput).toEqual("10");

    const request: NewContractRequest = {
      contractAddress: hashTimeLockAddress,
      inputAmount: 10,
      outputAmount: 1,
      expiration: timestamp,
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

    const responseTxId = await connector.invokeContract({
      contractName: DemoHelperJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "getTxId",
      params: [
        firstHighNetWorthAccount,
        receiver,
        10,
        hashLock,
        timestamp,
        tokenAddress,
      ],
    });
    expect(responseTxId.callOutput).toBeTruthy();
    const id = responseTxId.callOutput as string;

    try {
      const refundRequest: RefundRequest = {
        id,
        web3SigningCredential,
        connectorId,
        keychainId,
      };
      const resRefund = await api.refundV1(refundRequest);
      expect(resRefund.status).toEqual(400);
    } catch (error: any) {
      expect(error.response.status).toEqual(400);
    }

    const responseFinalBalance = await connector.invokeContract({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "balanceOf",
      params: [firstHighNetWorthAccount],
    });
    expect(responseFinalBalance.callOutput).toEqual("90");
  });
});
