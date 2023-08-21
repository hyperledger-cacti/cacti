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
import { NewHeadsSubscription } from "web3-eth";
import { PayableMethodObject } from "web3-eth-contract";

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
  PluginRegistry,
  consensusHasTransactionFinality,
} from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { DeployContractSolidityBytecodeEndpoint } from "./web-services/deploy-contract-solidity-bytecode-endpoint";
import { DeployContractSolidityBytecodeJsonObjectEndpoint } from "./web-services/deploy-contract-solidity-bytecode-endpoint-json-object";

import {
  DeployContractSolidityBytecodeV1Request,
  DeployContractSolidityBytecodeJsonObjectV1Request,
  DeployContractSolidityBytecodeV1Response,
  EthContractInvocationType,
  EthContractInvocationWeb3Method,
  InvokeContractV1Request,
  InvokeContractJsonObjectV1Request,
  InvokeContractV1Response,
  RunTransactionRequest,
  RunTransactionResponse,
  Web3SigningCredentialGethKeychainPassword,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
  WatchBlocksV1,
  WatchBlocksV1Options,
  InvokeRawWeb3EthMethodV1Request,
  InvokeRawWeb3EthContractV1Request,
  EthereumTransactionConfig,
} from "./generated/openapi/typescript-axios";

import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint";
import { InvokeContractEndpoint } from "./web-services/invoke-contract-endpoint";
import { InvokeContractJsonObjectEndpoint } from "./web-services/invoke-contract-endpoint-json-object";
import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";
import { GetPrometheusExporterMetricsEndpointV1 } from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";
import { InvokeRawWeb3EthMethodEndpoint } from "./web-services/invoke-raw-web3eth-method-v1-endpoint";
import { InvokeRawWeb3EthContractEndpoint } from "./web-services/invoke-raw-web3eth-contract-v1-endpoint";

import {
  isGasTransactionConfigEIP1559,
  isGasTransactionConfigLegacy,
  isWeb3SigningCredentialNone,
} from "./types/model-type-guards";
import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { RuntimeError } from "run-time-error";
import {
  Web3StringReturnFormat,
  convertWeb3ReceiptStatusToBool,
} from "./types/util-types";

// Used when waiting for WS requests to be send correctly before disconnecting
const waitForWsProviderRequestsTimeout = 5 * 1000; // 5s
const waitForWsProviderRequestsStep = 500; // 500ms

export interface IPluginLedgerConnectorEthereumOptions
  extends ICactusPluginOptions {
  rpcApiHttpHost: string;
  rpcApiWsHost?: string;
  logLevel?: LogLevelDesc;
  prometheusExporter?: PrometheusExporter;
  pluginRegistry: PluginRegistry;
}

