import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import { AddressInfo } from "net";
import Web3 from "web3";
import {
  Configuration,
  DefaultApi,
  IPluginHtlcEthBesuErc20Options,
  NewContractRequest,
  PluginHtlcEthBesuErc20,
} from "@hyperledger/cactus-plugin-htlc-eth-besu-erc20";
import {
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { ApiServer, ConfigService } from "@hyperledger/cactus-cmd-api-server";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import TestTokenJSON from "../../../solidity/token-erc20-contract/Test_Token.json";
import DemoHelperJSON from "../../../solidity/token-erc20-contract/DemoHelpers.json";

test("Test get single status endpoint", async (t: Test) => {
  const logLevel: LogLevelDesc = "INFO";
  t.comment("Starting Besu Test Ledger");
  const besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();

  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();

  const web3 = new Web3(rpcApiHttpHost);
  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.LOCAL,
  });
  const connector: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry(),
  });

  const httpServer = createServer();
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.once("listening", resolve);
    httpServer.listen(0, "127.0.0.1");
  });

  const addressInfo = httpServer.address() as AddressInfo;
  t.comment(`HttpServer AddressInfo: ${JSON.stringify(addressInfo)}`);
  const nodeHost = `http://${addressInfo.address}:${addressInfo.port}`;
  t.comment(`Cactus Node Host: ${nodeHost}`);

  const pluginRegistry = new PluginRegistry({});
  const configService = new ConfigService();
  const apiServerOptions = configService.newExampleConfig();

  const pluginOptions: IPluginHtlcEthBesuErc20Options = {
    instanceId: uuidv4(),
    logLevel,
    connector,
  };

  const pluginHtlc = new PluginHtlcEthBesuErc20(pluginOptions);
  pluginRegistry.add(pluginHtlc);
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = addressInfo.port;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  const config = configService.newExampleConfigConvict(apiServerOptions);
  const apiServer = new ApiServer({
    httpServerApi: httpServer,
    config: config.getProperties(),
    pluginRegistry,
  });

  await apiServer.start();
  t.comment("Start server");
  test.onFinish(() => apiServer.shutdown());

  const configuration = new Configuration({
    basePath: nodeHost,
  });
  t.comment("Setting configuration");

  const api = new DefaultApi(configuration);
  t.comment("Api generated");

  const firstHighNetWorthAccount = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
  const besuKeyPair = {
    privateKey:
      "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
  };

  let hashTimeLockAddress = "";
  let tokenAddress = "";
  let demoHelpersAddress = "";

  test("Deploys HashTimeLock via .json file on initialize function", async (t2: Test) => {
    const deployOut = await pluginHtlc.initialize(
      firstHighNetWorthAccount,
      besuKeyPair.privateKey,
      Web3SigningCredentialType.PRIVATEKEYHEX,
    );

    t2.ok(deployOut, "pluginHtlc.initialize() output is truthy OK");
    t2.ok(
      deployOut.transactionReceipt,
      "pluginHtlc.initialize() output.transactionReceipt is truthy OK",
    );
    t2.ok(
      (hashTimeLockAddress = deployOut.transactionReceipt
        .contractAddress as string),
      "pluginHtlc.initialize() output.transactionReceipt.contractAddress is truthy OK",
    );
  });

  test("Deploys TestToken via .json file on deployContract function", async (t2: Test) => {
    const encodedParameters = web3.eth.abi.encodeParameters(
      ["uint256", "string", "uint8", "string"],
      [100, "token", 2, "TKN"],
    );
    const deployOut = await connector.deployContract({
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
      },
      bytecode: TestTokenJSON.bytecode + encodedParameters.slice(2),
      gas: 6721975,
    });
    t2.ok(deployOut, "deployContract() output is truthy OK");
    t2.ok(
      deployOut.transactionReceipt,
      "deployContract() output.transactionReceipt is truthy OK",
    );
    t2.ok(
      deployOut.transactionReceipt.contractAddress,
      "deployContract() output.transactionReceipt.contractAddress is truthy OK",
    );
    tokenAddress = deployOut.transactionReceipt.contractAddress as string;

    const deployOutDemo = await connector.deployContract({
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
      },
      bytecode: DemoHelperJSON.bytecode,
      gas: 6721975,
    });
    t2.ok(deployOutDemo, "deployContract() output is truthy OK");
    t2.ok(
      deployOutDemo.transactionReceipt,
      "deployContract() output.transactionReceipt is truthy OK",
    );
    t2.ok(
      deployOutDemo.transactionReceipt.contractAddress,
      "deployContract() output.transactionReceipt.contractAddress is truthy OK",
    );
    demoHelpersAddress = deployOutDemo.transactionReceipt
      .contractAddress as string;
  });

  test("Approve 10 Tokens to HashTimeLockAddress", async (t2: Test) => {
    const { transactionReceipt } = await connector.invokeContract({
      contractAbi: TestTokenJSON.abi,
      contractAddress: tokenAddress as string,
      invocationType: EthContractInvocationType.SEND,
      methodName: "approve",
      params: [hashTimeLockAddress, "10"],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
      },
      gas: 6721975,
    });
    t2.equal(
      transactionReceipt?.status,
      true,
      "approve() transactionReceipt.status is true OK",
    );
  });

  test("Get account balance", async (t2: Test) => {
    const { callOutput } = await connector.invokeContract({
      contractAbi: TestTokenJSON.abi,
      contractAddress: tokenAddress as string,
      invocationType: EthContractInvocationType.CALL,
      methodName: "balanceOf",
      params: [firstHighNetWorthAccount],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
        secret: besuKeyPair.privateKey,
      },
      gas: 6721975,
    });
    t2.equal(callOutput, "100", "balance of account is 100 OK");
  });

  test("Get HashTimeLock contract and account allowance", async (t2: Test) => {
    const { callOutput } = await connector.invokeContract({
      contractAbi: TestTokenJSON.abi,
      contractAddress: tokenAddress as string,
      invocationType: EthContractInvocationType.CALL,
      methodName: "allowance",
      params: [firstHighNetWorthAccount, hashTimeLockAddress],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
        secret: besuKeyPair.privateKey,
      },
      gas: 6721975,
    });
    t2.equal(callOutput, "10", "callOutput() is 10 OK");
  });

  test("Create new contract for HTLC", async (t2: Test) => {
    const request: NewContractRequest = {
      inputAmount: 10,
      outputAmount: 1,
      expiration: 2147483648,
      hashLock:
        "0x3c335ba7f06a8b01d0596589f73c19069e21c81e5013b91f408165d1bf623d32",
      tokenAddress: tokenAddress,
      receiver: "0x627306090abaB3A6e1400e9345bC60c78a8BEf57",
      outputNetwork: "BTC",
      outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
    };
    const res = await api.newContract(request);
    t2.equal(res.status, 200, "response status is OK");
  });
  test("Get single status of HTLC", async (t2: Test) => {
    const { callOutput } = await connector.invokeContract({
      contractAbi: DemoHelperJSON.abi,
      contractAddress: demoHelpersAddress as string,
      invocationType: EthContractInvocationType.CALL,
      methodName: "getTxId",
      params: [
        firstHighNetWorthAccount,
        "0x627306090abaB3A6e1400e9345bC60c78a8BEf57",
        10,
        "0x3c335ba7f06a8b01d0596589f73c19069e21c81e5013b91f408165d1bf623d32",
        2147483648,
        tokenAddress,
      ],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
        secret: besuKeyPair.privateKey,
      },
      gas: 6721975,
    });

    const res = await api.getSingleStatus(callOutput as string);
    t2.equal(res.status, 200, "response status is 200 OK");
  });
});
