/**
 * Main IrohaV2 connector plugin class logic.
 */

import type { Express } from "express";
import type {
  Server as SocketIoServer,
  Socket as SocketIoSocket,
} from "socket.io";

import OAS from "../json/openapi.json";

import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  consensusHasTransactionFinality,
  PluginRegistry,
} from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import {
  IrohaInstruction,
  IrohaQuery,
  TransactRequestV1,
  TransactResponseV1,
  Iroha2BaseConfig,
  Iroha2KeyJson,
  Iroha2KeyPair,
  KeychainReference,
  QueryRequestV1,
  QueryResponseV1,
  IrohaInstructionRequestV1,
  WatchBlocksV1,
  WatchBlocksOptionsV1,
  GenerateTransactionRequestV1,
  IrohaTransactionParametersV1,
} from "./generated/openapi/typescript-axios";

import { Iroha2TransactEndpointV1 } from "./web-services/transact-v1-endpoint";
import { Iroha2QueryEndpointV1 } from "./web-services/query-v1-endpoint";
import { Iroha2WatchBlocksEndpointV1 } from "./web-services/watch-blocks-v1-endpoint";
import { Iroha2GenerateTransactionEndpointV1 } from "./web-services/generate-transaction-v1-endpoint";

import { KeyPair } from "@iroha2/crypto-core";
import {
  CactusIrohaV2Client,
  generateIrohaV2KeyPair,
  TransactionPayloadParameters,
} from "./cactus-iroha-sdk-wrapper/client";
import { CactusIrohaV2QueryClient } from "./cactus-iroha-sdk-wrapper/query";
import { LengthOf, stringifyBigIntReplacer } from "./utils";
import { createAccountId } from "./cactus-iroha-sdk-wrapper/data-factories";

/**
 * Input options for PluginLedgerConnectorIroha2.
 */
export interface IPluginLedgerConnectorIroha2Options
  extends ICactusPluginOptions {
  pluginRegistry: PluginRegistry;
  logLevel?: LogLevelDesc;
  defaultConfig?: Iroha2BaseConfig;
}

/**
 * Iroha V2 connector plugin.
 */
