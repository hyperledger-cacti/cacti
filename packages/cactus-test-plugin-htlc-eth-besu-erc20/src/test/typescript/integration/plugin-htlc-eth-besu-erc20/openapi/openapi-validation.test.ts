import "jest-extended";

import http from "http";
import type { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import bodyParser from "body-parser";
import { encodeParameter } from "web3-eth-abi";
import { keccak256 } from "web3-utils";
import {
  Configuration,
  DefaultApi as BesuApi,
  IPluginHtlcEthBesuErc20Options,
  PluginFactoryHtlcEthBesuErc20,
  NewContractRequest,
  InitializeRequest,
  RefundRequest,
  WithdrawRequest,
  GetStatusRequest,
  GetSingleStatusRequest,
} from "@hyperledger/cactus-plugin-htlc-eth-besu-erc20";
import {
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  Web3SigningCredential,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import {
  BesuTestLedger,
  pruneDockerContainersIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import TestTokenJSON from "../../../../solidity/token-erc20-contract/Test_Token.json";
import DemoHelperJSON from "../../../../solidity/token-erc20-contract/DemoHelpers.json";
import HashTimeLockJSON from "../../../../../../../cactus-plugin-htlc-eth-besu-erc20/src/main/solidity/contracts/HashedTimeLockContract.json";

import { installOpenapiValidationMiddleware } from "@hyperledger/cactus-core";
import { PluginHtlcEthBesuErc20 } from "@hyperledger/cactus-plugin-htlc-eth-besu-erc20";

const connectorId = uuidv4();
const logLevel: LogLevelDesc = "INFO";
const expiration = 2147483648;
const secret =
  "0x3853485acd2bfc3c632026ee365279743af107a30492e3ceaa7aefc30c2a048a";
const estimatedGas = 6721975;
const receiver = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
const firstHighNetWorthAccount = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
const privateKey =
  "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
const web3SigningCredential: Web3SigningCredential = {
  ethAccount: firstHighNetWorthAccount,
  secret: privateKey,
  type: Web3SigningCredentialType.PrivateKeyHex,
} as Web3SigningCredential;
let besuTestLedger = new BesuTestLedger({ logLevel });
let api: BesuApi;
let connector: PluginLedgerConnectorBesu;

const timeout = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const testCase = "Test cactus-plugin-htlc-eth-besu-erc20 openapi validation";

describe(testCase, () => {
  const fInitialize = "initializeV1";
  const fNew = "newContractV1";
  const fRefund = "refundV1";
  const fWithdraw = "withdrawV1";
  const fStatus = "getStatusV1";
  const fSingleStatus = "getSingleStatusV1";

  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  let hashTimeLockAddress: string;
  let timestamp: number;
  let tokenAddress: string;
  let txId: string;
  const keychainId = uuidv4();

  const secretEthAbiEncoded = encodeParameter("uint256", secret);
  const hashLock = keccak256(secretEthAbiEncoded);

  let server: http.Server;

  beforeAll(async () => {
    const pruning = pruneDockerContainersIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  afterAll(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  afterAll(async () => await Servers.shutdown(server));

  afterAll(async () => {
    const pruning = pruneDockerContainersIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  beforeAll(async () => {
    besuTestLedger = new BesuTestLedger();
    await besuTestLedger.start();

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
    connector = await factory.create({
      rpcApiHttpHost,
      rpcApiWsHost,
      logLevel,
      instanceId: connectorId,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });

    pluginRegistry.add(connector);
    const pluginOptions: IPluginHtlcEthBesuErc20Options = {
      logLevel,
      instanceId: uuidv4(),
      pluginRegistry,
    };

    const factoryHTLC = new PluginFactoryHtlcEthBesuErc20({
      pluginImportType: PluginImportType.Local,
    });

    const pluginHtlc = await factoryHTLC.create(pluginOptions);
    pluginRegistry.add(pluginHtlc);

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    server = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server: server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;

    const configuration = new Configuration({ basePath: apiHost });
    api = new BesuApi(configuration);

    const OAS = (pluginHtlc as PluginHtlcEthBesuErc20).getOpenApiSpec();

    await installOpenapiValidationMiddleware({
      logLevel,
      app: expressApp,
      apiSpec: OAS,
    });

    await pluginHtlc.getOrCreateWebServices();
    await pluginHtlc.registerWebServices(expressApp);
  });

  test(`${testCase} - ${fInitialize} - ${cOk}`, async () => {
    const parameters = {
      connectorId,
      keychainId,
      constructorArgs: [],
      web3SigningCredential,
      gas: estimatedGas,
    };

    const res = await api.initializeV1(parameters);

    expect(res).toBeTruthy();
    expect(res.data).toBeTruthy();
    expect(res.status).toEqual(200);

    hashTimeLockAddress = res.data.transactionReceipt.contractAddress as string;
  });

  test(`${testCase} - ${fInitialize} - ${cWithoutParams}`, async () => {
    const parameters = {
      keychainId,
      constructorArgs: [],
      web3SigningCredential,
      gas: estimatedGas,
    };

    await expect(
      api.initializeV1(parameters as any as InitializeRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/connectorId"),
          }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fInitialize} - ${cInvalidParams}`, async () => {
    const parameters = {
      connectorId,
      keychainId,
      constructorArgs: [],
      web3SigningCredential,
      gas: estimatedGas,
      fake: 4,
    };

    await expect(
      api.initializeV1(parameters as any as InitializeRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/fake" }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fNew} - ${cOk}`, async () => {
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

    tokenAddress = deployOutToken.transactionReceipt.contractAddress as string;

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

    const { callOutput } = await connector.invokeContract({
      contractName: DemoHelperJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "getTimestamp",
      params: [],
    });

    expect(callOutput).toBeTruthy();
    timestamp = callOutput as number;
    timestamp = +timestamp + +10;

    const parameters = {
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
    const res = await api.newContractV1(parameters);

    expect(res).toBeTruthy();
    expect(res.status).toEqual(200);
  });

  test(`${testCase} - ${fNew} - ${cWithoutParams}`, async () => {
    const parameters = {
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

    await expect(
      api.newContractV1(parameters as any as NewContractRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/contractAddress" }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fNew} - ${cWithoutParams}`, async () => {
    const parameters = {
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
      fake: 4,
    };

    await expect(
      api.newContractV1(parameters as any as NewContractRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/fake" }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fRefund} - ${cOk}`, async () => {
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

    txId = responseTxId.callOutput as string;
    await timeout(6000);
    const parameters = {
      id: txId,
      web3SigningCredential,
      connectorId,
      keychainId,
    };
    const res = await api.refundV1(parameters);

    expect(res).toBeTruthy();
    expect(res.status).toEqual(200);
  });

  test(`${testCase} - ${fRefund} - ${cWithoutParams}`, async () => {
    const parameters = {
      web3SigningCredential,
      connectorId,
      keychainId,
    };

    await expect(
      api.refundV1(parameters as any as RefundRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/id" }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fRefund} - ${cInvalidParams}`, async () => {
    const parameters = {
      id: "",
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 4,
    };

    await expect(
      api.refundV1(parameters as any as RefundRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/fake" }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fWithdraw} - ${cOk}`, async () => {
    const deployOutToken = await connector.deployContract({
      contractName: TestTokenJSON.contractName,
      contractAbi: TestTokenJSON.abi,
      bytecode: TestTokenJSON.bytecode,
      web3SigningCredential,
      keychainId,
      constructorArgs: ["100", "token", "2", "TKN"],
      gas: estimatedGas,
    });

    expect(deployOutToken.transactionReceipt.contractAddress).toBeTruthy();

    const tokenAddress = deployOutToken.transactionReceipt
      .contractAddress as string;

    await connector.deployContract({
      contractName: DemoHelperJSON.contractName,
      contractAbi: DemoHelperJSON.abi,
      bytecode: DemoHelperJSON.bytecode,
      web3SigningCredential,
      keychainId,
      constructorArgs: [],
      gas: estimatedGas,
    });

    await connector.invokeContract({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Send,
      methodName: "approve",
      params: [hashTimeLockAddress, "10"],
      gas: estimatedGas,
    });

    await api.newContractV1({
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
    });

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
        expiration,
        tokenAddress,
      ],
    });

    expect(responseTxId.callOutput).toBeTruthy();

    const id = responseTxId.callOutput as string;

    const withdrawRequest: WithdrawRequest = {
      id,
      secret,
      web3SigningCredential,
      connectorId,
      keychainId,
    };
    const resWithdraw = await api.withdrawV1(withdrawRequest);

    expect(resWithdraw).toBeTruthy();
    expect(resWithdraw.status).toEqual(200);
  });

  test(`${testCase} - ${fWithdraw} - ${cWithoutParams}`, async () => {
    const parameters = {
      secret,
      web3SigningCredential,
      connectorId,
      keychainId,
    };

    await expect(
      api.withdrawV1(parameters as any as WithdrawRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/id" }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fWithdraw} - ${cInvalidParams}`, async () => {
    const parameters = {
      id: "",
      secret,
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 4,
    };

    await expect(
      api.withdrawV1(parameters as any as WithdrawRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/fake" }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fStatus} - ${cOk}`, async () => {
    const ids = [txId as string];

    const parameters = {
      ids,
      web3SigningCredential,
      connectorId,
      keychainId,
    };
    const res = await api.getStatusV1(parameters);

    expect(res.status).toBeTruthy();
    expect(res.status).toEqual(200);
  });

  test(`${testCase} - ${fStatus} - ${cWithoutParams}`, async () => {
    const parameters = {
      web3SigningCredential,
      connectorId,
      keychainId,
    };

    await expect(
      api.getStatusV1(parameters as any as GetStatusRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/ids" }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fStatus} - ${cInvalidParams}`, async () => {
    const parameters = {
      ids: [""],
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 4,
    };

    await expect(
      api.getStatusV1(parameters as any as GetStatusRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/fake" }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fSingleStatus} - ${cOk}`, async () => {
    const parameters = {
      id: txId,
      web3SigningCredential,
      connectorId,
      keychainId,
    };
    const res = await api.getSingleStatusV1(parameters);

    expect(res.status).toEqual(200);
  });

  test(`${testCase} - ${fSingleStatus} - ${cWithoutParams}`, async () => {
    const parameters = {
      web3SigningCredential,
      connectorId,
      keychainId,
    };

    await expect(
      api.getSingleStatusV1(parameters as any as GetSingleStatusRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/id" }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fSingleStatus} - ${cWithoutParams}`, async () => {
    const parameters = {
      id: "",
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 4,
    };

    await expect(
      api.getSingleStatusV1(parameters as any as GetSingleStatusRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/fake" }),
        ]),
      },
    });
  });
});
