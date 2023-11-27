/**
 * Tests for sending transactions to Iroha V2 without sharing private key with the connector.
 * Transactions are signed on the client side.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Log settings
const testLogLevel: LogLevelDesc = "debug";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";

import {
  IrohaInstruction,
  IrohaQuery,
  signIrohaV2Transaction,
  TransactionStatusV1,
} from "../../../main/typescript/public-api";
import {
  generateTestIrohaCredentials,
  IrohaV2TestEnv,
} from "../test-helpers/iroha2-env-setup";
import { addRandomSuffix } from "../test-helpers/utils";

import "jest-extended";
import { TransactionPayload } from "@iroha2/data-model";
import { signIrohaV2Query } from "../../../main/typescript/iroha-sign-utils";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "generate-and-send-signed-transaction.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("Generate and send signed transaction tests", () => {
  let env: IrohaV2TestEnv;

  beforeAll(async () => {
    env = new IrohaV2TestEnv(log);
    await env.start();
  });

  afterAll(async () => {
    if (env) {
      await env.stop();
    }
  });

  //////////////////////////////////
  // Test Helpers
  //////////////////////////////////

  /**
   * Helper function to check if domain with specified `domainName` was correctly created.
   * Asserts the response from the connector query.
   *
   * @param domainName Name of the domain existing on test ledger.
   */
  async function assertDomainExistence(domainName: string): Promise<void> {
    const queryResponse = await env.apiClient.queryV1({
      query: {
        query: IrohaQuery.FindDomainById,
        params: [domainName],
      },
      baseConfig: env.defaultBaseConfig,
    });
    expect(queryResponse).toBeTruthy();
    expect(queryResponse.data).toBeTruthy();
    expect(queryResponse.data.response).toBeTruthy();
    expect(queryResponse.data.response.id).toBeTruthy();
    expect(queryResponse.data.response.id.name).toEqual(domainName);
  }

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Create new domain with regular `transact` request to assert the ledger is working correctly.
   */
  test("Sanity check if regular create domain transaction works", async () => {
    const domainName = addRandomSuffix("sanityTestDomain");
    expect(domainName).toBeTruthy();

    // Create new domain
    const transactionResponse = await env.apiClient.transactV1({
      transaction: {
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
      },
      waitForCommit: true,
      baseConfig: env.defaultBaseConfig,
    });
    expect(transactionResponse).toBeTruthy();
    expect(transactionResponse.status).toEqual(200);
    expect(transactionResponse.data.rejectReason).toBeUndefined();
    expect(transactionResponse.data.status).toEqual(
      TransactionStatusV1.Committed,
    );

    // Check if domain was created
    await assertDomainExistence(domainName);
  });

  /**
   * Create new domain with transaction signed on the client side.
   */
  test("Sign transaction on the client (BLP) side", async () => {
    const domainName = addRandomSuffix("genNewDomainTx");
    expect(domainName).toBeTruthy();

    // 1. Generate transaction
    const genTxResponse = await env.apiClient.generateTransactionV1({
      request: {
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
      },
      baseConfig: env.defaultBaseConfig,
    });
    expect(genTxResponse).toBeTruthy();
    expect(genTxResponse.data).toBeTruthy();
    expect(genTxResponse.status).toEqual(200);

    const genTxResponseDataB64 = Buffer.from(genTxResponse.data, "base64");
    const unsignedTransaction = Uint8Array.from(genTxResponseDataB64);

    expect(unsignedTransaction).toBeTruthy();
    log.info("Received unsigned transcation");
    log.debug("unsignedTransaction:", unsignedTransaction);

    // 2. Sign
    const signerAccountId = env.defaultBaseConfig.accountId;
    if (!signerAccountId) {
      throw new Error("No signer account ID in test environment");
    }

    const signedTransaction = signIrohaV2Transaction(
      unsignedTransaction,
      signerAccountId.name,
      signerAccountId.domainId,
      env.keyPairCredential,
    );
    expect(signedTransaction).toBeTruthy();
    log.info("Transaction signed with local private key");
    log.debug("signedTransaction:", signedTransaction);

    const signedTxBuffer = Buffer.from(signedTransaction);
    const signedTxBase64 = signedTxBuffer.toString("base64");

    // 3. Send
    const transactionResponse = await env.apiClient.transactV1({
      signedTransaction: signedTxBase64,
      waitForCommit: true,
      baseConfig: env.defaultBaseConfig,
    });
    expect(transactionResponse).toBeTruthy();
    expect(transactionResponse.status).toEqual(200);
    expect(transactionResponse.data.rejectReason).toBeUndefined();
    expect(transactionResponse.data.status).toEqual(
      TransactionStatusV1.Committed,
    );

    // Check if domain was created
    await assertDomainExistence(domainName);
  });

  /**
   * Test passing transaction parameters.
   */
  test("Transaction parameters sent in request are included in generated payload", async () => {
    const domainName = addRandomSuffix("txParamsDomain");
    expect(domainName).toBeTruthy();
    const inputParams = {
      ttl: "300000",
      creationTime: Date.now().toString(),
      nonce: 123,
    };

    // Generate transaction with tx params
    const genTxResponse = await env.apiClient.generateTransactionV1({
      request: {
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
        params: inputParams,
      },
      baseConfig: env.defaultBaseConfig,
    });

    // Assert generateTransactionV1 response
    expect(genTxResponse).toBeTruthy();
    expect(genTxResponse.data).toBeTruthy();
    expect(genTxResponse.status).toEqual(200);

    const dataBuffer = Buffer.from(genTxResponse.data, "base64");
    const unsignedTransaction = Uint8Array.from(dataBuffer);

    expect(unsignedTransaction).toBeTruthy();
    log.info("Received unsigned transcation");

    // Assert generated transaction structure
    const decodedTx = TransactionPayload.fromBuffer(unsignedTransaction);
    expect(decodedTx).toBeTruthy();
    expect(BigInt(decodedTx.creation_time).toString()).toEqual(
      inputParams.creationTime,
    );
    expect(BigInt(decodedTx.time_to_live_ms).toString()).toEqual(
      inputParams.ttl,
    );
    expect(decodedTx.nonce.value).toEqual(inputParams.nonce);
  });

  /**
   * Create new domain and query it with query request signed on the client side.
   */
  test("Sign query on the client (BLP) side", async () => {
    const domainName = addRandomSuffix("querySignDomain");
    expect(domainName).toBeTruthy();

    // Create new domain
    const transactionResponse = await env.apiClient.transactV1({
      transaction: {
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
      },
      waitForCommit: true,
      baseConfig: env.defaultBaseConfig,
    });
    expect(transactionResponse).toBeTruthy();
    expect(transactionResponse.status).toEqual(200);
    expect(transactionResponse.data.rejectReason).toBeUndefined();
    expect(transactionResponse.data.status).toEqual(
      TransactionStatusV1.Committed,
    );

    // 1. Generate query request payload
    const genQueryResponse = await env.apiClient.generateTransactionV1({
      request: {
        query: IrohaQuery.FindDomainById,
        params: [domainName],
      },
      baseConfig: env.defaultBaseConfig,
    });
    expect(genQueryResponse).toBeTruthy();
    expect(genQueryResponse.data).toBeTruthy();
    expect(genQueryResponse.status).toEqual(200);

    const queryResponseDataBuf = Buffer.from(genQueryResponse.data, "base64");
    const unsignedQueryReq = Uint8Array.from(queryResponseDataBuf);

    expect(unsignedQueryReq).toBeTruthy();
    log.info("Received unsigned query request");
    log.debug("unsignedQueryReq:", unsignedQueryReq);

    // 2. Sign
    const signerAccountId = env.defaultBaseConfig.accountId;
    if (!signerAccountId) {
      throw new Error("No signer account ID in test environment");
    }

    const signedQueryReq = signIrohaV2Query(
      unsignedQueryReq,
      signerAccountId.name,
      signerAccountId.domainId,
      env.keyPairCredential,
    );
    expect(signedQueryReq).toBeTruthy();
    log.info("Query request signed with a local private key");
    log.debug("signedQueryReq:", signedQueryReq);

    const payloadBuffer = Buffer.from(signedQueryReq);
    const payloadBase64 = payloadBuffer.toString("base64");

    // 3. Send
    const queryResponse = await env.apiClient.queryV1({
      signedQuery: {
        query: IrohaQuery.FindDomainById,
        payload: payloadBase64,
      },
      baseConfig: env.defaultBaseConfig,
    });
    expect(queryResponse).toBeTruthy();
    expect(queryResponse.data).toBeTruthy();
    expect(queryResponse.data.response).toBeTruthy();
    expect(queryResponse.data.response.id).toBeTruthy();
    expect(queryResponse.data.response.id.name).toEqual(domainName);
  });

  /**
   * Test generateTransactionV1 transaction error handling
   */
  test("generateTransactionV1 returns error for invalid transaction content", async () => {
    const domainName = addRandomSuffix("errorCheckDomain");
    expect(domainName).toBeTruthy();

    // Generate transaction with wrong instruction
    try {
      await env.apiClient.generateTransactionV1({
        request: {
          instruction: {
            name: "foo" as IrohaInstruction,
            params: [domainName],
          },
        },
        baseConfig: env.defaultBaseConfig,
      });
      expect(false).toBe(true); // should always throw by now
    } catch (err: any) {
      expect(err.response.status).toBe(500);
      expect(err.response.data.message).toEqual("Internal Server Error");
      expect(err.response.data.error).toBeTruthy();
    }
  });

  /**
   * Test generateTransactionV1 query error handling
   */
  test("generateTransactionV1 returns error for invalid query parameter number", async () => {
    // Query domain without it's ID
    try {
      await env.apiClient.generateTransactionV1({
        request: {
          query: IrohaQuery.FindDomainById,
          params: [],
        },
        baseConfig: env.defaultBaseConfig,
      });
      expect(false).toBe(true); // should always throw by now
    } catch (err: any) {
      expect(err.response.status).toBe(500);
      expect(err.response.data.message).toEqual("Internal Server Error");
      expect(err.response.data.error).toBeTruthy();
    }
  });

  /**
   * Complex test for account creation, asset definition and finally an asset transfer.
   */
  test("Complex asset transfer between accounts", async () => {
    // 1. Register new account - bob
    const bobDomain = "wonderland";
    const bobName = addRandomSuffix("bob");
    expect(bobName).toBeTruthy();

    const bobCredentials = generateTestIrohaCredentials();
    const registerAccountResponse = await env.apiClient.transactV1({
      transaction: {
        instruction: {
          name: IrohaInstruction.RegisterAccount,
          params: [
            bobName,
            bobDomain,
            bobCredentials.publicKey,
            bobCredentials.privateKey.digestFunction,
          ],
        },
      },
      waitForCommit: true,
      baseConfig: env.defaultBaseConfig,
    });
    expect(registerAccountResponse).toBeTruthy();
    expect(registerAccountResponse.status).toEqual(200);
    expect(registerAccountResponse.data.rejectReason).toBeUndefined();
    expect(registerAccountResponse.data.status).toEqual(
      TransactionStatusV1.Committed,
    );
    log.info(`User '${bobName}' registered.`);

    // 2. Confirm account bob was created
    const accountQueryResponse = await env.apiClient.queryV1({
      query: {
        query: IrohaQuery.FindAccountById,
        params: [bobName, bobDomain],
      },
      baseConfig: env.defaultBaseConfig,
    });
    expect(accountQueryResponse.data).toBeTruthy();
    const responseData = accountQueryResponse.data.response;
    expect(responseData).toBeTruthy();
    expect(responseData.id.name).toEqual(bobName);
    expect(responseData.id.domain_id.name).toEqual(bobDomain);

    // 3. Create new asset
    const assetOwnerName = env.defaultBaseConfig.accountId?.name;
    expect(assetOwnerName).toBeTruthy();
    const assetOwnerDomainName = env.defaultBaseConfig.accountId?.domainId;
    expect(assetOwnerDomainName).toBeTruthy();
    const assetName = addRandomSuffix("aliceGold");
    expect(assetName).toBeTruthy();
    const assetDomain = assetOwnerDomainName;
    expect(assetDomain).toBeTruthy();
    const valueType = "Quantity";
    const initAssetValue = 100;
    const mintable = "Infinitely";

    const registerAssetDefResponse = await env.apiClient.transactV1({
      transaction: {
        instruction: {
          name: IrohaInstruction.RegisterAssetDefinition,
          params: [assetName, assetDomain, valueType, mintable],
        },
      },
      waitForCommit: true,
      baseConfig: env.defaultBaseConfig,
    });
    expect(registerAssetDefResponse).toBeTruthy();
    expect(registerAssetDefResponse.status).toEqual(200);
    expect(registerAssetDefResponse.data.rejectReason).toBeUndefined();
    expect(registerAssetDefResponse.data.status).toEqual(
      TransactionStatusV1.Committed,
    );

    const registerAssetResponse = await env.apiClient.transactV1({
      transaction: {
        instruction: {
          name: IrohaInstruction.RegisterAsset,
          params: [
            assetName,
            assetDomain,
            assetOwnerName,
            assetOwnerDomainName,
            initAssetValue,
          ],
        },
      },
      waitForCommit: true,
      baseConfig: env.defaultBaseConfig,
    });
    expect(registerAssetResponse).toBeTruthy();
    expect(registerAssetResponse.status).toEqual(200);
    expect(registerAssetResponse.data.rejectReason).toBeUndefined();
    expect(registerAssetResponse.data.status).toEqual(
      TransactionStatusV1.Committed,
    );
    log.info(
      `Asset '${assetName}#${assetDomain}' registered. Initial value: ${initAssetValue}`,
    );

    // 4. Initial transfer of asset from alice to bob
    const transferValue = 10;

    const initTransferResponse = await env.apiClient.transactV1({
      transaction: {
        instruction: {
          name: IrohaInstruction.TransferAsset,
          params: [
            assetName,
            assetDomain,
            assetOwnerName,
            assetOwnerDomainName,
            bobName,
            bobDomain,
            transferValue,
          ],
        },
      },
      waitForCommit: true,
      baseConfig: env.defaultBaseConfig,
    });
    expect(initTransferResponse).toBeTruthy();
    expect(initTransferResponse.status).toEqual(200);
    expect(initTransferResponse.data.rejectReason).toBeUndefined();
    expect(initTransferResponse.data.status).toEqual(
      TransactionStatusV1.Committed,
    );
    log.info("Initial transfer of asset done.");

    // 5. Confirm asset balance on both accounts
    const initAliceBalanceQueryResponse = await env.apiClient.queryV1({
      query: {
        query: IrohaQuery.FindAssetById,
        params: [assetName, assetDomain, assetOwnerName, assetOwnerDomainName],
      },
      baseConfig: env.defaultBaseConfig,
    });
    expect(initAliceBalanceQueryResponse).toBeTruthy();
    expect(initAliceBalanceQueryResponse.data).toBeTruthy();
    const initAliceBalance =
      initAliceBalanceQueryResponse.data.response.value.value;
    log.info(
      "Alice (source) balance after initial transfer:",
      initAliceBalance,
    );
    expect(initAliceBalance).toEqual(initAssetValue - transferValue);

    const initBobBalanceQueryResponse = await env.apiClient.queryV1({
      query: {
        query: IrohaQuery.FindAssetById,
        params: [assetName, assetDomain, bobName, bobDomain],
      },
      baseConfig: env.defaultBaseConfig,
    });
    expect(initBobBalanceQueryResponse).toBeTruthy();
    expect(initBobBalanceQueryResponse.data).toBeTruthy();
    const initBobBalance =
      initBobBalanceQueryResponse.data.response.value.value;
    log.info("Bob (target) balance after initial transfer:", initBobBalance);
    expect(initBobBalance).toEqual(transferValue);

    // 6. Generate and sign transaction to transfer half of bob assets back to alice
    const transferBackValue = transferValue / 2;
    log.info("Transfer back to alice asset amount:", transferBackValue);

    const bobConfig = {
      ...env.defaultBaseConfig,
      accountId: {
        name: bobName,
        domainId: bobDomain,
      },
    };

    const genTxResponse = await env.apiClient.generateTransactionV1({
      request: {
        instruction: {
          name: IrohaInstruction.TransferAsset,
          params: [
            assetName,
            assetDomain,
            bobName,
            bobDomain,
            assetOwnerName,
            assetOwnerDomainName,
            transferBackValue,
          ],
        },
      },
      baseConfig: bobConfig,
    });
    expect(genTxResponse).toBeTruthy();
    expect(genTxResponse.data).toBeTruthy();
    expect(genTxResponse.status).toEqual(200);

    const genTxResponseDataBuffer = Buffer.from(genTxResponse.data, "base64");
    const unsignedTransaction = Uint8Array.from(genTxResponseDataBuffer);

    expect(unsignedTransaction).toBeTruthy();
    log.info("Received unsigned transcation");
    log.debug("unsignedTransaction:", unsignedTransaction);

    const signedTransaction = signIrohaV2Transaction(
      unsignedTransaction,
      bobName,
      bobDomain,
      {
        publicKey: bobCredentials.publicKeyMultihash,
        privateKey: bobCredentials.privateKey,
      },
    );
    expect(signedTransaction).toBeTruthy();
    log.info("Transaction signed with bob private key");
    log.debug("signedTransaction:", signedTransaction);

    const signedTxBuffer = Buffer.from(signedTransaction);
    const signedTxBase64 = signedTxBuffer.toString("base64");

    // 7. Send signed transfer transaction
    const transactionResponse = await env.apiClient.transactV1({
      signedTransaction: signedTxBase64,
      waitForCommit: true,
      baseConfig: bobConfig,
    });
    expect(transactionResponse).toBeTruthy();
    expect(transactionResponse.status).toEqual(200);
    expect(transactionResponse.data.rejectReason).toBeUndefined();
    expect(transactionResponse.data.status).toEqual(
      TransactionStatusV1.Committed,
    );

    // 8. Confirm final asset balance on both accounts
    const finalAliceBalanceQueryResponse = await env.apiClient.queryV1({
      query: {
        query: IrohaQuery.FindAssetById,
        params: [assetName, assetDomain, assetOwnerName, assetOwnerDomainName],
      },
      baseConfig: env.defaultBaseConfig,
    });
    expect(finalAliceBalanceQueryResponse).toBeTruthy();
    expect(finalAliceBalanceQueryResponse.data).toBeTruthy();
    const finalAliceBalance =
      finalAliceBalanceQueryResponse.data.response.value.value;
    log.info("Alice (target) balance after final transfer:", finalAliceBalance);
    expect(finalAliceBalance).toEqual(
      initAssetValue - transferValue + transferBackValue,
    );

    const finalBobBalanceQueryResponse = await env.apiClient.queryV1({
      query: {
        query: IrohaQuery.FindAssetById,
        params: [assetName, assetDomain, bobName, bobDomain],
      },
      baseConfig: env.defaultBaseConfig,
    });
    expect(finalBobBalanceQueryResponse).toBeTruthy();
    expect(finalBobBalanceQueryResponse.data).toBeTruthy();
    const finalBobBalance =
      finalBobBalanceQueryResponse.data.response.value.value;
    log.info("Bob (source) balance after final transfer:", finalBobBalance);
    expect(finalBobBalance).toEqual(transferValue - transferBackValue);
  });
});
