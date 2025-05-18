import type {
  Server as SocketIoServer,
  Socket as SocketIoSocket,
} from "socket.io";

import { Express } from "express";
import Web3, {
  Contract,
  HttpProvider,
  Transaction,
  TransactionReceiptBase,
  WebSocketProvider,
} from "web3";
import { PayableMethodObject } from "web3-eth-contract";

import OAS from "../json/openapi.json";

import { Interface, FunctionFragment, isAddress } from "ethers";

import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  PluginRegistry,
  consensusHasTransactionFinality,
} from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { DeployContractEndpoint } from "./web-services/deploy-contract-v1-endpoint";

import {
  DeployContractV1Request,
  EthContractInvocationType,
  EthContractInvocationWeb3Method,
  InvokeContractV1Request,
  InvokeContractV1Response,
  RunTransactionRequest,
  RunTransactionResponse,
  Web3SigningCredentialGethKeychainPassword,
  Web3SigningCredentialCactiKeychainRef,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
  WatchBlocksV1,
  WatchBlocksV1Options,
  InvokeRawWeb3EthMethodV1Request,
  InvokeRawWeb3EthContractV1Request,
  EthereumTransactionConfig,
  ContractKeychainDefinition,
  GasTransactionConfig,
  ContractJSON,
} from "./generated/openapi/typescript-axios";

import { RunTransactionEndpoint } from "./web-services/run-transaction-v1-endpoint";
import { InvokeContractEndpoint } from "./web-services/invoke-contract-v1-endpoint";
import {
  createWatchBlocksV1Endpoint,
  WatchBlocksV1Endpoint,
} from "./web-services/watch-blocks-v1-endpoint";
import { GetPrometheusExporterMetricsEndpointV1 } from "./web-services/get-prometheus-exporter-metrics-v1-endpoint";
import { InvokeRawWeb3EthMethodEndpoint } from "./web-services/invoke-raw-web3eth-method-v1-endpoint";
import { InvokeRawWeb3EthContractEndpoint } from "./web-services/invoke-raw-web3eth-contract-v1-endpoint";

import {
  isContractJsonDefinition,
  isContractKeychainDefinition,
  isDeployedContractJsonDefinition,
  isGasTransactionConfigEIP1559,
  isGasTransactionConfigLegacy,
  isWeb3SigningCredentialNone,
} from "./types/model-type-guards";
import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { RuntimeError } from "run-time-error-cjs";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";

import {
  Web3StringReturnFormat,
  convertWeb3ReceiptStatusToBool,
} from "./types/util-types";
import { Observable, ReplaySubject } from "rxjs";

export interface RunTransactionV1Exchange {
  request: InvokeContractV1Request;
  response: RunTransactionResponse;
  timestamp: Date;
}

// Used when waiting for WS requests to be send correctly before disconnecting
const waitForWsProviderRequestsTimeout = 5 * 1000; // 5s
const waitForWsProviderRequestsStep = 500; // 500ms
type RunContractDeploymentInput = {
  web3SigningCredential:
    | Web3SigningCredentialCactiKeychainRef
    | Web3SigningCredentialGethKeychainPassword
    | Web3SigningCredentialPrivateKeyHex;
  contractJSON: ContractJSON;
  gasConfig?: GasTransactionConfig;
  constructorArgs?: unknown[];
  value?: string;
};

export type HttpProviderOptions = ConstructorParameters<typeof HttpProvider>[1];
export type WsProviderSocketOptions = ConstructorParameters<
  typeof WebSocketProvider
>[1];
export type WsProviderReconnectOptions = ConstructorParameters<
  typeof WebSocketProvider
>[2];

const defaultWsProviderReconnectOptions: WsProviderReconnectOptions = {
  delay: 500,
  autoReconnect: true,
  maxAttempts: 20,
};

export interface IPluginLedgerConnectorEthereumOptions
  extends ICactusPluginOptions {
  rpcApiHttpHost?: string;
  rpcApiHttpOptions?: HttpProviderOptions;
  rpcApiWsHost?: string;
  rpcApiWsSocketOptions?: WsProviderSocketOptions;
  rpcApiWsReconnectOptions?: WsProviderReconnectOptions;
  logLevel?: LogLevelDesc;
  prometheusExporter?: PrometheusExporter;
  pluginRegistry: PluginRegistry;
}

