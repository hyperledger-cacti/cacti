/*
 * Copyright 2020-2023 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * verifier-factory.ts
 */

import { Verifier } from "./verifier";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { ISocketApiClient } from "@hyperledger/cactus-core-api";

import {
  ClientApiConfig,
  getValidatorApiClient,
} from "./get-validator-api-client";

//////////////////////////////////
// Type Declarations
//////////////////////////////////

type RequestedData = {
  dataName: string;
  dataType: string;
};

type ApiInfo = {
  apiType: string;
  requestedData: Array<RequestedData>;
};

/**
 * Validator config entry fields that are mandatory for all ledgers.
 */
type BaseValidatorFields = {
  validatorID: string;
  validatorType: keyof ClientApiConfig;
  ledgerInfo?: {
    ledgerAbstract: string;
  };
  apiInfo?: Array<ApiInfo>;
};

/**
 * Validator config entry fields specific to any supported ledger.
 */
type LedgerSpecificValidatorFields = Record<PropertyKey, unknown>;

/**
 * Validator config entry.
 */
export type ValidatorConfigEntry = BaseValidatorFields &
  LedgerSpecificValidatorFields;

/**
 * VerifierFactory config is a list of validator configs that constitute a cactus network.
 */
export type VerifierFactoryConfig = ValidatorConfigEntry[];

//////////////////////////////////
// VerifierFactory class
//////////////////////////////////

/**
 * VerifierFactory creates Verifier instances based only on validator id and it's ledger type.
 * Returned Verifiers are stored internally and reused for any future requests.
 */
export class VerifierFactory {
  private verifierMap = new Map<string, Verifier<ISocketApiClient<unknown>>>();
  private readonly log: Logger;

  readonly className: string;

  /**
   * @param verifierConfig: Configuration of validators
   * @param loglevel: Debug logging level
   */
  constructor(
    private readonly verifierConfig: VerifierFactoryConfig,
    private readonly loglevel: LogLevelDesc = "info",
  ) {
    this.className = this.constructor.name;

    verifierConfig.forEach((v) =>
      Checks.nonBlankString(v.validatorID, `${v.validatorID} validator config`),
    );
    verifierConfig.forEach((v) =>
      Checks.nonBlankString(
        v.validatorType,
        `${v.validatorType} validator config`,
      ),
    );

    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level: this.loglevel, label });
    this.log.debug(`${this.className} created with config:`, verifierConfig);
  }

  /**
   * Get single validator from internal VerifierFactory config.
   *
   * @param validatorId: Id of verifier to create.
   * @returns Single validator config entry.
   */
  private getValidatorConfigEntryOrThrow(
    validatorId: string,
  ): ValidatorConfigEntry {
    this.log.debug("Search for config of validator with id", validatorId);

    const validatorConfig = this.verifierConfig.find(
      (v) => v.validatorID === validatorId,
    );

    if (!validatorConfig) {
      throw new Error(
        `VerifierFactory - Missing validator config with ID ${validatorId}`,
      );
    }

    return validatorConfig;
  }

  /**
   * Get verifier from internal map, or create new one based on requested validator ID.
   *
   * @param validatorId: Id of verifier to create.
   * @param type: optional parameter, will determine the return type.
   * @returns Verifier<type> or Verifier<any> if type argument was not provided.
   */
  async getVerifier<K extends keyof ClientApiConfig>(
    validatorId: string,
    type?: K,
  ): Promise<Verifier<ClientApiConfig[K]["out"]>> {
    const validatorConfig = this.getValidatorConfigEntryOrThrow(validatorId);

    // Assert ClientApi types
    if (type && type !== validatorConfig.validatorType) {
      throw new Error(
        `VerifierFactory - Validator ${validatorId} type mismatch; requested=${type}, config=${validatorConfig.validatorType}`,
      );
    }

    if (this.verifierMap.has(validatorId)) {
      this.log.info(
        `Verifier for Validator ${validatorId} found in internal map - reuse.`,
      );
      return this.verifierMap.get(validatorId) as Verifier<
        ClientApiConfig[K]["out"]
      >;
    } else {
      this.log.info(`No Verifier for Validator ${validatorId} - create new.`);

      const clientApi = await getValidatorApiClient(
        validatorConfig.validatorType,
        validatorConfig as unknown as ClientApiConfig[K]["in"],
      );

      const verifier = new Verifier(validatorId, clientApi, this.loglevel);
      this.verifierMap.set(validatorId, verifier);

      return verifier;
    }
  }
}
