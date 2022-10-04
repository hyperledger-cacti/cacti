/**
 * Tests for executing Iroha instructions and queries through the cactus connector.
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
  Iroha2KeyPair,
} from "../../../main/typescript/public-api";
import {
  IrohaV2TestEnv,
  generateTestIrohaCredentials,
  waitForCommit,
} from "../test-helpers/iroha2-env-setup";
import { addRandomSuffix } from "../test-helpers/utils";

import { bytesToHex } from "hada";
import "jest-extended";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "iroha-instructions-and-queries.test",
  level: testLogLevel,
});

/**
 * Main test suite
 */
describe("Instructions and Queries test", () => {
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

  describe("Domain tests", () => {
    let domainName: string;

    // Create domain common test
    beforeAll(async () => {
      // Generate random domain and assets name
      domainName = addRandomSuffix("funcTestDomain");
      expect(domainName).toBeTruthy();

      // Create new domain
      const transactionResponse = await env.apiClient.transactV1({
        transaction: {
          instruction: {
            name: IrohaInstruction.RegisterDomain,
            params: [domainName],
          },
        },
        baseConfig: env.defaultBaseConfig,
      });
      expect(transactionResponse).toBeTruthy();
      expect(transactionResponse.status).toEqual(200);
      expect(transactionResponse.data.status).toBeTruthy();
      expect(transactionResponse.data.status).toEqual("OK");

      // Sleep
      await waitForCommit();
    });

    test("Query single domain (FindDomainById)", async () => {
      const queryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindDomainById,
        baseConfig: env.defaultBaseConfig,
        params: [domainName],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(queryResponse.data.response.id).toBeTruthy();
      expect(queryResponse.data.response.id.name).toEqual(domainName);
    });

    test("Query all domains (FindAllDomains)", async () => {
      const queryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAllDomains,
        baseConfig: env.defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(JSON.stringify(queryResponse.data.response)).toContain(domainName);
    });
  });

  describe("Account tests", () => {
    let newAccountName: string;
    let newAccountDomainName: string;
    let newAccountCredentials: Iroha2KeyPair;

    // Register new account (RegisterAccount)
    beforeAll(async () => {
      newAccountName = addRandomSuffix("fooAcc");
      expect(newAccountName).toBeTruthy();
      newAccountDomainName = addRandomSuffix("newAccDomain");
      expect(newAccountDomainName).toBeTruthy();

      // Create new domain for our new account
      const registerDomainResponse = await env.apiClient.transactV1({
        transaction: {
          instruction: {
            name: IrohaInstruction.RegisterDomain,
            params: [newAccountDomainName],
          },
        },
        baseConfig: env.defaultBaseConfig,
      });
      expect(registerDomainResponse).toBeTruthy();
      expect(registerDomainResponse.status).toEqual(200);
      expect(registerDomainResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Generate new account credentials
      newAccountCredentials = generateTestIrohaCredentials();

      // Register new account
      const registerAccountResponse = await env.apiClient.transactV1({
        transaction: {
          instruction: {
            name: IrohaInstruction.RegisterAccount,
            params: [
              newAccountName,
              newAccountDomainName,
              newAccountCredentials.publicKey,
              newAccountCredentials.privateKey.digestFunction,
            ],
          },
        },
        baseConfig: env.defaultBaseConfig,
      });
      expect(registerAccountResponse).toBeTruthy();
      expect(registerAccountResponse.status).toEqual(200);
      expect(registerAccountResponse.data.status).toEqual("OK");
      await waitForCommit();
    });

    test("Query single account (FindAccountById)", async () => {
      const queryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAccountById,
        baseConfig: env.defaultBaseConfig,
        params: [newAccountName, newAccountDomainName],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      const responseData = queryResponse.data.response;
      expect(responseData).toBeTruthy();
      expect(responseData.id.name).toEqual(newAccountName);
      expect(responseData.id.domain_id.name).toEqual(newAccountDomainName);
      expect(responseData.signatories.length).toBeGreaterThan(0);
      const receivedPubKey = responseData.signatories.pop().payload;
      expect(bytesToHex(Object.values(receivedPubKey))).toEqual(
        newAccountCredentials.publicKey,
      );
    });

    test("Query all accounts (FindAllAccounts)", async () => {
      const queryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAllAccounts,
        baseConfig: env.defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(JSON.stringify(queryResponse.data.response)).toContain(
        newAccountName,
      );
    });
  });

  describe("Asset tests", () => {
    let assetName: string;
    let domainName: string;
    const valueType = "Quantity";
    const value = 42;
    const mintable = "Infinitely";

    // Create asset definition and asset itself common test
    beforeAll(async () => {
      // Generate random domain and assets name
      assetName = addRandomSuffix("testAsset");
      expect(assetName).toBeTruthy();
      domainName = addRandomSuffix("testAssetDomain");
      expect(domainName).toBeTruthy();

      // Create new domain for our new asset
      const registerDomainResponse = await env.apiClient.transactV1({
        transaction: {
          instruction: {
            name: IrohaInstruction.RegisterDomain,
            params: [domainName],
          },
        },
        baseConfig: env.defaultBaseConfig,
      });
      expect(registerDomainResponse).toBeTruthy();
      expect(registerDomainResponse.status).toEqual(200);
      expect(registerDomainResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Create new asset definition
      const registerAssetDefResponse = await env.apiClient.transactV1({
        transaction: {
          instruction: {
            name: IrohaInstruction.RegisterAssetDefinition,
            params: [assetName, domainName, valueType, mintable],
          },
        },
        baseConfig: env.defaultBaseConfig,
      });
      expect(registerAssetDefResponse).toBeTruthy();
      expect(registerAssetDefResponse.status).toEqual(200);
      expect(registerAssetDefResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Create new asset
      const registerAssetResponse = await env.apiClient.transactV1({
        transaction: {
          instruction: {
            name: IrohaInstruction.RegisterAsset,
            params: [
              assetName,
              domainName,
              env.defaultBaseConfig.accountId?.name,
              env.defaultBaseConfig.accountId?.domainId,
              value,
            ],
          },
        },
        baseConfig: env.defaultBaseConfig,
      });
      expect(registerAssetResponse).toBeTruthy();
      expect(registerAssetResponse.status).toEqual(200);
      expect(registerAssetResponse.data.status).toEqual("OK");
      await waitForCommit();
    });

    test("Query single asset definition (FindAssetDefinitionById)", async () => {
      const queryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAssetDefinitionById,
        baseConfig: env.defaultBaseConfig,
        params: [assetName, domainName],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      const responseData = queryResponse.data.response;
      expect(responseData).toBeTruthy();
      expect(responseData.id.name).toEqual(assetName);
      expect(responseData.id.domain_id.name).toEqual(domainName);
      expect(responseData.value_type.tag).toEqual(valueType);
      expect(responseData.mintable.tag).toEqual(mintable);
    });

    test("Query all asset definitions (FindAllAssetsDefinitions)", async () => {
      const queryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAllAssetsDefinitions,
        baseConfig: env.defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(JSON.stringify(queryResponse.data.response)).toContain(domainName);
    });

    test("Query single asset (FindAssetById)", async () => {
      const queryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: env.defaultBaseConfig,
        params: [
          assetName,
          domainName,
          env.defaultBaseConfig.accountId?.name,
          env.defaultBaseConfig.accountId?.domainId,
        ],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      const responseData = queryResponse.data.response;
      expect(responseData).toBeTruthy();
      expect(responseData.id.definition_id.name).toEqual(assetName);
      expect(responseData.id.definition_id.domain_id.name).toEqual(domainName);
      expect(responseData.id.account_id.name).toEqual(
        env.defaultBaseConfig.accountId?.name,
      );
      expect(responseData.id.account_id.domain_id.name).toEqual(
        env.defaultBaseConfig.accountId?.domainId,
      );
      expect(responseData.value.tag).toEqual(valueType);
    });

    test("Query all assets (FindAllAssets)", async () => {
      const queryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAllAssets,
        baseConfig: env.defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(JSON.stringify(queryResponse.data.response)).toContain(assetName);
    });

    test("Mint asset integer value (MintAsset)", async () => {
      const mintValue = 100;

      // Get initial asset value
      const initQueryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: env.defaultBaseConfig,
        params: [
          assetName,
          domainName,
          env.defaultBaseConfig.accountId?.name,
          env.defaultBaseConfig.accountId?.domainId,
        ],
      });
      expect(initQueryResponse).toBeTruthy();
      expect(initQueryResponse.data).toBeTruthy();
      const initValue = initQueryResponse.data.response.value.value;
      log.info("Initial asset value (before mint):", initValue);

      // Mint additional asset value
      const mintResponse = await env.apiClient.transactV1({
        transaction: {
          instruction: {
            name: IrohaInstruction.MintAsset,
            params: [
              assetName,
              domainName,
              env.defaultBaseConfig.accountId?.name,
              env.defaultBaseConfig.accountId?.domainId,
              mintValue,
            ],
          },
        },
        baseConfig: env.defaultBaseConfig,
      });
      expect(mintResponse).toBeTruthy();
      expect(mintResponse.status).toEqual(200);
      expect(mintResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Get final asset value (after mint)
      const finalQueryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: env.defaultBaseConfig,
        params: [
          assetName,
          domainName,
          env.defaultBaseConfig.accountId?.name,
          env.defaultBaseConfig.accountId?.domainId,
        ],
      });
      expect(finalQueryResponse).toBeTruthy();
      expect(finalQueryResponse.data).toBeTruthy();
      const finalValue = finalQueryResponse.data.response.value.value;
      log.info("Final asset value (after mint):", finalValue);

      expect(finalValue).toEqual(initValue + mintValue);
    });

    test("Burn asset integer value (BurnAsset)", async () => {
      const burnValue = 5;

      // Get initial asset value
      const initQueryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: env.defaultBaseConfig,
        params: [
          assetName,
          domainName,
          env.defaultBaseConfig.accountId?.name,
          env.defaultBaseConfig.accountId?.domainId,
        ],
      });
      expect(initQueryResponse).toBeTruthy();
      expect(initQueryResponse.data).toBeTruthy();
      const initValue = initQueryResponse.data.response.value.value;
      log.info("Initial asset value (before burn):", initValue);
      expect(burnValue).toBeLessThan(initValue);

      // Burn asset value
      const burnResponse = await env.apiClient.transactV1({
        transaction: {
          instruction: {
            name: IrohaInstruction.BurnAsset,
            params: [
              assetName,
              domainName,
              env.defaultBaseConfig.accountId?.name,
              env.defaultBaseConfig.accountId?.domainId,
              burnValue,
            ],
          },
        },
        baseConfig: env.defaultBaseConfig,
      });
      expect(burnResponse).toBeTruthy();
      expect(burnResponse.status).toEqual(200);
      expect(burnResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Get final asset value (after burn)
      const finalQueryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: env.defaultBaseConfig,
        params: [
          assetName,
          domainName,
          env.defaultBaseConfig.accountId?.name,
          env.defaultBaseConfig.accountId?.domainId,
        ],
      });
      expect(finalQueryResponse).toBeTruthy();
      expect(finalQueryResponse.data).toBeTruthy();
      const finalValue = finalQueryResponse.data.response.value.value;
      log.info("Final asset value (after burn):", finalValue);

      expect(finalValue).toEqual(initValue - burnValue);
    });

    test("Transfer asset between accounts (TransferAsset)", async () => {
      const transferValue = 3;
      const sourceAccountName = env.defaultBaseConfig.accountId?.name;
      const sourceAccountDomain = env.defaultBaseConfig.accountId?.domainId;
      const targetAccountName = addRandomSuffix("transferTargetAcc");
      const targetAccountDomain = sourceAccountDomain;

      // Get initial asset value
      const initQueryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: env.defaultBaseConfig,
        params: [assetName, domainName, sourceAccountName, sourceAccountDomain],
      });
      expect(initQueryResponse).toBeTruthy();
      expect(initQueryResponse.data).toBeTruthy();
      const initValue = initQueryResponse.data.response.value.value;
      log.info("Initial asset value (before transfer):", initValue);
      expect(transferValue).toBeLessThan(initValue);

      // Register new account to receive the assets
      const accountCredentials = generateTestIrohaCredentials();
      const registerAccountResponse = await env.apiClient.transactV1({
        transaction: {
          instruction: {
            name: IrohaInstruction.RegisterAccount,
            params: [
              targetAccountName,
              targetAccountDomain,
              accountCredentials.publicKey,
              accountCredentials.privateKey.digestFunction,
            ],
          },
        },
        baseConfig: env.defaultBaseConfig,
      });
      expect(registerAccountResponse).toBeTruthy();
      expect(registerAccountResponse.status).toEqual(200);
      expect(registerAccountResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Transfer asset to the newly created account
      const transferResponse = await env.apiClient.transactV1({
        transaction: {
          instruction: {
            name: IrohaInstruction.TransferAsset,
            params: [
              assetName,
              domainName,
              sourceAccountName,
              sourceAccountDomain,
              targetAccountName,
              targetAccountDomain,
              transferValue,
            ],
          },
        },
        baseConfig: env.defaultBaseConfig,
      });
      expect(transferResponse).toBeTruthy();
      expect(transferResponse.status).toEqual(200);
      expect(transferResponse.data.status).toEqual("OK");
      await waitForCommit();

      // Get final asset value on source account (after transfer)
      const finalSourceQueryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: env.defaultBaseConfig,
        params: [assetName, domainName, sourceAccountName, sourceAccountDomain],
      });
      expect(finalSourceQueryResponse).toBeTruthy();
      expect(finalSourceQueryResponse.data).toBeTruthy();
      const finalSrcValue = finalSourceQueryResponse.data.response.value.value;
      log.info(
        "Final asset value on source account (after transfer):",
        finalSrcValue,
      );
      expect(finalSrcValue).toEqual(initValue - transferValue);

      // Get final asset value on target account (after transfer)
      const finalTargetQueryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAssetById,
        baseConfig: env.defaultBaseConfig,
        params: [assetName, domainName, targetAccountName, targetAccountDomain],
      });
      expect(finalTargetQueryResponse).toBeTruthy();
      expect(finalTargetQueryResponse.data).toBeTruthy();
      const finalTargetValue =
        finalTargetQueryResponse.data.response.value.value;
      log.info(
        "Final asset value on target account (after transfer):",
        finalTargetValue,
      );
      expect(finalTargetValue).toEqual(transferValue);
    });
  });

  describe("Transaction queries tests", () => {
    test("Query all transactions (FindAllTransactions)", async () => {
      const queryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAllTransactions,
        baseConfig: env.defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response.length).toBeGreaterThan(0);
      const singleTx = queryResponse.data.response.pop().value.value;
      expect(singleTx.signatures).toBeTruthy();
      expect(singleTx.payload).toBeTruthy();
      expect(singleTx.payload.account_id).toBeTruthy();
      expect(singleTx.payload.instructions).toBeTruthy();
    });

    /**
     * @todo Find a way to calculate / retrieve hash of some transaction.
     *       Right now it's hardcoded for manual testing.
     */
    test.skip("Query single transaction (FindAssetById)", async () => {
      const hash =
        "f1076e718309d9b54a9fc74f110b0d16111f7d1c4f9c470f18c56b9309ad873d";

      const queryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindTransactionByHash,
        baseConfig: env.defaultBaseConfig,
        params: [hash],
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      const responseData = queryResponse.data.response.value.value;
      expect(responseData).toBeTruthy();
      expect(responseData.signatures).toBeTruthy();
      expect(responseData.payload).toBeTruthy();
      expect(responseData.payload.account_id).toBeTruthy();
      expect(responseData.payload.instructions).toBeTruthy();
    });
  });

  describe("Miscellaneous tests", () => {
    test("Query all peers (FindAllPeers)", async () => {
      const queryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAllPeers,
        baseConfig: env.defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(queryResponse.data.response.length).toBeGreaterThan(0);
      const singlePeer = queryResponse.data.response.pop();
      expect(singlePeer.id).toBeTruthy();
      expect(singlePeer.id.address).toBeTruthy();
      expect(singlePeer.id.public_key).toBeTruthy();
    });

    test("Query all blocks (FindAllBlocks)", async () => {
      const queryResponse = await env.apiClient.queryV1({
        queryName: IrohaQuery.FindAllBlocks,
        baseConfig: env.defaultBaseConfig,
      });
      expect(queryResponse).toBeTruthy();
      expect(queryResponse.data).toBeTruthy();
      expect(queryResponse.data.response).toBeTruthy();
      expect(queryResponse.data.response.length).toBeGreaterThan(0);
      const singleBlock = queryResponse.data.response.pop();
      expect(singleBlock.header).toBeTruthy();
      expect(singleBlock.transactions).toBeDefined();
      expect(singleBlock.rejected_transactions).toBeDefined();
      expect(singleBlock.event_recommendations).toBeDefined();
    });
  });
});