export class PluginLedgerConnectorEthereum
  implements
    IPluginLedgerConnector<
      DeployContractV1Request,
      RunTransactionResponse,
      RunTransactionRequest,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService
{
  private readonly pluginRegistry: PluginRegistry;
  public prometheusExporter: PrometheusExporter;
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly web3: InstanceType<typeof Web3>;
  private endpoints: IWebServiceEndpoint[] | undefined;
  public static readonly CLASS_NAME = "PluginLedgerConnectorEthereum";
  private watchBlocksSubscriptions: Map<string, WatchBlocksV1Endpoint> =
    new Map();

  private txSubject: ReplaySubject<RunTransactionV1Exchange> =
    new ReplaySubject();

  public get className(): string {
    return PluginLedgerConnectorEthereum.CLASS_NAME;
  }

  private createWeb3WsProvider() {
    if (this.options.rpcApiWsHost) {
      return new WebSocketProvider(
        this.options.rpcApiWsHost,
        this.options.rpcApiWsSocketOptions,
        this.options.rpcApiWsReconnectOptions,
      );
    } else {
      throw new Error(
        "Can't instantiate WebSocketProvider without a valid rpcApiWsHost!",
      );
    }
  }

  private createWeb3Provider() {
    if (this.options.rpcApiHttpHost) {
      this.log.debug(
        "Using Web3 HttpProvider because rpcApiHttpHost was provided",
      );
      return new HttpProvider(
        this.options.rpcApiHttpHost,
        this.options.rpcApiHttpOptions,
      );
    } else if (this.options.rpcApiWsHost) {
      this.log.debug(
        "Using Web3 WebSocketProvider because rpcApiHttpHost is missing but rpcApiWsHost was provided",
      );
      return this.createWeb3WsProvider();
    } else {
      throw new Error(
        "Missing web3js RPC Api host (either HTTP or WS is required)",
      );
    }
  }

  constructor(public readonly options: IPluginLedgerConnectorEthereumOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.web3 = new Web3(this.createWeb3Provider());

    this.instanceId = options.instanceId;
    this.pluginRegistry = options.pluginRegistry as PluginRegistry;
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

    if (!this.options.rpcApiWsReconnectOptions) {
      this.options.rpcApiWsReconnectOptions = defaultWsProviderReconnectOptions;
    }

    this.prometheusExporter.startMetricsCollection();
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getTxSubjectObservable(): Observable<RunTransactionV1Exchange> {
    return this.txSubject.asObservable();
  }

  private async removeWatchBlocksSubscriptionForSocket(socketId: string) {
    try {
      const subscription = this.watchBlocksSubscriptions.get(socketId);
      if (subscription) {
        await subscription.unsubscribe();
        this.watchBlocksSubscriptions.delete(socketId);
        this.log.info(`${socketId} ${WatchBlocksV1.Unsubscribe} OK`);
      }
    } catch (error) {
      this.log.debug(
        `${socketId} ${WatchBlocksV1.Unsubscribe} Failed (possibly already closed)`,
      );
    }
  }

  private async closeWeb3jsConnection(wsProvider?: WebSocketProvider) {
    try {
      if (!wsProvider || typeof wsProvider.SocketConnection === "undefined") {
        this.log.debug("Non-WS provider found - finish");
        return;
      }

      // Wait for WS requests to finish
      const looseWsProvider = wsProvider as any; // Used to access protected fields of WS provider
      let waitForRequestRemainingSteps =
        waitForWsProviderRequestsTimeout / waitForWsProviderRequestsStep;
      while (
        waitForRequestRemainingSteps > 0 &&
        (looseWsProvider._pendingRequestsQueue.size > 0 ||
          looseWsProvider._sentRequestsQueue.size > 0)
      ) {
        this.log.debug(
          `Waiting for pending and sent requests to finish on web3js WS provider (${waitForWsProviderRequestsStep})...`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, waitForWsProviderRequestsStep),
        );
        waitForRequestRemainingSteps--;
      }

      // Disconnect the socket provider
      wsProvider.disconnect();
    } catch (error) {
      this.log.error("Error when disconnecting web3js provider!", error);
    }
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);

    this.log.debug("Remove any remaining web3js subscriptions");
    for (const socketId of this.watchBlocksSubscriptions.keys()) {
      this.log.debug(`${WatchBlocksV1.Unsubscribe} shutdown`);
      await this.removeWatchBlocksSubscriptionForSocket(socketId);
    }

    await this.closeWeb3jsConnection(
      this.web3.currentProvider as unknown as WebSocketProvider,
    );
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  async registerWebServices(
    app: Express,
    wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const { logLevel } = this.options;
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    wsApi.on("connection", (socket: SocketIoSocket) => {
      this.log.info(`New socket connection id ${socket.id}`);

      // WatchBlocksV1Endpoint
      socket.on(
        WatchBlocksV1.Subscribe,
        async (options?: WatchBlocksV1Options) => {
          try {
            const endpoint = createWatchBlocksV1Endpoint({
              web3: this.web3,
              socket,
              logLevel,
              options,
            });
            this.watchBlocksSubscriptions.set(
              socket.id,
              await endpoint.subscribe(),
            );
            this.log.debug(`${endpoint.className} created for ${socket.id}`);
          } catch (error) {
            this.log.error("Error when creating WatchBlocksV1Endpoint:", error);
          }
        },
      );
    });

    // Register JSON-RPC proxy to pass requests directly to ethereum node
    if (this.options.rpcApiHttpHost) {
      const proxyUrl =
        "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-ethereum/json-rpc";
      const targetUrl = this.options.rpcApiHttpHost;
      app.use(
        proxyUrl,
        createProxyMiddleware({
          target: targetUrl,
          changeOrigin: true,
          pathRewrite: {
            [".*"]: "",
          },
          onProxyReq: fixRequestBody,
          logLevel: "warn",
        }),
      );
      this.log.info(`Registered proxy from ${proxyUrl} to ${targetUrl}`);
    }

    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new DeployContractEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new RunTransactionEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new InvokeContractEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetPrometheusExporterMetricsEndpointV1({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new InvokeRawWeb3EthMethodEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new InvokeRawWeb3EthContractEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-ethereum`;
  }

  public async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    return ConsensusAlgorithmFamily.Stake;
  }

  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily =
      await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  /**
   * Verifies that it is safe to call a specific method on an object.
   *
   * @param object Object instance to check whether it has a method with a specific name or not.
   * @param name The name of the method that will be checked if it's usable on `object` or not.
   * @returns Boolean `true` when it IS safe to call the method named `name` on the object.
   * @throws If the object instance is falsy or the method name is a blank string.
   */
  public isSafeToCallObjectMethod(
    object: Record<string, unknown>,
    name: string,
  ): boolean {
    Checks.truthy(
      object,
      `${this.className}#isSafeToCallObjectMethod():contract`,
    );
    Checks.nonBlankString(
      name,
      `${this.className}#isSafeToCallObjectMethod():name`,
    );

    return (
      Object.prototype.hasOwnProperty.call(object, name) &&
      typeof object[name] === "function"
    );
  }

  /**
   * Verifies that it is safe to call a specific method of a Web3 Contract.
   *
   * @param contract The Web3 Contract instance to check whether it has a method with a specific name or not.
   * @param name The name of the method that will be checked if it's usable on `contract` or not.
   * @returns Boolean `true` when it IS safe to call the method named `name` on the contract.
   * @throws If the contract instance is falsy or it's methods object is falsy. Also throws if the method name is a blank string.
   */
  public async isSafeToCallContractMethod(
    contract: InstanceType<typeof Contract>,
    name: string,
  ): Promise<boolean> {
    Checks.truthy(
      contract,
      `${this.className}#isSafeToCallContractMethod():contract`,
    );

    Checks.truthy(
      contract.methods,
      `${this.className}#isSafeToCallContractMethod():contract.methods`,
    );

    Checks.nonBlankString(
      name,
      `${this.className}#isSafeToCallContractMethod():name`,
    );

    return this.isSafeToCallObjectMethod(contract.methods, name);
  }

  /**
   * Simple function for estimating `maxFeePerGas` to sent with transaction.
   * @warn It's not optimized for either speed or cost, consider using more complex solution on production!
   * @param priorityFee what priority tip you plan to include.
   * @returns estimated `maxFeePerGas` value.
   */
  public async estimateMaxFeePerGas(
    priorityFee: number | string = 0,
  ): Promise<string> {
    const pendingBlock = await this.web3.eth.getBlock("pending");
    const baseFee = pendingBlock.baseFeePerGas;
    if (!baseFee) {
      throw new Error(
        "Can't estimate maxFeePerGas - could not get recent baseFeePerGas",
      );
    }
    const estimate = baseFee + BigInt(priorityFee);
    return estimate.toString();
  }

  ////////////////////////////
  // Invoke
  ////////////////////////////

  /**
   * Invoke contract method.
   *
   * @param req contract method and transaction definition
   * @returns transaction receipt
   */
  public async invokeContract(
    req: InvokeContractV1Request,
  ): Promise<InvokeContractV1Response> {
    Checks.truthy(req, "invokeContract() request arg");

    if (isDeployedContractJsonDefinition(req.contract)) {
      return this.runContractInvoke(
        req,
        req.contract.contractAddress,
        req.contract.contractJSON,
      );
    } else if (isContractKeychainDefinition(req.contract)) {
      return this.invokeContractFromKeychain(req, req.contract);
    } else {
      // Exhaustive check
      const unknownContract: never = req.contract;
      throw new Error(
        `Unknown contract definition provided: ${unknownContract}`,
      );
    }
  }

  /**
   *  Invoke contract method using contract instance stored in a keychain plugin.
   *
   * @param req contract method and transaction definition
   * @param contract contract keychain reference
   * @returns transaction receipt
   */
  private async invokeContractFromKeychain(
    req: InvokeContractV1Request,
    contract: ContractKeychainDefinition,
  ): Promise<InvokeContractV1Response> {
    const fnTag = `${this.className}#invokeContract()`;
    Checks.truthy(contract.contractName, `${fnTag} contractName arg`);
    Checks.truthy(contract.keychainId, `${fnTag} keychainId arg`);

    const keychainPlugin = this.pluginRegistry.findOneByKeychainId(
      contract.keychainId,
    );
    if (!keychainPlugin.has(contract.contractName)) {
      throw new Error(
        `${fnTag} Cannot invoke the contract because contractName is not in the keychainPlugin`,
      );
    }
    const contractStr = await keychainPlugin.get(contract.contractName);
    const contractJSON = JSON.parse(contractStr);

    // if not exists a contract deployed, we deploy it
    const networkId = (await this.web3.eth.net.getId()).toString();
    if (
      !contractJSON.networks ||
      !contractJSON.networks[networkId] ||
      !contractJSON.networks[networkId].address
    ) {
      throw new Error(
        `Contract has not been deployed yet on this network (id ${networkId}) - can't invoke!`,
      );
    }

    return this.runContractInvoke(
      req,
      contractJSON.networks[networkId].address,
      contractJSON,
    );
  }

  /**
   * Internal logic for invoking actual transaction given address and ABI.
   *
   * @param req contract method and transaction definition
   * @param contractAddress deployed contract address
   * @param contractJSON contract ABI and bytecode
   * @returns transaction receipt
   */
  private async runContractInvoke(
    req: InvokeContractV1Request,
    contractAddress: string,
    contractJSON: ContractJSON,
  ): Promise<InvokeContractV1Response> {
    const fnTag = `${this.className}#runContractInvoke()`;
    Checks.truthy(req, "runContractInvoke() contractAddress arg");
    Checks.truthy(req, "runContractInvoke() contractJSON arg");

    if (!req.web3SigningCredential) {
      req.web3SigningCredential = {
        type: Web3SigningCredentialType.None,
      };
    }

    let abi;
    if (contractJSON.abi) {
      if (typeof contractJSON.abi === "string") {
        abi = JSON.parse(contractJSON.abi);
      } else {
        abi = contractJSON.abi;
      }
    } else {
      throw new Error(`${fnTag} Contract ABI is necessary`);
    }

    const contractInstance = new this.web3.eth.Contract(abi, contractAddress);
    const isSafeToCall = await this.isSafeToCallContractMethod(
      contractInstance,
      req.methodName,
    );
    if (!isSafeToCall) {
      throw new RuntimeError(
        `Invalid method name provided in request. ${req.methodName} does not exist on the Web3 contract object's "methods" property.`,
      );
    }

    const methodRef = contractInstance.methods[req.methodName] as (
      ...args: unknown[]
    ) => PayableMethodObject;
    Checks.truthy(methodRef, `${fnTag} YourContract.${req.methodName}`);

    const method = methodRef(...req.params);
    if (req.invocationType === EthContractInvocationType.Call) {
      const callOutput = await method.call();
      const success = true;
      return { success, callOutput };
    } else if (req.invocationType === EthContractInvocationType.Send) {
      if (isWeb3SigningCredentialNone(req.web3SigningCredential)) {
        throw new Error(`${fnTag} Cannot deploy contract with pre-signed TX`);
      }
      const web3SigningCredential = req.web3SigningCredential as
        | Web3SigningCredentialPrivateKeyHex
        | Web3SigningCredentialCactiKeychainRef;

      const transactionConfig = {
        from: web3SigningCredential.ethAccount,
        to: contractAddress,
        gasConfig: req.gasConfig,
        value: req.value,
        data: method.encodeABI(),
      };

      const out = await this.transact({
        transactionConfig,
        web3SigningCredential,
        timeoutMs: req.timeoutMs || 60000,
      });
      const success = out.transactionReceipt.status;
      const data = { success, out };

      // create RunTransactionV1Exchange for transaction monitoring
      const receiptData: RunTransactionV1Exchange = {
        request: req,
        response: out,
        timestamp: new Date(),
      };
      this.log.debug(`RunTransactionV1Exchange created ${receiptData}`);
      this.txSubject.next(receiptData);

      return data;
    } else {
      throw new Error(
        `${fnTag} Unsupported invocation type ${req.invocationType}`,
      );
    }
  }

  ////////////////////////////
  // Transact
  ////////////////////////////

  /**
   * Send ethereum transaction.
   *
   * @param req transaction definition.
   * @returns transaction receipt.
   */
  public async transact(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transact()`;

    switch (req.web3SigningCredential.type) {
      case Web3SigningCredentialType.CactiKeychainRef: {
        return await this.transactCactiKeychainRef(req);
      }
      case Web3SigningCredentialType.GethKeychainPassword: {
        return await this.transactGethKeychain(req);
      }
      case Web3SigningCredentialType.PrivateKeyHex: {
        return await this.transactPrivateKey(req);
      }
      case Web3SigningCredentialType.None: {
        if (req.transactionConfig.rawTransaction) {
          return await this.transactSigned(
            req.transactionConfig.rawTransaction,
          );
        } else {
          throw new Error(
            `${fnTag} Expected pre-signed raw transaction ` +
              ` since signing credential is specified as` +
              `Web3SigningCredentialType.NONE`,
          );
        }
      }
      default: {
        throw new Error(
          `${fnTag} Unrecognized Web3SigningCredentialType: ` +
            `${req.web3SigningCredential.type} Supported ones are: ` +
            `${Object.values(Web3SigningCredentialType).join(";")}`,
        );
      }
    }
  }

  /**
   * Send already signed transaction.
   *
   * @param rawTransaction signed transaction payload.
   * @returns transaction receipt.
   */
  public async transactSigned(
    rawTransaction: string,
  ): Promise<RunTransactionResponse> {
    const receipt = (await this.web3.eth.sendSignedTransaction(
      rawTransaction,
      Web3StringReturnFormat,
    )) as TransactionReceiptBase<string, string, string, unknown>;
    this.prometheusExporter.addCurrentTransaction();
    return {
      transactionReceipt: {
        ...receipt,
        status: convertWeb3ReceiptStatusToBool(receipt.status) ?? true,
      },
    };
  }

  /**
   * Wait until receipt for transaction with specified hash is returned.
   * Throws if timeout expires.
   *
   * @param txHash sent transaction hash
   * @param timeoutMs timeout in milliseconds
   * @returns transaction receipt.
   */
  public async pollForTxReceipt(
    txHash: string,
    timeoutMs = 60000,
  ): Promise<TransactionReceiptBase<string, string, string, unknown>> {
    const fnTag = `${this.className}#pollForTxReceipt()`;
    let timedOut = false;
    let tries = 0;
    const startedAt = new Date();

    do {
      try {
        return (await this.web3.eth.getTransactionReceipt(
          txHash,
          Web3StringReturnFormat,
        )) as TransactionReceiptBase<string, string, string, unknown>;
      } catch (error) {
        this.log.debug(
          "pollForTxReceipt getTransactionReceipt failed - (retry)",
        );
      }

      // Sleep for 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));
      tries++;
      timedOut = Date.now() >= startedAt.getTime() + timeoutMs;
    } while (!timedOut);

    throw new Error(`${fnTag} Timed out ${timeoutMs}ms, polls=${tries}`);
  }

  /**
   * Transact with identity stored in Geth node.
   *
   * @param txIn transaction definition.
   * @returns transaction receipt.
   */
  private async transactGethKeychain(
    txIn: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactGethKeychain()`;
    const { transactionConfig, web3SigningCredential } = txIn;
    const { secret } =
      web3SigningCredential as Web3SigningCredentialGethKeychainPassword;

    try {
      const txHash = await this.web3.eth.personal.sendTransaction(
        await this.getTransactionFromTxConfig(transactionConfig),
        secret,
      );
      const transactionReceipt = await this.pollForTxReceipt(txHash);
      return {
        transactionReceipt: {
          ...transactionReceipt,
          status:
            convertWeb3ReceiptStatusToBool(transactionReceipt.status) ?? true,
        },
      };
    } catch (ex) {
      throw new Error(
        `${fnTag} Failed to invoke web3.eth.personal.sendTransaction(). ` +
          `InnerException: ${ex.stack}`,
      );
    }
  }

  /**
   * Transact with private key passed in argument.
   *
   * @param req transaction definition.
   * @returns transaction receipt.
   */
  private async transactPrivateKey(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactPrivateKey()`;
    const { transactionConfig, web3SigningCredential } = req;
    const { secret } =
      web3SigningCredential as Web3SigningCredentialPrivateKeyHex;

    const signedTx = await this.web3.eth.accounts.signTransaction(
      await this.getTransactionFromTxConfig(transactionConfig),
      secret,
    );

    if (signedTx.rawTransaction) {
      return this.transactSigned(signedTx.rawTransaction);
    } else {
      throw new Error(
        `${fnTag} Failed to sign eth transaction. ` +
          `signedTransaction.rawTransaction is blank after .signTransaction().`,
      );
    }
  }

  /**
   * Transact with identity stored in cacti keychain.
   *
   * @param req transaction definition.
   * @returns transaction receipt.
   */
  private async transactCactiKeychainRef(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactCactiKeychainRef()`;
    const { transactionConfig, web3SigningCredential } = req;
    const { ethAccount, keychainEntryKey, keychainId } =
      web3SigningCredential as Web3SigningCredentialCactiKeychainRef;

    // locate the keychain plugin that has access to the keychain backend
    // denoted by the keychainID from the request.
    const keychainPlugin = this.pluginRegistry.findOneByKeychainId(
      keychainId as string,
    );
    Checks.truthy(keychainPlugin, `${fnTag} keychain for ID:"${keychainId}"`);

    // Now use the found keychain plugin to actually perform the lookup of
    // the private key that we need to run the transaction.
    const privateKeyHex = await keychainPlugin?.get(keychainEntryKey as string);

    return this.transactPrivateKey({
      transactionConfig,
      web3SigningCredential: {
        ethAccount,
        type: Web3SigningCredentialType.PrivateKeyHex,
        secret: privateKeyHex,
      },
    });
  }

  /**
   * Convert connector transaction config to web3js transaction object.
   *
   * @param txConfig connector transaction config
   * @returns web3js transaction
   */
  private async getTransactionFromTxConfig(
    txConfig: EthereumTransactionConfig,
  ): Promise<Transaction> {
    const tx: Transaction = {
      from: txConfig.from,
      to: txConfig.to,
      value: txConfig.value,
      nonce: txConfig.nonce,
      data: txConfig.data,
    };

    // Apply gas config to the transaction
    if (txConfig.gasConfig) {
      if (isGasTransactionConfigLegacy(txConfig.gasConfig)) {
        if (isGasTransactionConfigEIP1559(txConfig.gasConfig)) {
          throw new RuntimeError(
            `Detected mixed gasConfig! Use either legacy or EIP-1559 mode. gasConfig - ${JSON.stringify(
              txConfig.gasConfig,
            )}`,
          );
        }
        tx.maxPriorityFeePerGas = txConfig.gasConfig.gasPrice;
        tx.maxFeePerGas = txConfig.gasConfig.gasPrice;
        tx.gasLimit = txConfig.gasConfig.gas;
      } else {
        tx.maxPriorityFeePerGas = txConfig.gasConfig.maxPriorityFeePerGas;
        tx.maxFeePerGas = txConfig.gasConfig.maxFeePerGas;
        tx.gasLimit = txConfig.gasConfig.gasLimit;
      }
    }

    if (tx.maxPriorityFeePerGas && !tx.maxFeePerGas) {
      tx.maxFeePerGas = await this.estimateMaxFeePerGas(
        tx.maxPriorityFeePerGas.toString(),
      );
      this.log.info(
        `Estimated maxFeePerGas of ${tx.maxFeePerGas} because maxPriorityFeePerGas was provided.`,
      );
    }

    // Fill missing gas fields (do it last)
    if (!tx.gasLimit) {
      const estimatedGas = await this.web3.eth.estimateGas(tx);
      this.log.debug(
        `Gas not specified in the transaction values, estimated ${estimatedGas.toString()}`,
      );
      tx.gasLimit = estimatedGas;
    }

    return tx;
  }

  ////////////////////////////
  // Contract Deployment
  ////////////////////////////

  /**
   * Deploy contract to an Ethereum based ledger.
   *
   * @param req contract and transaction definition
   * @returns transaction receipt
   */
  public async deployContract(
    req: DeployContractV1Request,
  ): Promise<RunTransactionResponse> {
    Checks.truthy(req, "deployContract() request arg");

    if (isWeb3SigningCredentialNone(req.web3SigningCredential)) {
      throw new Error(`Cannot deploy contract with pre-signed TX`);
    }

    if (isContractJsonDefinition(req.contract)) {
      return this.runContractDeployment({
        web3SigningCredential: req.web3SigningCredential,
        gasConfig: req.gasConfig,
        constructorArgs: req.constructorArgs,
        value: req.value,
        contractJSON: req.contract.contractJSON,
      });
    } else if (isContractKeychainDefinition(req.contract)) {
      return this.deployContractFromKeychain(req, req.contract);
    } else {
      // Exhaustive check
      const unknownContract: never = req.contract;
      throw new Error(
        `Unknown contract definition provided: ${unknownContract}`,
      );
    }
  }

  /**
   * Internal function for creating and sending contract deployment transaction.
   *
   * @param config deployment configuration
   * @returns transaction receipt
   */
  private async runContractDeployment(
    config: RunContractDeploymentInput,
  ): Promise<RunTransactionResponse> {
    Checks.truthy(config, "runContractDeployment() config arg");

    const mockContract = new this.web3.eth.Contract(config.contractJSON.abi);
    const mockDeployment = mockContract.deploy({
      data: config.contractJSON.bytecode,
      arguments: config.constructorArgs as [],
    });
    const abi = mockDeployment.encodeABI();

    return this.transact({
      transactionConfig: {
        data: abi.startsWith("0x") ? abi : `0x${abi}`,
        from: config.web3SigningCredential.ethAccount,
        gasConfig: config.gasConfig,
        value: config.value,
      },
      web3SigningCredential: config.web3SigningCredential,
    });
  }

  /**
   * Internal function for deploying contract that has it's JSON stored in a keychain plugin.
   *
   * @param req contract and transaction definition
   * @param contract contract on keychain definition
   * @returns transaction receipt
   */
  private async deployContractFromKeychain(
    req: DeployContractV1Request,
    contract: ContractKeychainDefinition,
  ): Promise<RunTransactionResponse> {
    Checks.truthy(req, "deployContractFromKeychain() request arg");
    Checks.truthy(req, "deployContractFromKeychain() contract arg");

    // Obtain the contractJSON from keychainPlugin
    const keychainPlugin = this.pluginRegistry.findOneByKeychainId(
      contract.keychainId,
    );
    Checks.truthy(
      keychainPlugin,
      `Deployment contract keychain with ID:"${contract.keychainId}"`,
    );
    if (!keychainPlugin.has(contract.contractName)) {
      throw new Error(
        `Cannot create an instance of the contract because the contractName sent and the contractName of the JSON doesn't match`,
      );
    }
    const contractStr = await keychainPlugin.get(contract.contractName);
    const contractJSON = JSON.parse(contractStr);

    const receipt = await this.runContractDeployment({
      web3SigningCredential: req.web3SigningCredential as
        | Web3SigningCredentialCactiKeychainRef
        | Web3SigningCredentialGethKeychainPassword
        | Web3SigningCredentialPrivateKeyHex,
      gasConfig: req.gasConfig,
      constructorArgs: req.constructorArgs,
      value: req.value,
      contractJSON,
    });

    // Save the contract address in the keychainPlugin
    if (
      receipt.transactionReceipt.status &&
      receipt.transactionReceipt.contractAddress &&
      receipt.transactionReceipt.contractAddress != null
    ) {
      this.log.info(
        "Contract deployed successfully, saving address in keychain entry",
      );
      const networkId = await this.web3.eth.net.getId();
      const address = { address: receipt.transactionReceipt.contractAddress };
      contractJSON.networks = { [networkId.toString()]: address };
      keychainPlugin.set(contract.contractName, JSON.stringify(contractJSON));
    }

    return receipt;
  }

  ////////////////////////////
  // Invoke Web3 Methods
  ////////////////////////////

  /**
   * Low level function to call any method from web3.eth.
   * Should be used only if given functionality is not already covered by another endpoint.
   *
   * @param args web3.eth method and arguments
   * @returns method response
   */
  public async invokeRawWeb3EthMethod(
    args: InvokeRawWeb3EthMethodV1Request,
  ): Promise<any> {
    this.log.debug("invokeRawWeb3EthMethod input:", JSON.stringify(args));

    Checks.nonBlankString(
      args.methodName,
      "web3.eth method string must not be empty",
    );

    const looseWeb3Eth = this.web3.eth as any;
    // web3.eth methods in 4.X are stored in parent class
    const isSafeToCall =
      this.isSafeToCallObjectMethod(looseWeb3Eth, args.methodName) ||
      this.isSafeToCallObjectMethod(
        Object.getPrototypeOf(looseWeb3Eth),
        args.methodName,
      );
    if (!isSafeToCall) {
      throw new RuntimeError(
        `Invalid method name provided in request. ${args.methodName} does not exist on the Web3.Eth object.`,
      );
    }

    const web3MethodArgs = args.params || [];
    return looseWeb3Eth[args.methodName](...web3MethodArgs);
  }

  /**
   * Low level function to invoke contract.
   * Should be used only if given functionality is not already covered by another endpoint.
   *
   * @param args web3 contract method and arguments
   * @returns method response
   */
  public async invokeRawWeb3EthContract(
    args: InvokeRawWeb3EthContractV1Request,
  ): Promise<any> {
    this.log.debug("invokeRawWeb3EthContract input:", JSON.stringify(args));

    const contractMethodArgs = args.contractMethodArgs || [];

    if (
      !Object.values(EthContractInvocationWeb3Method).includes(
        args.invocationType,
      )
    ) {
      throw new Error(
        `Unknown invocationType (${args.invocationType}), must be specified in EthContractInvocationWeb3Method`,
      );
    }

    const contract = new this.web3.eth.Contract(args.abi, args.address);

    const isSafeToCall = await this.isSafeToCallContractMethod(
      contract,
      args.contractMethod,
    );
    if (!isSafeToCall) {
      throw new RuntimeError(
        `Invalid method name provided in request. ${args.contractMethod} does not exist on the Web3 contract object's "methods" property.`,
      );
    }
    const abiInterface = new Interface(args.abi);
    const methodFragment: FunctionFragment | null = abiInterface.getFunction(
      args.contractMethod,
    );
    if (!methodFragment) {
      throw new RuntimeError(
        `Method ${args.contractMethod} not found in ABI interface.`,
      );
    }

    // validation for the contractMethod
    if (methodFragment.inputs.length !== contractMethodArgs.length) {
      throw new Error(
        `Incorrect number of arguments for ${args.contractMethod}`,
      );
    }
    methodFragment.inputs.forEach((input, index) => {
      const argValue = contractMethodArgs[index];
      const isValidType = typeof argValue === input.type;

      if (!isValidType) {
        throw new Error(
          `Invalid type for argument ${index + 1} in ${args.contractMethod}`,
        );
      }
    });

    //validation for the invocationParams
    const invocationParams = args.invocationParams as Record<string, any>;
    const allowedKeys = ["from", "gasLimit", "gasPrice", "value"];

    if (invocationParams) {
      Object.keys(invocationParams).forEach((key) => {
        if (!allowedKeys.includes(key)) {
          throw new Error(`Invalid key '${key}' in invocationParams`);
        }
        if (key === "from" && !isAddress(invocationParams[key])) {
          throw new Error(`Invalid type for 'from' in invocationParams`);
        }
        if (key === "gasLimit" && typeof invocationParams[key] !== "number") {
          throw new Error(`Invalid type for '${key}' in invocationParams`);
        }
        if (key === "gasPrice" && typeof invocationParams[key] !== "number") {
          throw new Error(`Invalid type for '${key}'in invocationParams`);
        }
      });
    }

    const methodRef = contract.methods[args.contractMethod] as (
      ...args: unknown[]
    ) => any;
    return methodRef(...contractMethodArgs)[args.invocationType](
      args.invocationParams,
    );
  }
}
