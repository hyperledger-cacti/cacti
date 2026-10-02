import type { TokenProviderConfig } from "@canton-network/wallet-sdk" with { "resolution-mode": "import" };
import type { Express } from "express";
import {
  BadRequestError,
  ForbiddenError,
  GatewayTimeoutError,
  PayloadTooLargeError,
} from "http-errors-enhanced-cjs";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger-cacti/cactus-common";
import type { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import {
  ConsensusAlgorithmFamily,
  ICactusPluginOptions,
  IPluginLedgerConnector,
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger-cacti/cactus-core-api";

import OAS from "../json/openapi.json";
import {
  ActiveContract,
  GetActiveContractsRequest,
  GetActiveContractsResponse,
  ListPartiesResponse,
  RunTransactionRequest,
  RunTransactionResponse,
} from "./generated/openapi/typescript-axios";
import {
  CantonWalletSdkFactory,
  ICantonWalletSdk,
  ICantonWalletSdkFactory,
} from "./canton-wallet-sdk";
import { GetActiveContractsV1Endpoint } from "./web-services/get-active-contracts-v1-endpoint";
import {
  GetOpenApiSpecV1Endpoint,
  IGetOpenApiSpecV1EndpointOptions,
} from "./web-services/get-open-api-spec-v1-endpoint";
import { ListPartiesV1Endpoint } from "./web-services/list-parties-v1-endpoint";
import { RunTransactionV1Endpoint } from "./web-services/run-transaction-v1-endpoint";

const DEFAULT_ACTIVE_CONTRACT_LIMIT = 100;
const MAX_ACTIVE_CONTRACT_LIMIT = 1000;
export const DEFAULT_OPERATION_TIMEOUT_MS = 60_000;
export const MAX_OPERATION_TIMEOUT_MS = 300_000;
export const MAX_COMMANDS_PER_TRANSACTION = 100;
export const MAX_FILTER_VALUES = 100;
export const MAX_IDENTIFIER_LENGTH = 1024;
export const MAX_TRANSACTION_PAYLOAD_BYTES = 1024 * 1024;
export const MAX_TRANSACTION_PAYLOAD_DEPTH = 64;

export interface IPluginLedgerConnectorCantonOptions
  extends ICactusPluginOptions {
  ledgerClientUrl: URL | string;
  auth: TokenProviderConfig;
  pluginRegistry: PluginRegistry;
  logLevel?: LogLevelDesc;
  walletSdkFactory?: ICantonWalletSdkFactory;
  /**
   * Optional connector-level party allowlist. When supplied, transactions and
   * reads are rejected for every party not listed, and listParties() is
   * filtered to the configured parties. An empty array denies every party.
   */
  allowedPartyIds?: readonly string[];
  /** Timeout applied to each Wallet SDK initialization and ledger operation. */
  operationTimeoutMs?: number;
}

export class PluginLedgerConnectorCanton
  implements
    IPluginLedgerConnector<
      never,
      never,
      RunTransactionRequest,
      RunTransactionResponse
    >,
    IPluginWebService
{
  public static readonly CLASS_NAME = "PluginLedgerConnectorCanton";
  public static readonly PACKAGE_NAME =
    "@hyperledger-cacti/cacti-plugin-ledger-connector-canton";

  private readonly log: Logger;
  private readonly walletSdkFactory: ICantonWalletSdkFactory;
  private readonly allowedPartyIds?: ReadonlySet<string>;
  private readonly operationTimeoutMs: number;
  private endpoints?: IWebServiceEndpoint[];
  private walletSdkPromise?: Promise<ICantonWalletSdk>;

  public constructor(
    public readonly options: IPluginLedgerConnectorCantonOptions,
  ) {
    const fnTag = `${PluginLedgerConnectorCanton.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} options`);
    Checks.nonBlankString(options.instanceId, `${fnTag} options.instanceId`);
    if (typeof options.ledgerClientUrl === "string") {
      Checks.nonBlankString(
        options.ledgerClientUrl,
        `${fnTag} options.ledgerClientUrl`,
      );
    } else {
      Checks.truthy(
        options.ledgerClientUrl,
        `${fnTag} options.ledgerClientUrl`,
      );
    }
    Checks.truthy(options.auth, `${fnTag} options.auth`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);

    this.operationTimeoutMs =
      options.operationTimeoutMs ?? DEFAULT_OPERATION_TIMEOUT_MS;
    this.validateRequest(
      Number.isSafeInteger(this.operationTimeoutMs) &&
        this.operationTimeoutMs > 0 &&
        this.operationTimeoutMs <= MAX_OPERATION_TIMEOUT_MS,
      `${fnTag} options.operationTimeoutMs must be an integer between 1 and ${MAX_OPERATION_TIMEOUT_MS}`,
    );
    if (options.allowedPartyIds !== undefined) {
      this.validateNonBlankStringArray(
        options.allowedPartyIds,
        `${fnTag} options.allowedPartyIds`,
        false,
      );
      this.allowedPartyIds = new Set(options.allowedPartyIds);
    }

    this.log = LoggerProvider.getOrCreate({
      label: PluginLedgerConnectorCanton.CLASS_NAME,
      level: options.logLevel ?? "INFO",
    });
    this.walletSdkFactory =
      options.walletSdkFactory ?? new CantonWalletSdkFactory(this.log);
  }

  public get className(): string {
    return PluginLedgerConnectorCanton.CLASS_NAME;
  }

  public getInstanceId(): string {
    return this.options.instanceId;
  }

  public getPackageName(): string {
    return PluginLedgerConnectorCanton.PACKAGE_NAME;
  }

  public async onPluginInit(): Promise<void> {
    // Wallet SDK initialization is deliberately lazy so plugin registration
    // does not require the configured Canton ledger to be online.
  }

  public async shutdown(): Promise<void> {
    this.walletSdkPromise = undefined;
    this.endpoints = undefined;
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public async registerWebServices(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(
      webServices.map((webService) => webService.registerExpress(expressApp)),
    );
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (this.endpoints) {
      return this.endpoints;
    }

    const endpointOptions = {
      connector: this,
      logLevel: this.options.logLevel,
    };
    const oasPath =
      OAS.paths[
        "/api/v1/plugins/@hyperledger-cacti/cacti-plugin-ledger-connector-canton/get-open-api-spec"
      ];
    const openApiEndpointOptions: IGetOpenApiSpecV1EndpointOptions = {
      oas: OAS,
      oasPath,
      operationId: oasPath.get.operationId,
      path: oasPath.get["x-hyperledger-cacti"].http.path,
      pluginRegistry: this.options.pluginRegistry,
      verbLowerCase: oasPath.get["x-hyperledger-cacti"].http.verbLowerCase,
      logLevel: this.options.logLevel,
    };

    this.endpoints = [
      new RunTransactionV1Endpoint(endpointOptions),
      new GetActiveContractsV1Endpoint(endpointOptions),
      new ListPartiesV1Endpoint(endpointOptions),
      new GetOpenApiSpecV1Endpoint(openApiEndpointOptions),
    ];
    return this.endpoints;
  }

  public async deployContract(): Promise<never> {
    throw new Error(
      "Canton DAR deployment is not supported by this connector version.",
    );
  }

  public async transact(
    request: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    this.validateRequest(
      request !== undefined && request !== null,
      `${this.className}#transact() request is required`,
    );
    this.validateRequest(
      this.isNonBlankString(request.partyId),
      `${this.className}#transact() request.partyId must not be blank`,
    );
    this.validateStringLength(
      request.partyId,
      `${this.className}#transact() request.partyId`,
    );
    this.validateRequest(
      Array.isArray(request.commands) && request.commands.length > 0,
      `${this.className}#transact() request.commands must not be empty`,
    );
    this.validateRequest(
      request.commands.length <= MAX_COMMANDS_PER_TRANSACTION,
      `${this.className}#transact() request.commands must not contain more than ${MAX_COMMANDS_PER_TRANSACTION} items`,
    );
    for (const command of request.commands) {
      this.validateRequest(
        command && typeof command === "object",
        `${this.className}#transact() request.commands[] must be an object`,
      );
      this.validateCommandIdentifiers(command);
    }
    this.validateOptionalNonBlankString(
      request.commandId,
      `${this.className}#transact() request.commandId`,
    );
    this.validateOptionalNonBlankString(
      request.synchronizerId,
      `${this.className}#transact() request.synchronizerId`,
    );
    if (request.readAs) {
      this.validateNonBlankStringArray(
        request.readAs,
        `${this.className}#transact() request.readAs`,
        false,
      );
    }

    this.validateJsonPayload(
      request.commands,
      `${this.className}#transact() request.commands`,
    );
    this.assertPartyAllowed(request.partyId);
    request.readAs?.forEach((partyId) => this.assertPartyAllowed(partyId));

    const sdk = await this.getOrCreateWalletSdk();
    return this.withOperationTimeout(
      async () => {
        return sdk.ledger.internal.submit({
          actAs: [request.partyId],
          commands: request.commands,
          commandId: request.commandId,
          readAs: request.readAs,
          synchronizerId: request.synchronizerId,
        });
      },
      "Canton transaction submission",
      true,
    );
  }

  public async getActiveContracts(
    request: GetActiveContractsRequest,
  ): Promise<GetActiveContractsResponse> {
    this.validateRequest(
      request !== undefined && request !== null,
      `${this.className}#getActiveContracts() request is required`,
    );
    this.validateRequest(
      Array.isArray(request.parties) && request.parties.length > 0,
      `${this.className}#getActiveContracts() request.parties must not be empty`,
    );
    this.validateNonBlankStringArray(
      request.parties,
      `${this.className}#getActiveContracts() request.parties`,
    );
    request.parties.forEach((partyId) => this.assertPartyAllowed(partyId));
    if (request.templateIds) {
      this.validateNonBlankStringArray(
        request.templateIds,
        `${this.className}#getActiveContracts() request.templateIds`,
      );
    }
    if (request.interfaceIds) {
      this.validateNonBlankStringArray(
        request.interfaceIds,
        `${this.className}#getActiveContracts() request.interfaceIds`,
      );
    }
    this.validateRequest(
      !(request.templateIds && request.interfaceIds),
      `${this.className}#getActiveContracts() request cannot combine templateIds and interfaceIds`,
    );
    if (request.offset !== undefined) {
      this.validateRequest(
        Number.isSafeInteger(request.offset) && request.offset >= 0,
        `${this.className}#getActiveContracts() request.offset must be a non-negative safe integer`,
      );
    }

    const requestedLimit = request.limit ?? DEFAULT_ACTIVE_CONTRACT_LIMIT;
    this.validateRequest(
      Number.isSafeInteger(requestedLimit) && requestedLimit > 0,
      `${this.className}#getActiveContracts() request.limit must be a positive integer`,
    );
    this.validateRequest(
      requestedLimit <= MAX_ACTIVE_CONTRACT_LIMIT,
      `${this.className}#getActiveContracts() request.limit must not exceed ${MAX_ACTIVE_CONTRACT_LIMIT}`,
    );

    const sdk = await this.getOrCreateWalletSdk();
    const contracts = await this.withOperationTimeout(async () => {
      return sdk.ledger.acsReader.readJsContracts({
        parties: request.parties,
        filterByParty: true,
        templateIds: request.templateIds,
        interfaceIds: request.interfaceIds,
        offset: request.offset,
        limit: requestedLimit,
      });
    }, "Canton active-contract query");

    return { contracts: contracts.map((contract) => this.toDto(contract)) };
  }

  public async listParties(): Promise<ListPartiesResponse> {
    const sdk = await this.getOrCreateWalletSdk();
    const parties = await this.withOperationTimeout(async () => {
      return sdk.party.list();
    }, "Canton party query");
    return {
      parties: this.allowedPartyIds
        ? parties.filter((partyId) => this.allowedPartyIds?.has(partyId))
        : parties,
    };
  }

  public async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    return ConsensusAlgorithmFamily.Authority;
  }

  public async hasTransactionFinality(): Promise<boolean> {
    return true;
  }

  private toDto(contract: ActiveContract): ActiveContract {
    return {
      contractId: contract.contractId,
      templateId: contract.templateId,
      createArgument: contract.createArgument,
      witnessParties: [...contract.witnessParties],
      signatories: [...contract.signatories],
      observers: contract.observers ? [...contract.observers] : undefined,
      createdAt: contract.createdAt,
      synchronizerId: contract.synchronizerId,
    };
  }

  private validateNonBlankStringArray(
    values: readonly string[],
    fieldName: string,
    requireValue = true,
  ): void {
    this.validateRequest(
      Array.isArray(values),
      `${fieldName} must be an array`,
    );
    if (requireValue) {
      this.validateRequest(values.length > 0, `${fieldName} must not be empty`);
    }
    this.validateRequest(
      values.length <= MAX_FILTER_VALUES,
      `${fieldName} must not contain more than ${MAX_FILTER_VALUES} items`,
    );
    for (const value of values) {
      this.validateRequest(
        this.isNonBlankString(value),
        `${fieldName}[] must not be blank`,
      );
      this.validateStringLength(value, `${fieldName}[]`);
    }
  }

  private validateOptionalNonBlankString(
    value: string | undefined,
    fieldName: string,
  ): void {
    if (value !== undefined) {
      this.validateRequest(
        this.isNonBlankString(value),
        `${fieldName} must not be blank`,
      );
      this.validateStringLength(value, fieldName);
    }
  }

  private isNonBlankString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }

  private validateRequest(condition: unknown, message: string): void {
    if (!condition) {
      throw new BadRequestError(message);
    }
  }

  private validateStringLength(value: string, fieldName: string): void {
    this.validateRequest(
      value.length <= MAX_IDENTIFIER_LENGTH,
      `${fieldName} must not exceed ${MAX_IDENTIFIER_LENGTH} characters`,
    );
  }

  private validateCommandIdentifiers(command: object): void {
    const commandRecord = command as Record<string, unknown>;
    for (const variant of [
      "CreateCommand",
      "ExerciseCommand",
      "CreateAndExerciseCommand",
    ]) {
      const body = commandRecord[variant];
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        continue;
      }
      const bodyRecord = body as Record<string, unknown>;
      for (const field of ["templateId", "contractId", "choice"]) {
        const value = bodyRecord[field];
        if (typeof value === "string") {
          this.validateStringLength(
            value,
            `${this.className}#transact() request.commands[].${variant}.${field}`,
          );
        }
      }
    }
  }

  private validateJsonPayload(value: unknown, fieldName: string): void {
    const activeObjects = new WeakSet<object>();
    const stack: Array<{
      readonly depth: number;
      readonly exiting?: boolean;
      readonly value: unknown;
    }> = [{ depth: 0, value }];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        break;
      }
      if (current.exiting) {
        activeObjects.delete(current.value as object);
        continue;
      }
      this.validateRequest(
        current.depth <= MAX_TRANSACTION_PAYLOAD_DEPTH,
        `${fieldName} must not exceed ${MAX_TRANSACTION_PAYLOAD_DEPTH} nesting levels`,
      );

      const valueType = typeof current.value;
      if (
        valueType === "bigint" ||
        valueType === "function" ||
        valueType === "symbol" ||
        valueType === "undefined" ||
        (valueType === "number" && !Number.isFinite(current.value))
      ) {
        throw new BadRequestError(
          `${fieldName} must be finite, acyclic JSON data`,
        );
      }
      if (!current.value || valueType !== "object") {
        continue;
      }

      const objectValue = current.value as object;
      const prototype = Object.getPrototypeOf(objectValue) as unknown;
      this.validateRequest(
        Array.isArray(objectValue) ||
          prototype === Object.prototype ||
          prototype === null,
        `${fieldName} must contain only JSON objects and arrays`,
      );
      this.validateRequest(
        !activeObjects.has(objectValue),
        `${fieldName} must be finite, acyclic JSON data`,
      );
      activeObjects.add(objectValue);
      stack.push({
        depth: current.depth,
        exiting: true,
        value: objectValue,
      });
      for (const item of Object.values(objectValue)) {
        stack.push({ depth: current.depth + 1, value: item });
      }
    }

    let serialized: string | undefined;
    try {
      serialized = JSON.stringify(value);
    } catch (_error: unknown) {
      throw new BadRequestError(
        `${fieldName} must be finite, acyclic JSON data`,
      );
    }

    this.validateRequest(
      serialized !== undefined,
      `${fieldName} must be JSON serializable`,
    );
    if (Buffer.byteLength(serialized, "utf8") > MAX_TRANSACTION_PAYLOAD_BYTES) {
      throw new PayloadTooLargeError(
        `${fieldName} must not exceed ${MAX_TRANSACTION_PAYLOAD_BYTES} bytes`,
      );
    }
  }

  private assertPartyAllowed(partyId: string): void {
    if (this.allowedPartyIds && !this.allowedPartyIds.has(partyId)) {
      throw new ForbiddenError(
        "The requested Canton party is not allowed by this connector.",
      );
    }
  }

  private async withOperationTimeout<T>(
    operation: () => Promise<T>,
    operationName: string,
    outcomeMayBeUnknown = false,
  ): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(
        () =>
          reject(
            new GatewayTimeoutError(
              `${operationName} exceeded ${this.operationTimeoutMs} ms${
                outcomeMayBeUnknown
                  ? "; the final transaction outcome is unknown"
                  : ""
              }`,
            ),
          ),
        this.operationTimeoutMs,
      );
    });
    try {
      return await Promise.race([operation(), timeoutPromise]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private getOrCreateWalletSdk(): Promise<ICantonWalletSdk> {
    if (!this.walletSdkPromise) {
      const sdkPromise = this.withOperationTimeout(
        () =>
          this.walletSdkFactory.create({
            auth: this.options.auth,
            ledgerClientUrl: this.options.ledgerClientUrl,
          }),
        "Canton Wallet SDK initialization",
      ).catch((error: unknown) => {
        // Do not let a stale initialization (for example one invalidated by
        // shutdown) clear a newer SDK promise.
        if (this.walletSdkPromise === sdkPromise) {
          this.walletSdkPromise = undefined;
        }
        throw error;
      });
      this.walletSdkPromise = sdkPromise;
    }
    return this.walletSdkPromise;
  }
}
