/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * get-validator-api-client.ts
 */

import {
  SocketIOApiClient,
  SocketIOApiClientOptions,
} from "@hyperledger/cactus-api-client";

import {
  BesuApiClient,
  BesuApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import {
  QuorumApiClient,
  QuorumApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";

import {
  CordaApiClient,
  CordaApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-corda";

/**
 * Configuration of ApiClients currently supported by Verifier and VerifierFactory
 * Each entry key defines the name of the connection type that has to be specified in VerifierFactory config.
 * Each entry value defines two values: in, for input options for ApiClient, and out, for type of ApiClient.
 * @warning Remember to keep this list updated to have new ApiClients visible in VerifierFactory interface.
 */
export type ClientApiConfig = {
  "legacy-socketio": {
    in: SocketIOApiClientOptions;
    out: SocketIOApiClient;
  };
  BESU_1X: {
    in: BesuApiClientOptions;
    out: BesuApiClient;
  };
  BESU_2X: {
    in: BesuApiClientOptions;
    out: BesuApiClient;
  };
  QUORUM_2X: {
    in: QuorumApiClientOptions;
    out: QuorumApiClient;
  };
  CORDA_4X: {
    in: CordaApiClientOptions;
    out: CordaApiClient;
  };
};

/**
 * Getter function for ApiClient based only on it's type/ledger name.
 *
 * @param validatorType: what kind of validator to create, must be defined in ClientApiConfig.
 * @param options: Configuration for given ApiClients, depends on validatorType supplied earlier
 * @returns Api coresponding to validatorType requested in arguments.
 *
 * @todo Use dynamic import to save space and not require all the ApiClient packages.
 */
export function getValidatorApiClient<K extends keyof ClientApiConfig>(
  validatorType: K,
  options: ClientApiConfig[K]["in"],
): ClientApiConfig[K]["out"] {
  switch (validatorType) {
    case "legacy-socketio":
      return new SocketIOApiClient(options as SocketIOApiClientOptions);
    case "BESU_1X":
    case "BESU_2X":
      return new BesuApiClient(options as BesuApiClientOptions);
    case "QUORUM_2X":
      return new QuorumApiClient(options as QuorumApiClientOptions);
    case "CORDA_4X":
      return new CordaApiClient(options as CordaApiClientOptions);
    default:
      // Will not compile if any ClientApiConfig key was not handled by this switch
      const _: never = validatorType;
      return _;
  }
}
