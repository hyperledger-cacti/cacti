import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { AddressInfo } from "net";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { Server as SocketIoServer } from "socket.io";
import {
  DefaultApi as HtlcCoordinatorBesuApi,
  PluginFactoryHTLCCoordinatorBesu,
  IPluginHTLCCoordinatorBesuOptions,
  HtlcPackage,
  OwnHTLCRequest,
  CounterpartyHTLCRequest,
  WithdrawCounterpartyRequest,
  Configuration,
} from "../../../../main/typescript/public-api";
import {
  DefaultApi as BesuApi,
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  Web3SigningCredentialType,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  IPluginHtlcEthBesuErc20Options,
  PluginFactoryHtlcEthBesuErc20,
} from "@hyperledger/cactus-plugin-htlc-eth-besu-erc20";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Constants, PluginImportType } from "@hyperledger/cactus-core-api";
import {
  BesuTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import HashTimeLockJSON from "@hyperledger/cactus-plugin-htlc-eth-besu-erc20/src/main/solidity/contracts/HashedTimeLockContract.json";
import TestTokenJSON from "@hyperledger/cactus-test-plugin-htlc-eth-besu-erc20/src/test/solidity/token-erc20-contract/Test_Token.json";
import DemoHelperJSON from "@hyperledger/cactus-test-plugin-htlc-eth-besu-erc20/src/test/solidity/token-erc20-contract/DemoHelpers.json";

const logLevel: LogLevelDesc = "INFO";
const estimatedGas = 6721975;
const expiration = 2147483648;
const incorrect_secret =
  "0x4853485acd2bfc3c632026ee365279743af107a30492e3ceaa7aefc30c2a048a";
const receiver = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
const hashLock =
  "0x3c335ba7f06a8b01d0596589f73c19069e21c81e5013b91f408165d1bf623d32";
const firstHighNetWorthAccount = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
const privateKey =
  "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
const connectorInstanceId = uuidv4();
const web3SigningCredential: Web3SigningCredential = {
  ethAccount: firstHighNetWorthAccount,
  secret: privateKey,
  type: Web3SigningCredentialType.PrivateKeyHex,
} as Web3SigningCredential;
const contractAddress = "0xCfEB869F69431e42cdB54A4F4f105C19C080A601";

const testCase = "Test own htlc endpoint";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  t.comment("Starting Besu Test Ledger");
  const besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();

  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();
  const keychainId = uuidv4();
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
    instanceId: connectorInstanceId,
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });
  pluginRegistry.add(connector);

  const iPluginHtlcEthBesuErc20Options: IPluginHtlcEthBesuErc20Options = {
    instanceId: uuidv4(),
    keychainId: keychainId,
    pluginRegistry,
  };
  const pluginFactoryHtlcEthBesuErc20 = new PluginFactoryHtlcEthBesuErc20({
    pluginImportType: PluginImportType.Local,
  });
  const pluginHtlcEthBesuErc20 = await pluginFactoryHtlcEthBesuErc20.create(
    iPluginHtlcEthBesuErc20Options,
  );
  pluginRegistry.add(pluginHtlcEthBesuErc20);

  const pluginOptions: IPluginHTLCCoordinatorBesuOptions = {
    instanceId: uuidv4(),
    logLevel,
    pluginRegistry,
  };
  const factoryHTLC = new PluginFactoryHTLCCoordinatorBesu({
    pluginImportType: PluginImportType.Local,
  });
  const pluginHTLCCoordinatorBesu = await factoryHTLC.create(pluginOptions);
  pluginRegistry.add(pluginHTLCCoordinatorBesu);

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "0.0.0.0",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(server));
  const { address, port } = addressInfo;
  const apiHost = `http://${address}:${port}`;

  const configuration = new Configuration({ basePath: apiHost });
  const htlcCoordinatorBesuApi = new HtlcCoordinatorBesuApi(configuration);

  await pluginHTLCCoordinatorBesu.getOrCreateWebServices();
  await pluginHTLCCoordinatorBesu.registerWebServices(expressApp);
  const besuWsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });
  const besuConnectorConfiguration = new Configuration({ basePath: apiHost });
  const besuConnectorApi = new BesuApi(besuConnectorConfiguration);

  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp, besuWsApi as any);

  t.comment("Deploys TestToken via .json file on deployContract function");
  const deployOutToken = await connector.deployContract({
    contractName: TestTokenJSON.contractName,
    contractAbi: TestTokenJSON.abi,
    bytecode: TestTokenJSON.bytecode,
    web3SigningCredential,
    keychainId,
    constructorArgs: ["100", "token", "2", "TKN"],
    gas: estimatedGas,
  });
  t.ok(deployOutToken, "deployContract() output is truthy OK");
  t.ok(
    deployOutToken.transactionReceipt,
    "deployContract() output.transactionReceipt is truthy OK",
  );
  t.ok(
    deployOutToken.transactionReceipt.contractAddress,
    "deployContract() output.transactionReceipt.contractAddress is truthy OK",
  );
  const tokenAddress = deployOutToken.transactionReceipt
    .contractAddress as string;

  t.comment("Approve 10 Tokens to HashTimeLockAddress");
  const approveTokensOutput = await besuConnectorApi.invokeContractV1({
    contractName: TestTokenJSON.contractName,
    keychainId,
    signingCredential: web3SigningCredential,
    invocationType: EthContractInvocationType.Send,
    methodName: "approve",
    params: [contractAddress, "10"],
    gas: estimatedGas,
  });
  t.equal(
    approveTokensOutput.data.success,
    true,
    "approve() transactionReceipt.status is true OK",
  );

  t.comment("Get account balance");
  const responseBalance = await besuConnectorApi.invokeContractV1({
    contractName: TestTokenJSON.contractName,
    keychainId,
    signingCredential: web3SigningCredential,
    invocationType: EthContractInvocationType.Call,
    methodName: "balanceOf",
    params: [firstHighNetWorthAccount],
  });
  t.equal(
    responseBalance.data.callOutput,
    "100",
    "balance of account is 100 OK",
  );

  t.comment("Get HashTimeLock contract and account allowance");
  const allowanceOutput = await besuConnectorApi.invokeContractV1({
    contractName: TestTokenJSON.contractName,
    keychainId,
    signingCredential: web3SigningCredential,
    invocationType: EthContractInvocationType.Call,
    methodName: "allowance",
    params: [firstHighNetWorthAccount, contractAddress],
  });
  t.equal(allowanceOutput.status, 200, "allowance status is 200 OK");
  t.equal(allowanceOutput.data.callOutput, "10", "allowance amount is 10 OK");

  t.comment("Create and initialize own HTLC");
  const ownHTLCRequest: OwnHTLCRequest = {
    htlcPackage: HtlcPackage.BesuErc20,
    connectorInstanceId,
    keychainId,
    constructorArgs: [],
    web3SigningCredential,
    inputAmount: 10,
    outputAmount: 1,
    expiration,
    hashLock,
    tokenAddress,
    receiver,
    outputNetwork: "BTC",
    outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
    gas: estimatedGas,
  };

  const response = await htlcCoordinatorBesuApi.ownHtlcV1(ownHTLCRequest);
  t.equal(response.status, 200, "response status is 200 OK");
  t.equal(response.data.success, true, "response success is true");
  t.ok(
    response.data,
    "pluginHTLCCoordinatorBesu.ownHtlcV1() output is truthy OK",
  );
  t.ok(
    response.data.out.transactionReceipt,
    "pluginHTLCCoordinatorBesu.ownHtlcV1() output.transactionReceipt is truthy OK",
  );

  t.comment("Get HTLC id");
  const responseTxId = await besuConnectorApi.invokeContractV1({
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
      expiration,
      tokenAddress,
    ],
    gas: estimatedGas,
  });

  t.comment("Get counterparty HTLC");
  const counterpartyHTLCRequest: CounterpartyHTLCRequest = {
    htlcPackage: HtlcPackage.BesuErc20,
    connectorInstanceId,
    keychainId,
    htlcId: responseTxId.data.callOutput,
    web3SigningCredential,
    gas: estimatedGas,
  };

  const response2 = await htlcCoordinatorBesuApi.counterpartyHtlcV1(
    counterpartyHTLCRequest,
  );
  t.equal(response2.status, 200, "response status is 200 OK");
  t.equal(response2.data.success, true, "response success is true");
  t.equal(response2.data.callOutput, "1", "the contract status is 1 - Active");

  t.comment("Withdraw with incorrect secret");
  const withdrawCounterparty: WithdrawCounterpartyRequest = {
    htlcPackage: HtlcPackage.BesuErc20,
    connectorInstanceId,
    keychainId,
    web3SigningCredential,
    htlcId: responseTxId.data.callOutput,
    secret: incorrect_secret,
    gas: estimatedGas,
  };

  try {
    await htlcCoordinatorBesuApi.withdrawCounterpartyV1(withdrawCounterparty);
  } catch (exp) {
    const revertReason = exp.response.data.error.receipt.revertReason;
    const regExp = new RegExp(/0e494e56414c49445f5345435245540/);
    const rejectMsg = "response === throws OK";
    t.match(revertReason, regExp, rejectMsg);
  }

  t.comment("Get balance of receiver account");
  const responseFinalBalanceReceiver = await connector.invokeContract({
    contractName: TestTokenJSON.contractName,
    keychainId,
    signingCredential: web3SigningCredential,
    invocationType: EthContractInvocationType.Call,
    methodName: "balanceOf",
    params: [receiver],
  });
  t.equal(
    responseFinalBalanceReceiver.callOutput,
    "0",
    "balance of receiver account is 0 OK",
  );

  t.comment("Get balance of sender account");
  const responseFinalBalanceSender = await connector.invokeContract({
    contractName: TestTokenJSON.contractName,
    keychainId,
    signingCredential: web3SigningCredential,
    invocationType: EthContractInvocationType.Call,
    methodName: "balanceOf",
    params: [firstHighNetWorthAccount],
  });
  t.equal(
    responseFinalBalanceSender.callOutput,
    "90",
    "balance of sender account is 90 OK",
  );

  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});
