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
  EthereumApiClient,
  EthereumApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";

import {
  CordaApiClient,
  CordaApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-corda";

import {
  IrohaApiClient,
  IrohaApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-iroha";

import {
  Iroha2ApiClient,
  Iroha2ApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-iroha2";

import {
  FabricApiClient,
  FabricApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import {
  SawtoothApiClient,
  SawtoothApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-sawtooth";

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
  ETH_1X: {
    in: EthereumApiClientOptions;
    out: EthereumApiClient;
  };
  CORDA_4X: {
    in: CordaApiClientOptions;
    out: CordaApiClient;
  };
  IROHA_1X: {
    in: IrohaApiClientOptions;
    out: IrohaApiClient;
  };
  IROHA_2X: {
    in: Iroha2ApiClientOptions;
    out: Iroha2ApiClient;
  };
  FABRIC_2X: {
    in: FabricApiClientOptions;
    out: FabricApiClient;
  };
  SAWTOOTH_1X: {
    in: SawtoothApiClientOptions;
    out: SawtoothApiClient;
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
    case "ETH_1X":
      return new EthereumApiClient(options as EthereumApiClientOptions);
    case "CORDA_4X":
      return new CordaApiClient(options as CordaApiClientOptions);
    case "IROHA_1X":
      return new IrohaApiClient(options as IrohaApiClientOptions);
    case "IROHA_2X":
      return new Iroha2ApiClient(options as CordaApiClientOptions);
    case "FABRIC_2X":
      return new FabricApiClient(options as FabricApiClientOptions);
    case "SAWTOOTH_1X":
      return new SawtoothApiClient(options as SawtoothApiClientOptions);
    default:
      // Will not compile if any ClientApiConfig key was not handled by this switch
      const _: never = validatorType;
      return _;
  }
}
