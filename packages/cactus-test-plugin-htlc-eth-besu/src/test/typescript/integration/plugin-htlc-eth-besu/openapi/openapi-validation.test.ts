import http from "http";
import type { AddressInfo } from "net";
import test, { Test } from "tape-promise/tape";
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
} from "@hyperledger/cactus-plugin-htlc-eth-besu";
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
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { DataTest } from "../../data-test";
import DemoHelperJSON from "../../../../solidity/contracts/DemoHelpers.json";
import HashTimeLockJSON from "../../../../../../../cactus-plugin-htlc-eth-besu/src/main/solidity/contracts/HashTimeLock.json";

import { installOpenapiValidationMiddleware } from "@hyperledger/cactus-core";
import { PluginHtlcEthBesu } from "@hyperledger/cactus-plugin-htlc-eth-besu";

const connectorId = uuidv4();
const logLevel: LogLevelDesc = "INFO";

const testCase = "Test cactus-plugin-htlc-eth-besu openapi validation";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const timeout = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  t.comment("Starting Besu Test Ledger");
  const besuTestLedger = new BesuTestLedger({ logLevel });

  const firstHighNetWorthAccount = besuTestLedger.getGenesisAccountPubKey();
  const privateKey = besuTestLedger.getGenesisAccountPrivKey();

  const web3SigningCredential: Web3SigningCredential = {
    ethAccount: firstHighNetWorthAccount,
    secret: privateKey,
    type: Web3SigningCredentialType.PrivateKeyHex,
  } as Web3SigningCredential;

  test.onFailure(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  await besuTestLedger.start();

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
  const connector: PluginLedgerConnectorBesu = await factory.create({
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

  const pluginHtlc = await factoryHTLC.create(pluginOptions);
  pluginRegistry.add(pluginHtlc);

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
  const api = new BesuApi(configuration);

  const OAS = (pluginHtlc as PluginHtlcEthBesu).getOpenApiSpec();

  await installOpenapiValidationMiddleware({
    logLevel,
    app: expressApp,
    apiSpec: OAS,
  });

  await pluginHtlc.getOrCreateWebServices();
  await pluginHtlc.registerWebServices(expressApp);

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
  let timestamp = 0;

  test(`${testCase} - ${fInitialize} - ${cOk}`, async (t2: Test) => {
    const parameters = {
      connectorId,
      keychainId,
      constructorArgs: [],
      web3SigningCredential,
      gas: DataTest.estimated_gas,
    };

    const res = await api.initializeV1(parameters);
    t2.ok(res, "initialize called successfully");
    t2.equal(
      res.status,
      200,
      `Endpoint ${fInitialize}: response.status === 200 OK`,
    );

    hashTimeLockAddress = res.data.transactionReceipt.contractAddress as string;

    t2.end();
  });

  test(`${testCase} - ${fInitialize} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // connectorId,
      keychainId,
      constructorArgs: [],
      web3SigningCredential,
      gas: DataTest.estimated_gas,
    };

    try {
      await api.initializeV1((parameters as any) as InitializeRequest);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fInitialize} without required connectorId: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("connectorId"),
        "Rejected because connectorId is required",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fInitialize} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
      connectorId,
      keychainId,
      constructorArgs: [],
      web3SigningCredential,
      gas: DataTest.estimated_gas,
      fake: 4,
    };

    try {
      await api.initializeV1((parameters as any) as InitializeRequest);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fInitialize} with fake=4: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fNew} - ${cOk}`, async (t2: Test) => {
    await connector.deployContract({
      contractName: DemoHelperJSON.contractName,
      contractAbi: DemoHelperJSON.abi,
      bytecode: DemoHelperJSON.bytecode,
      web3SigningCredential,
      keychainId,
      constructorArgs: [],
      gas: DataTest.estimated_gas,
    });

    const { callOutput } = await connector.invokeContract({
      contractName: DemoHelperJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "getTimestamp",
      params: [],
    });
    t2.ok(callOutput, "callOutput() output.callOutput is truthy OK");
    timestamp = callOutput as number;
    timestamp = +timestamp + +10;

    const parameters = {
      contractAddress: hashTimeLockAddress,
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
    const res = await api.newContractV1(parameters);
    t2.ok(res, "newContract called successfully");
    t2.equal(res.status, 200, `Endpoint ${fNew}: response.status === 200 OK`);

    t2.end();
  });

  test(`${testCase} - ${fNew} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // contractAddress: hashTimeLockAddress,
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
    try {
      await api.newContractV1((parameters as any) as NewContractObj);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fNew} without required contractAddress: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("contractAddress"),
        "Rejected because contractAddress is required",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fNew} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
      contractAddress: hashTimeLockAddress,
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
      fake: 4,
    };
    try {
      await api.newContractV1((parameters as any) as NewContractObj);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fNew} with fake=4: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fRefund} - ${cOk}`, async (t2: Test) => {
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
        DataTest.hashLock,
        timestamp,
      ],
    });
    t2.ok(responseTxId.callOutput, "result is truthy OK");
    const id = responseTxId.callOutput as string;

    await timeout(6000);

    const parameters = {
      id,
      web3SigningCredential,
      connectorId,
      keychainId,
    };
    const res = await api.refundV1(parameters);
    t2.equal(
      res.status,
      200,
      `Endpoint ${fRefund}: response.status === 200 OK`,
    );

    t2.end();
  });

  test(`${testCase} - ${fRefund} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // id,
      web3SigningCredential,
      connectorId,
      keychainId,
    };
    try {
      await api.refundV1((parameters as any) as RefundReq);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fRefund} without required id: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(fields.includes("id"), "Rejected because id is required");
    }

    t2.end();
  });

  test(`${testCase} - ${fRefund} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
      id: "",
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 4,
    };
    try {
      await api.refundV1((parameters as any) as RefundReq);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fRefund} with fake=4: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fWithdraw} - ${cOk}`, async (t2: Test) => {
    const bodyObj: NewContractObj = {
      contractAddress: hashTimeLockAddress,
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
      secret:
        "0x3853485acd2bfc3c632026ee365279743af107a30492e3ceaa7aefc30c2a048a",
      web3SigningCredential,
      connectorId,
      keychainId,
    };

    const res = await api.withdrawV1(parameters);
    t2.equal(
      res.status,
      200,
      `Endpoint ${fWithdraw}: response.status === 200 OK`,
    );

    t2.end();
  });

  test(`${testCase} - ${fWithdraw} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // id: callOutput,
      secret:
        "0x3853485acd2bfc3c632026ee365279743af107a30492e3ceaa7aefc30c2a048a",
      web3SigningCredential,
      connectorId,
      keychainId,
    };

    try {
      await api.withdrawV1((parameters as any) as WithdrawReq);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fWithdraw} without required id: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(fields.includes("id"), "Rejected because id is required");
    }

    t2.end();
  });

  test(`${testCase} - ${fWithdraw} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
      id: "",
      secret:
        "0x3853485acd2bfc3c632026ee365279743af107a30492e3ceaa7aefc30c2a048a",
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 4,
    };

    try {
      await api.withdrawV1((parameters as any) as WithdrawReq);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fWithdraw} with fake=4: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fStatus} - ${cOk}`, async (t2: Test) => {
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
    t2.equal(
      res.status,
      200,
      `Endpoint ${fStatus}: response.status === 200 OK`,
    );

    t2.end();
  });

  test(`${testCase} - ${fStatus} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // ids,
      web3SigningCredential,
      connectorId,
      keychainId,
    };

    try {
      await api.getStatusV1((parameters as any) as GetStatusRequest);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fStatus} without required ids: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(fields.includes("ids"), "Rejected because ids is required");
    }

    t2.end();
  });

  test(`${testCase} - ${fStatus} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
      ids: [""],
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 4,
    };

    try {
      await api.getStatusV1((parameters as any) as GetStatusRequest);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fStatus} with fake=4: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fSingleStatus} - ${cOk}`, async (t2: Test) => {
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
    t2.equal(
      res.status,
      200,
      `Endpoint ${fSingleStatus}: response.status === 200 OK`,
    );

    t2.end();
  });

  test(`${testCase} - ${fSingleStatus} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // id: callOutput,
      web3SigningCredential,
      connectorId,
      keychainId,
    };

    try {
      await api.getSingleStatusV1(
        (parameters as any) as GetSingleStatusRequest,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fSingleStatus} without required id: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(fields.includes("id"), "Rejected because id is required");
    }

    t2.end();
  });

  test(`${testCase} - ${fSingleStatus} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
      id: "",
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 4,
    };

    try {
      await api.getSingleStatusV1(
        (parameters as any) as GetSingleStatusRequest,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fSingleStatus} with fake=4: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }

    t2.end();
  });

  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});
