/**
 * Tests for sending transactions without sharing private key with the connector.
 * Transactions are signed on the client side.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Log settings
const testLogLevel: LogLevelDesc = "info";

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
  IrohaV2TestEnv,
  waitForCommit,
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
    const unsignedTransaction = Uint8Array.from(
      Object.values(genTxResponse.data),
    );
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

    // 3. Send
    const transactionResponse = await env.apiClient.transactV1({
      signedTransaction,
      baseConfig: env.defaultBaseConfig,
    });
    expect(transactionResponse).toBeTruthy();
    expect(transactionResponse.status).toEqual(200);
    expect(transactionResponse.data.rejectReason).toBeUndefined();
    expect(transactionResponse.data.status).toEqual(
      TransactionStatusV1.Submitted,
    );

    // Sleep
    await waitForCommit();

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
    const unsignedTransaction = Uint8Array.from(
      Object.values(genTxResponse.data),
    );
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
    const unsignedQueryReq = Uint8Array.from(
      Object.values(genQueryResponse.data),
    );
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

    // 3. Send
    const queryResponse = await env.apiClient.queryV1({
      signedQuery: {
        query: IrohaQuery.FindDomainById,
        payload: signedQueryReq,
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
});
