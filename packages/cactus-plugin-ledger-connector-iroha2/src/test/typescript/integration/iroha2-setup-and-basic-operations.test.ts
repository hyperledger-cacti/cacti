/**
 * Tests for Iroha V2 connector setup and basic operation tests for endpoints.
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

import { v4 as uuidv4 } from "uuid";
import "jest-extended";

import {
  Iroha2BaseConfig,
  IrohaInstruction,
  IrohaQuery,
  PluginLedgerConnectorIroha2,
  TransactionStatusV1,
} from "../../../main/typescript/public-api";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { crypto } from "@iroha2/crypto-target-node";
import { setCrypto } from "@iroha2/client";

import {
  IrohaV2TestEnv,
  generateTestIrohaCredentials,
} from "../test-helpers/iroha2-env-setup";
import { addRandomSuffix } from "../test-helpers/utils";

setCrypto(crypto);

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "setup-and-basic-operations.test",
  level: testLogLevel,
});

/**
 * Test suite for helper functions used by the test suites
 */
describe("Helper functions test", () => {
  test("Adding random suffix to test strings works (addRandomSuffix)", async () => {
    const a = addRandomSuffix("foo");
    expect(a).toBeTruthy();
    const b = addRandomSuffix("foo");
    expect(b).toBeTruthy();
    expect(a).not.toEqual(b);
  });

  test("Test key generation works (generateTestIrohaCredentials)", async () => {
    const credentials = generateTestIrohaCredentials();
    expect(credentials).toBeTruthy();
    expect(credentials.publicKey).toBeTruthy();
    expect(credentials.publicKeyMultihash).toBeTruthy();
    expect(credentials.privateKey.payload).toBeTruthy();
    expect(credentials.privateKey.digestFunction).toBeTruthy();
  });
});

/**
 * Main test suite
 */
