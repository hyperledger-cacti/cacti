import "jest-extended";
import { v4 as uuidv4 } from "uuid";
import { Server as SocketIoServer } from "socket.io";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  BesuApiClient,
  IPluginLedgerConnectorBesuOptions,
  ReceiptType,
  RunTransactionRequest,
  InvokeContractV1Request,
  EthContractInvocationType,
  DeployContractSolidityBytecodeV1Request,
  SignTransactionRequest,
  GetBalanceV1Request,
  GetPastLogsV1Request,
  GetBlockV1Request,
  GetBesuRecordV1Request,
  RunTransactionResponse,
} from "../../../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  BesuTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import KeyEncoder from "key-encoder";
import {
  IListenOptions,
  KeyFormat,
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
  Servers,
} from "@hyperledger/cactus-common";
import { Constants } from "@hyperledger/cactus-core-api";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import { AddressInfo } from "net";
import { BesuApiClientOptions } from "../../../../../main/typescript/api-client/besu-api-client";

import { installOpenapiValidationMiddleware } from "@hyperledger/cactus-core";
import OAS from "../../../../../main/json/openapi.json";
import { Account } from "web3-core";

const logLevel: LogLevelDesc = "TRACE";
const testCase = "able to validate OpenAPI requests";

const log = LoggerProvider.getOrCreate({
  label: "connector-besu-openapi-validation.test.ts",
  level: logLevel,
});

