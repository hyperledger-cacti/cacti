import http from "http";
import { AddressInfo } from "net";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { v4 as internalIpV4 } from "internal-ip";
import bodyParser from "body-parser";
import express from "express";
import { Server as SocketIoServer } from "socket.io";
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
} from "../../../main/typescript/public-api";

import { Configuration } from "@hyperledger/cactus-core-api";

import {
  IrohaCommand,
  IrohaQuery,
  KeyPair,
} from "../../../main/typescript/generated/openapi/typescript-axios";
import cryptoHelper from "iroha-helpers/lib/cryptoHelper";
import { Constants } from "@hyperledger/cactus-core-api";

const testCase = "runs tx on an Iroha v1.2.0 ledger";
const logLevel: LogLevelDesc = "INFO";

test.onFailure(async () => {
  await Containers.logDiagnostics({ logLevel });
});

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

// Test fails because Iroha is unable to connect to Postgres for some reason.
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
  const rpcApiWsHost = await iroha.getRpcApiWsHost();
  const internalAddr = iroha.getInternalAddr();
  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });

  const connector: PluginLedgerConnectorIroha = await factory.create({
    rpcToriiPortHost,
    rpcApiWsHost: rpcApiWsHost,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry(),
  });

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "localhost",
    port: 0,
    server,
  };

  const wsApi = new SocketIoServer(server, {
    path: Constants.SocketIoConnectionPathV1,
  });

  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(server));
  const { address, port } = addressInfo;
  const apiHost = `http://${address}:${port}`;
  const apiConfig = new Configuration({ basePath: apiHost });
  const apiClient = new IrohaApi(apiConfig);

  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp, wsApi);

  let firstTxHash;
  const admin = iroha.getDefaultAdminAccount();
  const domain = iroha.getDefaultDomain();
  const adminID = `${admin}@${domain}`;
  const user = uuidv4().substring(0, 5);
  /**
   * An account in Iroha ledger is formatted as: `account_name@domain_id`
   * @see https://iroha.readthedocs.io/en/main/concepts_architecture/er_model.html?highlight=%3Casset_name%3E%23%3Cdomain_id%3E#account
   */
  const userID = `${user}@${domain}`;
  {
    const req = {
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
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
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
      params: {
        accountName: "testaccount",
        domainId: domain,
        publicKey: userPub,
      },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccount,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [adminID],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, {
      accountId: adminID,
      domainId: domain,
      quorum: 1,
      jsonData: "{}",
    });
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccount,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { accountId: adminID },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, {
      accountId: adminID,
      domainId: domain,
      quorum: 1,
      jsonData: "{}",
    });
  }

  const moneyCreatorRole = "money_creator";
  const newDomain = "test2";
  {
    const req = {
      commandName: IrohaCommand.CreateDomain,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [newDomain, moneyCreatorRole],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.CreateDomain,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { domainId: "testDomain", defaultRole: "money_creator" },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  let asset = "coolcoin";
  /**
   * An asset in Iroha ledger is formatted as: `asset_name#domain_id`
   * @see https://iroha.readthedocs.io/en/main/concepts_architecture/er_model.html?highlight=%3Casset_name%3E%23%3Cdomain_id%3E#asset
   */
  let assetID = `${asset}#${domain}`;
  {
    const req = {
      commandName: IrohaCommand.CreateAsset,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [asset, domain, 3],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  asset = "testcoin";
  assetID = `${asset}#${domain}`;
  {
    const req = {
      commandName: IrohaCommand.CreateAsset,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { assetName: asset, domainId: domain, precision: 3 },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaQuery.GetAssetInfo,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [assetID],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, {
      assetId: assetID,
      domainId: domain,
      precision: 3,
    });
  }

  {
    const req = {
      commandName: IrohaQuery.GetAssetInfo,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { assetId: assetID },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, {
      assetId: assetID,
      domainId: domain,
      precision: 3,
    });
  }

  {
    const req = {
      commandName: IrohaCommand.AddAssetQuantity,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [assetID, "123.123"],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.AddAssetQuantity,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { assetId: assetID, amount: "123.123" },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  const txDescription = uuidv4().substring(0, 5) + Date.now();
  {
    const req = {
      commandName: IrohaCommand.TransferAsset,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [adminID, userID, assetID, txDescription, "57.75"],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
    console.log(res.data.transactionReceipt.txHash);
    firstTxHash = res.data.transactionReceipt.txHash[0];
    console.log(firstTxHash);
  }

  {
    const req = {
      commandName: IrohaCommand.TransferAsset,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: {
        srcAccountId: adminID,
        destAccountId: userID,
        assetId: assetID,
        description: txDescription,
        amount: "57.75",
      },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
    firstTxHash = res.data.transactionReceipt.txHash[0];
    console.log(firstTxHash);
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountAssets,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [adminID, 100, assetID],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      {
        assetId: assetID,
        accountId: adminID,
        balance: "130.746",
      },
    ]);
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountAssets,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { accountId: adminID, pageSize: 100, firstAssetId: assetID },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      {
        assetId: assetID,
        accountId: adminID,
        balance: "130.746",
      },
    ]);
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountAssets,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [userID, 100, assetID],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      {
        assetId: assetID,
        accountId: userID,
        balance: "115.50",
      },
    ]);
  }

  {
    const req = {
      commandName: IrohaCommand.SubtractAssetQuantity,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [assetID, "30.123"],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.SubtractAssetQuantity,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { assetId: assetID, amount: "30.123" },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountAssets,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [adminID, 100, assetID],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      {
        assetId: assetID,
        accountId: adminID,
        balance: "70.500",
      },
    ]);
  }

  {
    const req = {
      commandName: IrohaQuery.GetSignatories,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [adminID],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEquals(res.data.transactionReceipt, [adminPubA]);
  }

  const keyPair4: KeyPair = cryptoHelper.generateKeyPair();
  const adminPubB = keyPair4.publicKey;
  {
    const req = {
      commandName: IrohaCommand.AddSignatory,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [adminID, adminPubB],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  const testKeyPair: KeyPair = cryptoHelper.generateKeyPair();
  const testAdminPub = testKeyPair.publicKey;
  {
    const req = {
      commandName: IrohaCommand.AddSignatory,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { accountId: adminID, publicKey: testAdminPub },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaQuery.GetSignatories,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [adminID],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.true(res.data.transactionReceipt.includes(adminPubA));
    t.true(res.data.transactionReceipt.includes(adminPubB));
  }

  {
    const req = {
      commandName: IrohaQuery.GetSignatories,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { accountId: adminID },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.true(res.data.transactionReceipt.includes(adminPubA));
    t.true(res.data.transactionReceipt.includes(adminPubB));
    t.true(res.data.transactionReceipt.includes(testAdminPub));
  }

  {
    const req = {
      commandName: IrohaCommand.RemoveSignatory,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [adminID, adminPubB],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.RemoveSignatory,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { accountId: adminID, publicKey: testAdminPub },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaQuery.GetSignatories,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [adminID],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [adminPubA]);
  }

  {
    const req = {
      commandName: IrohaQuery.GetRoles,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      "cactus_test",
      "cactus_test_full",
      "admin",
      "user",
      moneyCreatorRole,
    ]);
  }

  {
    const req = {
      commandName: IrohaQuery.GetRolePermissions,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [moneyCreatorRole],
    };
    const res = await apiClient.runTransactionV1(req);
    console.log(res.data.transactionReceipt);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    /**
     * Iroha Javascript SDK maps each permission to an index number
     * @see https://github.com/hyperledger/iroha-javascript/blob/main/src/proto/primitive_pb.d.ts#L193-L247
     */
    const permissionArr = [3, 11, 12, 13];
    t.deepEqual(res.data.transactionReceipt, permissionArr);
  }

  {
    const req = {
      commandName: IrohaQuery.GetRolePermissions,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { roleId: moneyCreatorRole },
    };
    const res = await apiClient.runTransactionV1(req);
    console.log(res.data.transactionReceipt);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    /**
     * Iroha Javascript SDK maps each permission to an index number
     * @see https://github.com/hyperledger/iroha-javascript/blob/main/src/proto/primitive_pb.d.ts#L193-L247
     */
    const permissionArr = [3, 11, 12, 13];
    t.deepEqual(res.data.transactionReceipt, permissionArr);
  }

  {
    const req = {
      commandName: IrohaQuery.GetTransactions,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      /**
       * param[0] needs to be an array of transactions
       * Example: [[TxHash1, TxHash2, TxHash3]]
       * @see https://iroha.readthedocs.io/en/main/develop/api/queries.html?highlight=GetTransactions#id25
       */
      params: [[firstTxHash]],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(
      res.data.transactionReceipt.array[0][0][0][0][0][0].slice(-1)[0],
      [adminID, userID, assetID, txDescription, "57.75"],
    );
  }

  {
    const req = {
      commandName: IrohaQuery.GetTransactions,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      /**
       * param[0] needs to be an array of transactions
       * Example: [[TxHash1, TxHash2, TxHash3]]
       * @see https://iroha.readthedocs.io/en/main/develop/api/queries.html?highlight=GetTransactions#id25
       */
      params: { txHashesList: [firstTxHash] },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(
      res.data.transactionReceipt.array[0][0][0][0][0][0].slice(-1)[0],
      [adminID, userID, assetID, txDescription, "57.75"],
    );
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountTransactions,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [
        adminID,
        100,
        firstTxHash,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      ],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(
      res.data.transactionReceipt.transactionsList[0].payload.reducedPayload
        .commandsList,
      [
        {
          transferAsset: {
            srcAccountId: adminID,
            destAccountId: userID,
            assetId: assetID,
            description: txDescription,
            amount: "57.75",
          },
        },
      ],
    );
    t.equal(
      res.data.transactionReceipt.transactionsList[0].signaturesList[0]
        .publicKey,
      adminPubA,
    );
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountTransactions,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: {
        accountId: adminID,
        pageSize: 100,
        firstTxHash: firstTxHash,
        firstTxTime: undefined,
        lastTxTime: undefined,
        firstTxHeight: undefined,
        lastTxHeight: undefined,
        ordering: {
          field: undefined,
          direction: undefined,
        },
      },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(
      res.data.transactionReceipt.transactionsList[0].payload.reducedPayload
        .commandsList,
      [
        {
          transferAsset: {
            srcAccountId: adminID,
            destAccountId: userID,
            assetId: assetID,
            description: txDescription,
            amount: "57.75",
          },
        },
      ],
    );
    t.equal(
      res.data.transactionReceipt.transactionsList[0].signaturesList[0]
        .publicKey,
      adminPubA,
    );
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountAssetTransactions,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [
        adminID,
        assetID,
        100,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      ],
    };
    const res = await apiClient.runTransactionV1(req);
    t.deepEqual(
      res.data.transactionReceipt.transactionsList[0].payload.reducedPayload
        .commandsList,
      [
        {
          transferAsset: {
            srcAccountId: adminID,
            destAccountId: userID,
            assetId: assetID,
            description: txDescription,
            amount: "57.75",
          },
        },
      ],
    );
    t.equal(
      res.data.transactionReceipt.transactionsList[0].signaturesList[0]
        .publicKey,
      adminPubA,
    );
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountAssetTransactions,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: {
        accountId: adminID,
        assetId: assetID,
        pageSize: 100,
        firstTxHash: undefined,
        firstTxTime: undefined,
        lastTxTime: undefined,
        firstTxHeight: undefined,
        lastTxHeight: undefined,
        ordering: {
          field: undefined,
          direction: undefined,
        },
      },
    };
    const res = await apiClient.runTransactionV1(req);
    t.deepEqual(
      res.data.transactionReceipt.transactionsList[0].payload.reducedPayload
        .commandsList,
      [
        {
          transferAsset: {
            srcAccountId: adminID,
            destAccountId: userID,
            assetId: assetID,
            description: txDescription,
            amount: "57.75",
          },
        },
      ],
    );
    t.equal(
      res.data.transactionReceipt.transactionsList[0].signaturesList[0]
        .publicKey,
      adminPubA,
    );
  }

  {
    const req = {
      commandName: IrohaQuery.GetPeers,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      {
        address: internalAddr,
        peerKey: nodePubA,
        tlsCertificate: "",
      },
    ]);
  }

  {
    const req = {
      commandName: IrohaQuery.GetBlock,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [1],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(
      res.data.transactionReceipt.payload.transactionsList[0].payload
        .reducedPayload.commandsList[0].addPeer.peer,
      {
        address: internalAddr,
        peerKey: nodePubA,
        tlsCertificate: "",
      },
    );
  }

  {
    const req = {
      commandName: IrohaQuery.GetBlock,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { height: 1 },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(
      res.data.transactionReceipt.payload.transactionsList[0].payload
        .reducedPayload.commandsList[0].addPeer.peer,
      {
        address: internalAddr,
        peerKey: nodePubA,
        tlsCertificate: "",
      },
    );
  }

  {
    const req = {
      commandName: IrohaCommand.AppendRole,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [userID, moneyCreatorRole],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.AppendRole,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { accountId: userID, roleName: "cactus_test" },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.DetachRole,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [userID, moneyCreatorRole],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.DetachRole,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { accountId: userID, roleName: "cactus_test" },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  let testRole = uuidv4().substring(0, 5);
  {
    const req = {
      commandName: IrohaCommand.CreateRole,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [testRole, [6, 7]],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }
  testRole = uuidv4().substring(0, 5) + Date.now();
  {
    const req = {
      commandName: IrohaCommand.CreateRole,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { roleName: testRole, permissionsList: [6, 7] },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.GrantPermission,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { accountId: userID, permission: "CAN_CALL_ENGINE_ON_MY_BEHALF" },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.RevokePermission,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { accountId: userID, permission: "CAN_CALL_ENGINE_ON_MY_BEHALF" },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.SetAccountDetail,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [userID, "age", "18"],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.SetAccountDetail,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { accountId: userID, key: "age", value: "21" },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountDetail,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [userID, "age", adminID, 1, "age", adminID],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, {
      "admin@test": { age: "21" },
    });
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountDetail,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: {
        accountId: userID,
        key: "age",
        writer: adminID,
        pageSize: 1,
        paginationKey: "age",
        paginationWriter: adminID,
      },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, {
      "admin@test": { age: "21" },
    });
  }

  {
    const req = {
      commandName: IrohaCommand.CompareAndSetAccountDetail,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [userID, "age", "118", "21", false], //change age from 21 to 118
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.CompareAndSetAccountDetail,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [userID, "age", "21", "118", false], //change age from 118 to 21
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaQuery.GetAccountDetail,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [userID, "age", adminID, 1, "age", adminID],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, {
      "admin@test": { age: "21" },
    });
  }

  {
    const req = {
      commandName: IrohaQuery.GetEngineReceipts,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [firstTxHash],
    };
    const res = await apiClient.runTransactionV1(req);
    t.deepEqual(res.data.transactionReceipt.array, [[]]);
  }

  {
    const req = {
      commandName: IrohaQuery.GetEngineReceipts,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { txHash: firstTxHash },
    };
    const res = await apiClient.runTransactionV1(req);
    t.deepEqual(res.data.transactionReceipt.array, [[]]);
  }

  const key = uuidv4().substring(0, 5) + Date.now();
  const value = uuidv4().substring(0, 5) + Date.now();
  {
    const req = {
      commandName: IrohaCommand.SetSettingValue,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [key, value],
    };
    await t.rejects(
      apiClient.runTransactionV1(req),
      /[\s\S]*/,
      "SetSettingValue transaction is rejected OK",
    );
  }

  /**
   * The callee and input values are taken from Iroha doc's example.
   * At some point, we should generate it on our own.
   * @see https://iroha.readthedocs.io/en/main/develop/api/commands.html?highlight=CallEngine#id18
   */
  const callee = "7C370993FD90AF204FD582004E2E54E6A94F2651";
  const input =
    "40c10f19000000000000000000000000969453762b0c739dd285b31635efa00e24c2562800000000000000000000000000000000000000000000000000000000000004d2";
  {
    const req = {
      commandName: IrohaCommand.CallEngine,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [undefined, adminID, callee, input],
    };
    await t.rejects(
      apiClient.runTransactionV1(req),
      /[\s\S]*/,
      "CallEngine transaction is rejected OK",
    );
  }

  {
    const req = {
      commandName: IrohaCommand.CallEngine,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { type: undefined, caller: adminID, callee, input },
    };
    await t.rejects(
      apiClient.runTransactionV1(req),
      /[\s\S]*/,
      "CallEngine transaction is rejected OK",
    );
  }

  /**
   * FIXME - the Iroha Javascript SDK does not give any output if we try to produce a pending transaction
   * This results in an infinite loop and thus the following code cannot be executed.
   * Once the Iroha Javascript SDK is justitied. We can safely produce a pending transaction.
   * @see https://github.com/hyperledger/iroha-javascript/issues/66
   * Dealing with it will cause the test suite fail, so only testing against an empty pending transaction case.
   */
  {
    const req = {
      commandName: IrohaQuery.GetPendingTransactions,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [
        5,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      ],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, []);
  }

  {
    const req = {
      commandName: IrohaQuery.GetPendingTransactions,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: {
        pageSize: 5,
        firstTxHash: undefined,
        firstTxTime: undefined,
        lastTxTime: undefined,
        firstTxHeight: undefined,
        lastTxHeight: undefined,
        ordering: {
          field: undefined,
          direction: undefined,
        },
      },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, []);
  }

  const keyPair5: KeyPair = cryptoHelper.generateKeyPair();
  const adminPubC = keyPair5.publicKey;
  const adminPrivC = keyPair5.privateKey;
  {
    const req = {
      commandName: IrohaCommand.AddSignatory,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [adminID, adminPubC],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  {
    const req = {
      commandName: IrohaCommand.SetAccountQuorum,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { accountId: adminID, quorum: 2 },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    console.log(res.data.transactionReceipt);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }

  const keyPair6: KeyPair = cryptoHelper.generateKeyPair();
  const nodePubB = keyPair6.publicKey;
  /**
   * Take advantage of Postgres's address to fake it as the peer address
   * since it is different from existing Iroha node's address
   */
  const peerAddr = `${postgresHost}:${postgresPort}`;
  {
    const req = {
      commandName: IrohaCommand.AddPeer,
      baseConfig: {
        irohaHost: irohaHost,
        irohaPort: irohaPort,
        creatorAccountId: adminID,
        privKey: [adminPriv, adminPrivC],
        quorum: 2,
        timeoutLimit: 5000,
        tls: false,
      },
      params: { address: peerAddr, peerKey: nodePubB },
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status[0], "COMMITTED");
  }
  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
