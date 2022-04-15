// Base Class: packages/cactus-verifier-client/src/main/typescript/get-validator-api-client.ts

import "jest-extended";

import { getValidatorApiClient } from "../../../main/typescript/get-validator-api-client";

import {
  SocketIOApiClient,
  SocketIOApiClientOptions,
} from "@hyperledger/cactus-api-client";

import {
  BesuApiClient,
  BesuApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

test("Create legacy socketio client", () => {
  const clientOptions: SocketIOApiClientOptions = {
    validatorID: "someValId",
    validatorURL: "invalid-url123asd",
    validatorKeyValue: "xxxxxxxxxxxxx",
  };

  const clientApi: SocketIOApiClient = getValidatorApiClient(
    "legacy-socketio",
    clientOptions,
  );

  expect(clientApi.className).toEqual("SocketIOApiClient");
  expect(clientApi.options).toEqual(clientOptions);

  // Close socket manually to prevent a warning
  clientApi.close();
});

test("Create besu client", () => {
  const clientOptions = new BesuApiClientOptions({ basePath: "foo" });

  // BESU 1
  const clientApi1: BesuApiClient = getValidatorApiClient(
    "BESU_1X",
    clientOptions,
  );

  expect(clientApi1.className).toEqual("BesuApiClient");
  expect(clientApi1.options).toEqual(clientOptions);

  // BESU 2
  const clientApi2: BesuApiClient = getValidatorApiClient(
    "BESU_2X",
    clientOptions,
  );

  expect(clientApi2.className).toEqual("BesuApiClient");
  expect(clientApi2.options).toEqual(clientOptions);
});
