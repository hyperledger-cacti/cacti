import test, { Test } from "tape-promise/tape";
import { v4 as uuidV4 } from "uuid";

import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";

import HelloWorldContractJson from "../../../../../solidity/hello-world-contract/HelloWorld.json";

import {
  EthContractInvocationType,
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialType,
  DefaultApi as QuorumApi,
  DeployContractSolidityBytecodeJsonObjectV1Request,
  InvokeContractJsonObjectV1Request,
} from "../../../../../../main/typescript/public-api";

import {
  QuorumTestLedger,
  IQuorumGenesisOptions,
  IAccount,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

const testCase = "Quorum Ledger Connector Plugin";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";
import { Configuration } from "@hyperledger/cactus-core-api";
import { PluginRegistry } from "@hyperledger/cactus-core";

import { installOpenapiValidationMiddleware } from "@hyperledger/cactus-core";
import OAS from "../../../../../../main/json/openapi.json";

const logLevel: LogLevelDesc = "INFO";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const containerImageVersion = "2021-05-03-quorum-v21.4.1";
  const ledgerOptions = { containerImageVersion };
  const ledger = new QuorumTestLedger(ledgerOptions);
  test.onFinish(async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  });
  await ledger.start();

  const rpcApiHttpHost = await ledger.getRpcApiHttpHost();
  const quorumGenesisOptions: IQuorumGenesisOptions = await ledger.getGenesisJsObject();
  t.ok(quorumGenesisOptions);
  t.ok(quorumGenesisOptions.alloc);

  const highNetWorthAccounts: string[] = Object.keys(
    quorumGenesisOptions.alloc,
  ).filter((address: string) => {
    const anAccount: IAccount = quorumGenesisOptions.alloc[address];
    const theBalance = parseInt(anAccount.balance, 10);
    return theBalance > 10e7;
  });
  const [firstHighNetWorthAccount] = highNetWorthAccounts;

  const connector: PluginLedgerConnectorQuorum = new PluginLedgerConnectorQuorum(
    {
      instanceId: uuidV4(),
      rpcApiHttpHost,
      logLevel,
      pluginRegistry: new PluginRegistry(),
    },
  );

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
  t.comment(
    `Metrics URL: ${apiHost}/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-quorum/get-prometheus-exporter-metrics`,
  );

  const apiConfig = new Configuration({ basePath: apiHost });
  const apiClient = new QuorumApi(apiConfig);

  await installOpenapiValidationMiddleware({
    logLevel,
    app: expressApp,
    apiSpec: OAS,
  });

  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp);

  const fDeploy = "deployContractSolBytecodeJsonObjectV1";
  const fInvoke = "invokeContractV1NoKeychain";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  let contractAddress: string;

  test(`${testCase} - ${fDeploy} - ${cOk}`, async (t2: Test) => {
    const parameters = {
      contractAddress,
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      // bytecode: HelloWorldContractJson.bytecode,
      gas: 1000000,
      contractJSON: HelloWorldContractJson,
    };
    const res = await apiClient.deployContractSolBytecodeJsonObjectV1(
      parameters as DeployContractSolidityBytecodeJsonObjectV1Request,
    );
    t2.ok(res, "Contract deployed successfully");
    t2.ok(res.data);
    t2.equal(
      res.status,
      200,
      `Endpoint ${fDeploy}: response.status === 200 OK`,
    );

    contractAddress = res.data.transactionReceipt.contractAddress as string;

    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cOk}`, async (t2: Test) => {
    const parameters = {
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [`DrCactus${uuidV4()}`],
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      contractJSON: HelloWorldContractJson,
    };
    const res = await apiClient.invokeContractV1NoKeychain(
      parameters as InvokeContractJsonObjectV1Request,
    );
    t2.ok(res, "Contract invoked successfully");
    t2.ok(res.data);
    t2.equal(
      res.status,
      200,
      `Endpoint ${fInvoke}: response.status === 200 OK`,
    );

    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const parameters = {
        contractAddress,
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        bytecode: HelloWorldContractJson.bytecode,
        gas: 1000000,
      };
      await apiClient.deployContractSolBytecodeJsonObjectV1(
        (parameters as any) as DeployContractSolidityBytecodeJsonObjectV1Request,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fDeploy} without required contractJSON and bytecode: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("contractJSON"),
        "Rejected because contractJSON is required",
      );
      t2.notOk(fields.includes("gas"), "gas is not required");
    }

    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const parameters = {
        contractAddress,
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        bytecode: HelloWorldContractJson.bytecode,
        gas: 1000000,
        contractJSON: HelloWorldContractJson,
        fake: 4,
      };
      await apiClient.deployContractSolBytecodeJsonObjectV1(
        (parameters as any) as DeployContractSolidityBytecodeJsonObjectV1Request,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fDeploy} with fake=4: response.status === 400 OK`,
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

  test(`${testCase} - ${fInvoke} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const parameters = {
        contractAddress,
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        params: [`DrCactus${uuidV4()}`],
        gas: 1000000,
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        nonce: 2,
      };
      await apiClient.invokeContractV1NoKeychain(
        (parameters as any) as InvokeContractJsonObjectV1Request,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fInvoke} without required contractJSON and methodName: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("contractJSON"),
        "Rejected because contractJSON is required",
      );
      t2.notOk(fields.includes("nonce"), "nonce is not required");
    }

    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const parameters = {
        contractAddress,
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        params: [`DrCactus${uuidV4()}`],
        gas: 1000000,
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        nonce: 2,
        contractJSON: HelloWorldContractJson,
        fake: 4,
      };
      await apiClient.invokeContractV1NoKeychain(
        (parameters as any) as InvokeContractJsonObjectV1Request,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fInvoke} with fake=4: response.status === 400 OK`,
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
