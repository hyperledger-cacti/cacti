/*
 * Copyright 2020-2023 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * get-validator-api-client.ts
 */

import type {
  BesuApiClient,
  BesuApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import type {
  EthereumApiClient,
  EthereumApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import type {
  CordaApiClient,
  CordaApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-corda";
import type {
  Iroha2ApiClient,
  Iroha2ApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-iroha2";
import type {
  FabricApiClient,
  FabricApiClientOptions,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import type {
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
  BESU_1X: {
    in: BesuApiClientOptions;
    out: BesuApiClient;
  };
  BESU_2X: {
    in: BesuApiClientOptions;
    out: BesuApiClient;
  };
  ETH_1X: {
    in: EthereumApiClientOptions;
    out: EthereumApiClient;
  };
  CORDA_4X: {
    in: CordaApiClientOptions;
    out: CordaApiClient;
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
 */
export async function getValidatorApiClient<K extends keyof ClientApiConfig>(
  validatorType: K,
  options: ClientApiConfig[K]["in"],
): Promise<ClientApiConfig[K]["out"]> {
  switch (validatorType) {
    case "BESU_1X":
    case "BESU_2X":
      // TODO - replace with dynamic imports once ESM is supported
      const besuPackage = require("@hyperledger/cactus-plugin-ledger-connector-besu");
      return new besuPackage.BesuApiClient(options as BesuApiClientOptions);
    case "ETH_1X":
      const ethereumPackage = require("@hyperledger/cactus-plugin-ledger-connector-ethereum");
      return new ethereumPackage.EthereumApiClient(
        options as EthereumApiClientOptions,
      );
    case "CORDA_4X":
      const cordaPackage = require("@hyperledger/cactus-plugin-ledger-connector-corda");
      return new cordaPackage.CordaApiClient(options as CordaApiClientOptions);
    case "IROHA_2X":
      const iroha2Package = require("@hyperledger/cactus-plugin-ledger-connector-iroha2");
      return new iroha2Package.Iroha2ApiClient(
        options as Iroha2ApiClientOptions,
      );
    case "FABRIC_2X":
      const fabricPackage = require("@hyperledger/cactus-plugin-ledger-connector-fabric");
      return new fabricPackage.FabricApiClient(
        options as FabricApiClientOptions,
      );
    case "SAWTOOTH_1X":
      const sawtoothPackage = require("@hyperledger/cactus-plugin-ledger-connector-sawtooth");
      return new sawtoothPackage.SawtoothApiClient(
        options as SawtoothApiClientOptions,
      );
    default:
      // Will not compile if any ClientApiConfig key was not handled by this switch
      const _: never = validatorType;
      return _;
  }
}
