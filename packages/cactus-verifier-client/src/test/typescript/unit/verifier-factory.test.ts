// Base Class: packages/cactus-verifier-client/src/main/typescript/verifier-factory.ts

import "jest-extended";

import { Verifier } from "../../../main/typescript/verifier";
import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "../../../main/typescript/verifier-factory";
import { BesuApiClient } from "@hyperledger/cactus-plugin-ledger-connector-besu";

describe("Constructor Tests", () => {
  test("Basic construction", () => {
    const ledgerPluginInfo: VerifierFactoryConfig = [
      {
        validatorID: "besu_openapi_connector",
        validatorType: "BESU_2X",
        basePath: "127.0.0.1",
        ledgerInfo: {
          ledgerAbstract: "Besu-OpenAPI Ledger",
        },
        apiInfo: [],
      },
    ];

    const verifierFactory = new VerifierFactory(ledgerPluginInfo);
    expect(verifierFactory.className).toEqual("VerifierFactory");
    expect(verifierFactory["verifierMap"].size).toBe(0);
    expect(verifierFactory["verifierConfig"]).toEqual(ledgerPluginInfo);
  });

  test("Empty validatorID throws exception", () => {
    const ledgerPluginInfo: VerifierFactoryConfig = [
      {
        validatorID: "",
        validatorType: "BESU_2X",
        basePath: "127.0.0.1",
        username: "admin",
        password: "password",
        ledgerInfo: {
          ledgerAbstract: "Besu-OpenAPI Ledger",
        },
        apiInfo: [],
      },
    ];

    expect(() => new VerifierFactory(ledgerPluginInfo)).toThrow();
  });
});

describe("getVerifier Tests", () => {
  const ledgerPluginInfo: VerifierFactoryConfig = [
    {
      validatorID: "myBesuValidatorId",
      validatorType: "BESU_2X",
      basePath: "myBesuPath",
      username: "admin",
      password: "password",
      ledgerInfo: {
        ledgerAbstract: "Besu-OpenAPI Ledger",
      },
      apiInfo: [],
    },
  ];

  let sut: VerifierFactory;

  beforeEach(() => {
    sut = new VerifierFactory(ledgerPluginInfo);
  });

  test("Throws when requesting validator not defined in config", async () => {
    try {
      await sut.getVerifier("missingValidatorId");
      expect(1).toBe("getVerifier with invalid Id should throw an error!");
    } catch (error) {
      console.log("getVerifier with invalid Id throw error as expected.");
    }
  });

  test("Throws when requested client type differs from configured type", async () => {
    try {
      await sut.getVerifier("myBesuValidatorId", "CORDA_4X");
      expect(1).toBe(
        "getVerifier with invalid verifier type should throw an error!",
      );
    } catch (error) {
      console.log("getVerifier with invalid type throw error as expected.");
    }

    // even though the same clientApi is used for both BESU_1X and BESU_2X this should fail
    // client code should not depend on internal implementation detail.
    try {
      await sut.getVerifier("myBesuValidatorId", "BESU_1X");
      expect(1).toBe(
        "getVerifier with invalid verifier type should throw an error!",
      );
    } catch (error) {
      console.log("getVerifier with invalid type throw error as expected.");
    }
  });

  test("Creates a open-api based client", async () => {
    const validatorId = "myBesuValidatorId";

    const client = await sut.getVerifier(validatorId, "BESU_2X");

    expect(client.verifierID).toEqual(validatorId);
    expect(client.ledgerApi.className).toEqual("BesuApiClient");
    expect(client.ledgerApi.options.basePath).toEqual("myBesuPath");
  });

  test("Creates correct api client without explicit type specification", async () => {
    const validatorId = "myBesuValidatorId";

    const client = (await sut.getVerifier(
      validatorId,
    )) as Verifier<BesuApiClient>;

    expect(client.verifierID).toEqual(validatorId);
    expect(client.ledgerApi.className).toEqual("BesuApiClient");
  });

  test("Factory reuses already created verifiers", async () => {
    const validatorId = "myBesuValidatorId";

    const client = await sut.getVerifier(validatorId, "BESU_2X");
    expect(client.verifierID).toEqual(validatorId);
    expect(sut["verifierMap"].size).toBe(1);

    const anotherClient = await sut.getVerifier(validatorId, "BESU_2X");
    expect(anotherClient.verifierID).toEqual(validatorId);
    expect(sut["verifierMap"].size).toBe(1); // No new verifier added

    expect(client).toBe(anotherClient);
  });
});
