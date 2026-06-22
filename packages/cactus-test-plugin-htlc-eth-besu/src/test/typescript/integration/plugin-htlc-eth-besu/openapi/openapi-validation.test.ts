import "jest-extended";

import http from "http";
import type { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import bodyParser from "body-parser";
import {
  Configuration,
  DefaultApi as BesuApi,
  IPluginHtlcEthBesuOptions,
  PluginFactoryHtlcEthBesu,
  NewContractObj,
  InitializeRequest,
  RefundReq,
  WithdrawReq,
  GetStatusRequest,
  GetSingleStatusRequest,
} from "@hyperledger-cacti/cactus-plugin-htlc-eth-besu";
import {
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  Web3SigningCredential,
  Web3SigningCredentialType,
} from "@hyperledger-cacti/cactus-plugin-ledger-connector-besu";
import { PluginKeychainMemory } from "@hyperledger-cacti/cactus-plugin-keychain-memory";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger-cacti/cactus-common";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import { PluginImportType } from "@hyperledger-cacti/cactus-core-api";
import {
  BesuTestLedger,
  pruneDockerContainersIfGithubAction,
} from "@hyperledger-cacti/cactus-test-tooling";
import { DataTest } from "../../data-test";
import DemoHelperJSON from "../../../../solidity/contracts/DemoHelpers.json";
import HashTimeLockJSON from "../../../../../../../cactus-plugin-htlc-eth-besu/src/main/solidity/contracts/HashTimeLock.json";

import { installOpenapiValidationMiddleware } from "@hyperledger-cacti/cactus-core";
import { PluginHtlcEthBesu } from "@hyperledger-cacti/cactus-plugin-htlc-eth-besu";

const connectorId = uuidv4();
const logLevel: LogLevelDesc = "INFO";

const FORTY_TWO_AS_HEX_STRING =
  "0x0000000000000000000000000000000000000000000000000000000000003432";
const FORTY_TWO_KECCAK_256 =
  "0xf0095bab87a78fd2afa113b903c90a72ba1fd22c44f55b66cf409390814dfb69";

let besuTestLedger = new BesuTestLedger({ logLevel });
let api: BesuApi;
let connector: PluginLedgerConnectorBesu;

const firstHighNetWorthAccount = besuTestLedger.getGenesisAccountPubKey();
const privateKey = besuTestLedger.getGenesisAccountPrivKey();

const web3SigningCredential: Web3SigningCredential = {
  ethAccount: firstHighNetWorthAccount,
  secret: privateKey,
  type: Web3SigningCredentialType.PrivateKeyHex,
} as Web3SigningCredential;

const timeout = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const testCase = "Test cactus-plugin-htlc-eth-besu openapi validation";

describe(testCase, () => {
  const fInitialize = "initialize";
  const fNew = "newContract";
  const fRefund = "refund";
  const fWithdraw = "withdraw";
  const fStatus = "getStatus";
  const fSingleStatus = "getSingleStatus";

  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  let hashTimeLockAddress: string;
  let timestamp: number;
  let pluginHtlc: PluginHtlcEthBesu;
  const keychainId = uuidv4();
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
        [DemoHelperJSON.contractName, JSON.stringify(DemoHelperJSON)],
      ]),
      logLevel,
    });
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
    const pluginOptions: IPluginHtlcEthBesuOptions = {
      logLevel,
      instanceId: uuidv4(),
      pluginRegistry,
    };

    const factoryHTLC = new PluginFactoryHtlcEthBesu({
      pluginImportType: PluginImportType.Local,
    });

    pluginHtlc = await factoryHTLC.create(pluginOptions);
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

    const OAS = (pluginHtlc as PluginHtlcEthBesu).getOpenApiSpec();

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
      gas: DataTest.estimated_gas,
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
      gas: DataTest.estimated_gas,
    };

    await expect(
      api.initializeV1(parameters as unknown as InitializeRequest),
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
      gas: DataTest.estimated_gas,
      fake: 4,
    };

    await expect(
      api.initializeV1(parameters as unknown as InitializeRequest),
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
      contractName: DemoHelperJSON.contractName,
      contractAbi: DemoHelperJSON.abi,
      bytecode: DemoHelperJSON.bytecode,
      web3SigningCredential,
      keychainId,
      constructorArgs: [],
      gas: DataTest.estimated_gas,
    });
    expect(deployOutToken).toBeTruthy();

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
      outputAmount: 0x04,
      expiration: timestamp,
      hashLock: FORTY_TWO_KECCAK_256,
      receiver: DataTest.receiver,
      outputNetwork: "BTC",
      outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
      connectorId: connectorId,
      web3SigningCredential,
      keychainId,
      gas: DataTest.estimated_gas,
    };
    const res = await api.newContractV1(parameters);
    expect(res).toBeTruthy();
    expect(res.status).toEqual(200);
  });

  test(`${testCase} - ${fNew} - ${cWithoutParams}`, async () => {
    const parameters = {
      inputAmount: 10,
      outputAmount: 0x04,
      expiration: timestamp,
      hashLock: DataTest.hashLock,
      receiver: DataTest.receiver,
      outputNetwork: "BTC",
      outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
      connectorId: connectorId,
      web3SigningCredential,
      keychainId,
      gas: DataTest.estimated_gas,
    };

    await expect(
      api.newContractV1(parameters as unknown as NewContractObj),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/contractAddress" }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fNew} - ${cInvalidParams}`, async () => {
    const parameters = {
      contractAddress: hashTimeLockAddress,
      inputAmount: 10,
      outputAmount: 0x04,
      expiration: timestamp,
      hashLock: FORTY_TWO_KECCAK_256,
      receiver: DataTest.receiver,
      outputNetwork: "BTC",
      outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
      connectorId: connectorId,
      web3SigningCredential,
      keychainId,
      gas: DataTest.estimated_gas,
      fake: 4,
    };

    await expect(
      api.newContractV1(parameters as unknown as NewContractObj),
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
        DataTest.receiver,
        10,
        FORTY_TWO_KECCAK_256,
        timestamp,
      ],
    });

    expect(responseTxId.callOutput).toBeTruthy();

    const txId = responseTxId.callOutput as string;
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
      api.refundV1(parameters as unknown as RefundReq),
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
      api.refundV1(parameters as unknown as RefundReq),
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
    const bodyObj: NewContractObj = {
      contractAddress: hashTimeLockAddress,
      inputAmount: 10,
      outputAmount: 0x04,
      expiration: DataTest.expiration,
      hashLock: FORTY_TWO_KECCAK_256,
      receiver: DataTest.receiver,
      outputNetwork: "BTC",
      outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
      connectorId: connectorId,
      web3SigningCredential,
      keychainId,
      gas: DataTest.estimated_gas,
    };
    await api.newContractV1(bodyObj);

    const { callOutput } = await connector.invokeContract({
      contractName: DemoHelperJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "getTxId",
      params: [
        firstHighNetWorthAccount,
        DataTest.receiver,
        10,
        FORTY_TWO_KECCAK_256,
        DataTest.expiration,
      ],
    });

    const parameters = {
      id: callOutput,
      secret: FORTY_TWO_AS_HEX_STRING,
      web3SigningCredential,
      connectorId,
      keychainId,
    };
    const resWithdraw = await api.withdrawV1(parameters);

    expect(resWithdraw).toBeTruthy();
    expect(resWithdraw.status).toEqual(200);
  });

  test(`${testCase} - ${fWithdraw} - ${cWithoutParams}`, async () => {
    const parameters = {
      secret:
        "0x3853485acd2bfc3c632026ee365279743af107a30492e3ceaa7aefc30c2a048a",
      web3SigningCredential,
      connectorId,
      keychainId,
    };

    await expect(
      api.withdrawV1(parameters as unknown as WithdrawReq),
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
      secret:
        "0x3853485acd2bfc3c632026ee365279743af107a30492e3ceaa7aefc30c2a048a",
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 4,
    };

    await expect(
      api.withdrawV1(parameters as unknown as WithdrawReq),
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
    const initRequest: InitializeRequest = {
      connectorId,
      keychainId,
      constructorArgs: [],
      web3SigningCredential,
      gas: DataTest.estimated_gas,
    };
    const deployOut = await pluginHtlc.initialize(initRequest);
    const hashTimeLockAddress2 = deployOut.transactionReceipt
      .contractAddress as string;

    const bodyObj: NewContractObj = {
      contractAddress: hashTimeLockAddress2,
      inputAmount: 10,
      outputAmount: 0x04,
      expiration: DataTest.expiration,
      hashLock: DataTest.hashLock,
      receiver: DataTest.receiver,
      outputNetwork: "BTC",
      outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
      connectorId: connectorId,
      web3SigningCredential,
      keychainId,
      gas: DataTest.estimated_gas,
    };
    await api.newContractV1(bodyObj);

    const { callOutput } = await connector.invokeContract({
      contractName: DemoHelperJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "getTxId",
      params: [
        firstHighNetWorthAccount,
        DataTest.receiver,
        10,
        DataTest.hashLock,
        DataTest.expiration,
      ],
    });

    const ids = [callOutput as string];

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
      api.getStatusV1(parameters as unknown as GetStatusRequest),
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
      api.getStatusV1(parameters as unknown as GetStatusRequest),
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
    const initRequest: InitializeRequest = {
      connectorId,
      keychainId,
      constructorArgs: [],
      web3SigningCredential,
      gas: DataTest.estimated_gas,
    };
    const deployOut = await pluginHtlc.initialize(initRequest);
    const hashTimeLockAddress2 = deployOut.transactionReceipt
      .contractAddress as string;

    const bodyObj: NewContractObj = {
      contractAddress: hashTimeLockAddress2,
      inputAmount: 10,
      outputAmount: 0x04,
      expiration: DataTest.expiration,
      hashLock: DataTest.hashLock,
      receiver: DataTest.receiver,
      outputNetwork: "BTC",
      outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
      connectorId: connectorId,
      web3SigningCredential,
      keychainId,
      gas: DataTest.estimated_gas,
    };
    await api.newContractV1(bodyObj);

    const { callOutput } = await connector.invokeContract({
      contractName: DemoHelperJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "getTxId",
      params: [
        firstHighNetWorthAccount,
        DataTest.receiver,
        10,
        DataTest.hashLock,
        DataTest.expiration,
      ],
    });
    const parameters = {
      id: callOutput,
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
      api.getSingleStatusV1(parameters as unknown as GetSingleStatusRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/id" }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fSingleStatus} - ${cInvalidParams}`, async () => {
    const parameters = {
      id: "",
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 4,
    };

    await expect(
      api.getSingleStatusV1(parameters as unknown as GetSingleStatusRequest),
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
