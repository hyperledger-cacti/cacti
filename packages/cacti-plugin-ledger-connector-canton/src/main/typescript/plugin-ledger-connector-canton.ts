import type { Express } from "express";
import {
  BadRequestError,
  ForbiddenError,
  GatewayTimeoutError,
  PayloadTooLargeError,
  ServiceUnavailableError,
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
  ActiveContractInterfaceView,
  GetActiveContractsRequest,
  GetActiveContractsResponse,
  ListPartiesResponse,
  RunTransactionRequest,
  RunTransactionResponse,
} from "./generated/openapi/typescript-axios";
import { toCantonLedgerError } from "./canton-ledger-error";
import {
  CantonAuthConfig,
  CantonWalletSdkFactory,
  ICantonActiveContractEntry,
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

export const DEFAULT_ACTIVE_CONTRACT_LIMIT = 100;
/**
 * Canton's default `http-list-max-elements-limit`. The Ledger API ignores a
 * larger `limit` and fails the whole query with HTTP 413 when more contracts
 * match, so the connector caps requests at this value unless configured.
 */
export const DEFAULT_MAX_ACTIVE_CONTRACT_LIMIT = 200;
export const MAX_ACTIVE_CONTRACT_LIMIT = 1000;
export const DEFAULT_OPERATION_TIMEOUT_MS = 60_000;
export const MAX_OPERATION_TIMEOUT_MS = 300_000;
export const MAX_COMMANDS_PER_TRANSACTION = 100;
export const MAX_FILTER_VALUES = 100;
export const MAX_IDENTIFIER_LENGTH = 1024;
export const MAX_TRANSACTION_PAYLOAD_BYTES = 1024 * 1024;
export const MAX_TRANSACTION_PAYLOAD_DEPTH = 64;
export const DEFAULT_MAX_IN_FLIGHT_OPERATIONS = 64;
export const MAX_IN_FLIGHT_OPERATIONS = 1024;

export interface IPluginLedgerConnectorCantonOptions
  extends ICactusPluginOptions {
  /**
   * Canton JSON Ledger API base URL. It must use HTTPS because the Wallet SDK
   * sends the service credential to it. Plain HTTP is accepted only for a
   * loopback host and only when `allowInsecureLoopbackHttp` is true.
   */
  ledgerClientUrl: URL | string;
  /**
   * Development-only exception, for example for Canton LocalNet, that allows
   * `http:` to localhost, 127.0.0.0/8, or [::1]. Remote plaintext HTTP is
   * always rejected.
   */
  allowInsecureLoopbackHttp?: boolean;
  /**
   * Ledger API authentication. For `client_credentials`, `configUrl` must
   * satisfy the same HTTPS rule as `ledgerClientUrl` because the client
   * secret is sent to the token endpoint it describes.
   */
  auth: CantonAuthConfig;
  pluginRegistry: PluginRegistry;
  logLevel?: LogLevelDesc;
  walletSdkFactory?: ICantonWalletSdkFactory;
  /**
   * Parties this connector may act and read as. Transactions and reads for
   * any other party are rejected, and listParties() is filtered to these
   * parties. Exactly one of `allowedPartyIds` and `allowAllParties` must be
   * set. An empty array denies every party.
   */
  allowedPartyIds?: readonly string[];
  /**
   * Explicitly allows every party the configured Canton user has rights for.
   * Every caller with the relevant REST scope can then act or read as any of
   * those parties.
   */
  allowAllParties?: boolean;
  /**
   * Largest `limit` accepted by getActiveContracts(). Set it to at most the
   * participant's `http-list-max-elements-limit` (Canton default 200).
   */
  maxActiveContractLimit?: number;
  /** Timeout applied to each Wallet SDK initialization and ledger operation. */
  operationTimeoutMs?: number;
  /**
   * Maximum number of upstream Wallet SDK calls, including SDK
   * initialization, that may be pending at once. A call that timed out keeps
   * its slot until the upstream work actually settles, because the Wallet SDK
   * cannot cancel it. Requests beyond the limit fail with HTTP 503.
   */
  maxInFlightOperations?: number;
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
  private readonly ledgerClientUrl: string;
  private readonly auth: CantonAuthConfig;
  private readonly operationTimeoutMs: number;
  private readonly maxActiveContractLimit: number;
  private readonly maxInFlightOperations: number;
  private readonly inFlightOperations = new Set<Promise<void>>();
  private isShutDown = false;
  private endpoints?: IWebServiceEndpoint[];
  private walletSdkPromise?: Promise<ICantonWalletSdk>;

  public constructor(
    public readonly options: IPluginLedgerConnectorCantonOptions,
  ) {
    const fnTag = `${PluginLedgerConnectorCanton.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} options`);
    Checks.nonBlankString(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);
    const allowInsecureLoopbackHttp =
      options.allowInsecureLoopbackHttp === true;
    // The validated, normalized values are kept so that later mutation of the
    // caller's options cannot redirect the service credential.
    this.ledgerClientUrl = PluginLedgerConnectorCanton.validateServiceUrl(
      options.ledgerClientUrl,
      allowInsecureLoopbackHttp,
      `${fnTag} options.ledgerClientUrl`,
    );
    this.auth = PluginLedgerConnectorCanton.validateAuth(
      options.auth,
      allowInsecureLoopbackHttp,
      `${fnTag} options.auth`,
    );

    this.operationTimeoutMs =
      options.operationTimeoutMs ?? DEFAULT_OPERATION_TIMEOUT_MS;
    PluginLedgerConnectorCanton.validateIntegerOption(
      this.operationTimeoutMs,
      MAX_OPERATION_TIMEOUT_MS,
      `${fnTag} options.operationTimeoutMs`,
    );
    this.maxInFlightOperations =
      options.maxInFlightOperations ?? DEFAULT_MAX_IN_FLIGHT_OPERATIONS;
    PluginLedgerConnectorCanton.validateIntegerOption(
      this.maxInFlightOperations,
      MAX_IN_FLIGHT_OPERATIONS,
      `${fnTag} options.maxInFlightOperations`,
    );
    this.maxActiveContractLimit =
      options.maxActiveContractLimit ?? DEFAULT_MAX_ACTIVE_CONTRACT_LIMIT;
    PluginLedgerConnectorCanton.validateIntegerOption(
      this.maxActiveContractLimit,
      MAX_ACTIVE_CONTRACT_LIMIT,
      `${fnTag} options.maxActiveContractLimit`,
    );

    const allowAllParties = options.allowAllParties === true;
    if (allowAllParties === (options.allowedPartyIds !== undefined)) {
      throw new Error(
        `${fnTag} set exactly one of options.allowedPartyIds and options.allowAllParties: true`,
      );
    }
    if (options.allowedPartyIds !== undefined) {
      const partyIds = options.allowedPartyIds as unknown;
      if (
        !Array.isArray(partyIds) ||
        !partyIds.every(
          (partyId) =>
            typeof partyId === "string" &&
            partyId.trim().length > 0 &&
            partyId.length <= MAX_IDENTIFIER_LENGTH,
        )
      ) {
        throw new Error(
          `${fnTag} options.allowedPartyIds must be an array of non-blank party IDs`,
        );
      }
      this.allowedPartyIds = new Set(partyIds as string[]);
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

  /**
   * Stops accepting new ledger work, then waits up to `operationTimeoutMs`
   * for pending upstream calls to settle. Shutdown is terminal: later ledger
   * operations fail with HTTP 503.
   */
  public async shutdown(): Promise<void> {
    this.isShutDown = true;
    this.walletSdkPromise = undefined;
    this.endpoints = undefined;

    if (this.inFlightOperations.size === 0) {
      return;
    }
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const drained = await Promise.race([
      Promise.all(this.inFlightOperations).then(() => true),
      new Promise<false>((resolve) => {
        timeout = setTimeout(() => resolve(false), this.operationTimeoutMs);
      }),
    ]);
    clearTimeout(timeout);
    if (!drained) {
      this.log.warn(
        `${this.inFlightOperations.size} Canton Wallet SDK operation(s) were still pending after shutdown waited ${this.operationTimeoutMs} ms.`,
      );
    }
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
    const fnTag = `${this.className}#transact()`;
    this.validateRequest(
      this.isPlainObject(request),
      `${fnTag} request must be an object`,
    );
    this.validateRequiredString(request.partyId, `${fnTag} request.partyId`);
    // A caller-supplied, stable command ID is what lets Canton's command
    // deduplication reject a retry of a submission whose outcome is unknown
    // (for example after a timeout) instead of committing it twice.
    this.validateRequiredString(
      request.commandId,
      `${fnTag} request.commandId`,
    );
    if (request.synchronizerId !== undefined) {
      this.validateRequiredString(
        request.synchronizerId,
        `${fnTag} request.synchronizerId`,
      );
    }
    if (request.readAs !== undefined) {
      this.validateNonBlankStringArray(
        request.readAs,
        `${fnTag} request.readAs`,
        false,
      );
    }
    // Authorize before inspecting the potentially large command payload.
    this.assertPartyAllowed(request.partyId);
    request.readAs?.forEach((partyId) => this.assertPartyAllowed(partyId));

    this.validateRequest(
      Array.isArray(request.commands) && request.commands.length > 0,
      `${fnTag} request.commands must not be empty`,
    );
    this.validateRequest(
      request.commands.length <= MAX_COMMANDS_PER_TRANSACTION,
      `${fnTag} request.commands must not contain more than ${MAX_COMMANDS_PER_TRANSACTION} items`,
    );
    this.validateJsonPayload(request.commands, `${fnTag} request.commands`);
    request.commands.forEach((command) => this.validateCommand(command));

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
      requestedLimit <= this.maxActiveContractLimit,
      `${this.className}#getActiveContracts() request.limit must not exceed ${this.maxActiveContractLimit}`,
    );

    const sdk = await this.getOrCreateWalletSdk();
    // Resolving the offset here, rather than inside the SDK, lets the response
    // report the snapshot it reflects so callers can continue from it.
    const activeAtOffset =
      request.offset ??
      (await this.withOperationTimeout(
        () => sdk.ledger.ledgerEnd(),
        "Canton ledger-end query",
      ));
    const entries = await this.withOperationTimeout(async () => {
      return sdk.ledger.acsReader.raw.read({
        parties: request.parties,
        filterByParty: true,
        templateIds: request.templateIds,
        interfaceIds: request.interfaceIds,
        offset: activeAtOffset,
        limit: requestedLimit,
      });
    }, "Canton active-contract query");

    // The ledger applies the limit; slicing keeps the response bounded even
    // if an upstream version ignores it. Incomplete reassignment entries count
    // towards the ledger's limit but are not active contracts.
    const boundedEntries = entries.slice(0, requestedLimit);
    return {
      contracts: boundedEntries.flatMap((entry) => {
        const contract = this.toDto(entry);
        return contract ? [contract] : [];
      }),
      activeAtOffset,
      limitReached: boundedEntries.length >= requestedLimit,
    };
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

  private toDto(entry: ICantonActiveContractEntry): ActiveContract | undefined {
    const activeContract = entry?.contractEntry?.JsActiveContract;
    if (!activeContract) {
      return undefined;
    }
    const event = activeContract.createdEvent;
    const interfaceViews = event.interfaceViews?.map(
      (view): ActiveContractInterfaceView => ({
        interfaceId: view.interfaceId,
        viewStatus: {
          code: view.viewStatus.code,
          message: view.viewStatus.message,
        },
        viewValue: view.viewValue,
      }),
    );
    return {
      contractId: event.contractId,
      templateId: event.templateId,
      createArgument: event.createArgument as ActiveContract["createArgument"],
      witnessParties: [...event.witnessParties],
      signatories: [...event.signatories],
      observers: event.observers ? [...event.observers] : undefined,
      createdAt: event.createdAt,
      synchronizerId: activeContract.synchronizerId,
      interfaceViews,
    };
  }

  private validateNonBlankStringArray(
    values: unknown,
    fieldName: string,
    requireValue = true,
  ): asserts values is string[] {
    this.validateRequest(
      Array.isArray(values),
      `${fieldName} must be an array`,
    );
    if (!Array.isArray(values)) {
      return;
    }
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

  private validateRequiredString(value: unknown, fieldName: string): void {
    this.validateRequest(
      this.isNonBlankString(value),
      `${fieldName} must not be blank`,
    );
    this.validateStringLength(value as string, fieldName);
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return false;
    }
    const prototype = Object.getPrototypeOf(value) as unknown;
    return prototype === Object.prototype || prototype === null;
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

  /**
   * Checks the command envelope that the OpenAPI schema describes, so that
   * direct library callers get the same 400 responses as REST callers.
   */
  private validateCommand(command: unknown): void {
    const fieldName = `${this.className}#transact() request.commands[]`;
    this.validateRequest(
      this.isPlainObject(command),
      `${fieldName} must be an object`,
    );
    const variants = Object.keys(command as object);
    const variant = variants[0];
    this.validateRequest(
      variants.length === 1 &&
        (variant === "CreateCommand" ||
          variant === "ExerciseCommand" ||
          variant === "CreateAndExerciseCommand"),
      `${fieldName} must contain exactly one of CreateCommand, ExerciseCommand, or CreateAndExerciseCommand`,
    );
    const body = (command as Record<string, unknown>)[variant];
    this.validateRequest(
      this.isPlainObject(body),
      `${fieldName}.${variant} must be an object`,
    );
    const fields = body as Record<string, unknown>;
    this.validateRequiredString(
      fields.templateId,
      `${fieldName}.${variant}.templateId`,
    );
    if (variant === "ExerciseCommand") {
      this.validateRequiredString(
        fields.contractId,
        `${fieldName}.${variant}.contractId`,
      );
    }
    if (variant !== "CreateCommand") {
      this.validateRequiredString(
        fields.choice,
        `${fieldName}.${variant}.choice`,
      );
      this.validateRequest(
        "choiceArgument" in fields,
        `${fieldName}.${variant}.choiceArgument is required`,
      );
    }
    if (variant !== "ExerciseCommand") {
      this.validateRequest(
        this.isPlainObject(fields.createArguments),
        `${fieldName}.${variant}.createArguments must be an object`,
      );
    }
  }

  /**
   * Validates that a payload is finite, acyclic, plain JSON within the size
   * and depth limits. The walk keeps a lower bound of the serialized size and
   * stops as soon as it exceeds the limit, so oversized payloads are rejected
   * without traversing or serializing all of them.
   */
  private validateJsonPayload(value: unknown, fieldName: string): void {
    const tooLarge = () =>
      new PayloadTooLargeError(
        `${fieldName} must not exceed ${MAX_TRANSACTION_PAYLOAD_BYTES} bytes`,
      );
    const notJson = () =>
      new BadRequestError(`${fieldName} must be finite, acyclic JSON data`);
    // A lower bound of the UTF-8 JSON size: every UTF-16 code unit of a
    // string is at least one UTF-8 byte, and each value is at least one byte.
    let minimumBytes = 0;
    const account = (bytes: number) => {
      minimumBytes += bytes;
      if (minimumBytes > MAX_TRANSACTION_PAYLOAD_BYTES) {
        throw tooLarge();
      }
    };

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

      const item = current.value;
      switch (typeof item) {
        case "string":
          account(item.length + 2);
          continue;
        case "number":
          if (!Number.isFinite(item)) {
            throw notJson();
          }
          account(1);
          continue;
        case "boolean":
          account(4);
          continue;
        case "object":
          break;
        default:
          throw notJson();
      }
      if (item === null) {
        account(4);
        continue;
      }

      this.validateRequest(
        Array.isArray(item) || this.isPlainObject(item),
        `${fieldName} must contain only JSON objects and arrays`,
      );
      if (activeObjects.has(item)) {
        throw notJson();
      }
      activeObjects.add(item);
      stack.push({ depth: current.depth, exiting: true, value: item });
      if (Array.isArray(item)) {
        // Brackets plus one separator between elements.
        account(2 + Math.max(item.length - 1, 0));
        for (let index = item.length - 1; index >= 0; index--) {
          stack.push({ depth: current.depth + 1, value: item[index] });
        }
      } else {
        const keys = Object.keys(item);
        // Braces, separators, and each quoted key with its colon.
        account(2 + Math.max(keys.length - 1, 0));
        for (const key of keys) {
          account(key.length + 3);
          stack.push({
            depth: current.depth + 1,
            value: (item as Record<string, unknown>)[key],
          });
        }
      }
    }

    let serialized: string | undefined;
    try {
      serialized = JSON.stringify(value);
    } catch (_error: unknown) {
      throw notJson();
    }
    this.validateRequest(
      serialized !== undefined,
      `${fieldName} must be JSON serializable`,
    );
    if (Buffer.byteLength(serialized, "utf8") > MAX_TRANSACTION_PAYLOAD_BYTES) {
      throw tooLarge();
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
    const pendingOperation = this.startTrackedOperation(operation);
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
      return await Promise.race([pendingOperation, timeoutPromise]);
    } catch (error: unknown) {
      throw toCantonLedgerError(error, outcomeMayBeUnknown);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  /**
   * Starts an upstream Wallet SDK call and holds an in-flight slot until that
   * call settles, even if the caller has already timed out. This bounds the
   * requests, sockets, and payloads that abandoned operations can retain.
   */
  private startTrackedOperation<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isShutDown) {
      throw new ServiceUnavailableError(
        "The Canton connector has been shut down.",
      );
    }
    if (this.inFlightOperations.size >= this.maxInFlightOperations) {
      throw new ServiceUnavailableError(
        "The Canton connector has too many pending ledger operations.",
      );
    }
    const pendingOperation = Promise.resolve().then(operation);
    const settled = pendingOperation.then(
      () => undefined,
      () => undefined,
    );
    this.inFlightOperations.add(settled);
    void settled.then(() => this.inFlightOperations.delete(settled));
    return pendingOperation;
  }

  private static validateIntegerOption(
    value: number,
    maximum: number,
    fieldName: string,
  ): void {
    if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
      throw new Error(
        `${fieldName} must be an integer between 1 and ${maximum}`,
      );
    }
  }

  /**
   * Validates a URL that receives credentials and returns its normalized
   * form. HTTPS is required; plain HTTP is accepted only for a loopback host
   * with the explicit development exception.
   */
  private static validateServiceUrl(
    value: unknown,
    allowInsecureLoopbackHttp: boolean,
    fieldName: string,
  ): string {
    if (
      !(value instanceof URL) &&
      (typeof value !== "string" || value.trim().length === 0)
    ) {
      throw new Error(`${fieldName} must be a non-blank URL`);
    }
    let url: URL;
    try {
      url = new URL(value instanceof URL ? value.href : value);
    } catch (_error: unknown) {
      throw new Error(`${fieldName} must be an absolute URL`);
    }
    if (url.username || url.password) {
      throw new Error(
        `${fieldName} must not embed credentials; configure options.auth instead`,
      );
    }
    if (url.protocol === "https:") {
      return url.href;
    }
    if (
      url.protocol !== "http:" ||
      !allowInsecureLoopbackHttp ||
      !PluginLedgerConnectorCanton.isLoopbackHostname(url.hostname)
    ) {
      throw new Error(
        `${fieldName} must use https:; plain http: is only allowed for a loopback host with options.allowInsecureLoopbackHttp`,
      );
    }
    return url.href;
  }

  /** Validates the authentication options and returns a private copy. */
  private static validateAuth(
    auth: unknown,
    allowInsecureLoopbackHttp: boolean,
    fieldName: string,
  ): CantonAuthConfig {
    const isNonBlank = (value: unknown): value is string =>
      typeof value === "string" && value.trim().length > 0;
    if (typeof auth !== "object" || auth === null) {
      throw new Error(`${fieldName} must be an object`);
    }
    const config = auth as Record<string, unknown>;
    const copyCredentials = () => {
      const credentials = config.credentials as
        | Record<string, unknown>
        | undefined;
      if (
        typeof credentials !== "object" ||
        credentials === null ||
        !isNonBlank(credentials.clientId) ||
        typeof credentials.clientSecret !== "string"
      ) {
        throw new Error(
          `${fieldName}.credentials must contain clientId and clientSecret`,
        );
      }
      return {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        scope: credentials.scope as string | undefined,
        audience: credentials.audience as string | undefined,
      };
    };
    switch (config.method) {
      case "static":
        if (!isNonBlank(config.token)) {
          throw new Error(`${fieldName}.token must not be blank`);
        }
        return { method: "static", token: config.token };
      case "self_signed":
        if (!isNonBlank(config.issuer)) {
          throw new Error(`${fieldName}.issuer must not be blank`);
        }
        return {
          method: "self_signed",
          issuer: config.issuer,
          credentials: copyCredentials(),
          keyId: config.keyId as string | undefined,
        };
      case "client_credentials":
        return {
          method: "client_credentials",
          configUrl: PluginLedgerConnectorCanton.validateServiceUrl(
            config.configUrl,
            allowInsecureLoopbackHttp,
            `${fieldName}.configUrl`,
          ),
          credentials: copyCredentials(),
        };
      default:
        throw new Error(
          `${fieldName}.method must be static, self_signed, or client_credentials`,
        );
    }
  }

  private static isLoopbackHostname(hostname: string): boolean {
    // The URL parser normalizes IPv4 shorthands such as 127.1 and keeps
    // IPv6 literals in brackets.
    return (
      hostname === "localhost" ||
      hostname === "[::1]" ||
      /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
    );
  }

  private getOrCreateWalletSdk(): Promise<ICantonWalletSdk> {
    if (!this.walletSdkPromise) {
      const sdkPromise = this.withOperationTimeout(
        () =>
          this.walletSdkFactory.create({
            auth: this.auth,
            ledgerClientUrl: this.ledgerClientUrl,
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