export class PluginLedgerConnectorIroha2
  implements
    IPluginLedgerConnector<never, never, TransactRequestV1, TransactResponseV1>,
    ICactusPlugin,
    IPluginWebService
{
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly defaultConfig: Iroha2BaseConfig | undefined;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private runningWatchBlocksMonitors = new Set<Iroha2WatchBlocksEndpointV1>();

  public readonly className: string;

  constructor(public readonly options: IPluginLedgerConnectorIroha2Options) {
    this.className = this.constructor.name;
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    const level = this.options.logLevel || "info";
    this.log = LoggerProvider.getOrCreate({ level, label: this.className });

    this.instanceId = options.instanceId;

    this.defaultConfig = options.defaultConfig;
    // Remove proto in case we use merge method vulnerable to proto pollution
    if (this.defaultConfig instanceof Object) {
      Object.setPrototypeOf(this.defaultConfig, null);
    }
  }

  /**
   * Iroha V2 ledger consensus family
   */
  async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    return ConsensusAlgorithmFamily.Authority;
  }

  /**
   * Iroha V2 ledger transaction finality
   */
  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily =
      await this.getConsensusAlgorithmFamily();
    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  /**
   *
   * @returns Open API JSON specification.
   */
  public getOpenApiSpec(): unknown {
    return OAS;
  }

  /**
   * @warning Method not implemented - do not use!
   */
  public deployContract(): Promise<never> {
    throw new Error("Method not implemented.");
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Callback that should be called during plugin initialization.
   * @returns Void
   */
  public async onPluginInit(): Promise<unknown> {
    // Nothing to do...
    return;
  }

  /**
   * Callback that must be called during shutdown.
   * Will cleanup allocated resources, stop the connections.
   */
  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
    this.runningWatchBlocksMonitors.forEach((m) => m.close());
    this.runningWatchBlocksMonitors.clear();
  }

  /**
   * Register all supported WebSocket endpoints on specific socket connected to the client.
   *
   * @param socket Connected socket
   * @returns `socket` from input arg.
   */
  private registerWatchBlocksSocketIOEndpoint(
    socket: SocketIoSocket,
  ): SocketIoSocket {
    this.log.debug("Register WatchBlocks.Subscribe handler.");

    socket.on(
      WatchBlocksV1.Subscribe,
      async (options: WatchBlocksOptionsV1) => {
        const apiURL = options.baseConfig?.torii.apiURL;
        if (!apiURL) {
          socket.emit(WatchBlocksV1.Error, {
            message: "WatchBlocksV1.Subscribe error",
            error: "WatchBlocksV1.Subscribe requires apiURL torii parameter",
          });
          return socket;
        }

        // Start monitoring
        const monitor = new Iroha2WatchBlocksEndpointV1({
          socket,
          logLevel: this.options.logLevel,
          apiURL,
        });
        this.runningWatchBlocksMonitors.add(monitor);
        await monitor.subscribe(options);
        this.log.debug(
          "Running monitors count:",
          this.runningWatchBlocksMonitors.size,
        );

        socket.on("disconnect", async () => {
          this.runningWatchBlocksMonitors.delete(monitor);
          this.log.debug(
            "Running monitors count:",
            this.runningWatchBlocksMonitors.size,
          );
        });
      },
    );

    return socket;
  }

  /**
   * Register Rest and WebSocket services on servers supplied in argument.
   * Should be called by cactus cmd server.
   *
   * @param app ExpressJS app object.
   * @param wsApi SocketIO server object.
   * @returns registered endpoints list.
   */
  async registerWebServices(
    app: Express,
    wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    // Add custom replacer to handle bigint responses correctly
    app.set("json replacer", stringifyBigIntReplacer);

    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    if (wsApi) {
      wsApi.on("connection", (socket: SocketIoSocket) => {
        this.log.debug(`New Socket connected. ID=${socket.id}`);
        this.registerWatchBlocksSocketIOEndpoint(socket);
      });
    }

    return webServices;
  }

  /**
   * Get list of rest endpoints supported by this connector plugin.
   * The list is initialized once and reused on subsequent calls.
   *
   * @returns List of web service endpoints.
   */
  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const endpoints: IWebServiceEndpoint[] = [
      new Iroha2TransactEndpointV1({
        connector: this,
        logLevel: this.options.logLevel,
      }),
      new Iroha2QueryEndpointV1({
        connector: this,
        logLevel: this.options.logLevel,
      }),
      new Iroha2GenerateTransactionEndpointV1({
        connector: this,
        logLevel: this.options.logLevel,
      }),
    ];

    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-iroha2`;
  }

  /**
   * Read entry with `keychainRef` from keychain with id `keychainId`.
   * Assume it's stored in JSON-compatible format.
   *
   * @param keychainId keychain plugin ID.
   * @param keychainRef entry key.
   * @returns parsed entry value.
   */
  private async getFromKeychain(keychainId: string, keychainRef: string) {
    const keychain =
      this.options.pluginRegistry.findOneByKeychainId(keychainId);
    return JSON.parse(await keychain.get(keychainRef));
  }

  /**
   * Return Iroha V2 SDK client compatible key pair object.
   *
   * @param signingCredentials Credentials received from the client in the request.
   * @returns Iroha V2 SDK `KeyPair` object.
   */
  private async getSigningKeyPair(
    signingCredentials: Iroha2KeyPair | KeychainReference,
  ): Promise<KeyPair> {
    Checks.truthy(
      signingCredentials,
      "getSigningKeyPair() signingCredentials arg",
    );

    let publicKeyString: string;
    let privateKeyJson: Iroha2KeyJson;
    if ("keychainId" in signingCredentials) {
      this.log.debug("getSigningKeyPair() read from keychain plugin");
      const keychainStoredKey = await this.getFromKeychain(
        signingCredentials.keychainId,
        signingCredentials.keychainRef,
      );
      publicKeyString = keychainStoredKey.publicKey;
      privateKeyJson = keychainStoredKey.privateKey;
    } else {
      this.log.debug(
        "getSigningKeyPair() read directly from signingCredentials",
      );
      publicKeyString = signingCredentials.publicKey;
      privateKeyJson = signingCredentials.privateKey;
    }

    Checks.truthy(publicKeyString, "getSigningKeyPair raw public key");
    Checks.truthy(privateKeyJson, "getSigningKeyPair raw private key json");

    return generateIrohaV2KeyPair(publicKeyString, privateKeyJson);
  }

  /**
   * Create Cactus IrohaV2 client using both defaultConfig (defined during class creation)
   * and config specified in arg.
   *
   * @param baseConfig Iroha V2 base connection configuration.
   * @returns `CactusIrohaV2Client`
   */
  public async createClient(
    baseConfig?: Iroha2BaseConfig,
  ): Promise<CactusIrohaV2Client> {
    if (!baseConfig && !this.defaultConfig) {
      throw new Error(
        "createClient() called without valid Iroha config - fail",
      );
    }

    // Merge default config with config passed to this function
    const mergedConfig = { ...this.defaultConfig, ...baseConfig };

    if (!mergedConfig.torii) {
      throw new Error("torii is missing in combined configuration");
    }

    // Parse signing key pair
    let keyPair: KeyPair | undefined;
    if (mergedConfig.signingCredential) {
      keyPair = await this.getSigningKeyPair(mergedConfig.signingCredential);
    }

    // Parse account ID
    if (!mergedConfig.accountId) {
      throw new Error("accountId is missing in combined configuration");
    }
    const accountId = createAccountId(
      mergedConfig.accountId.name,
      mergedConfig.accountId.domainId,
    );

    return new CactusIrohaV2Client(
      {
        apiURL: mergedConfig.torii.apiURL,
        telemetryURL: mergedConfig.torii.telemetryURL,
      },
      accountId,
      keyPair,
      this.options.logLevel,
    );
  }

  /**
   * Get context for specific query (e.g. it `request` or `payload` methods.).
   *
   * @param client `CactusIrohaV2QueryClient` instance.
   * @param query Name of the query (`IrohaQuery`).
   *
   * @returns Query Context
   */
  public getQueryContext(
    client: CactusIrohaV2QueryClient,
    query: IrohaQuery,
  ): {
    request: (...params: any[]) => Promise<unknown>;
    payload: (...params: any[]) => Promise<Uint8Array>;
    requestSigned: (signedPayload: ArrayBufferView) => Promise<unknown>;
  } {
    switch (query) {
      case IrohaQuery.FindAllDomains:
        return client.findAllDomains;
      case IrohaQuery.FindDomainById:
        return client.findDomainById;
      case IrohaQuery.FindAssetDefinitionById:
        return client.findAssetDefinitionById;
      case IrohaQuery.FindAllAssetsDefinitions:
        return client.findAllAssetsDefinitions;
      case IrohaQuery.FindAssetById:
        return client.findAssetById;
      case IrohaQuery.FindAllAssets:
        return client.findAllAssets;
      case IrohaQuery.FindAllPeers:
        return client.findAllPeers;
      case IrohaQuery.FindAccountById:
        return client.findAccountById;
      case IrohaQuery.FindAllAccounts:
        return client.findAllAccounts;
      case IrohaQuery.FindAllTransactions:
        return client.findAllTransactions;
      case IrohaQuery.FindTransactionByHash:
        return client.findTransactionByHash;
      case IrohaQuery.FindAllBlocks:
        return client.findAllBlocks;
      default:
        const unknownType: never = query;
        throw new Error(
          `Unknown IrohaV2 query - '${unknownType}'. Check name and connector version.`,
        );
    }
  }

  /**
   * Helper function used to safely check that required number of parameters were supplied in the request.
   *
   * @param params Parameter list from the request.
   * @param expectedCount Expected parameter count
   * @param functionName Function that needs specified number of args (used for error logging only)
   *
   * @returns List of checked parameters (of `expectedCount` length).
   */
  private checkArgsCount(
    params: unknown[] | undefined,
    expectedCount: number,
    functionName: string,
  ): unknown[] {
    if (!params) {
      throw new Error(
        `Error [${functionName}] - Missing required parameters in request.`,
      );
    }

    const requiredParams = params.slice(0, expectedCount);

    if (requiredParams.length < expectedCount) {
      throw new Error(
        `Error [${functionName}] - No enough parameters. Expected: ${expectedCount}, got: ${requiredParams.length}`,
      );
    }

    return requiredParams;
  }

  /**
   * Validate required parameters and call transact method
   * (will add instruction to the list of operations to be executed)
   *
   * @note `expectedCount` must be equal to number of args required by `transactFunction`,
   * otherwise the code will not compile (this is intended safety-check)
   *
   * @param client `CactusIrohaV2Client` object.
   * @param transactFunction Transact function to be executed
   * @param params Parameter list from the request.
   * @param expectedCount Expected parameter count
   */
  private addTransactionWithCheckedParams<
    T extends (...args: any[]) => unknown,
  >(
    client: CactusIrohaV2Client,
    transactFunction: T,
    params: unknown[] | undefined,
    expectedCount: LengthOf<Parameters<T>>,
  ): void {
    const validatedArgs = this.checkArgsCount(
      params,
      expectedCount,
      transactFunction.name,
    );
    transactFunction.apply(client, validatedArgs);
  }

  /**
   * Loop through each instruction in `reqInstruction` and add them to current transaction session in `client`.
   *
   * @param client `CactusIrohaV2Client` instance.
   * @param reqInstruction Single or list of Iroha instructions to be added.
   */
  private processInstructionsRequests(
    client: CactusIrohaV2Client,
    reqInstruction: IrohaInstructionRequestV1 | IrohaInstructionRequestV1[],
  ): void {
    Checks.truthy(client, "processInstructionsRequests client");
    Checks.truthy(
      reqInstruction,
      "processInstructionsRequests instructions in request",
    );

    // Convert single instruction scenario to list with one element
    // (both single and multiple instructions are supported)
    let instructions: IrohaInstructionRequestV1[];
    if (Array.isArray(reqInstruction)) {
      instructions = reqInstruction;
    } else {
      instructions = [reqInstruction];
    }

    // Each command adds an instruction to a list included in the final transaction.
    instructions.forEach((cmd) => {
      switch (cmd.name) {
        case IrohaInstruction.RegisterDomain:
          this.addTransactionWithCheckedParams(
            client,
            CactusIrohaV2Client.prototype.registerDomain,
            cmd.params,
            1,
          );
          break;
        case IrohaInstruction.RegisterAssetDefinition:
          this.addTransactionWithCheckedParams(
            client,
            CactusIrohaV2Client.prototype.registerAssetDefinition,
            cmd.params,
            4,
          );
          break;
        case IrohaInstruction.RegisterAsset:
          this.addTransactionWithCheckedParams(
            client,
            CactusIrohaV2Client.prototype.registerAsset,
            cmd.params,
            5,
          );
          break;
        case IrohaInstruction.MintAsset:
          this.addTransactionWithCheckedParams(
            client,
            CactusIrohaV2Client.prototype.mintAsset,
            cmd.params,
            5,
          );
          break;
        case IrohaInstruction.BurnAsset:
          this.addTransactionWithCheckedParams(
            client,
            CactusIrohaV2Client.prototype.burnAsset,
            cmd.params,
            5,
          );
          break;
        case IrohaInstruction.TransferAsset:
          this.addTransactionWithCheckedParams(
            client,
            CactusIrohaV2Client.prototype.transferAsset,
            cmd.params,
            7,
          );
          break;
        case IrohaInstruction.RegisterAccount:
          this.addTransactionWithCheckedParams(
            client,
            CactusIrohaV2Client.prototype.registerAccount,
            cmd.params,
            4,
          );
          break;
        default:
          const unknownType: never = cmd.name;
          throw new Error(
            `Unknown IrohaV2 instruction - '${unknownType}'. Check name and connector version.`,
          );
      }
    });
  }

  /**
   * Try parsing transaction parameter from request to IrohaV2 SDK compatible format.
   * If input is empty, undefined is returned.
   *
   * @param reqParams transaction parameters from connector request.
   * @returns `TransactionPayloadParameters` or `undefined`
   */
  private tryParseTransactionParams(
    reqParams?: IrohaTransactionParametersV1,
  ): TransactionPayloadParameters | undefined {
    if (!reqParams) {
      return undefined;
    }

    return {
      ttl: reqParams.ttl ? BigInt(reqParams.ttl) : undefined,
      creationTime: reqParams.creationTime
        ? BigInt(reqParams.creationTime)
        : undefined,
      nonce: reqParams.nonce,
    };
  }

  /**
   * Transact endpoint logic.
   * To submit transaction you must provide either signed transaction payload or list of instructions with signingCredential.
   *
   * @param req Request object.
   *
   * @returns Status of the operation.
   */
  public async transact(req: TransactRequestV1): Promise<TransactResponseV1> {
    const fnTag = `${this.className}:transact()`;
    const client = await this.createClient(req.baseConfig);

    try {
      if (req.transaction) {
        this.processInstructionsRequests(client, req.transaction.instruction);
        return await client.send(
          this.tryParseTransactionParams(req.transaction.params),
          req.waitForCommit,
        );
      } else if (req.signedTransaction) {
        const signedTxB64 = Buffer.from(req.signedTransaction, "base64");
        const transactionBinary = Uint8Array.from(signedTxB64);

        return await client.sendSignedPayload(
          transactionBinary,
          req.waitForCommit,
        );
      } else {
        const eMsg =
          `${fnTag} To submit transaction you must provide either signed transaction` +
          ` payload (.signedTransaction) or list of instructions with signingCredential`;
        throw new Error(eMsg);
      }
    } finally {
      client.free();
    }
  }

  /**
   * Query endpoint logic.
   * To send query request you must provide either signed query payload or query definition with signingCredential.
   *
   * @param req Request object.
   *
   * @returns Response from the query.
   */
  public async query(req: QueryRequestV1): Promise<QueryResponseV1> {
    const client = await this.createClient(req.baseConfig);

    try {
      if (req.query) {
        const queryContext = this.getQueryContext(
          client.query,
          req.query.query,
        );

        const params = req.query.params ?? [];
        return {
          response: await queryContext.request(...params),
        };
      } else if (req.signedQuery) {
        const queryContext = this.getQueryContext(
          client.query,
          req.signedQuery.query,
        );

        const payloadBuffer = Buffer.from(req.signedQuery.payload, "base64");
        const queryBinary = Uint8Array.from(payloadBuffer);

        return {
          response: await queryContext.requestSigned(queryBinary),
        };
      } else {
        throw new Error(
          "To submit transaction you must provide either signed transaction payload or query description with signingCredential",
        );
      }
    } finally {
      client.free();
    }
  }

  /**
   * Query endpoint logic.
   *
   * @param req Request object.
   * @returns Binary unsigned transaction.
   */
  public async generateTransaction(
    req: GenerateTransactionRequestV1,
  ): Promise<string> {
    const client = await this.createClient(req.baseConfig);

    try {
      if ("instruction" in req.request) {
        this.processInstructionsRequests(client, req.request.instruction);
        const txParams = this.tryParseTransactionParams(req.request.params);
        const payloadTypedArray = client.getTransactionPayloadBuffer(txParams);
        const payloadBuffer = Buffer.from(payloadTypedArray);
        const payloadBase64 = payloadBuffer.toString("base64");
        return payloadBase64;
      } else if ("query" in req.request) {
        const queryContext = this.getQueryContext(
          client.query,
          req.request.query,
        );

        const params = req.request.params ?? [];
        const payloadTypedArray = await queryContext.payload(...params);
        const payloadBuffer = Buffer.from(payloadTypedArray);
        const payloadBase64 = payloadBuffer.toString("base64");
        return payloadBase64;
      } else {
        throw new Error("Missing required transaction or query definition");
      }
    } finally {
      client.free();
    }
  }
}