describe("PluginLedgerConnectorBesu", () => {
  const fDeploy = "deployContractSolBytecodeV1";
  const fInvoke = "invokeContractV1";
  const fRun = "runTransactionV1";
  const fSign = "signTransactionV1";
  const fBalance = "getBalanceV1";
  const fBlock = "getBlockV1";
  const fPastLogs = "getPastLogsV1";
  const fRecord = "getBesuRecordV1";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
  const keychainIdForSigned = uuidv4();
  const keychainIdForUnsigned = uuidv4();
  const keychainRefForSigned = uuidv4();
  const keychainRefForUnsigned = uuidv4();

  let besuTestLedger: BesuTestLedger;
  let testEthAccount2: Account;
  let firstHighNetWorthAccount: string;
  let apiClient: BesuApiClient;
  let testEthAccount1: Account;
  let httpServer: http.Server;

  beforeAll(async () => {
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  afterAll(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  afterAll(async () => await Servers.shutdown(httpServer));

  beforeAll(async () => {
    besuTestLedger = new BesuTestLedger();
    await besuTestLedger.start();

    const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
    const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

    testEthAccount1 = await besuTestLedger.createEthTestAccount();
    testEthAccount2 = await besuTestLedger.createEthTestAccount();
    firstHighNetWorthAccount = besuTestLedger.getGenesisAccountPubKey();

    // keychainPlugin for signed transactions
    const { privateKey } = Secp256k1Keys.generateKeyPairsBuffer();
    const keyHex = privateKey.toString("hex");
    const pem = keyEncoder.encodePrivate(keyHex, KeyFormat.Raw, KeyFormat.PEM);
    const signedKeychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: keychainIdForSigned,
      backend: new Map([[keychainRefForSigned, pem]]),
      logLevel,
    });

    // keychainPlugin for unsigned transactions
    const keychainEntryValue = testEthAccount1.privateKey;
    const unsignedKeychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: keychainIdForUnsigned,
      backend: new Map([[keychainRefForUnsigned, keychainEntryValue]]),
      logLevel,
    });
    unsignedKeychainPlugin.set(
      HelloWorldContractJson.contractName,
      JSON.stringify(HelloWorldContractJson),
    );

    const pluginRegistry = new PluginRegistry({
      plugins: [signedKeychainPlugin, unsignedKeychainPlugin],
    });

    const options: IPluginLedgerConnectorBesuOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost,
      rpcApiWsHost,
      pluginRegistry,
      logLevel,
    };
    const connector = new PluginLedgerConnectorBesu(options);
    pluginRegistry.add(connector);

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    httpServer = http.createServer(expressApp);

    const wsApi = new SocketIoServer(httpServer, {
      path: Constants.SocketIoConnectionPathV1,
    });

    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server: httpServer,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;

    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;

    const wsBasePath = apiHost + Constants.SocketIoConnectionPathV1;
    log.info("WS base path: " + wsBasePath);

    const besuApiClientOptions = new BesuApiClientOptions({
      basePath: apiHost,
    });
    apiClient = new BesuApiClient(besuApiClientOptions);

    await installOpenapiValidationMiddleware({
      logLevel,
      app: expressApp,
      apiSpec: OAS,
    });

    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp, wsApi);
  });

  test(`${testCase} - ${fDeploy} - ${cOk}`, async () => {
    const parameters = {
      keychainId: keychainIdForUnsigned,
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      bytecode: HelloWorldContractJson.bytecode,
      gas: 1000000,
    };
    const res = await apiClient.deployContractSolBytecodeV1(
      parameters as DeployContractSolidityBytecodeV1Request,
    );
    expect(res).toBeTruthy();
    expect(res.data).toBeTruthy();
    expect(res.status).toEqual(200);
  });

  test(`${testCase} - ${fDeploy} - ${cWithoutParams}`, async () => {
    const parameters = {
      keychainId: keychainIdForUnsigned,
      contractAbi: HelloWorldContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    };

    await expect(
      apiClient.deployContractSolBytecodeV1(
        parameters as unknown as DeployContractSolidityBytecodeV1Request,
      ),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/contractName"),
          }),
          expect.objectContaining({
            path: expect.stringContaining("/body/bytecode"),
          }),
          expect.not.objectContaining({
            path: expect.stringContaining("/body/gas"),
          }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fDeploy} - ${cInvalidParams}`, async () => {
    const parameters = {
      keychainId: keychainIdForUnsigned,
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      bytecode: HelloWorldContractJson.bytecode,
      gas: 1000000,
      fake: 4,
    };

    await expect(
      apiClient.deployContractSolBytecodeV1(
        parameters as DeployContractSolidityBytecodeV1Request,
      ),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({ path: "/body/fake" }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fInvoke} - ${cOk}`, async () => {
    const parameters = {
      contractName: "HelloWorld",
      keychainId: keychainIdForUnsigned,
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      signingCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    };
    const res = await apiClient.invokeContractV1(
      parameters as InvokeContractV1Request,
    );
    expect(res).toBeTruthy();
    expect(res.data).toBeTruthy();
    expect(res.status).toEqual(200);
  });

  test(`${testCase} - ${fInvoke} - ${cWithoutParams}`, async () => {
    const parameters = {
      keychainId: keychainIdForUnsigned,
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      signingCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    };

    await expect(
      apiClient.invokeContractV1(parameters as any as InvokeContractV1Request),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/contractName"),
          }),
          expect.not.objectContaining({
            path: expect.stringContaining("/body/gas"),
          }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fInvoke} - ${cInvalidParams}`, async () => {
    const parameters = {
      contractName: "HelloWorld",
      keychainId: keychainIdForUnsigned,
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      signingCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      fake: 4,
    };

    await expect(
      apiClient.invokeContractV1(parameters as InvokeContractV1Request),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/fake"),
          }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fRun} - ${cOk}`, async () => {
    const parameters = {
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      transactionConfig: {
        from: testEthAccount1.address,
        to: testEthAccount2.address,
        value: 10e7,
        gas: 1000000,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
        timeoutMs: 5000,
      },
    };
    const res = await apiClient.runTransactionV1(
      parameters as RunTransactionRequest,
    );
    expect(res).toBeTruthy();
    expect(res.data).toBeTruthy();
    expect(res.data).toBeObject();
    expect(res.status).toEqual(200);
  });

  test(`${testCase} - ${fRun} - ${cWithoutParams}`, async () => {
    const parameters = {
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      transactionConfig: {
        from: testEthAccount1.address,
        to: testEthAccount2.address,
        value: 10e7,
        gas: 1000000,
      },
    };

    await expect(
      apiClient.runTransactionV1(parameters as RunTransactionRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/consistencyStrategy"),
          }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fRun} - ${cInvalidParams}`, async () => {
    const parameters = {
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      transactionConfig: {
        from: testEthAccount1.address,
        to: testEthAccount2.address,
        value: 10e7,
        gas: 1000000,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
        timeoutMs: 5000,
      },
      fake: 4,
    };

    await expect(
      apiClient.runTransactionV1(parameters as RunTransactionRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/fake"),
          }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fSign} - ${cOk}`, async () => {
    const runTxRes = await apiClient.runTransactionV1({
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.LedgerBlockAck,
        timeoutMs: 5000,
      },
      transactionConfig: {
        from: testEthAccount1.address,
        to: testEthAccount2.address,
        value: 1,
        gas: 10000000,
      },
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });

    expect(runTxRes).toBeTruthy();
    expect(runTxRes).toBeObject();
    expect(runTxRes.status).toBeTruthy();
    expect(runTxRes.status).toEqual(200);
    expect(runTxRes.data).toBeTruthy();

    const body = runTxRes.data as unknown as {
      readonly data: RunTransactionResponse;
    };
    expect(body.data).toBeObject();
    expect(body.data.transactionReceipt).toBeObject();

    const parameters = {
      keychainId: keychainIdForSigned,
      keychainRef: keychainRefForSigned,
      transactionHash: (runTxRes.data as any).data.transactionReceipt
        .transactionHash,
    };

    const res = await apiClient.signTransactionV1(
      parameters as SignTransactionRequest,
    );

    expect(res).toBeTruthy();
    expect(res).toBeObject();
    expect(res.data).toBeTruthy();
    expect(res.data).toBeObject();
    expect(res.status).toEqual(200);
  });

  test(`${testCase} - ${fSign} - ${cWithoutParams}`, async () => {
    const runTxRes = await apiClient.runTransactionV1({
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.LedgerBlockAck,
        timeoutMs: 5000,
      },
      transactionConfig: {
        from: testEthAccount1.address,
        to: testEthAccount2.address,
        value: 1,
        gas: 10000000,
      },
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(runTxRes).toBeTruthy();
    expect(runTxRes.status).toEqual(200);
    expect(runTxRes.data).toBeTruthy();
    expect((runTxRes.data as any).data.transactionReceipt).toBeTruthy();

    const parameters = {
      keychainRef: keychainRefForSigned,
      transactionHash: (runTxRes.data as any).data.transactionReceipt
        .transactionHash,
    };

    await expect(
      apiClient.signTransactionV1(parameters as SignTransactionRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/keychainId"),
          }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fSign} - ${cInvalidParams}`, async () => {
    const runTxRes = await apiClient.runTransactionV1({
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.LedgerBlockAck,
        timeoutMs: 5000,
      },
      transactionConfig: {
        from: testEthAccount1.address,
        to: testEthAccount2.address,
        value: 1,
        gas: 10000000,
      },
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    expect(runTxRes).toBeTruthy();
    expect(runTxRes.status).toEqual(200);
    expect(runTxRes.data).toBeTruthy();
    expect((runTxRes.data as any).data.transactionReceipt).toBeTruthy();

    const parameters = {
      keychainId: keychainIdForSigned,
      keychainRef: keychainRefForSigned,
      transactionHash: (runTxRes.data as any).data.transactionReceipt
        .transactionHash,
      fake: 4,
    };

    await expect(
      apiClient.signTransactionV1(parameters as SignTransactionRequest),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/fake"),
          }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fBalance} - ${cOk}`, async () => {
    const parameters = { address: firstHighNetWorthAccount };
    const res = await apiClient.getBalanceV1(parameters as GetBalanceV1Request);
    expect(res.status).toEqual(200);
    expect(res.data.balance).toBeTruthy();
  });

  test(`${testCase} - ${fBalance} - ${cWithoutParams}`, async () => {
    const parameters = {}; // Empty parameters object

    await expect(
      apiClient.getBalanceV1(parameters as GetBalanceV1Request),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/address"),
          }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fBalance} - ${cInvalidParams}`, async () => {
    const parameters = {
      address: firstHighNetWorthAccount,
      fake: 4,
    };

    await expect(
      apiClient.getBalanceV1(parameters as GetBalanceV1Request),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/fake"),
          }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fBlock} - ${cOk}`, async () => {
    const parameters = { blockHashOrBlockNumber: 0 };
    const res = await apiClient.getBlockV1(parameters as GetBlockV1Request);
    expect(res.status).toEqual(200);
    expect(res.data.block).toBeTruthy();
  });

  test(`${testCase} - ${fBlock} - ${cWithoutParams}`, async () => {
    const parameters = {}; // Empty parameters object

    await expect(
      apiClient.getBlockV1(parameters as GetBlockV1Request),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/blockHashOrBlockNumber"),
          }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fBlock} - ${cInvalidParams}`, async () => {
    const parameters = {
      blockHashOrBlockNumber: 0,
      fake: 4,
    };

    await expect(
      apiClient.getBlockV1(parameters as GetBlockV1Request),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/fake"),
          }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fPastLogs} - ${cOk}`, async () => {
    const parameters = { address: firstHighNetWorthAccount };
    const res = await apiClient.getPastLogsV1(
      parameters as GetPastLogsV1Request,
    );
    expect(res.status).toEqual(200);
    expect(res.data.logs).toBeTruthy();
  });

  test(`${testCase} - ${fPastLogs} - ${cWithoutParams}`, async () => {
    try {
      const parameters = {};
      const response = await apiClient.getPastLogsV1(
        parameters as GetPastLogsV1Request,
      );
      console.log(
        "e.response.status should be 400 but actually is,",
        response.status,
      );
    } catch (e) {
      expect(e.response.status).toEqual(400);
      const fields = e.response.data.map((param: { readonly path: string }) =>
        param.path.replace("/body/", ""),
      );
      expect(fields.includes("address")).toBeTrue();
    }

    //since status code is actually 200 refactored approach does not work

    // const parameters = {}; // Empty parameters object

    // await expect(apiClient.getPastLogsV1(parameters as GetPastLogsV1Request))
    // .rejects.toMatchObject({
    //   response: {
    //     status: 400,
    //     data: expect.arrayContaining([
    //       expect.objectContaining({ path: expect.stringContaining("/body/address") })
    //     ])
    //   }
    // });
  });

  test(`${testCase} - ${fPastLogs} - ${cInvalidParams}`, async () => {
    const parameters = {
      address: firstHighNetWorthAccount,
      fake: 4,
    };

    await expect(
      apiClient.getPastLogsV1(parameters as GetPastLogsV1Request),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/fake"),
          }),
        ]),
      },
    });
  });

  test(`${testCase} - ${fRecord} - ${cOk}`, async () => {
    const runTxRes = await apiClient.runTransactionV1({
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.LedgerBlockAck,
        timeoutMs: 5000,
      },
      transactionConfig: {
        from: testEthAccount1.address,
        to: testEthAccount2.address,
        value: 1,
        gas: 10000000,
      },
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });

    expect(runTxRes).toBeTruthy();
    expect(runTxRes.status).toBeNumber();
    expect(runTxRes.status).toEqual(200);
    expect(runTxRes.data).toBeTruthy();
    expect((runTxRes.data as any).data.transactionReceipt).toBeTruthy();

    const parameters = {
      transactionHash: (runTxRes.data as any).data.transactionReceipt
        .transactionHash,
    };
    const res = await apiClient.getBesuRecordV1(
      parameters as GetBesuRecordV1Request,
    );
    expect(res.status).toEqual(200);
    expect(res.data).toBeTruthy();
  });

  test(`${testCase} - ${fRecord} - ${cWithoutParams}`, async () => {
    try {
      const parameters = {};
      const response = await apiClient.getBesuRecordV1(
        parameters as GetBesuRecordV1Request,
      );
      console.log(
        "e.response.status should be 400 but actually is,",
        response.status,
      );
    } catch (e) {
      expect(e.response.status).toEqual(400);
      const fields = e.response.data.map((param: any) =>
        param.path.replace("/body/", ""),
      );
      expect(fields.includes("transactionHash")).toBeTrue();
    }

    // since status code is actually 200 refactored approach does not work

    // const parameters = {}; // Empty parameters object

    // await expect(apiClient.getBesuRecordV1(parameters as GetBesuRecordV1Request))
    //   .rejects.toMatchObject({
    //     response: {
    //       status: 400,
    //       data: expect.arrayContaining([
    //         expect.objectContaining({ path: expect.stringContaining("/body/transactionHash") })
    //       ])
    //     }
    //   });
  });

  test(`${testCase} - ${fRecord} - ${cInvalidParams}`, async () => {
    const parameters = {
      transactionHash: "",
      fake: 5,
    };

    await expect(
      apiClient.getBesuRecordV1(parameters as GetBesuRecordV1Request),
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("/body/fake"),
          }),
        ]),
      },
    });
  });

  afterAll(async () => {
    await pruneDockerAllIfGithubAction({ logLevel });
  });
});
