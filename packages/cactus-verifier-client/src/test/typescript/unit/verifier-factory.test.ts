// Base Class: packages/cactus-verifier-client/src/main/typescript/verifier-factory.ts

import "jest-extended";

import { Verifier } from "../../../main/typescript/verifier";
import { SocketIOApiClient } from "@hyperledger/cactus-api-client";
import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "../../../main/typescript/verifier-factory";
import { BesuApiClient } from "@hyperledger/cactus-plugin-ledger-connector-besu";

describe("Constructor Tests", () => {
  test("Basic construction", () => {
    const ledgerPluginInfo: VerifierFactoryConfig = [
      {
        validatorID: "sUr7d10R",
        validatorType: "legacy-socketio",
        validatorURL: "https://sawtooth-validator:5140",
        validatorKeyPath: "./validatorKey/sUr7d10R/keysUr7d10R.crt",
        ledgerInfo: {
          ledgerAbstract: "Sawtooth Ledger",
        },
        apiInfo: [],
      },
      {
        validatorID: "besu_openapi_connector",
        validatorType: "BESU_2X",
        basePath: "localhost",
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
        validatorID: "sUr7d10R",
        validatorType: "legacy-socketio",
        validatorURL: "https://sawtooth-validator:5140",
        validatorKeyPath: "./validatorKey/sUr7d10R/keysUr7d10R.crt",
        ledgerInfo: {
          ledgerAbstract: "Sawtooth Ledger",
        },
        apiInfo: [],
      },
      {
        validatorID: "",
        validatorType: "BESU_2X",
        basePath: "localhost",
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
      validatorID: "mySocketSawtoothValidatorId",
      validatorType: "legacy-socketio",
      validatorURL: "https://sawtooth-validator:5140",
      validatorKeyPath: "./validatorKey/sUr7d10R/keysUr7d10R.crt",
      ledgerInfo: {
        ledgerAbstract: "Sawtooth Ledger",
      },
      apiInfo: [],
    },
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

  test("Throws when requesting validator not defined in config", () => {
    expect(() => sut.getVerifier("missingValidatorId")).toThrow();
  });

  test("Throws when requested client type differs from configured type", () => {
    expect(() =>
      sut.getVerifier("myBesuValidatorId", "legacy-socketio"),
    ).toThrow();

    // even though the same clientApi is used for both BESU_1X and BESU_2X this should fail
    // client code should not depend on internal implementation detail.
    expect(() => sut.getVerifier("myBesuValidatorId", "BESU_1X")).toThrow();
  });

  test("Creates a legacy socketio client", () => {
    const validatorId = "mySocketSawtoothValidatorId";

    const client: Verifier<SocketIOApiClient> = sut.getVerifier(
      validatorId,
      "legacy-socketio",
    );

    expect(client.verifierID).toEqual(validatorId);
    expect(client.ledgerApi.className).toEqual("SocketIOApiClient");
    expect(client.ledgerApi.options.validatorID).toEqual(validatorId);

    client.ledgerApi.close();
  });

  test("Creates a open-api based client", () => {
    const validatorId = "myBesuValidatorId";

    const client: Verifier<BesuApiClient> = sut.getVerifier(
      validatorId,
      "BESU_2X",
    );

    expect(client.verifierID).toEqual(validatorId);
    expect(client.ledgerApi.className).toEqual("BesuApiClient");
    expect(client.ledgerApi.options.basePath).toEqual("myBesuPath");
  });

  test("Creates correct api client without explicit type specification", () => {
    const validatorId = "mySocketSawtoothValidatorId";

    const client: Verifier<SocketIOApiClient> = sut.getVerifier(
      validatorId,
    ) as Verifier<SocketIOApiClient>;

    expect(client.verifierID).toEqual(validatorId);
    expect(client.ledgerApi.className).toEqual("SocketIOApiClient");
    expect(client.ledgerApi.options.validatorID).toEqual(validatorId);

    client.ledgerApi.close();
  });

  test("Factory reuses already created verifiers", () => {
    const validatorId = "mySocketSawtoothValidatorId";

    const client: Verifier<SocketIOApiClient> = sut.getVerifier(
      validatorId,
      "legacy-socketio",
    );
    expect(client.verifierID).toEqual(validatorId);
    expect(sut["verifierMap"].size).toBe(1);

    const anotherClient: Verifier<SocketIOApiClient> = sut.getVerifier(
      validatorId,
      "legacy-socketio",
    );
    expect(anotherClient.verifierID).toEqual(validatorId);
    expect(sut["verifierMap"].size).toBe(1); // No new verifier added

    expect(client).toBe(anotherClient);

    client.ledgerApi.close();
  });
});