export class PluginLedgerConnectorEthereum
  implements
    IPluginLedgerConnector<
      DeployContractSolidityBytecodeV1Request,
      DeployContractSolidityBytecodeV1Response,
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
  private readonly web3: Web3;
  private endpoints: IWebServiceEndpoint[] | undefined;
  public static readonly CLASS_NAME = "PluginLedgerConnectorEthereum";
  private watchBlocksSubscriptions: Map<string, NewHeadsSubscription> =
    new Map();

  public get className(): string {
    return PluginLedgerConnectorEthereum.CLASS_NAME;
  }

  private getWeb3Provider() {
    if (!this.options.rpcApiWsHost) {
      return new HttpProvider(this.options.rpcApiHttpHost);
    }
    return new WebSocketProvider(this.options.rpcApiWsHost);
  }

  constructor(public readonly options: IPluginLedgerConnectorEthereumOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.rpcApiHttpHost, `${fnTag} options.rpcApiHttpHost`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.web3 = new Web3(this.getWeb3Provider());

    this.instanceId = options.instanceId;
    this.pluginRegistry = options.pluginRegistry as PluginRegistry;
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

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

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);

    this.log.debug("Remove any remaining web3js subscriptions");
    for (const socketId of this.watchBlocksSubscriptions.keys()) {
      this.log.debug(`${WatchBlocksV1.Unsubscribe} shutdown`);
      await this.removeWatchBlocksSubscriptionForSocket(socketId);
    }

    try {
      const wsProvider = this.web3.currentProvider as WebSocketProvider;
      if (!wsProvider || !typeof wsProvider.SocketConnection === undefined) {
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
      this.log.error("Error when disconnecting web3js WS provider!", error);
    }
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  async registerWebServices(
    app: Express,
    wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const { web3 } = this;
    const { logLevel } = this.options;
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    wsApi.on("connection", (socket: SocketIoSocket) => {
      this.log.debug(`New Socket connected. ID=${socket.id}`);

      socket.on(
        WatchBlocksV1.Subscribe,
        async (options?: WatchBlocksV1Options) => {
          const watchBlocksEndpoint = new WatchBlocksV1Endpoint({
            web3,
            socket,
            logLevel,
            options,
          });
          this.watchBlocksSubscriptions.set(
            socket.id,
            await watchBlocksEndpoint.subscribe(),
          );

          socket.on("disconnect", async (reason: string) => {
            this.log.debug(
              `${WatchBlocksV1.Unsubscribe} disconnect reason=%o`,
              reason,
            );
            await this.removeWatchBlocksSubscriptionForSocket(socket.id);
          });
        },
      );
    });

    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new DeployContractSolidityBytecodeEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new DeployContractSolidityBytecodeJsonObjectEndpoint({
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
      const endpoint = new InvokeContractJsonObjectEndpoint({
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

  public async getContractInfoKeychain(
    req: InvokeContractV1Request,
  ): Promise<InvokeContractV1Response> {
    const fnTag = `${this.className}#invokeContract()`;

    const { contractName, keychainId } = req;
    if (!contractName) {
      throw new Error(
        `${fnTag} Cannot recover the keychain plugin because the contractName is empty`,
      );
    }
    if (!keychainId) {
      throw new Error(`${fnTag} Cannot invoke contract without keychainId`);
    }
    const keychainPlugin = this.pluginRegistry.findOneByKeychainId(keychainId);
    if (!keychainPlugin.has(contractName)) {
      throw new Error(
        `${fnTag} Cannot invoke the contract because contractName is not in the keychainPlugin`,
      );
    }
    const contractStr = await keychainPlugin.get(contractName);
    const contractJSON = JSON.parse(contractStr);

    // if not exists a contract deployed, we deploy it
    const networkId = (await this.web3.eth.net.getId()).toString();
    if (
      !contractJSON.networks ||
      !contractJSON.networks[networkId] ||
      !contractJSON.networks[networkId].address
    ) {
      if (isWeb3SigningCredentialNone(req.web3SigningCredential)) {
        throw new Error(`${fnTag} Cannot deploy contract with pre-signed TX`);
      }

      const receipt = await this.runDeploy(req);

      const address = {
        address: receipt.transactionReceipt.contractAddress,
      };
      const network = { [networkId]: address };
      contractJSON.networks = network;
      keychainPlugin.set(req.contractName, JSON.stringify(contractJSON));
    }

    return this.invokeContract({
      ...req,
      contractAddress: contractJSON.networks[networkId].address,
      contractJSON: contractJSON,
    });
  }

  public async getContractInfo(
    req: InvokeContractJsonObjectV1Request,
  ): Promise<InvokeContractV1Response> {
    const fnTag = `${this.className}#invokeContractNoKeychain()`;
    const { contractJSON, contractAddress } = req;
    if (!contractJSON) {
      throw new Error(`${fnTag} The contractJson param is needed`);
    }
    if (!contractAddress) {
      throw new Error(`${fnTag} The contractAddress param is needed`);
    }
    return this.invokeContract(req);
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

  public async invokeContract(
    req: InvokeContractJsonObjectV1Request,
  ): Promise<InvokeContractV1Response> {
    const fnTag = `${this.className}#invokeContract()`;

    const { contractAddress, contractJSON } = req;

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
      contractInstance.methods[req.methodName];
      const callOutput = await method.call();
      const success = true;
      return { success, callOutput };
    } else if (req.invocationType === EthContractInvocationType.Send) {
      if (isWeb3SigningCredentialNone(req.web3SigningCredential)) {
        throw new Error(`${fnTag} Cannot deploy contract with pre-signed TX`);
      }
      const web3SigningCredential = req.web3SigningCredential as
        | Web3SigningCredentialPrivateKeyHex
        | Web3SigningCredentialCactusKeychainRef;

      const transactionConfig = {
        from: web3SigningCredential.ethAccount,
        to: contractAddress,
        gasConfig: req.gasConfig,
        value: req.value,
        nonce: req.nonce,
        data: method.encodeABI(),
      };

      const out = await this.transact({
        transactionConfig,
        web3SigningCredential,
        timeoutMs: req.timeoutMs || 60000,
      });
      const success = out.transactionReceipt.status;
      const data = { success, out };
      return data;
    } else {
      throw new Error(
        `${fnTag} Unsupported invocation type ${req.invocationType}`,
      );
    }
  }

  public async transact(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transact()`;
    try {
      switch (req.web3SigningCredential.type) {
        case Web3SigningCredentialType.CactusKeychainRef: {
          return await this.transactCactusKeychainRef(req);
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
    } catch (error) {
      if ("toJSON" in error) {
        this.log.debug("transact() failed with error:", error.toJSON());
      }
      throw error;
    }
  }

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
        status: convertWeb3ReceiptStatusToBool(receipt.status),
      },
    };
  }

  public async transactGethKeychain(
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
          status: convertWeb3ReceiptStatusToBool(transactionReceipt.status),
        },
      };
    } catch (ex) {
      throw new Error(
        `${fnTag} Failed to invoke web3.eth.personal.sendTransaction(). ` +
          `InnerException: ${ex.stack}`,
      );
    }
  }

  public async transactPrivateKey(
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

  public async transactCactusKeychainRef(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactCactusKeychainRef()`;
    const { transactionConfig, web3SigningCredential } = req;
    const { ethAccount, keychainEntryKey, keychainId } =
      web3SigningCredential as Web3SigningCredentialCactusKeychainRef;

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

  private async generateBytecode(req: any): Promise<string> {
    const tmpContracts = new this.web3.eth.Contract(
      (req.contractJSON as any).abi,
    );
    const deployment = tmpContracts.deploy({
      data: req.contractJSON.bytecode,
      arguments: req.constructorArgs,
    });
    const abi = deployment.encodeABI();
    return abi.startsWith("0x") ? abi : `0x${abi}`;
  }

  async runDeploy(req: any): Promise<DeployContractSolidityBytecodeV1Response> {
    const web3SigningCredential = req.web3SigningCredential as
      | Web3SigningCredentialGethKeychainPassword
      | Web3SigningCredentialPrivateKeyHex;

    const bytecode = await this.generateBytecode(req);

    const receipt = await this.transact({
      transactionConfig: {
        data: bytecode,
        from: web3SigningCredential.ethAccount,
        gasConfig: req.gasConfig,
      },
      web3SigningCredential,
    });

    return receipt;
  }

  public async deployContract(
    req: DeployContractSolidityBytecodeV1Request,
  ): Promise<DeployContractSolidityBytecodeV1Response> {
    const fnTag = `${this.className}#deployContract()`;
    Checks.truthy(req, `${fnTag} req`);

    if (isWeb3SigningCredentialNone(req.web3SigningCredential)) {
      throw new Error(`${fnTag} Cannot deploy contract with pre-signed TX`);
    }
    if (!req.keychainId || !req.contractName) {
      throw new Error(
        `${fnTag} Cannot deploy contract without keychainId and the contractName`,
      );
    }
    const keychainPlugin = this.pluginRegistry.findOneByKeychainId(
      req.keychainId,
    );
    Checks.truthy(
      keychainPlugin,
      `${fnTag} keychain for ID:"${req.keychainId}"`,
    );
    if (!keychainPlugin.has(req.contractName)) {
      throw new Error(
        `${fnTag} Cannot create an instance of the contract because the contractName sent and the contractName of the JSON doesn't match`,
      );
    }

    // obtain the contractJSON from keychainPlugin
    const contractStr = await keychainPlugin.get(req.contractName);
    const contractJSON = JSON.parse(contractStr);
    req.contractJSON = contractJSON;

    // deploy the contract
    const receipt = await this.runDeploy(req);

    // save the contract address in the keychainPlugin
    if (
      receipt.transactionReceipt.status &&
      receipt.transactionReceipt.contractAddress &&
      receipt.transactionReceipt.contractAddress != null
    ) {
      const networkId = (await this.web3.eth.net.getId()).toString();
      const address = { address: receipt.transactionReceipt.contractAddress };
      const network = { [networkId]: address };
      contractJSON.networks = network;
      keychainPlugin.set(req.contractName, JSON.stringify(contractJSON));
    }

    return receipt;
  }

  public async deployContractJsonObject(
    req: DeployContractSolidityBytecodeJsonObjectV1Request,
  ): Promise<DeployContractSolidityBytecodeV1Response> {
    const fnTag = `${this.className}#deployContractNoKeychain()`;
    if (
      !req.contractJSON ||
      !req.contractJSON.bytecode ||
      !req.web3SigningCredential
    ) {
      throw new Error(
        `${fnTag} Cannot deploy contract without contractJSON, bytecode or web3SigningCredential`,
      );
    }
    return this.runDeploy(req);
  }

  // Low level function to call any method from web3.eth
  // Should be used only if given functionality is not already covered by another endpoint.
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

  // Low level function to invoke contract
  // Should be used only if given functionality is not already covered by another endpoint.
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

    const methodRef = contract.methods[args.contractMethod] as (
      ...args: unknown[]
    ) => any;
    return methodRef(...contractMethodArgs)[args.invocationType](
      args.invocationParams,
    );
  }

  /**
   * Convert connector transaction config to web3js transaction object.
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
        `Estimated maxFeePerGas of ${tx.maxFeePerGas} becuase maxPriorityFeePerGas was provided.`,
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
}
