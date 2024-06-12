import type { Server as SocketIoServer } from "socket.io";
import type { Socket as SocketIoSocket } from "socket.io";
import type { Express } from "express";
import { Optional } from "typescript-optional";

import OAS from "../json/openapi.json";

import Web3 from "web3";

import type { WebsocketProvider } from "web3-core";
import Web3JsQuorum, { IWeb3Quorum } from "web3js-quorum";

import { Contract, ContractSendMethod } from "web3-eth-contract";
import {
  GetBalanceV1Request,
  GetBalanceV1Response,
  DeployContractSolidityBytecodeNoKeychainV1Request,
} from "./generated/openapi/typescript-axios/index";

import {
  GetPastLogsV1Request,
  GetPastLogsV1Response,
} from "./generated/openapi/typescript-axios/index";
import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
  IPluginGrpcService,
  IGrpcSvcDefAndImplPair,
} from "@hyperledger/cactus-core-api";

import {
  PluginRegistry,
  consensusHasTransactionFinality,
} from "@hyperledger/cactus-core";

import {
  Checks,
  CodedError,
  IJsObjectSignerOptions,
  JsObjectSigner,
  KeyConverter,
  KeyFormat,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { DeployContractSolidityBytecodeEndpoint } from "./web-services/deploy-contract-solidity-bytecode-endpoint";
import { DeployContractSolidityBytecodeNoKeychainEndpoint } from "./web-services/deploy-contract-solidity-bytecode-no-keychain-endpoint";

import {
  WatchBlocksV1,
  DeployContractSolidityBytecodeV1Request,
  DeployContractSolidityBytecodeV1Response,
  EthContractInvocationType,
  InvokeContractV1Request,
  InvokeContractV1Response,
  ReceiptType,
  RunTransactionRequest,
  RunTransactionResponse,
  SignTransactionRequest,
  SignTransactionResponse,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
  GetTransactionV1Request,
  GetTransactionV1Response,
  GetBlockV1Request,
  GetBlockV1Response,
  GetBesuRecordV1Request,
  GetBesuRecordV1Response,
} from "./generated/openapi/typescript-axios";

import { InvokeContractEndpoint } from "./web-services/invoke-contract-endpoint";
import { isWeb3SigningCredentialNone } from "./model-type-guards";
import { BesuSignTransactionEndpointV1 } from "./web-services/sign-transaction-endpoint-v1";
import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import {
  GetPrometheusExporterMetricsEndpointV1,
  IGetPrometheusExporterMetricsEndpointV1Options,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";
import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";
import { RuntimeError } from "run-time-error-cjs";
import { GetBalanceEndpoint } from "./web-services/get-balance-endpoint";
import { GetTransactionEndpoint } from "./web-services/get-transaction-endpoint";
import { GetPastLogsEndpoint } from "./web-services/get-past-logs-endpoint";
import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint";
import { GetBlockEndpoint } from "./web-services/get-block-v1-endpoint-";
import { GetBesuRecordEndpointV1 } from "./web-services/get-besu-record-endpoint-v1";
import { AbiItem } from "web3-utils";
import {
  GetOpenApiSpecV1Endpoint,
  IGetOpenApiSpecV1EndpointOptions,
} from "./web-services/get-open-api-spec-v1-endpoint";
import * as grpc_default_service from "./generated/proto/protoc-gen-ts/services/default_service";
import * as besu_grpc_svc_streams from "./generated/proto/protoc-gen-ts/services/besu-grpc-svc-streams";
import { BesuGrpcSvcOpenApi } from "./grpc-services/besu-grpc-svc-open-api";
import { BesuGrpcSvcStreams } from "./grpc-services/besu-grpc-svc-streams";
import { getBlockV1Http } from "./impl/get-block-v1/get-block-v1-http";
import { transactV1Impl } from "./impl/transact-v1/transact-v1-impl";
import {
  IDeployContractV1KeychainResponse,
  deployContractV1Keychain,
} from "./impl/deploy-contract-v1/deploy-contract-v1-keychain";
import {
  IDeployContractV1NoKeychainResponse,
  deployContractV1NoKeychain,
} from "./impl/deploy-contract-v1/deploy-contract-v1-no-keychain";
import { Observable, ReplaySubject } from "rxjs";

export interface RunTransactionV1Exchange {
  request: InvokeContractV1Request;
  response: RunTransactionResponse;
  timestamp: Date;
}

export const E_KEYCHAIN_NOT_FOUND = "cactus.connector.besu.keychain_not_found";

export interface IPluginLedgerConnectorBesuOptions
  extends ICactusPluginOptions {
  rpcApiHttpHost: string;
  rpcApiWsHost: string;
  pluginRegistry: PluginRegistry;
  prometheusExporter?: PrometheusExporter;
  logLevel?: LogLevelDesc;
}

export class PluginLedgerConnectorBesu
  implements
    IPluginLedgerConnector<
      DeployContractSolidityBytecodeV1Request,
      DeployContractSolidityBytecodeV1Response,
      RunTransactionRequest,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginGrpcService,
    IPluginWebService
{
  private readonly instanceId: string;
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;
  private readonly logLevel: LogLevelDesc;
  private readonly web3Provider: WebsocketProvider;
  private readonly web3: Web3;
  private web3Quorum: IWeb3Quorum | undefined;
  private readonly pluginRegistry: PluginRegistry;
  private contracts: {
    [name: string]: Contract;
  } = {};

  private endpoints: IWebServiceEndpoint[] | undefined;

  private txSubject: ReplaySubject<RunTransactionV1Exchange> =
    new ReplaySubject();

  public static readonly CLASS_NAME = "PluginLedgerConnectorBesu";

  public get className(): string {
    return PluginLedgerConnectorBesu.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorBesuOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.rpcApiHttpHost, `${fnTag} options.rpcApiHttpHost`);
    Checks.truthy(options.rpcApiWsHost, `${fnTag} options.rpcApiWsHost`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    this.logLevel = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level: this.logLevel, label });

    this.web3Provider = new Web3.providers.WebsocketProvider(
      this.options.rpcApiWsHost,
    );
    this.web3 = new Web3(this.web3Provider);
    this.instanceId = options.instanceId;
    this.pluginRegistry = options.pluginRegistry;
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

  public getTxSubjectObservable(): Observable<RunTransactionV1Exchange> {
    return this.txSubject.asObservable();
  }

  public async onPluginInit(): Promise<void> {
    this.web3Quorum = Web3JsQuorum(this.web3);
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
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

      socket.on(WatchBlocksV1.Subscribe, () => {
        new WatchBlocksV1Endpoint({ web3, socket, logLevel }).subscribe();
      });
    });
    return webServices;
  }
  public async createGrpcSvcDefAndImplPairs(): Promise<
    IGrpcSvcDefAndImplPair[]
  > {
    const openApiSvc = await this.createGrpcOpenApiSvcDefAndImplPair();
    const streamsSvc = await this.createGrpcStreamsSvcDefAndImplPair();
    return [openApiSvc, streamsSvc];
  }

  public async createGrpcStreamsSvcDefAndImplPair(): Promise<IGrpcSvcDefAndImplPair> {
    const definition =
      besu_grpc_svc_streams.org.hyperledger.cacti.plugin.ledger.connector.besu
        .services.besuservice.UnimplementedBesuGrpcSvcStreamsService.definition;

    const implementation = new BesuGrpcSvcStreams({
      logLevel: this.logLevel,
      web3: this.web3,
    });

    return { definition, implementation };
  }

  /**
   * Create a new instance of the service implementation.
   * Note: This does not cache the returned objects internally. A new instance
   * is created during every invocation.
   *
   * @returns The gRPC service definition+implementation pair that is backed
   * by the code generated by the OpenAPI generator from the openapi.json spec
   * of this package. Used by the API server to obtain the service objects dynamically
   * at runtime so that the plugin's gRPC services can be exposed in a similar
   * fashion how the HTTP REST endpoints are registered as well.
   */
  public async createGrpcOpenApiSvcDefAndImplPair(): Promise<IGrpcSvcDefAndImplPair> {
    const definition =
      grpc_default_service.org.hyperledger.cacti.plugin.ledger.connector.besu
        .services.defaultservice.DefaultServiceClient.service;

    const implementation = new BesuGrpcSvcOpenApi({
      logLevel: this.logLevel,
      web3: this.web3,
    });

    return { definition, implementation };
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
      const endpoint = new DeployContractSolidityBytecodeNoKeychainEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetBalanceEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetTransactionEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetPastLogsEndpoint({
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
      const endpoint = new GetBlockEndpoint({
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
      const endpoint = new BesuSignTransactionEndpointV1({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetBesuRecordEndpointV1({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(endpoint);
    }
    {
      const oasPath =
        OAS.paths[
          "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/get-open-api-spec"
        ];

      const operationId = oasPath.get.operationId;
      const opts: IGetOpenApiSpecV1EndpointOptions = {
        oas: OAS,
        oasPath,
        operationId,
        path: oasPath.get["x-hyperledger-cacti"].http.path,
        pluginRegistry: this.pluginRegistry,
        verbLowerCase: oasPath.get["x-hyperledger-cacti"].http.verbLowerCase,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetOpenApiSpecV1Endpoint(opts);
      endpoints.push(endpoint);
    }

    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-besu`;
  }

  public async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    return ConsensusAlgorithmFamily.Authority;
  }
  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily =
      await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
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
    contract: Contract,
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

    const { methods } = contract;

    return Object.prototype.hasOwnProperty.call(methods, name);
  }

  public async invokeContract(
    req: InvokeContractV1Request,
  ): Promise<InvokeContractV1Response> {
    const fnTag = `${this.className}#invokeContract()`;

    const contractName = req.contractName;
    let contractInstance: Contract;

    if (req.keychainId != undefined) {
      const networkId = await this.web3.eth.net.getId();
      const keychainPlugin = this.pluginRegistry.findOneByKeychainId(
        req.keychainId,
      );
      Checks.truthy(
        keychainPlugin,
        `${fnTag} keychain for ID:"${req.keychainId}"`,
      );
      if (!keychainPlugin.has(contractName)) {
        throw new Error(
          `${fnTag} Cannot create an instance of the contract because the contractName and the contractName of the JSON doesn't match`,
        );
      }
      const contractStr = await keychainPlugin.get(contractName);
      const contractJSON = JSON.parse(contractStr);
      if (
        contractJSON.networks === undefined ||
        contractJSON.networks[networkId] === undefined ||
        contractJSON.networks[networkId].address === undefined
      ) {
        if (isWeb3SigningCredentialNone(req.signingCredential)) {
          throw new Error(`${fnTag} Cannot deploy contract with pre-signed TX`);
        }
        const web3SigningCredential = req.signingCredential as
          | Web3SigningCredentialPrivateKeyHex
          | Web3SigningCredentialCactusKeychainRef;

        const receipt = await this.transact({
          transactionConfig: {
            data: `0x${contractJSON.bytecode}`,
            from: web3SigningCredential.ethAccount,
            gas: req.gas,
            gasPrice: req.gasPrice,
          },
          consistencyStrategy: {
            blockConfirmations: 0,
            receiptType: ReceiptType.NodeTxPoolAck,
            timeoutMs: req.timeoutMs || 60000,
          },
          web3SigningCredential,
          privateTransactionConfig: req.privateTransactionConfig,
        });

        const address = {
          address: receipt.transactionReceipt.contractAddress,
        };
        const network = { [networkId]: address };
        contractJSON.networks = network;
        keychainPlugin.set(contractName, JSON.stringify(contractJSON));
      }
      const contract = new this.web3.eth.Contract(
        contractJSON.abi,
        contractJSON.networks[networkId].address,
      );

      this.contracts[contractName] = contract;
    } else if (
      req.keychainId == undefined &&
      req.contractAbi == undefined &&
      req.contractAddress == undefined
    ) {
      throw new Error(
        `${fnTag} Cannot invoke a contract without contract instance, the keychainId param is needed`,
      );
    }

    contractInstance = this.contracts[contractName];
    if (req.contractAbi != undefined) {
      let abi;
      if (typeof req.contractAbi === "string") {
        abi = JSON.parse(req.contractAbi);
      } else {
        abi = req.contractAbi;
      }

      const { contractAddress } = req;
      contractInstance = new this.web3.eth.Contract(abi, contractAddress);
    }

    const isSafeToCall = await this.isSafeToCallContractMethod(
      contractInstance,
      req.methodName,
    );
    if (!isSafeToCall) {
      throw new RuntimeError(
        `Invalid method name provided in request. ${req.methodName} does not exist on the Web3 contract object's "methods" property.`,
      );
    }

    const methodRef = contractInstance.methods[req.methodName];
    Checks.truthy(methodRef, `${fnTag} YourContract.${req.methodName}`);
    const method: ContractSendMethod = methodRef(...req.params);

    if (req.invocationType === EthContractInvocationType.Call) {
      let callOutput;
      let success = false;
      if (req.privateTransactionConfig) {
        const data = method.encodeABI();
        let privKey: string;

        if (
          req.signingCredential.type ==
          Web3SigningCredentialType.CactusKeychainRef
        ) {
          const { keychainEntryKey, keychainId } =
            req.signingCredential as Web3SigningCredentialCactusKeychainRef;

          const keychainPlugin =
            this.pluginRegistry.findOneByKeychainId(keychainId);
          privKey = await keychainPlugin?.get(keychainEntryKey);
        } else {
          privKey = (
            req.signingCredential as Web3SigningCredentialPrivateKeyHex
          ).secret;
        }

        const fnParams = {
          to: contractInstance.options.address,
          data,
          privateFrom: req.privateTransactionConfig.privateFrom,
          privateKey: privKey,
          privateFor: req.privateTransactionConfig.privateFor,
        };
        if (!this.web3Quorum) {
          throw new RuntimeError(`InvalidState: web3Quorum not initialized.`);
        }

        const privacyGroupId =
          this.web3Quorum.utils.generatePrivacyGroup(fnParams);
        this.log.debug("Generated privacyGroupId: ", privacyGroupId);
        callOutput = await this.web3Quorum.priv.call(privacyGroupId, {
          to: contractInstance.options.address,
          data,
          // TODO: Update the "from" property of ICallOptions to be optional
        });

        success = true;
        this.log.debug(`Web3 EEA Call output: `, callOutput);
      } else {
        callOutput = await method.call();
        success = true;
      }
      return { success, callOutput };
    } else if (req.invocationType === EthContractInvocationType.Send) {
      if (isWeb3SigningCredentialNone(req.signingCredential)) {
        throw new Error(`${fnTag} Cannot deploy contract with pre-signed TX`);
      }
      const web3SigningCredential = req.signingCredential as
        | Web3SigningCredentialPrivateKeyHex
        | Web3SigningCredentialCactusKeychainRef;
      const payload = (method.send as any).request();
      const { params } = payload;
      const [transactionConfig] = params;
      if (req.gas == undefined) {
        req.gas = await this.web3.eth.estimateGas(transactionConfig);
      }
      transactionConfig.from = web3SigningCredential.ethAccount;
      transactionConfig.gas = req.gas;
      transactionConfig.gasPrice = req.gasPrice;
      transactionConfig.value = req.value;
      transactionConfig.nonce = req.nonce;
      const txReq: RunTransactionRequest = {
        transactionConfig,
        web3SigningCredential,
        consistencyStrategy: {
          blockConfirmations: 0,
          receiptType: ReceiptType.NodeTxPoolAck,
          timeoutMs: req.timeoutMs || 60000,
        },
        privateTransactionConfig: req.privateTransactionConfig,
      };
      const out = await this.transact(txReq);
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

  public async transact(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const ctx = {
      prometheusExporter: this.prometheusExporter,
      pluginRegistry: this.pluginRegistry,
      logLevel: this.logLevel,
      web3: this.web3,
    };
    const runTransactionResponse = transactV1Impl(ctx, req);
    return runTransactionResponse;
  }

  public async deployContract(
    req: DeployContractSolidityBytecodeV1Request,
  ): Promise<DeployContractSolidityBytecodeV1Response> {
    const ctx = {
      pluginRegistry: this.pluginRegistry,
      prometheusExporter: this.prometheusExporter,
      web3: this.web3,
      logLevel: this.logLevel,
    };

    const deployContractV1KeychainResponse: IDeployContractV1KeychainResponse =
      await deployContractV1Keychain(ctx, req);
    if (
      deployContractV1KeychainResponse.status &&
      deployContractV1KeychainResponse.contractAddress &&
      deployContractV1KeychainResponse.contract
    ) {
      this.contracts[deployContractV1KeychainResponse.contractName] =
        deployContractV1KeychainResponse.contract;
    }
    return deployContractV1KeychainResponse.deployResponse;
  }

  public async deployContractNoKeychain(
    req: DeployContractSolidityBytecodeNoKeychainV1Request,
  ): Promise<DeployContractSolidityBytecodeV1Response> {
    const ctx = {
      pluginRegistry: this.pluginRegistry,
      prometheusExporter: this.prometheusExporter,
      web3: this.web3,
      logLevel: this.logLevel,
    };
    const deployContractV1NoKeychainResponse: IDeployContractV1NoKeychainResponse =
      await deployContractV1NoKeychain(ctx, req);
    if (deployContractV1NoKeychainResponse.contractJsonString) {
      this.contracts[deployContractV1NoKeychainResponse.contractName] =
        deployContractV1NoKeychainResponse.contract;
    }
    return deployContractV1NoKeychainResponse.deployResponse;
  }

  public async signTransaction(
    req: SignTransactionRequest,
  ): Promise<Optional<SignTransactionResponse>> {
    const { pluginRegistry, rpcApiHttpHost, logLevel } = this.options;
    const { keychainId, keychainRef, transactionHash } = req;

    const converter = new KeyConverter();

    const web3Provider = new Web3.providers.HttpProvider(rpcApiHttpHost);
    const web3 = new Web3(web3Provider);

    // Make sure the transaction exists on the ledger first...
    const transaction = await web3.eth.getTransaction(transactionHash);
    if (!transaction) {
      return Optional.empty();
    }

    const keychain = pluginRegistry.findOneByKeychainId(keychainId);

    if (!keychain) {
      const msg = `Keychain for ID ${keychainId} not found.`;
      throw new CodedError(msg, E_KEYCHAIN_NOT_FOUND);
    }

    const pem: string = await keychain.get(keychainRef);

    const pkRaw = converter.privateKeyAs(pem, KeyFormat.PEM, KeyFormat.Raw);

    const jsObjectSignerOptions: IJsObjectSignerOptions = {
      privateKey: pkRaw,
      logLevel,
    };

    const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

    if (transaction !== undefined && transaction !== null) {
      const singData = jsObjectSigner.sign(transaction.input);
      const signDataHex = Buffer.from(singData).toString("hex");

      const resBody: SignTransactionResponse = { signature: signDataHex };
      return Optional.ofNullable(resBody);
    }

    return Optional.empty();
  }

  public async getBalance(
    request: GetBalanceV1Request,
  ): Promise<GetBalanceV1Response> {
    const balance = await this.web3.eth.getBalance(
      request.address,
      request.defaultBlock,
    );
    return { balance };
  }

  public async getTransaction(
    request: GetTransactionV1Request,
  ): Promise<GetTransactionV1Response> {
    const transaction = await this.web3.eth.getTransaction(
      request.transactionHash,
    );
    return { transaction };
  }

  public async getPastLogs(
    request: GetPastLogsV1Request,
  ): Promise<GetPastLogsV1Response> {
    const logs = await this.web3.eth.getPastLogs(request);
    return { logs };
  }

  public async getBlock(
    request: GetBlockV1Request,
  ): Promise<GetBlockV1Response> {
    const ctx = { logLevel: this.logLevel, web3: this.web3 };
    const getBlockV1Response = await getBlockV1Http(ctx, request);
    this.log.debug("getBlockV1Response=%o", getBlockV1Response);
    return getBlockV1Response;
  }

  public async getBesuRecord(
    request: GetBesuRecordV1Request,
  ): Promise<GetBesuRecordV1Response> {
    const fnTag = `${this.className}#getBesuRecord()`;
    //////////////////////////////////////////////
    let abi: AbiItem[] | AbiItem = [];
    const resp: GetBesuRecordV1Response = {};
    const txHash = request.transactionHash;

    if (txHash) {
      const transaction = await this.web3.eth.getTransaction(txHash);
      if (transaction.input) {
        resp.transactionInputData = transaction.input;
        return resp;
      }
    }

    if (request.invokeCall) {
      if (request.invokeCall.contractAbi) {
        if (typeof request.invokeCall.contractAbi === "string") {
          abi = JSON.parse(request.invokeCall.contractAbi);
        } else {
          abi = request.invokeCall.contractAbi;
        }
      }
      const { contractAddress } = request.invokeCall;
      const contractInstance = new this.web3.eth.Contract(abi, contractAddress);

      const isSafeToCall = await this.isSafeToCallContractMethod(
        contractInstance,
        request.invokeCall.methodName,
      );
      if (!isSafeToCall) {
        throw new RuntimeError(
          `Invalid method name provided in request. ${request.invokeCall.methodName} does not exist on the Web3 contract object's "methods" property.`,
        );
      }

      const methodRef = contractInstance.methods[request.invokeCall.methodName];
      Checks.truthy(
        methodRef,
        `${fnTag} YourContract.${request.invokeCall.methodName}`,
      );
      const method: ContractSendMethod = methodRef(
        ...request.invokeCall.params,
      );

      if (
        request.invokeCall.invocationType === EthContractInvocationType.Call
      ) {
        const callOutput = await (method as any).call();
        const res: GetBesuRecordV1Response = {
          callOutput,
        };
        return res;
      } else {
        throw new Error(
          `${fnTag} Unsupported invocation type ${request.invokeCall.invocationType}`,
        );
      }
    }
    return resp;
  }
}
