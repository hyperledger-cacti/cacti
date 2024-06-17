import "jest-extended";
import { v4 as uuidv4 } from "uuid";
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
  Configuration,
  PluginHTLCCoordinatorBesu,
} from "../../../../main/typescript/public-api";
import {
  IPluginHtlcEthBesuErc20Options,
  PluginFactoryHtlcEthBesuErc20,
  PluginHtlcEthBesuErc20,
} from "@hyperledger/cactus-plugin-htlc-eth-besu-erc20";
import {
  DefaultApi as BesuApi,
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  Web3SigningCredentialType,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
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

describe("HTLC Coordinator Besu", () => {
  const logLevel: LogLevelDesc = "INFO";
  const estimatedGas = 6721975;
  const expiration = 2147483648;
  const receiver = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
  const hashLock =
    "0x3c335ba7f06a8b01d0596589f73c19069e21c81e5013b91f408165d1bf623d32";
  const privateKey =
    "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";

  const firstHighNetWorthAccount = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
  const contractAddress = "0xCfEB869F69431e42cdB54A4F4f105C19C080A601";

  const connectorInstanceId = uuidv4();
  const pluginRegistry = new PluginRegistry({});
  const web3SigningCredential: Web3SigningCredential = {
    ethAccount: firstHighNetWorthAccount,
    secret: privateKey,
    type: Web3SigningCredentialType.PrivateKeyHex,
  } as Web3SigningCredential;

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

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const besuWsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });

  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
    server,
  };

  let besuTestLedger: BesuTestLedger;
  let connector: PluginLedgerConnectorBesu;
  let pluginHtlcEthBesuErc20: PluginHtlcEthBesuErc20;
  let pluginHTLCCoordinatorBesu: PluginHTLCCoordinatorBesu;
  let htlcCoordinatorBesuApiClient: HtlcCoordinatorBesuApi;
  let besuConnectorApi: BesuApi;
  let rpcApiHttpHost: string;
  let rpcApiWsHost: string;

  beforeAll(async () => {
    besuTestLedger = new BesuTestLedger();
    await besuTestLedger.start();

    rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

    await keychainPlugin.set(
      DemoHelperJSON.contractName,
      JSON.stringify(DemoHelperJSON),
    );
    await keychainPlugin.set(
      HashTimeLockJSON.contractName,
      JSON.stringify(HashTimeLockJSON),
    );

    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });

    connector = await factory.create({
      instanceId: connectorInstanceId,
      rpcApiHttpHost,
      rpcApiWsHost,
      logLevel,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });
    pluginRegistry.add(connector);

    const iPluginHtlcEthBesuErc20Options: IPluginHtlcEthBesuErc20Options = {
      instanceId: uuidv4(),
      keychainId: keychainId,
      pluginRegistry,
    };

    const factoryHtlc = new PluginFactoryHtlcEthBesuErc20({
      pluginImportType: PluginImportType.Local,
    });

    pluginHtlcEthBesuErc20 = await factoryHtlc.create(
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
    pluginHTLCCoordinatorBesu = await factoryHTLC.create(pluginOptions);
    pluginRegistry.add(pluginHTLCCoordinatorBesu);

    await pluginHTLCCoordinatorBesu.getOrCreateWebServices();
    await pluginHTLCCoordinatorBesu.registerWebServices(expressApp);

    const { address, port } = await Servers.listen(listenOptions);
    const apiHost = `http://${address}:${port}`;

    const configuration = new Configuration({ basePath: apiHost });
    htlcCoordinatorBesuApiClient = new HtlcCoordinatorBesuApi(configuration);

    const besuConnectorConfiguration = new Configuration({ basePath: apiHost });
    besuConnectorApi = new BesuApi(besuConnectorConfiguration);

    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, besuWsApi);
  });

  afterAll(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
    await Servers.shutdown(server);
  });

  afterAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.not.toThrow();
  });

  test("Deploys TestToken and performs HTLC operations", async () => {
    // Deploy TestToken

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

    const approveTokensOutput = await besuConnectorApi.invokeContractV1({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Send,
      methodName: "approve",
      params: [contractAddress, "10"],
      gas: estimatedGas,
    });
    expect(approveTokensOutput.data.success).toBeTrue();

    const responseBalance = await besuConnectorApi.invokeContractV1({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "balanceOf",
      params: [firstHighNetWorthAccount],
    });
    expect(responseBalance.data.callOutput).toEqual("100");

    const allowanceOutput = await besuConnectorApi.invokeContractV1({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "allowance",
      params: [firstHighNetWorthAccount, contractAddress],
    });
    expect(allowanceOutput.status).toBe(200);
    expect(allowanceOutput.data.callOutput).toEqual("10");

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

    const response =
      await htlcCoordinatorBesuApiClient.ownHtlcV1(ownHTLCRequest);
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data).toBeTruthy();
    expect(response.data.out.transactionReceipt).toBeTruthy();

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

    const counterpartyHTLCRequest: CounterpartyHTLCRequest = {
      htlcPackage: HtlcPackage.BesuErc20,
      connectorInstanceId,
      keychainId,
      htlcId: responseTxId.data.callOutput,
      web3SigningCredential,
      gas: estimatedGas,
    };

    const response2 = await htlcCoordinatorBesuApiClient.counterpartyHtlcV1(
      counterpartyHTLCRequest,
    );
    expect(response2.status).toBe(200);
    const hstsHeader = response2.headers["strict-transport-security"];
    expect(hstsHeader).toBe("max-age=31536000; includeSubDomains; preload");
    expect(response2.data.success).toBe(true);
    expect(response2.data.callOutput).toBe("1"); // Contract status is Active
  });
});