describe("Setup and basic endpoint tests", () => {
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

  test("Connector and request config merge works", async () => {
    const defaultConfig = {
      ...env.defaultBaseConfig,
      signingCredential: env.keyPairCredential,
    };
    const defaultConfigConnector = new PluginLedgerConnectorIroha2({
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      defaultConfig,
    });

    // Default config
    const allDefault = (await defaultConfigConnector.createClient())
      .toriiOptions;
    expect(allDefault).toEqual(defaultConfig.torii);

    // Overwrite by request
    const requestConfig: Iroha2BaseConfig = {
      torii: {
        apiURL: "http://example.com",
        telemetryURL: "http://telemetry.com",
      },
    };
    const overwrittenConfig = (
      await defaultConfigConnector.createClient(requestConfig)
    ).toriiOptions;
    expect(overwrittenConfig).toEqual(requestConfig.torii);
  });

  test("Waiting for transaction commit returns it's status", async () => {
    const domainName = addRandomSuffix("waitForTx");

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
    expect(transactionResponse.data).toBeTruthy();
    expect(transactionResponse.data.rejectReason).toBeUndefined();
    expect(transactionResponse.data.status).toEqual(
      TransactionStatusV1.Committed,
    );
    expect(transactionResponse.data.hash).toBeTruthy();
    expect(transactionResponse.data.hash.length).toEqual(64);

    // Query it
    // Transaction should be committed so no waiting is needed.
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
  });

  test("Rejected transaction returns a reason", async () => {
    const domainName = addRandomSuffix("waitForRejectTx");

    // Create new domain - first one is committed
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
    expect(transactionResponse.data).toBeTruthy();
    expect(transactionResponse.data.rejectReason).toBeUndefined();
    expect(transactionResponse.data.status).toEqual(
      TransactionStatusV1.Committed,
    );

    // Create existing domain again - should be rejected
    const rejectResponse = await env.apiClient.transactV1({
      transaction: {
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
      },
      waitForCommit: true,
      baseConfig: env.defaultBaseConfig,
    });
    expect(rejectResponse).toBeTruthy();
    expect(rejectResponse.status).toEqual(200);
    expect(rejectResponse.data).toBeTruthy();
    expect(rejectResponse.data.status).toEqual(TransactionStatusV1.Rejected);
    expect(rejectResponse.data.rejectReason).toBeTruthy();
    log.debug(
      "OK - transaction rejected with reason:",
      rejectResponse.data.rejectReason,
    );
  });

  test("Sending transaction with keychain signatory works", async () => {
    const domainName = addRandomSuffix("keychainSignatoryDomain");

    // Create new domain
    const transactionResponse = await env.apiClient.transactV1({
      transaction: {
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
      },
      waitForCommit: true,
      baseConfig: {
        ...env.defaultBaseConfig,
        signingCredential: env.keychainCredentials,
      },
    });
    expect(transactionResponse).toBeTruthy();
    expect(transactionResponse.status).toEqual(200);
    expect(transactionResponse.data.rejectReason).toBeUndefined();
    expect(transactionResponse.data.status).toEqual(
      TransactionStatusV1.Committed,
    );
    expect(transactionResponse.data.hash).toBeTruthy();

    // Query it
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
  });

  test("Sending transaction with keypair signatory works", async () => {
    const domainName = addRandomSuffix("keypairSignatoryDomain");

    // Create new domain
    const transactionResponse = await env.apiClient.transactV1({
      transaction: {
        instruction: {
          name: IrohaInstruction.RegisterDomain,
          params: [domainName],
        },
      },
      waitForCommit: true,
      baseConfig: {
        ...env.defaultBaseConfig,
        signingCredential: env.keyPairCredential,
      },
    });
    expect(transactionResponse).toBeTruthy();
    expect(transactionResponse.status).toEqual(200);
    expect(transactionResponse.data.rejectReason).toBeUndefined();
    expect(transactionResponse.data.status).toEqual(
      TransactionStatusV1.Committed,
    );
    expect(transactionResponse.data.hash).toBeTruthy();

    // Query it
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
  });

  test("Multiple instructions in single transaction works", async () => {
    // Create two new domains
    const firstDomainName = addRandomSuffix("multiTxFirstDomain");
    const secondDomainName = addRandomSuffix("multiTxSecondDomain");
    const transactionResponse = await env.apiClient.transactV1({
      transaction: {
        instruction: [
          {
            name: IrohaInstruction.RegisterDomain,
            params: [firstDomainName],
          },
          {
            name: IrohaInstruction.RegisterDomain,
            params: [secondDomainName],
          },
        ],
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
    expect(transactionResponse.data.hash).toBeTruthy();

    // Query domains
    const queryResponse = await env.apiClient.queryV1({
      query: {
        query: IrohaQuery.FindAllDomains,
      },
      baseConfig: env.defaultBaseConfig,
    });
    expect(queryResponse).toBeTruthy();
    expect(queryResponse.data).toBeTruthy();
    expect(queryResponse.data.response).toBeTruthy();
    expect(JSON.stringify(queryResponse.data.response)).toContain(
      firstDomainName,
    );
    expect(JSON.stringify(queryResponse.data.response)).toContain(
      secondDomainName,
    );
  });

  test("Unknown transaction instruction name reports error", () => {
    // Send invalid command
    return expect(
      env.apiClient.transactV1({
        transaction: {
          instruction: {
            name: "foo" as IrohaInstruction,
            params: [],
          },
        },
        baseConfig: env.defaultBaseConfig,
      }),
    ).toReject();
  });

  test("Sending transaction with incomplete config reports error", async () => {
    const domainName = "wrongConfigDomain";

    // Use config without account and keypair (only torii)
    await expect(
      env.apiClient?.transactV1({
        transaction: {
          instruction: {
            name: IrohaInstruction.RegisterDomain,
            params: [domainName],
          },
        },
        baseConfig: {
          torii: env.defaultBaseConfig.torii,
        },
      }),
    ).toReject();

    // Use config without keypair
    await expect(
      env.apiClient.transactV1({
        transaction: {
          instruction: {
            name: IrohaInstruction.RegisterDomain,
            params: [domainName],
          },
        },
        baseConfig: {
          torii: env.defaultBaseConfig.torii,
          accountId: env.defaultBaseConfig.accountId,
        },
      }),
    ).toReject();

    // Assert it was not created
    await expect(
      env.apiClient.queryV1({
        query: {
          query: IrohaQuery.FindDomainById,
          params: [domainName],
        },
        baseConfig: env.defaultBaseConfig,
      }),
    ).toReject();
  });

  test("Unknown query name reports error", () => {
    // Send invalid query
    return expect(
      env.apiClient.queryV1({
        query: {
          query: "foo" as IrohaQuery,
        },
        baseConfig: env.defaultBaseConfig,
      }),
    ).toReject();
  });
});
