// Base Class: packages/cactus-verifier-client/src/main/typescript/get-validator-api-client.ts

import "jest-extended";

import { getValidatorApiClient } from "../../../main/typescript/get-validator-api-client";

import { BesuApiClientOptions } from "@hyperledger/cactus-plugin-ledger-connector-besu";

test("Create besu client", async () => {
  const clientOptions = new BesuApiClientOptions({ basePath: "foo" });

  // BESU 1
  const clientApi1 = await getValidatorApiClient("BESU_1X", clientOptions);
  expect(clientApi1.className).toEqual("BesuApiClient");
  expect(clientApi1.options).toEqual(clientOptions);

  // BESU 2
  const clientApi2 = await getValidatorApiClient("BESU_2X", clientOptions);
  expect(clientApi2.className).toEqual("BesuApiClient");
  expect(clientApi2.options).toEqual(clientOptions);
});
