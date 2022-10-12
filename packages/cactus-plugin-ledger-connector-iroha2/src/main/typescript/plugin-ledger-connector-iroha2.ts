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

import { TransactEndpoint } from "./web-services/transact-endpoint";
import { QueryEndpoint } from "./web-services/query-endpoint";
import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";
import { GenerateTransactionEndpoint } from "./web-services/generate-transaction-endpoint";

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
    IPluginWebService {
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly defaultConfig: Iroha2BaseConfig | undefined;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private runningWatchBlocksMonitors = new Set<WatchBlocksV1Endpoint>();

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
    const currentConsensusAlgorithmFamily = await this.getConsensusAlgorithmFamily();
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
        // Get client
        const cactusIrohaClient = await this.getClient(options.baseConfig);

        // Start monitoring
        const monitor = new WatchBlocksV1Endpoint({
          socket,
          logLevel: this.options.logLevel,
          torii: cactusIrohaClient.irohaToriiClient,
        });
        this.runningWatchBlocksMonitors.add(monitor);
        await monitor.subscribe(options);
        this.log.debug(
          "Running monitors count:",
          this.runningWatchBlocksMonitors.size,
        );

        socket.on("disconnect", async () => {
          cactusIrohaClient.clear();
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
      new TransactEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      }),
      new QueryEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      }),
      new GenerateTransactionEndpoint({
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
    const keychain = this.options.pluginRegistry.findOneByKeychainId(
      keychainId,
    );
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
  public async getClient(
    baseConfig?: Iroha2BaseConfig,
  ): Promise<CactusIrohaV2Client> {
    if (!baseConfig && !this.defaultConfig) {
      throw new Error("getClient() called without valid Iroha config - fail");
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

    // TODO - confirm which args are optional and remove type casts accordingly
    return new CactusIrohaV2Client(
      {
        apiURL: mergedConfig.torii.apiURL as string,
        telemetryURL: mergedConfig.torii.telemetryURL as string,
      },
      accountId,
      keyPair,
      this.options.logLevel,
    );
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
    T extends (...args: any[]) => unknown
  >(
    client: CactusIrohaV2Client,
    transactFunction: T,
    params: unknown[] | undefined,
    expectedCount: LengthOf<Parameters<T>>,
  ): void {
    transactFunction.apply(
      client,
      this.checkArgsCount(params, expectedCount, transactFunction.name),
    );
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
   * @returns Status of the operation.
   */
  public async transact(req: TransactRequestV1): Promise<TransactResponseV1> {
    const client = await this.getClient(req.baseConfig);

    try {
      if (req.transaction) {
        this.processInstructionsRequests(client, req.transaction.instruction);
        await client.send(
          this.tryParseTransactionParams(req.transaction.params),
        );
      } else if (req.signedTransaction) {
        const transactionBinary = Uint8Array.from(
          Object.values(req.signedTransaction),
        );
        await client.sendSignedPayload(transactionBinary);
      } else {
        throw new Error(
          "To submit transaction you must provide either signed transaction payload or list of instructions with signingCredential",
        );
      }

      return {
        status: "OK",
      };
    } finally {
      client.free();
    }
  }

  /**
   * Generate raw, unsigned transaction payload from instructions in request.
   * Can be signed on the client side and send to the transact endpoint.
   *
   * @param req Request object.
   * @returns Binary unsigned transaction.
   */
  public async generateTransaction(
    req: GenerateTransactionRequestV1,
  ): Promise<Uint8Array> {
    const client = await this.getClient(req.baseConfig);

    try {
      this.processInstructionsRequests(client, req.transaction.instruction);
      return client.getTransactionPayloadBuffer(
        this.tryParseTransactionParams(req.transaction.params),
      );
    } finally {
      client.free();
    }
  }

  /**
   * Validate required parameters and call the query method.
   * Do not use for queries that does not require any parameters.
   *
   * @note `expectedCount` must be equal to number of args required by `transactFunction`,
   * otherwise the code will not compile (this is intended safety-check)
   *
   * @param client `CactusIrohaV2Client` object.
   * @param queryFunction Query function to be executed
   * @param params Parameter list from the request.
   * @param expectedCount Expected parameter count
   * @returns Query result.
   */
  private async runQueryWithCheckedParams<
    T extends (...args: any[]) => Promise<unknown>
  >(
    client: CactusIrohaV2Client,
    queryFunction: T,
    params: unknown[] | undefined,
    expectedCount: LengthOf<Parameters<T>>,
  ): Promise<QueryResponseV1> {
    return {
      response: await queryFunction.apply(
        client.query,
        this.checkArgsCount(params, expectedCount, queryFunction.name),
      ),
    };
  }

  /**
   * Query endpoint logic.
   *
   * @param req Request with a query name.
   * @returns Response from the query.
   */
  public async query(req: QueryRequestV1): Promise<QueryResponseV1> {
    const client = await this.getClient(req.baseConfig);

    try {
      switch (req.queryName) {
        case IrohaQuery.FindAllDomains:
          return {
            response: await client.query.findAllDomains(),
          };
        case IrohaQuery.FindDomainById:
          return await this.runQueryWithCheckedParams(
            client,
            CactusIrohaV2QueryClient.prototype.findDomainById,
            req.params,
            1,
          );
        case IrohaQuery.FindAssetDefinitionById:
          return await this.runQueryWithCheckedParams(
            client,
            CactusIrohaV2QueryClient.prototype.findAssetDefinitionById,
            req.params,
            2,
          );
        case IrohaQuery.FindAllAssetsDefinitions:
          return {
            response: await client.query.findAllAssetsDefinitions(),
          };
        case IrohaQuery.FindAssetById:
          return await this.runQueryWithCheckedParams(
            client,
            CactusIrohaV2QueryClient.prototype.findAssetById,
            req.params,
            4,
          );
        case IrohaQuery.FindAllAssets:
          return {
            response: await client.query.findAllAssets(),
          };
        case IrohaQuery.FindAllPeers:
          return {
            response: await client.query.findAllPeers(),
          };
        case IrohaQuery.FindAccountById:
          return await this.runQueryWithCheckedParams(
            client,
            CactusIrohaV2QueryClient.prototype.findAccountById,
            req.params,
            2,
          );
        case IrohaQuery.FindAllAccounts:
          return {
            response: await client.query.findAllAccounts(),
          };
        case IrohaQuery.FindAllTransactions:
          return {
            response: await client.query.findAllTransactions(),
          };
        case IrohaQuery.FindTransactionByHash:
          return await this.runQueryWithCheckedParams(
            client,
            CactusIrohaV2QueryClient.prototype.findTransactionByHash,
            req.params,
            1,
          );
        case IrohaQuery.FindAllBlocks:
          return {
            response: await client.query.findAllBlocks(),
          };
        default:
          const unknownType: never = req.queryName;
          throw new Error(
            `Unknown IrohaV2 query - '${unknownType}'. Check name and connector version.`,
          );
      }
    } finally {
      client.free();
    }
  }
}
