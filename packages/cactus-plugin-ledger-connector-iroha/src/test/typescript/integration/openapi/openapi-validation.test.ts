import http from "http";
import { AddressInfo } from "net";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { v4 as internalIpV4 } from "internal-ip";
import bodyParser from "body-parser";
import express from "express";

import {
  Containers,
  pruneDockerAllIfGithubAction,
  PostgresTestContainer,
  IrohaTestLedger,
} from "@hyperledger/cactus-test-tooling";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginImportType } from "@hyperledger/cactus-core-api";

import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { RuntimeError } from "run-time-error";
import {
  PluginLedgerConnectorIroha,
  DefaultApi as IrohaApi,
  PluginFactoryLedgerConnector,
} from "../../../../main/typescript/public-api";

import { Configuration } from "@hyperledger/cactus-core-api";

import {
  IrohaCommand,
  KeyPair,
  RunTransactionRequestV1,
} from "../../../../main/typescript/generated/openapi/typescript-axios";
import cryptoHelper from "iroha-helpers-ts/lib/cryptoHelper";

import OAS from "../../../../main/json/openapi.json";
import { installOpenapiValidationMiddleware } from "@hyperledger/cactus-core";

const testCase = "Iroha plugin openapi validation";
const logLevel: LogLevelDesc = "INFO";

test.onFailure(async () => {
  await Containers.logDiagnostics({ logLevel });
});

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const postgres = new PostgresTestContainer({ logLevel });

  test.onFinish(async () => {
    await postgres.stop();
  });

  await postgres.start();
  const postgresHost = await internalIpV4();
  const postgresPort = await postgres.getPostgresPort();
  const irohaHost = await internalIpV4();
  if (!postgresHost || !irohaHost) {
    throw new RuntimeError("Could not determine the internal IPV4 address.");
  }

  const keyPair1: KeyPair = cryptoHelper.generateKeyPair();
  const adminPriv = keyPair1.privateKey;
  const adminPubA = keyPair1.publicKey;
  const keyPair2: KeyPair = cryptoHelper.generateKeyPair();
  const nodePrivA = keyPair2.privateKey;
  const nodePubA = keyPair2.publicKey;
  const keyPair3: KeyPair = cryptoHelper.generateKeyPair();
  const userPub = keyPair3.publicKey;
  const iroha = new IrohaTestLedger({
    adminPriv: adminPriv,
    adminPub: adminPubA,
    nodePriv: nodePrivA,
    nodePub: nodePubA,
    postgresHost: postgresHost,
    postgresPort: postgresPort,
    logLevel: logLevel,
  });

  test.onFinish(async () => {
    await iroha.stop();
  });
  await iroha.start();
  const irohaPort = await iroha.getRpcToriiPort();
  const rpcToriiPortHost = await iroha.getRpcToriiPortHost();
  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });

  const connector: PluginLedgerConnectorIroha = await factory.create({
    rpcToriiPortHost,
    instanceId: uuidv4(),
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
  const apiConfig = new Configuration({ basePath: apiHost });
  const apiClient = new IrohaApi(apiConfig);

  await installOpenapiValidationMiddleware({
    logLevel,
    app: expressApp,
    apiSpec: OAS,
  });

  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp);

  const admin = iroha.getDefaultAdminAccount();
  const domain = iroha.getDefaultDomain();
  const adminID = `${admin}@${domain}`;
  const user = uuidv4().substring(0, 5);

  const fRun = "runTransactionV1";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  test(`${testCase} - ${fRun} - ${cOk}`, async (t2: Test) => {
    const parameters = {
      commandName: IrohaCommand.CreateAccount,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [user, domain, userPub],
    };
    const res = await apiClient.runTransactionV1(parameters);
    t2.ok(res);
    t2.equal(res.status, 200);

    t2.end();
  });

  test(`${testCase} - ${fRun} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const parameters = {
        commandName: IrohaCommand.CreateAccount,
        baseConfig: {
          irohaHost: irohaHost,
          irohaPort: irohaPort,
          creatorAccountId: adminID,
          privKey: [adminPriv],
          quorum: 1,
          timeoutLimit: 5000,
          tls: false,
        },
        // params: [user, domain, userPub],
      };
      await apiClient.runTransactionV1(
        (parameters as any) as RunTransactionRequestV1,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fRun} without required params: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(fields.includes("params"), "Rejected because params is required");
    }
    t2.end();
  });

  test(`${testCase} - ${fRun} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const parameters = {
        commandName: IrohaCommand.CreateAccount,
        baseConfig: {
          irohaHost: irohaHost,
          irohaPort: irohaPort,
          creatorAccountId: adminID,
          privKey: [adminPriv],
          quorum: 1,
          timeoutLimit: 5000,
          tls: false,
        },
        params: [user, domain, userPub],
        fake: 4,
      };
      await apiClient.runTransactionV1(
        (parameters as any) as RunTransactionRequestV1,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fRun} with fake=4: response.status === 400 OK`,
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
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
