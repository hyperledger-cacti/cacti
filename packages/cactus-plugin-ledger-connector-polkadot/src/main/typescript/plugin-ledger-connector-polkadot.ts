import { Server } from "http";
import { Server as SecureServer } from "https";
import { Express } from "express";
import {
  BadRequestError,
  InternalServerError,
  ServiceUnavailableError,
} from "http-errors-enhanced-cjs";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import {
  GetPrometheusMetricsEndpoint,
  IGetPrometheusMetricsEndpointOptions,
} from "./web-services/get-prometheus-exporter-metrics-endpoint";

import "multer";
import { Optional } from "typescript-optional";

import OAS from "../json/openapi.json";

import {
  consensusHasTransactionFinality,
  PluginRegistry,
} from "@hyperledger/cactus-core";

import {
  IPluginLedgerConnector,
  ConsensusAlgorithmFamily,
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  newRex,
} from "@hyperledger/cactus-common";
import { promisify } from "util";
import {
  DeployContractInkRequest,
  DeployContractInkResponse,
  InvokeContractRequest,
  InvokeContractResponse,
  PolkadotContractInvocationType,
  RawTransactionRequest,
  RawTransactionResponse,
  RunTransactionRequest,
  RunTransactionResponse,
  SignRawTransactionRequest,
  SignRawTransactionResponse,
  TransactionInfoRequest,
  TransactionInfoResponse,
  Web3SigningCredential,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialMnemonicString,
  Web3SigningCredentialType,
} from "./generated/openapi/typescript-axios/index";
import {
  GetTransactionInfoEndpoint,
  IGetTransactionInfoEndpointOptions,
} from "./web-services/get-transaction-info-endpoint";

import {
  RunTransactionEndpoint,
  IRunTransactionEndpointOptions,
} from "./web-services/run-transaction-endpoint";
import {
  GetRawTransactionEndpoint,
  IGetRawTransactionEndpointOptions,
} from "./web-services/get-raw-transaction-endpoint";
import {
  ISignRawTransactionEndpointOptions,
  SignRawTransactionEndpoint,
} from "./web-services/sign-raw-transaction-endpoint";
import {
  DeployContractInkEndpoint,
  IDeployContractInkEndpointOptions,
} from "./web-services/deploy-contract-ink-endpoint";
import {
  isWeb3SigningCredentialCactusRef,
  isWeb3SigningCredentialMnemonicString,
  isWeb3SigningCredentialNone,
} from "./model-type-guards";
import {
  IInvokeContractEndpointOptions,
  InvokeContractEndpoint,
} from "./web-services/invoke-contract-endpoint";

export interface IPluginLedgerConnectorPolkadotOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  pluginRegistry?: PluginRegistry;
  prometheusExporter?: PrometheusExporter;
  wsProviderUrl: string;
  instanceId: string;
  autoConnect?: boolean;
}

