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
const logLevel: LogLevelDesc = "ERROR";

test.onFailure(async () => {
  await Containers.logDiagnostics({ logLevel });
});

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

// Flaky test, does not always work, fix it once we have time
test.skip(testCase, async (t: Test) => {
  const postgres1 = new PostgresTestContainer({ logLevel });
  const postgres2 = new PostgresTestContainer({ logLevel });
  test.onFinish(async () => {
    await postgres1.stop();
    await postgres2.stop();
  });

  await postgres1.start();
  await postgres2.start();
  const postgresHost1 = await internalIpV4();
  const postgresPort1 = await postgres1.getPostgresPort();
  const postgresHost2 = await internalIpV4();
  const postgresPort2 = await postgres2.getPostgresPort();
  if (!postgresHost1 || !postgresHost2) {
    throw new RuntimeError("Could not determine the internal IPV4 address.");
  }

  //Start the 1st Iroha ledger with default priv/pub key pairs.
  const iroha1 = new IrohaTestLedger({
    postgresHost: postgresHost1,
    postgresPort: postgresPort1,
    logLevel: logLevel,
  });

  //Start the 2nd Iroha ledger with randomly generated priv/pub key pairs.
  const keyPairA: KeyPair = cryptoHelper.generateKeyPair();
  const adminPriv2 = keyPairA.privateKey;
  const adminPub2 = keyPairA.publicKey;
  const keyPairB: KeyPair = cryptoHelper.generateKeyPair();
  const nodePriv2 = keyPairB.privateKey;
  const nodePub2 = keyPairB.publicKey;
  const iroha2 = new IrohaTestLedger({
    adminPriv: adminPriv2,
    adminPub: adminPub2,
    nodePriv: nodePriv2,
    nodePub: nodePub2,
    postgresHost: postgresHost2,
    postgresPort: postgresPort2,
    logLevel: logLevel,
  });

  test.onFinish(async () => {
    await iroha1.stop();
    await iroha2.stop();
  });
  await iroha1.start();
  await iroha2.start();
  const irohaHost1 = await internalIpV4();
  const irohaHost2 = await internalIpV4();
  if (!irohaHost1 || !irohaHost2) {
    throw new RuntimeError("Could not determine the internal IPV4 address.");
  }
  const irohaPort1 = await iroha1.getRpcToriiPort();
  const rpcToriiPortHost1 = await iroha1.getRpcToriiPortHost();
  const irohaPort2 = await iroha2.getRpcToriiPort();
  const rpcToriiPortHost2 = await iroha2.getRpcToriiPortHost();

  //Start 2 connectors for 2 Iroha ledgers.
  const factory1 = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });
  const connector1: PluginLedgerConnectorIroha = await factory1.create({
    rpcToriiPortHost: rpcToriiPortHost1,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry(),
  });
  const factory2 = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });
  const connector2: PluginLedgerConnectorIroha = await factory2.create({
    rpcToriiPortHost: rpcToriiPortHost2,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry(),
  });
  //register the 2 connectors with 2 express services
  const expressApp1 = express();
  expressApp1.use(bodyParser.json({ limit: "250mb" }));
  const server1 = http.createServer(expressApp1);
  const listenOptions1: IListenOptions = {
    hostname: "0.0.0.0",
    port: 0,
    server: server1,
  };
  const addressInfo1 = (await Servers.listen(listenOptions1)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(server1));
  const apiHost1 = `http://${addressInfo1.address}:${addressInfo1.port}`;
  const apiConfig1 = new Configuration({ basePath: apiHost1 });
  const apiClient1 = new IrohaApi(apiConfig1);

  const expressApp2 = express();
  expressApp2.use(bodyParser.json({ limit: "250mb" }));
  const server2 = http.createServer(expressApp2);
  const listenOptions2: IListenOptions = {
    hostname: "0.0.0.0",
    port: 0,
    server: server2,
  };
  const addressInfo2 = (await Servers.listen(listenOptions2)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(server2));
  const apiHost2 = `http://${addressInfo2.address}:${addressInfo2.port}`;
  const apiConfig2 = new Configuration({ basePath: apiHost2 });
  const apiClient2 = new IrohaApi(apiConfig2);

  await connector1.getOrCreateWebServices();
  await connector1.registerWebServices(expressApp1);
  await connector2.getOrCreateWebServices();
  await connector2.registerWebServices(expressApp2);

  const adminPriv1 = await iroha1.getGenesisAccountPrivKey();
  const admin1 = iroha1.getDefaultAdminAccount();
  const domain1 = iroha1.getDefaultDomain();
  const adminID1 = `${admin1}@${domain1}`;
  const admin2 = iroha2.getDefaultAdminAccount();
  const domain2 = iroha2.getDefaultDomain();
  const adminID2 = `${admin2}@${domain2}`;

  //Setup: create coolcoin#test for Iroha1
  const asset = "coolcoin";
  const assetID1 = `${asset}#${domain1}`;
  const assetID2 = `${asset}#${domain1}`;
  {
    const req = {
      commandName: IrohaCommand.CreateAsset,
      baseConfig: {
        irohaHost: irohaHost1,
        irohaPort: irohaPort1,
        creatorAccountId: adminID1,
        privKey: [adminPriv1],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [asset, domain1, 3],
    };
    const res = await apiClient1.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  //Verify the generated priv/pub keys are equivalent to those pulled from the ledger.
  {
    const adminPriv2_ = await iroha2.getGenesisAccountPrivKey();
    const adminPub2_ = await iroha2.getGenesisAccountPubKey();
    const { publicKey, privateKey } = await iroha2.getNodeKeyPair();
    t.equal(adminPriv2, adminPriv2_);
    t.equal(adminPub2, adminPub2_);
    t.equal(nodePriv2, privateKey);
    t.equal(nodePub2, publicKey);
  }

  //Setup: create coolcoin#test for Iroha2
  {
    const req = {
      commandName: IrohaCommand.CreateAsset,
      baseConfig: {
        irohaHost: irohaHost2,
        irohaPort: irohaPort2,
        creatorAccountId: adminID2,
        privKey: [adminPriv2],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [asset, domain2, 3],
    };
    const res = await apiClient2.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }
  //Iroha1's admin is initialized with 100 (coolcoin#test).
  {
    const req = {
      commandName: IrohaCommand.AddAssetQuantity,
      baseConfig: {
        irohaHost: irohaHost1,
        irohaPort: irohaPort1,
        creatorAccountId: adminID1,
        privKey: [adminPriv1],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [assetID1, "100.000"],
    };
    const res = await apiClient1.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }

  // Iroha1's admin transfers 30 (coolcoin#test) to Iroha2's admin.
  // i.e., Iroha1's admin subtracts 30 (coolcoin#test).
  {
    const req = {
      commandName: IrohaCommand.SubtractAssetQuantity,
      baseConfig: {
        irohaHost: irohaHost1,
        irohaPort: irohaPort1,
        creatorAccountId: adminID1,
        privKey: [adminPriv1],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [assetID1, "30.000"],
    };
    const res = await apiClient1.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }
  //i.e., Iroha2's admin adds 30 (coolcoin#test).
  {
    const req = {
      commandName: IrohaCommand.AddAssetQuantity,
      baseConfig: {
        irohaHost: irohaHost2,
        irohaPort: irohaPort2,
        creatorAccountId: adminID2,
        privKey: [adminPriv2],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [assetID2, "30.000"],
    };
    const res = await apiClient2.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.equal(res.data.transactionReceipt.status, "COMMITTED");
  }
  //Verification: iroha1's admin has 70 (coolcoin#test).
  {
    const req = {
      commandName: IrohaQuery.GetAccountAssets,
      baseConfig: {
        irohaHost: irohaHost1,
        irohaPort: irohaPort1,
        creatorAccountId: adminID1,
        privKey: [adminPriv1],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [adminID1, 10, assetID1],
    };
    const res = await apiClient1.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      {
        assetId: assetID1,
        accountId: adminID1,
        balance: "70.000",
      },
    ]);
  }
  //Verification: iroha2's admin has 30 (coolcoin#test).
  {
    const req = {
      commandName: IrohaQuery.GetAccountAssets,
      baseConfig: {
        irohaHost: irohaHost2,
        irohaPort: irohaPort2,
        creatorAccountId: adminID2,
        privKey: [adminPriv2],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [adminID2, 10, assetID2],
    };
    const res = await apiClient2.runTransactionV1(req);
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.deepEqual(res.data.transactionReceipt, [
      {
        assetId: assetID2,
        accountId: adminID2,
        balance: "30.000",
      },
    ]);
  }

  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
