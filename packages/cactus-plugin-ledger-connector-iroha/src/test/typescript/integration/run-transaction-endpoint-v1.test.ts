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
} from "../../../main/typescript/public-api";

import { Configuration } from "@hyperledger/cactus-core-api";

import {
  IrohaCommand,
  IrohaQuery,
  KeyPair,
} from "../../../main/typescript/generated/openapi/typescript-axios";
import cryptoHelper from "iroha-helpers-ts/lib/cryptoHelper";

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
test.skip(testCase, async (t: Test) => {
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
  const internalAddr = iroha.getInternalAddr();
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

  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp);

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
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  const asset = "coolcoin";
  /**
   * An asset in Iroha ledger is formatted as: `asset_name#domain_id`
   * @see https://iroha.readthedocs.io/en/main/concepts_architecture/er_model.html?highlight=%3Casset_name%3E%23%3Cdomain_id%3E#asset
   */
  const assetID = `${asset}#${domain}`;
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
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
    firstTxHash = res.data.transactionReceipt.txHash;
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
        balance: "65.373",
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
        balance: "57.75",
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
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
        balance: "35.250",
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
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
      params: [adminID, 100, firstTxHash],
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
      params: [adminID, assetID, 100, undefined],
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
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  const testRole = uuidv4().substring(0, 5);
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
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
      params: [userID, "CAN_CALL_ENGINE_ON_MY_BEHALF"],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
      params: [userID, "CAN_CALL_ENGINE_ON_MY_BEHALF"],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
      "admin@test": { age: "18" },
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
      params: [userID, "age", "118", "18"], //change age from 18 to 118
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
      "admin@test": { age: "118" },
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
      params: [5, undefined],
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
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
      params: [adminID, 2],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    console.log(res.data.transactionReceipt);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
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
      params: [peerAddr, nodePubB],
    };
    const res = await apiClient.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  // //  Use Promise.race to cancel the promise
  // {
  //   const req1 = {
  //     commandName: "producePendingTx",
  //     params: [],
  //   };
  //   Promise.race([
  //     //FIXME - the Iroha Javascript SDK does not give any output if we try to produce a pending transaction
  //     // This results in an infinite loop and thus the following code cannot be executed.
  //     // This fix is not perfect. It cancels the request with a timeout, but will result in grpc "Error: 14 UNAVAILABLE: GOAWAY received
  //     // Once the Iroha Javascript SDK is justitied. We can safely produce a pending transaction.
  //     apiClient.runTransactionV1(req1),
  //     new Promise((resolve) => setTimeout(resolve, 1000)),
  //   ]);
  // }

  // use bluebird to cancel Promise
  // {
  //   const req1 = {
  //     commandName: "producePendingTx",
  //     params: [],
  //   };
  //   const promise = apiClient.runTransactionV1(req1);
  //   const p2 = new Promise((onCancel) => {
  //     promise;
  //     onCancel(() => console.log("p2 canceled"));
  //   });
  //   p2.cancel();
  // }

  // // {
  // //   const req = {
  // //     commandName: "removePeer",
  // //     params: [
  // //       "0000000000000000000000000000000000000000000000000000000000000002",
  // //     ],
  // //   };
  // //   const res = await apiClient.runTransactionV1(req);
  // //   console.log(res.data.transactionReceipt);
  // // }

  // // {
  // //   const req = {
  // //     commandName: "fetchCommits",
  // //     params: [],
  // //   };
  // //   const res = await apiClient.runTransactionV1(req);
  // //   t.ok(res);
  // //   t.ok(res.data);
  // //   t.equal(res.status, 200);
  // //   console.log(res.data.transactionReceipt);
  // // }
  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