export class PluginLedgerConnectorPolkadot
  implements
    IPluginLedgerConnector<
      DeployContractInkRequest,
      DeployContractInkResponse,
      RunTransactionRequest,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService
{
  public static readonly CLASS_NAME = "PluginLedgerConnectorPolkadot";
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly pluginRegistry: PluginRegistry;
  public wsProvider: unknown;
  public api?: unknown;
  public prometheusExporter: PrometheusExporter;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private autoConnect: false | number | undefined;

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public get className(): string {
    return PluginLedgerConnectorPolkadot.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginLedgerConnectorPolkadotOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    if (typeof opts.logLevel !== "undefined") {
      Checks.truthy(opts.logLevel, `${fnTag} options.logLevelDesc`);
    }
    Checks.truthy(opts.wsProviderUrl, `${fnTag} options.wsProviderUrl`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    this.pluginRegistry = opts.pluginRegistry || new PluginRegistry({});
    this.prometheusExporter =
      opts.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = opts.instanceId;
    if (opts.autoConnect) {
      this.autoConnect = 1;
    }
    this.prometheusExporter.startMetricsCollection();
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const { log } = this;
    log.info(`Installing web services for plugin ${this.getPackageName()}...`);

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const opts: IGetPrometheusMetricsEndpointOptions = {
        connector: this,
        logLevel: this.opts.logLevel,
      };

      const endpoint = new GetPrometheusMetricsEndpoint(opts);
      endpoints.push(endpoint);
    }
    {
      const opts: IGetTransactionInfoEndpointOptions = {
        connector: this,
        logLevel: this.opts.logLevel,
      };

      const endpoint = new GetTransactionInfoEndpoint(opts);
      endpoints.push(endpoint);
    }
    {
      const opts: IRunTransactionEndpointOptions = {
        connector: this,
        logLevel: this.opts.logLevel,
      };

      const endpoint = new RunTransactionEndpoint(opts);
      endpoints.push(endpoint);
    }
    {
      const opts: IGetRawTransactionEndpointOptions = {
        connector: this,
        logLevel: this.opts.logLevel,
      };

      const endpoint = new GetRawTransactionEndpoint(opts);
      endpoints.push(endpoint);
    }
    {
      const opts: ISignRawTransactionEndpointOptions = {
        connector: this,
        logLevel: this.opts.logLevel,
      };

      const endpoint = new SignRawTransactionEndpoint(opts);
      endpoints.push(endpoint);
    }
    {
      const opts: IDeployContractInkEndpointOptions = {
        connector: this,
        logLevel: this.opts.logLevel,
      };

      const endpoint = new DeployContractInkEndpoint(opts);
      endpoints.push(endpoint);
    }
    {
      const opts: IInvokeContractEndpointOptions = {
        connector: this,
        logLevel: this.opts.logLevel,
      };

      const endpoint = new InvokeContractEndpoint(opts);
      endpoints.push(endpoint);
    }

    this.endpoints = endpoints;

    const pkg = this.getPackageName();
    log.info(`Installed web services for plugin ${pkg} OK`, { endpoints });
    return endpoints;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async shutdown(): Promise<void> {
    const serverMaybe = this.getHttpServer();
    if (serverMaybe.isPresent()) {
      const server = serverMaybe.get();
      await promisify(server.close.bind(server))();
    }
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-polkadot`;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
  }

  public async onPluginInit(): Promise<void> {
    const { WsProvider } = await import("@polkadot/rpc-provider");
    const { ApiPromise } = await import("@polkadot/api");
    try {
      this.wsProvider = new WsProvider(
        this.opts.wsProviderUrl,
        this.autoConnect,
      );
    } catch (ex: unknown) {
      const rex = newRex(`Could not create WsProvider. Inner exception:`, ex);
      throw new InternalServerError(rex.toJSON());
    }
    try {
      if (!(this.wsProvider instanceof WsProvider)) {
        throw new InternalServerError("this.wsProvider was not a WsProvider");
      }
      this.api = await ApiPromise.create({ provider: this.wsProvider });
    } catch (ex: unknown) {
      const rex = newRex(`Could not create API. Inner exception:`, ex);
      throw new InternalServerError(rex.toJSON());
    }
  }

  public async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    return ConsensusAlgorithmFamily.Stake;
  }

  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily =
      await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  public async rawTransaction(
    req: RawTransactionRequest,
  ): Promise<RawTransactionResponse> {
    const fnTag = `${this.className}#rawTransaction()`;
    Checks.truthy(req, `${fnTag} req`);
    if (!this.api) {
      throw new InternalServerError(`${fnTag} this.api is falsy.`);
    }
    const { ApiPromise } = await import("@polkadot/api");
    if (!(this.api instanceof ApiPromise)) {
      throw new InternalServerError("this.api was not instanceof ApiPromise");
    }
    try {
      const accountAddress = req.to;
      const transferValue = req.value;

      this.log.debug("%s transferAllowDeath %s, %d", fnTag, req.to, req.value);

      const rawTx = this.api.tx.balances.transferAllowDeath(
        accountAddress,
        transferValue,
      );

      this.log.debug("%s transferAllowDeath rawTx=%o", rawTx.toHuman());

      const responseContainer = {
        response_data: {
          rawTransaction: rawTx.toHex(),
        },
        succeeded: true,
        message: "obtainRawTransaction",
        error: null,
      };

      const response: RawTransactionResponse = {
        responseContainer: responseContainer,
      };
      this.log.debug("%s res %o", fnTag, response);
      return response;
    } catch (ex: unknown) {
      const rex = newRex(`${fnTag} Obtaining raw transaction has failed:`, ex);
      throw new InternalServerError(rex.toJSON());
    }
  }

  public async signTransaction(
    req: SignRawTransactionRequest,
  ): Promise<SignRawTransactionResponse> {
    const fnTag = `${this.className}#signTx()`;
    Checks.truthy(req, `${fnTag} req`);
    if (!this.api) {
      throw new ServiceUnavailableError("Substrate Node connection is down.");
    }
    try {
      const { Keyring } = await import("@polkadot/api");
      const keyring = new Keyring({ type: "sr25519" });
      const accountPair = keyring.createFromUri(req.mnemonic);
      const { ApiPromise } = await import("@polkadot/api");
      if (!(this.api instanceof ApiPromise)) {
        throw new InternalServerError("this.api was not instanceof ApiPromise");
      }
      const deserializedRawTransaction = this.api.tx(req.rawTransaction);
      const signedTransaction = await deserializedRawTransaction.signAsync(
        accountPair,
        req.signingOptions,
      );
      const serializedSignedTransaction = signedTransaction.toHex();
      const response: SignRawTransactionResponse = {
        success: true,
        signedTransaction: serializedSignedTransaction,
      };
      return response;
    } catch (ex: unknown) {
      const errorMsg = `${fnTag} signing raw Polkadot transaction failed.`;
      const rex = newRex(errorMsg, ex);
      throw new InternalServerError(rex.toJSON());
    }
  }

  // Perform a monetary transaction to Polkadot;
  public async transact(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transact()`;
    switch (req.web3SigningCredential.type) {
      case Web3SigningCredentialType.CactusKeychainRef: {
        return this.transactCactusKeychainRef(req);
      }
      case Web3SigningCredentialType.MnemonicString: {
        return this.transactMnemonicString(req);
      }
      case Web3SigningCredentialType.None: {
        if (req.transactionConfig.transferSubmittable) {
          return this.transactSigned(req);
        } else {
          const errorMessage =
            `${fnTag} Expected pre-signed raw transaction ` +
            ` since signing credential is specified as` +
            `Web3SigningCredentialType.NONE`;
          throw new BadRequestError(errorMessage);
        }
      }
      default: {
        const errorMessage =
          `${fnTag} Unrecognized Web3SigningCredentialType: ` +
          `Supported ones are: ` +
          `${Object.values(Web3SigningCredentialType).join(";")}`;
        throw new BadRequestError(errorMessage);
      }
    }
  }
  public async transactCactusKeychainRef(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactCactusKeychainRef()`;
    const { transactionConfig, web3SigningCredential } = req;
    const { keychainEntryKey, keychainId } =
      web3SigningCredential as Web3SigningCredentialCactusKeychainRef;

    // locate the keychain plugin that has access to the keychain backend
    // denoted by the keychainID from the request.
    const keychainPlugin = this.pluginRegistry.findOneByKeychainId(keychainId);

    Checks.truthy(keychainPlugin, `${fnTag} keychain for ID:"${keychainId}"`);

    // Now use the found keychain plugin to actually perform the lookup of
    // the private key that we need to run the transaction.
    const mnemonic = await keychainPlugin?.get(keychainEntryKey);
    return this.transactMnemonicString({
      web3SigningCredential: {
        type: Web3SigningCredentialType.MnemonicString,
        mnemonic,
      },
      transactionConfig,
    });
  }
  public async transactMnemonicString(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactMnemonicString()`;
    Checks.truthy(req, `${fnTag} req`);
    if (!this.api) {
      throw new BadRequestError(`Connection to Substrate Node is down.`);
    }
    const { ApiPromise } = await import("@polkadot/api");
    if (!(this.api instanceof ApiPromise)) {
      throw new InternalServerError("this.api was not instanceof ApiPromise");
    }
    const { transactionConfig, web3SigningCredential } = req;
    const { mnemonic } =
      web3SigningCredential as Web3SigningCredentialMnemonicString;
    if (!mnemonic) {
      throw new BadRequestError(`Need mnemonic string for transaction`);
    }
    let success = false;
    const { Keyring } = await import("@polkadot/api");
    const keyring = new Keyring({ type: "sr25519" });
    const accountPair = keyring.createFromUri(mnemonic);
    const accountAddress = transactionConfig.to;
    const transferValue = transactionConfig.value;
    const txResult = await new Promise<{
      success: boolean;
      transactionHash: string;
      blockhash: string;
    }>(async (resolve, reject) => {
      if (!this.api) {
        reject(
          new ServiceUnavailableError(`Connection to Substrate Node down.`),
        );
      }
      if (!(this.api instanceof ApiPromise)) {
        throw new InternalServerError("this.api was not instanceof ApiPromise");
      }
      this.api.tx.balances
        .transferAllowDeath(accountAddress, transferValue)
        .signAndSend(accountPair, async ({ status, txHash, dispatchError }) => {
          if (status.isInBlock) {
            if (dispatchError) {
              reject(
                new ServiceUnavailableError(
                  `Connection to Substrate Node down.`,
                ),
              );
              if (dispatchError.isModule) {
                if (!(this.api instanceof ApiPromise)) {
                  throw new InternalServerError(
                    "this.api was not instanceof ApiPromise",
                  );
                }
                const decoded = this.api.registry.findMetaError(
                  dispatchError.asModule,
                );
                const { docs, name, section } = decoded;
                throw new BadRequestError(
                  `${section}.${name}: ${docs.join(" ")}`,
                );
              } else {
                throw new BadRequestError(dispatchError.toString());
              }
            }
            this.prometheusExporter.addCurrentTransaction();
            resolve({
              success: true,
              blockhash: status.asInBlock.toHex(),
              transactionHash: txHash.toHex(),
            });
          }
        });
    });
    success = txResult.success;
    const transactionHash = txResult.transactionHash;
    const blockHash = txResult.blockhash;
    return {
      success,
      txHash: transactionHash,
      blockHash: blockHash,
    };
  }
  public async transactSigned(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactSigned()`;
    Checks.truthy(
      req.transactionConfig.transferSubmittable,
      `${fnTag}:req.transactionConfig.transferSubmittable`,
    );
    const { ApiPromise } = await import("@polkadot/api");
    if (!(this.api instanceof ApiPromise)) {
      throw new InternalServerError("this.api was not instanceof ApiPromise");
    }
    const signedTx = req.transactionConfig.transferSubmittable as string;

    this.log.debug(
      "Starting api.rpc.author.submitAndWatchExtrinsic(transferSubmittable) ",
    );
    let success = false;
    Checks.truthy(req, `${fnTag} req`);
    if (!this.api) {
      throw new ServiceUnavailableError(`Connection to Substrate Node down.`);
    }
    const deserializedTransaction = this.api.tx(signedTx);
    const signature = deserializedTransaction.signature.toHex();
    if (!signature) {
      throw new BadRequestError(`${fnTag} Transaction is not signed.`);
    }

    const { isHex } = await import("@polkadot/util");
    if (!isHex(signature)) {
      throw new BadRequestError(`${fnTag} Transaction signature is not valid.`);
    }

    const txResult = await new Promise<{
      success: boolean;
      transactionHash: string;
      blockhash: string;
    }>(async (resolve, reject) => {
      if (!this.api) {
        reject(
          new ServiceUnavailableError(`Connection to Substrate Node down.`),
        );
      }
      if (!(this.api instanceof ApiPromise)) {
        throw new InternalServerError("this.api was not instanceof ApiPromise");
      }
      this.api.rpc.author.submitAndWatchExtrinsic(
        deserializedTransaction,
        ({ isInBlock, hash, asInBlock, type }) => {
          if (isInBlock) {
            this.prometheusExporter.addCurrentTransaction();
            resolve({
              success: true,
              blockhash: asInBlock.toHex(),
              transactionHash: hash.toHex(),
            });
          } else {
            const errorMessage = `transaction not submitted with status: ${type}`;
            reject(new BadRequestError(errorMessage));
          }
        },
      );
    });

    success = txResult.success;
    const txHash = txResult.transactionHash;
    const blockHash = txResult.blockhash;
    return { success, txHash, blockHash };
  }

  private async getMnemonicStringFromWeb3SigningCredential(
    fnTag: string,
    type: "deploy" | "invoke",
    web3SigningCredential: Web3SigningCredential,
  ): Promise<string> {
    if (isWeb3SigningCredentialNone(web3SigningCredential)) {
      throw new BadRequestError(
        `${fnTag} Cannot ${type} contract with pre-signed TX`,
      );
    }
    let mnemonic: string;
    if (isWeb3SigningCredentialMnemonicString(web3SigningCredential)) {
      const Credential =
        web3SigningCredential as Web3SigningCredentialMnemonicString;
      mnemonic = Credential.mnemonic;
      if (!mnemonic) {
        const errorMessage = `${fnTag} Cannot ${type} contract without mnemonic string.`;
        throw new BadRequestError(errorMessage);
      }
      return mnemonic;
    } else if (isWeb3SigningCredentialCactusRef(web3SigningCredential)) {
      const Credential =
        web3SigningCredential as Web3SigningCredentialCactusKeychainRef;
      const { keychainEntryKey, keychainId } = Credential;
      if (!keychainId || !keychainEntryKey) {
        const errorMessage = `${fnTag} Cannot ${type} contract without keychainId and the keychainEntryKey.`;
        throw new BadRequestError(errorMessage);
      }
      // locate the keychain plugin that has access to the keychain backend
      // denoted by the keychainID from the request.
      const keychainPlugin =
        this.pluginRegistry.findOneByKeychainId(keychainId);
      if (!keychainPlugin) {
        const errorMessage =
          `${fnTag} The plugin registry does not contain` +
          ` a keychain plugin for ID:"${keychainId}"`;
        throw new BadRequestError(errorMessage);
      }
      // Now use the found keychain plugin to actually perform the lookup of
      // the private key that we need to run the transaction.
      mnemonic = await keychainPlugin.get(keychainEntryKey);
      if (!mnemonic) {
        const errorMessage =
          `${fnTag} Cannot ${type} contract because` +
          `the mnemonic string does not exist on the keychain`;
        throw new BadRequestError(errorMessage);
      }
      return mnemonic;
    } else {
      const errorMessage =
        `${fnTag} Unrecognized Web3SigningCredentialType: ` +
        `Supported ones are: ` +
        `${Object.values(Web3SigningCredentialType).join(";")}`;
      throw new BadRequestError(errorMessage);
    }
  }

  // Deploy and instantiate a smart contract in Polkadot
  public async deployContract(
    req: DeployContractInkRequest,
  ): Promise<DeployContractInkResponse> {
    const fnTag = `${this.className}#deployContract()`;
    Checks.truthy(req, `${fnTag} req`);
    if (!this.api) {
      throw new ServiceUnavailableError(`Connection to Substrate Node down.`);
    }
    const { ApiPromise } = await import("@polkadot/api");
    if (!(this.api instanceof ApiPromise)) {
      throw new InternalServerError("this.api was not instanceof ApiPromise");
    }
    const mnemonic = await this.getMnemonicStringFromWeb3SigningCredential(
      fnTag,
      "deploy",
      req.web3SigningCredential,
    );
    let success = false;
    const { CodePromise, Abi } = await import("@polkadot/api-contract");
    const contractAbi = new Abi(
      req.metadata,
      this.api.registry.getChainProperties(),
    );
    const contractCode = new CodePromise(
      this.api,
      contractAbi,
      Buffer.from(req.wasm, "base64"),
    );
    const gasLimit: unknown = this.api.registry.createType("WeightV2", {
      refTime: req.gasLimit.refTime,
      proofSize: req.gasLimit.proofSize,
    });
    const { Keyring } = await import("@polkadot/api");
    const { stringCamelCase } = await import("@polkadot/util");

    const keyring = new Keyring({ type: "sr25519" });
    const accountPair = keyring.createFromUri(mnemonic);
    const params = req.params ?? [];
    const constructorMethod = req.constructorMethod ?? "new";
    const tx = contractCode.tx[stringCamelCase(constructorMethod)](
      {
        gasLimit: gasLimit as string, // FIXME
        storageDepositLimit: req.storageDepositLimit,
        salt: req.salt,
        value: req.balance,
      },
      ...params,
    );
    const txResult = await new Promise<{
      success: boolean;
      address: string | undefined;
    }>((resolve, reject) => {
      tx.signAndSend(
        accountPair,
        //https://github.com/polkadot-js/api/issues/5722
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ({ contract, status, dispatchError }) => {
          if (status.isInBlock || status.isFinalized) {
            if (dispatchError) {
              reject(new BadRequestError("deployment not successful"));
              if (dispatchError.isModule) {
                if (!(this.api instanceof ApiPromise)) {
                  throw new InternalServerError(
                    "this.api was not instanceof ApiPromise",
                  );
                }
                const decoded = this.api.registry.findMetaError(
                  dispatchError.asModule,
                );
                const { docs, name, section } = decoded;
                throw new BadRequestError(
                  `${section}.${name}: ${docs.join(" ")}`,
                );
              } else {
                throw new BadRequestError(dispatchError.toString());
              }
            }
            this.prometheusExporter.addCurrentTransaction();
            resolve({
              success: true,
              address: contract.address.toString(),
            });
          }
        },
      );
    });
    success = txResult.success;
    const contractAddress = txResult.address;
    return {
      success: success,
      contractAddress: contractAddress,
    };
  }

  public async isSafeToCallContractMethod(
    abi: unknown,
    name: string,
  ): Promise<boolean> {
    Checks.truthy(abi, `${this.className}#isSafeToCallContractMethod():abi`);
    const { Abi } = await import("@polkadot/api-contract");
    if (!(abi instanceof Abi)) {
      throw new Error("Expected abi arg as instanceof Abi");
    }
    Checks.truthy(
      abi.messages,
      `${this.className}#isSafeToCallContractMethod():abi.messages`,
    );
    Checks.nonBlankString(
      name,
      `${this.className}#isSafeToCallContractMethod():name`,
    );
    const methods = abi.messages.map((m) => m.method);
    return methods.includes(name);
  }

  // invoke the smart contract
  public async invokeContract(
    req: InvokeContractRequest,
  ): Promise<InvokeContractResponse> {
    const fnTag = `${this.className}#invokeContract()`;
    Checks.truthy(req, `${fnTag} req`);
    if (!this.api) {
      throw new ServiceUnavailableError(`Connection to Substrate Node down.`);
    }
    const { ApiPromise } = await import("@polkadot/api");
    if (!(this.api instanceof ApiPromise)) {
      throw new InternalServerError("this.api was not instanceof ApiPromise");
    }
    const { Abi, ContractPromise } = await import("@polkadot/api-contract");
    const contractAbi = new Abi(
      req.metadata,
      this.api.registry.getChainProperties(),
    );
    const { stringCamelCase } = await import("@polkadot/util");
    const methodName = stringCamelCase(req.methodName);
    const isSafeToCall = await this.isSafeToCallContractMethod(
      contractAbi,
      methodName,
    );
    if (!isSafeToCall) {
      throw new BadRequestError(
        `Invalid method name provided in request. ${req.methodName} does not exist on the contract abi.messages object's "method" property.`,
      );
    }
    const contract = new ContractPromise(
      this.api,
      req.metadata,
      req.contractAddress,
    );
    const gasLimit: unknown = this.api.registry.createType("WeightV2", {
      refTime: req.gasLimit.refTime,
      proofSize: req.gasLimit.proofSize,
    });
    if (req.invocationType === PolkadotContractInvocationType.Query) {
      let success = false;
      const params = req.params ?? [];
      const query = contract.query[methodName](
        req.accountAddress,
        {
          gasLimit: gasLimit as string, // FIXME,
          storageDepositLimit: req.storageDepositLimit,
          value: req.balance,
        },
        ...params,
      );
      const callOutput = await query;
      success = true;
      return { success, callOutput };
    } else if (req.invocationType === PolkadotContractInvocationType.Send) {
      const mnemonic = await this.getMnemonicStringFromWeb3SigningCredential(
        fnTag,
        "invoke",
        req.web3SigningCredential,
      );
      const { Keyring } = await import("@polkadot/api");
      const keyring = new Keyring({ type: "sr25519" });
      const accountPair = keyring.createFromUri(mnemonic);
      let success = false;
      const params = req.params ?? [];
      const tx = contract.tx[methodName](
        {
          gasLimit: gasLimit as string, // FIXME
          storageDepositLimit: req.storageDepositLimit,
          value: req.balance,
        },
        ...params,
      );
      const txResult = await new Promise<{
        success: boolean;
        transactionHash: string;
        blockHash: string;
      }>((resolve, reject) => {
        tx.signAndSend(accountPair, ({ status, txHash, dispatchError }) => {
          if (!this.api) {
            throw new ServiceUnavailableError(`Substrate node connection down`);
          }
          if (status.isInBlock || status.isFinalized) {
            if (dispatchError) {
              reject("TX not successful");
              if (dispatchError.isModule) {
                if (!(this.api instanceof ApiPromise)) {
                  throw new InternalServerError(
                    "this.api was not instanceof ApiPromise",
                  );
                }
                const decoded = this.api.registry.findMetaError(
                  dispatchError.asModule,
                );
                const { docs, name, section } = decoded;
                throw new BadRequestError(
                  `${section}.${name}: ${docs.join(" ")}`,
                );
              } else {
                throw new BadRequestError(dispatchError.toString());
              }
            }
            this.prometheusExporter.addCurrentTransaction();
            resolve({
              success: true,
              transactionHash: txHash.toHex(),
              blockHash: status.asInBlock.toHex(),
            });
          }
        });
      });
      success = txResult.success;
      const txHash = txResult.transactionHash;
      const blockHash = txResult.blockHash;
      return { success, txHash, blockHash };
    } else {
      throw new BadRequestError(
        `${fnTag} Unsupported invocation type ${req.invocationType}`,
      );
    }
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const fn = `${this.className}#getPrometheusExporterMetrics()`;
    try {
      const res: string = await this.prometheusExporter.getPrometheusMetrics();
      this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
      return res;
    } catch (ex: unknown) {
      const rex = newRex(`${fn} Failed to get Prometheus exporter metrics`, ex);
      throw new InternalServerError(rex.toJSON());
    }
  }

  // Obtains information to sign a transaction
  public async obtainTransactionInformation(
    req: TransactionInfoRequest,
  ): Promise<TransactionInfoResponse> {
    const fnTag = `${this.className}#obtainTxInformation()`;
    Checks.truthy(req, `${fnTag} req`);
    this.log.info(`getTxFee`);
    if (!this.api) {
      throw new ServiceUnavailableError(`Substrate node connection down`);
    }
    const accountAddress = req.accountAddress;
    const transactionExpiration = (req.transactionExpiration as number) || 50;
    const { ApiPromise } = await import("@polkadot/api");
    if (!(this.api instanceof ApiPromise)) {
      throw new InternalServerError("this.api was not instanceof ApiPromise");
    }
    try {
      const signedBlock = await this.api.rpc.chain.getBlock();
      const nonce = (await this.api.derive.balances.account(accountAddress))
        .accountNonce;
      const blockHash = signedBlock.block.header.hash;

      const era = this.api.createType("ExtrinsicEra", {
        current: signedBlock.block.header.number,
        period: transactionExpiration,
      });

      const options = {
        nonce: nonce,
        blockHash: blockHash,
        era: era,
      };

      const responseContainer = {
        response_data: options,
        succeeded: true,
        message: "obtainTransactionInformation",
        error: null,
      };

      const response: TransactionInfoResponse = {
        responseContainer: responseContainer,
      };

      return response;
    } catch (ex: unknown) {
      const rex = newRex(`${fnTag} Obtaining info for transaction failed.`, ex);
      throw new InternalServerError(rex.toJSON());
    }
  }

  public async shutdownConnectionToSubstrate(): Promise<void> {
    try {
      if (this.api) {
        const { ApiPromise } = await import("@polkadot/api");
        if (!(this.api instanceof ApiPromise)) {
          throw new InternalServerError(
            "this.api was not instanceof ApiPromise",
          );
        }
        this.log.info("Shutting down connection to substrate...");
        this.api.disconnect();
      } else {
        this.log.warn(
          "Trying to shutdown connection to substrate, but no connection is available",
        );
      }
    } catch (ex: unknown) {
      this.log.error("Could not disconnect from Substrate Ledger:", ex);
      const rex = newRex("Could not disconnect from Substrate Ledger", ex);
      throw new InternalServerError(rex.toJSON());
    }
  }
}
