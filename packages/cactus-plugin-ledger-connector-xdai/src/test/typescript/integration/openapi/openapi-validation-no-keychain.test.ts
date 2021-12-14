import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorXdai,
  DefaultApi as XdaiApi,
  DeployContractJsonObjectV1Request,
  InvokeContractJsonObjectV1Request,
} from "../../../../main/typescript/public-api";
import {
  Containers,
  K_DEV_WHALE_ACCOUNT_PRIVATE_KEY,
  K_DEV_WHALE_ACCOUNT_PUBLIC_KEY,
  OpenEthereumTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import HelloWorldContractJson from "../../../solidity/hello-world-contract/HelloWorld.json";
import { PluginRegistry } from "@hyperledger/cactus-core";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";

import { installOpenapiValidationMiddleware } from "@hyperledger/cactus-core";
import OAS from "../../../../main/json/openapi.json";

const testCase = "xDai API";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  test.onFailure(async () => {
    await Containers.logDiagnostics({ logLevel });
  });

  // create a test ledger
  const xdaiTestLedger = new OpenEthereumTestLedger({ logLevel });
  test.onFinish(async () => {
    await xdaiTestLedger.stop();
    await xdaiTestLedger.destroy();
  });
  await xdaiTestLedger.start();

  // get host to which connector will attack
  const rpcApiHttpHost = await xdaiTestLedger.getRpcApiHttpHost();

  // obtain public and private keys from an account
  const whalePubKey = K_DEV_WHALE_ACCOUNT_PUBLIC_KEY;
  const whalePrivKey = K_DEV_WHALE_ACCOUNT_PRIVATE_KEY;

  // create the connector
  const connector: PluginLedgerConnectorXdai = new PluginLedgerConnectorXdai({
    instanceId: uuidv4(),
    rpcApiHttpHost,
    logLevel,
    pluginRegistry: new PluginRegistry(),
  });

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
  const config = new Configuration({ basePath: apiHost });
  const apiClient = new XdaiApi(config);

  await installOpenapiValidationMiddleware({
    logLevel,
    app: expressApp,
    apiSpec: OAS,
  });

  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp);

  const fDeploy = "deployContractJsonObjectV1";
  const fInvoke = "invokeContractV1";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  let contractAddress: string;

  test(`${testCase} - ${fDeploy} - ${cOk}`, async (t2: Test) => {
    const parameters = {
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: whalePubKey,
        secret: whalePrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 1000000,
      contractJSON: HelloWorldContractJson,
    };
    const res = await apiClient.deployContractJsonObjectV1(
      parameters as DeployContractJsonObjectV1Request,
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

  test(`${testCase} - ${fDeploy} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const parameters = {
        constructorArgs: [],
        web3SigningCredential: {
          ethAccount: whalePubKey,
          secret: whalePrivKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        gas: 1000000,
      };
      await apiClient.deployContractJsonObjectV1(
        (parameters as any) as DeployContractJsonObjectV1Request,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fDeploy} without required contractJSON: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("contractJSON"),
        "Rejected because contractJSON is required",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const parameters = {
        constructorArgs: [],
        web3SigningCredential: {
          ethAccount: whalePubKey,
          secret: whalePrivKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        gas: 1000000,
        contractJSON: HelloWorldContractJson,
        fake: 4,
      };
      await apiClient.deployContractJsonObjectV1(
        (parameters as any) as DeployContractJsonObjectV1Request,
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

  test(`${testCase} - ${fInvoke} - ${cOk}`, async (t2: Test) => {
    const parameters = {
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      gas: 1000000,
      web3SigningCredential: {
        ethAccount: whalePubKey,
        secret: whalePrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      contractJSON: HelloWorldContractJson,
    };
    const res = await apiClient.invokeContractJsonObject(parameters);
    t2.ok(res, "Contract invoked successfully");
    t2.ok(res.data);
    t2.equal(
      res.status,
      200,
      `Endpoint ${fInvoke}: response.status === 200 OK`,
    );

    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const parameters = {
        contractAddress,
        invocationType: EthContractInvocationType.Call,
        methodName: "sayHello",
        params: [],
        gas: 1000000,
        web3SigningCredential: {
          ethAccount: whalePubKey,
          secret: whalePrivKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      };
      await apiClient.invokeContractJsonObject(
        (parameters as any) as InvokeContractJsonObjectV1Request,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fInvoke} without required contractJSON: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("contractJSON"),
        "Rejected because contractJSON is required",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const parameters = {
        contractAddress,
        invocationType: EthContractInvocationType.Call,
        methodName: "sayHello",
        params: [],
        gas: 1000000,
        web3SigningCredential: {
          ethAccount: whalePubKey,
          secret: whalePrivKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        contractJSON: HelloWorldContractJson,
        fake: 4,
      };
      await apiClient.invokeContractJsonObject(
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

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});
