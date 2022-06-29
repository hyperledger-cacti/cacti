/**
 * Test sending transactions signed on the BLP (client) side.
 * No private keys are shared with the connector in this scenario.
 * Test suite contains simple sanity check of regular transaction call as well.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Ledger settings
const ledgerImageName = "ghcr.io/hyperledger/cactus-iroha-all-in-one";
const ledgerImageVersion = "2021-08-16--1183";
const postgresImageName = "postgres";
const postgresImageVersion = "9.5-alpine";

// Log settings
const testLogLevel: LogLevelDesc = "info"; // default: info
const sutLogLevel: LogLevelDesc = "info"; // default: info

import {
  PostgresTestContainer,
  IrohaTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
  Servers,
} from "@hyperledger/cactus-common";

import { PluginRegistry } from "@hyperledger/cactus-core";

import { PluginImportType, Configuration } from "@hyperledger/cactus-core-api";

import http from "http";
import express from "express";
import bodyParser from "body-parser";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";
import { v4 as internalIpV4 } from "internal-ip";
import "jest-extended";

import cryptoHelper from "iroha-helpers-ts/lib/cryptoHelper";

import {
  PluginLedgerConnectorIroha,
  DefaultApi as IrohaApi,
  PluginFactoryLedgerConnector,
  signIrohaTransaction,
} from "../../../main/typescript/public-api";

import {
  IrohaCommand,
  IrohaQuery,
} from "../../../main/typescript/generated/openapi/typescript-axios";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "generate-and-send-signed-transaction.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("Generate and send signed transaction tests", () => {
  let postgresContainer: PostgresTestContainer;
  let adminKeyPair: {
    publicKey: string;
    privateKey: string;
  };
  let irohaLedger: IrohaTestLedger;
  let irohaConnector: PluginLedgerConnectorIroha;
  let irohaLedgerHost: string;
  let irohaLedgerPort: number;
  let irohaAdminID: string;
  let connectorServer: http.Server;
  let apiClient: IrohaApi;

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });

    log.info("Run PostgresTestContainer...");
    postgresContainer = new PostgresTestContainer({
      imageName: postgresImageName,
      imageVersion: postgresImageVersion,
      logLevel: testLogLevel,
    });
    await postgresContainer.start();
    const postgresHost = (await internalIpV4()) as string;
    const postgresPort = await postgresContainer.getPostgresPort();
    expect(postgresHost).toBeTruthy();
    expect(postgresPort).toBeTruthy();
    log.info(`Postgres running at ${postgresHost}:${postgresPort}`);

    log.info("Generate key pairs...");
    adminKeyPair = cryptoHelper.generateKeyPair();
    const nodeKeyPair = cryptoHelper.generateKeyPair();

    log.info("Run IrohaTestLedger...");
    irohaLedger = new IrohaTestLedger({
      imageName: ledgerImageName,
      imageVersion: ledgerImageVersion,
      adminPriv: adminKeyPair.privateKey,
      adminPub: adminKeyPair.publicKey,
      nodePriv: nodeKeyPair.privateKey,
      nodePub: nodeKeyPair.publicKey,
      postgresHost: postgresHost,
      postgresPort: postgresPort,
      logLevel: testLogLevel,
    });
    await irohaLedger.start();
    irohaLedgerHost = (await internalIpV4()) as string;
    expect(irohaLedgerHost).toBeTruthy();
    irohaLedgerPort = await irohaLedger.getRpcToriiPort();
    expect(irohaLedgerPort).toBeTruthy();
    const rpcToriiPortHost = await irohaLedger.getRpcToriiPortHost();
    expect(rpcToriiPortHost).toBeTruthy();
    const admin = irohaLedger.getDefaultAdminAccount();
    expect(admin).toBeTruthy();
    const domain = irohaLedger.getDefaultDomain();
    expect(domain).toBeTruthy();
    irohaAdminID = `${admin}@${domain}`;
    log.info(
      "IrohaTestLedger RPC host:",
      rpcToriiPortHost,
      "irohaAdminID:",
      irohaAdminID,
    );

    log.info("Create iroha connector...");
    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    connectorServer = http.createServer(expressApp);
    const listenOptions = {
      hostname: "localhost",
      port: 0,
      server: connectorServer,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;

    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });

    irohaConnector = await factory.create({
      rpcToriiPortHost,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry(),
      logLevel: sutLogLevel,
    });
    await irohaConnector.getOrCreateWebServices();
    await irohaConnector.registerWebServices(expressApp);
    log.info(`Iroha connector is running at ${address}:${port}`);

    log.info("Create iroha ApiClient...");
    const apiHost = `http://${address}:${port}`;
    const apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new IrohaApi(apiConfig);
  });

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (connectorServer) {
      log.info("Stop the iroha connector...");
      await Servers.shutdown(connectorServer);
    }

    if (irohaLedger) {
      log.info("Stop iroha ledger...");
      await irohaLedger.stop();
    }

    if (postgresContainer) {
      log.info("Stop iroha postgres container...");
      await postgresContainer.stop();
    }

    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
  });

  //////////////////////////////////
  // Test Helpers
  //////////////////////////////////

  /**
   * Read iroha account details and check if valid response was received.
   * @param accountID account to fetch.
   * @returns getAccount command response.
   */
  async function getAccountInfo(accountID: string) {
    log.debug("Get account info with ID", accountID);

    const getAccReq = {
      commandName: IrohaQuery.GetAccount,
      baseConfig: {
        irohaHost: irohaLedgerHost,
        irohaPort: irohaLedgerPort,
        creatorAccountId: irohaAdminID,
        privKey: [adminKeyPair.privateKey],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [accountID],
    };

    const getAccResponse = await apiClient.runTransactionV1(getAccReq);
    expect(getAccResponse).toBeTruthy();
    expect(getAccResponse.data).toBeTruthy();
    expect(getAccResponse.status).toEqual(200);

    return getAccResponse;
  }

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Check if creating an account with regular transaction works well.
   * This test sends private key to the connector to sign the transaction,
   * and then reads new account details to confirm it was created.
   */
  test("Sanity check if regular create account transaction works", async () => {
    const username = "usersanity" + uuidv4().substring(0, 5);
    const defaultDomain = irohaLedger.getDefaultDomain();
    const userKeyPair = cryptoHelper.generateKeyPair();
    const userID = `${username}@${defaultDomain}`;

    // 1. Create
    log.debug("Create user with ID", userID);
    const createAccReq = {
      commandName: IrohaCommand.CreateAccount,
      baseConfig: {
        irohaHost: irohaLedgerHost,
        irohaPort: irohaLedgerPort,
        creatorAccountId: irohaAdminID,
        privKey: [adminKeyPair.privateKey],
        quorum: 1,
        timeoutLimit: 5000,
        tls: false,
      },
      params: [username, defaultDomain, userKeyPair.publicKey],
    };
    const createAccResponse = await apiClient.runTransactionV1(createAccReq);
    expect(createAccResponse).toBeTruthy();
    expect(createAccResponse.data).toBeTruthy();
    expect(createAccResponse.status).toEqual(200);
    expect(createAccResponse.data.transactionReceipt.status).toEqual(
      "COMMITTED",
    );

    // 2. Confirm
    const getAccResponse = await getAccountInfo(userID);
    expect(getAccResponse.data.transactionReceipt).toEqual({
      accountId: userID,
      domainId: defaultDomain,
      quorum: 1,
      jsonData: "{}",
    });
  });

  /**
   * Create new account without sharing the private key with the connector.
   * This test will first generate the unsigned transaction, use util function from connector package
   * to sign the transaction, and finally send the signed transaction.
   * Private key is not shared with the connector.
   * New account details are read to confirm it was created and committed correctly.
   */
  test("Sign transaction on the client (BLP) side", async () => {
    const username = "user" + uuidv4().substring(0, 5);
    const defaultDomain = irohaLedger.getDefaultDomain();
    const userKeyPair = cryptoHelper.generateKeyPair();
    const userID = `${username}@${defaultDomain}`;

    // Generate transaction
    log.info("Call generateTransactionV1 to get unsigned transaction.");
    const genTxResponse = await apiClient.generateTransactionV1({
      commandName: IrohaCommand.CreateAccount,
      commandParams: {
        accountName: username,
        domainId: defaultDomain,
        publicKey: userKeyPair.publicKey,
      },
      creatorAccountId: irohaAdminID,
      quorum: 1,
    });
    expect(genTxResponse).toBeTruthy();
    expect(genTxResponse.data).toBeTruthy();
    expect(genTxResponse.status).toEqual(200);
    const unsignedTransaction = Uint8Array.from(
      Object.values(genTxResponse.data),
    );
    expect(unsignedTransaction).toBeTruthy();
    log.info("Received unsigned transcation");
    log.debug("unsignedTransaction:", unsignedTransaction);

    // Sign
    const signedTransaction = signIrohaTransaction(
      unsignedTransaction,
      adminKeyPair.privateKey,
    );
    expect(signedTransaction).toBeTruthy();
    log.info("Transaction signed with local private key");
    log.debug("signedTx:", signedTransaction);

    // Send
    const sendTransactionResponse = await apiClient.runTransactionV1({
      signedTransaction,
      baseConfig: {
        irohaHost: irohaLedgerHost,
        irohaPort: irohaLedgerPort,
        timeoutLimit: 5000,
        tls: false,
      },
    });
    expect(sendTransactionResponse).toBeTruthy();
    expect(sendTransactionResponse.status).toEqual(200);
    expect(sendTransactionResponse.data).toBeTruthy();
    expect(sendTransactionResponse.data.transactionReceipt).toBeTruthy();
    expect(sendTransactionResponse.data.transactionReceipt.txHash).toBeTruthy();
    expect(sendTransactionResponse.data.transactionReceipt.status).toEqual(
      "COMMITTED",
    );

    // 3. Confirm
    const getAccResponse = await getAccountInfo(userID);
    expect(getAccResponse.data.transactionReceipt).toEqual({
      accountId: userID,
      domainId: defaultDomain,
      quorum: 1,
      jsonData: "{}",
    });
  });

  /**
   * Check if exceptions thrown by generateTransactionV1 are properly serialized
   * and sanitized, so that response message doesn't contain any malicious data.
   */
  test("generateTransactionV1 error responses check", async () => {
    const username = "user" + uuidv4().substring(0, 5);
    const defaultDomain = irohaLedger.getDefaultDomain();
    const userKeyPair = cryptoHelper.generateKeyPair();

    // Bad Request Error
    try {
      log.info(
        "Call generateTransactionV1 with invalid command name - should fail.",
      );
      await apiClient.generateTransactionV1({
        commandName: "MaliciousError <script type='text/javascript'>var i = 10</script>" as any,
        commandParams: {
          accountName: username,
          domainId: defaultDomain,
          publicKey: userKeyPair.publicKey,
        },
        creatorAccountId: irohaAdminID,
        quorum: 1,
      });
      expect(true).toBeFalse(); // Should always fail
    } catch (error: any) {
      const errorResponse = error.response;
      expect(errorResponse).toBeTruthy();
      expect(errorResponse.status).toEqual(400);
      expect(errorResponse.data).toBeTruthy();
      expect(errorResponse.data.message).toBeTruthy();
      expect(errorResponse.data.error).toBeTruthy();
      // HTML should be escaped from the response message
      expect(errorResponse.data.message).not.toContain("<script");
    }

    // Internal Server Error
    try {
      log.info(
        "Call generateTransactionV1 with missing arguments - should fail.",
      );
      await apiClient.generateTransactionV1({
        commandName: IrohaCommand.CreateAccount,
        commandParams: {},
        creatorAccountId: irohaAdminID,
        quorum: 1,
      });
      expect(true).toBeFalse(); // Should always fail
    } catch (error: any) {
      const errorResponse = error.response;
      expect(errorResponse).toBeTruthy();
      expect(errorResponse.status).toEqual(500);
      expect(errorResponse.data).toBeTruthy();
      expect(errorResponse.data.message).toBeTruthy();
      expect(errorResponse.data.error).toBeTruthy();
    }
  });
});
