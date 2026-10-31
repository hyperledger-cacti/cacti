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
  CantonCommand,
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
import { validateCantonServiceUrl } from "./canton-service-url";

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
  private readonly allowInsecureLoopbackHttp: boolean;
  private readonly operationTimeoutMs: number;
  private readonly maxActiveContractLimit: number;
  private readonly maxInFlightOperations: number;
  private readonly inFlightOperations = new Set<Promise<void>>();
  private isShutDown = false;
  private endpoints?: IWebServiceEndpoint[];
  private walletSdkPromise?: Promise<ICantonWalletSdk>;
  private walletSdk?: ICantonWalletSdk;
  private shutdownPromise?: Promise<void>;
  private readonly lifecycleAbortController = new AbortController();

  public constructor(
    public readonly options: IPluginLedgerConnectorCantonOptions,
  ) {
    const fnTag = `${PluginLedgerConnectorCanton.CLASS_NAME}#constructor()`;
    Checks.truthy(options, `${fnTag} options`);
    Checks.nonBlankString(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);
    this.allowInsecureLoopbackHttp = options.allowInsecureLoopbackHttp === true;
    // The validated, normalized values are kept so that later mutation of the
    // caller's options cannot redirect the service credential.
    this.ledgerClientUrl = validateCantonServiceUrl(
      options.ledgerClientUrl,
      this.allowInsecureLoopbackHttp,
      `${fnTag} options.ledgerClientUrl`,
    );
    this.auth = PluginLedgerConnectorCanton.validateAuth(
      options.auth,
      this.allowInsecureLoopbackHttp,
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
            partyId === partyId.trim() &&
            partyId.length <= MAX_IDENTIFIER_LENGTH,
        )
      ) {
        throw new Error(
          `${fnTag} options.allowedPartyIds must be an array of non-blank party IDs without surrounding whitespace`,
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
  public shutdown(): Promise<void> {
    if (!this.shutdownPromise) {
      this.isShutDown = true;
      this.shutdownPromise = this.shutdownResources();
    }
    return this.shutdownPromise;
  }

  private async shutdownResources(): Promise<void> {
    this.isShutDown = true;
    this.walletSdkPromise = undefined;
    this.endpoints = undefined;

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
    const sdk = this.walletSdk;
    this.walletSdk = undefined;
    this.lifecycleAbortController.abort();
    await sdk?.dispose?.();
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
    const partyId = request.partyId as unknown;
    const commandId = request.commandId as unknown;
    const synchronizerId = request.synchronizerId as unknown;
    const readAsInput = request.readAs as unknown;
    const commandsInput = request.commands as unknown;
    this.validateRequiredString(partyId, `${fnTag} request.partyId`);
    // A caller-supplied, stable command ID is what lets Canton's command
    // deduplication reject a retry of a submission whose outcome is unknown
    // (for example after a timeout) instead of committing it twice.
    this.validateRequiredString(commandId, `${fnTag} request.commandId`);
    if (synchronizerId !== undefined) {
      this.validateRequiredString(
        synchronizerId,
        `${fnTag} request.synchronizerId`,
      );
    }
    const readAs =
      readAsInput === undefined
        ? undefined
        : Array.isArray(readAsInput)
          ? [...readAsInput]
          : readAsInput;
    if (readAs !== undefined) {
      this.validateNonBlankStringArray(
        readAs,
        `${fnTag} request.readAs`,
        false,
      );
    }
    // Authorize before inspecting the potentially large command payload.
    this.assertPartyAllowed(partyId as string);
    readAs?.forEach((readAsPartyId) => this.assertPartyAllowed(readAsPartyId));

    this.validateRequest(
      Array.isArray(commandsInput) && commandsInput.length > 0,
      `${fnTag} request.commands must not be empty`,
    );
    this.validateRequest(
      (commandsInput as unknown[]).length <= MAX_COMMANDS_PER_TRANSACTION,
      `${fnTag} request.commands must not contain more than ${MAX_COMMANDS_PER_TRANSACTION} items`,
    );
    const serializedCommands = this.validateJsonPayload(
      commandsInput,
      `${fnTag} request.commands`,
    );
    // Forward the exact JSON representation that was size-checked. Besides
    // removing prototypes and accessors, this prevents a direct library caller
    // from changing a validated command while SDK initialization is pending.
    const commands = JSON.parse(serializedCommands) as unknown;
    this.validateRequest(
      Array.isArray(commands) && commands.length > 0,
      `${fnTag} request.commands must not be empty`,
    );
    this.validateRequest(
      (commands as unknown[]).length <= MAX_COMMANDS_PER_TRANSACTION,
      `${fnTag} request.commands must not contain more than ${MAX_COMMANDS_PER_TRANSACTION} items`,
    );
    (commands as unknown[]).forEach((command) => this.validateCommand(command));

    const sdk = await this.getOrCreateWalletSdk();
    return this.withOperationTimeout(
      async () => {
        return sdk.ledger.internal.submit({
          actAs: [partyId as string],
          commands: commands as CantonCommand[],
          commandId: commandId as string,
          readAs,
          synchronizerId: synchronizerId as string | undefined,
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
      this.isPlainObject(request),
      `${this.className}#getActiveContracts() request must be an object`,
    );
    const partiesInput = request.parties as unknown;
    const parties = Array.isArray(partiesInput)
      ? [...partiesInput]
      : partiesInput;
    this.validateRequest(
      Array.isArray(parties) && parties.length > 0,
      `${this.className}#getActiveContracts() request.parties must not be empty`,
    );
    this.validateNonBlankStringArray(
      parties,
      `${this.className}#getActiveContracts() request.parties`,
    );
    parties.forEach((partyId) => this.assertPartyAllowed(partyId));
    const templateIdsInput = request.templateIds as unknown;
    const interfaceIdsInput = request.interfaceIds as unknown;
    const hasTemplateIds = templateIdsInput !== undefined;
    const hasInterfaceIds = interfaceIdsInput !== undefined;
    const templateIds = Array.isArray(templateIdsInput)
      ? [...templateIdsInput]
      : templateIdsInput;
    const interfaceIds = Array.isArray(interfaceIdsInput)
      ? [...interfaceIdsInput]
      : interfaceIdsInput;
    if (hasTemplateIds) {
      this.validateNonBlankStringArray(
        templateIds,
        `${this.className}#getActiveContracts() request.templateIds`,
      );
    }
    if (hasInterfaceIds) {
      this.validateNonBlankStringArray(
        interfaceIds,
        `${this.className}#getActiveContracts() request.interfaceIds`,
      );
    }
    this.validateRequest(
      !(hasTemplateIds && hasInterfaceIds),
      `${this.className}#getActiveContracts() request cannot combine templateIds and interfaceIds`,
    );
    const configuredOffset = request.offset as unknown;
    if (configuredOffset !== undefined) {
      this.validateRequest(
        Number.isSafeInteger(configuredOffset) &&
          (configuredOffset as number) >= 0,
        `${this.className}#getActiveContracts() request.offset must be a non-negative safe integer`,
      );
    }

    const configuredLimit = request.limit as unknown;
    if (configuredLimit !== undefined) {
      this.validateRequest(
        Number.isSafeInteger(configuredLimit) &&
          (configuredLimit as number) > 0,
        `${this.className}#getActiveContracts() request.limit must be a positive integer`,
      );
    }
    const requestedLimit =
      configuredLimit === undefined
        ? Math.min(DEFAULT_ACTIVE_CONTRACT_LIMIT, this.maxActiveContractLimit)
        : (configuredLimit as number);
    this.validateRequest(
      requestedLimit <= this.maxActiveContractLimit,
      `${this.className}#getActiveContracts() request.limit must not exceed ${this.maxActiveContractLimit}`,
    );

    const sdk = await this.getOrCreateWalletSdk();
    // Resolving the offset here, rather than inside the SDK, lets the response
    // report the snapshot it reflects so callers can continue from it.
    const activeAtOffset =
      configuredOffset === undefined
        ? await this.withOperationTimeout(
            () => sdk.ledger.ledgerEnd(),
            "Canton ledger-end query",
          )
        : (configuredOffset as number);
    const entries = await this.withOperationTimeout(async () => {
      return sdk.ledger.acsReader.raw.read({
        parties,
        filterByParty: true,
        templateIds: templateIds as string[] | undefined,
        interfaceIds: interfaceIds as string[] | undefined,
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
    return ConsensusAlgorithmFamily.OrgHyperledgerCactusConsensusalgorithmProofOfAuthority;
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
  private validateJsonPayload(value: unknown, fieldName: string): string {
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
    return serialized;
  }

  private assertPartyAllowed(partyId: string): void {
    // Party IDs are opaque and case-sensitive. Reject surrounding whitespace
    // instead of silently changing the ledger identity during authorization.
    this.validateRequest(
      partyId === partyId.trim(),
      "Canton party IDs must not contain surrounding whitespace.",
    );
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
    const copyOptionalString = (
      value: unknown,
      valueFieldName: string,
    ): string | undefined => {
      if (value === undefined) {
        return undefined;
      }
      if (typeof value !== "string") {
        throw new Error(`${valueFieldName} must be a string`);
      }
      return value;
    };
    const copyCredentials = () => {
      const credentials = config.credentials as
        | Record<string, unknown>
        | undefined;
      if (
        typeof credentials !== "object" ||
        credentials === null ||
        !isNonBlank(credentials.clientId) ||
        typeof credentials.clientSecret !== "string" ||
        credentials.clientSecret.length === 0
      ) {
        throw new Error(
          `${fieldName}.credentials must contain a non-blank clientId and non-empty clientSecret`,
        );
      }
      return {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        scope: copyOptionalString(
          credentials.scope,
          `${fieldName}.credentials.scope`,
        ),
        audience: copyOptionalString(
          credentials.audience,
          `${fieldName}.credentials.audience`,
        ),
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
        if (config.keyId !== undefined && !isNonBlank(config.keyId)) {
          throw new Error(`${fieldName}.keyId must not be blank`);
        }
        return {
          method: "self_signed",
          issuer: config.issuer,
          credentials: copyCredentials(),
          keyId: config.keyId,
        };
      case "client_credentials": {
        const allowedTokenEndpointOrigins = config.allowedTokenEndpointOrigins;
        if (
          allowedTokenEndpointOrigins !== undefined &&
          (!Array.isArray(allowedTokenEndpointOrigins) ||
            !allowedTokenEndpointOrigins.every(
              (origin) =>
                typeof origin === "string" && origin.trim().length > 0,
            ))
        ) {
          throw new Error(
            `${fieldName}.allowedTokenEndpointOrigins must be an array of URLs`,
          );
        }
        const normalizedAllowedTokenEndpointOrigins =
          allowedTokenEndpointOrigins?.map(
            (origin, index) =>
              new URL(
                validateCantonServiceUrl(
                  origin,
                  allowInsecureLoopbackHttp,
                  `${fieldName}.allowedTokenEndpointOrigins[${index}]`,
                ),
              ).origin,
          );
        return {
          method: "client_credentials",
          configUrl: validateCantonServiceUrl(
            config.configUrl,
            allowInsecureLoopbackHttp,
            `${fieldName}.configUrl`,
          ),
          credentials: copyCredentials(),
          ...(normalizedAllowedTokenEndpointOrigins
            ? {
                allowedTokenEndpointOrigins:
                  normalizedAllowedTokenEndpointOrigins,
              }
            : {}),
        };
      }
      default:
        throw new Error(
          `${fieldName}.method must be static, self_signed, or client_credentials`,
        );
    }
  }

  private getOrCreateWalletSdk(): Promise<ICantonWalletSdk> {
    if (!this.walletSdkPromise) {
      let abandoned = false;
      const sdkPromise = this.withOperationTimeout(async () => {
        const sdk = await this.walletSdkFactory.create({
          auth: this.auth,
          ledgerClientUrl: this.ledgerClientUrl,
          allowInsecureLoopbackHttp: this.allowInsecureLoopbackHttp,
          oauthRequestTimeoutMs: this.operationTimeoutMs,
          signal: this.lifecycleAbortController.signal,
        });
        if (this.isShutDown || abandoned) {
          await sdk.dispose?.();
          throw new ServiceUnavailableError(
            "The Canton SDK initialization is no longer active.",
          );
        }
        this.walletSdk = sdk;
        return sdk;
      }, "Canton Wallet SDK initialization").catch((error: unknown) => {
        abandoned = true;
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
