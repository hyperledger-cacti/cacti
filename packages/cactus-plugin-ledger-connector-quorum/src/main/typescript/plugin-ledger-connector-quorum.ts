import { Server } from "http";
import { Server as SecureServer } from "https";

import { Express } from "express";
import Web3 from "web3";
// The strange way of obtaining the contract class here is like this because
// web3-eth internally sub-classes the Contract class at runtime
// @see https://stackoverflow.com/a/63639280/698470
const Contract = new Web3().eth.Contract;
import { ContractSendMethod } from "web3-eth-contract";
import { TransactionReceipt } from "web3-eth";

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
  InvokeContractV1Request,
  InvokeContractJsonObjectV1Request,
  InvokeContractV1Response,
  RunTransactionRequest,
  RunTransactionResponse,
  Web3SigningCredentialGethKeychainPassword,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "./generated/openapi/typescript-axios/";

import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint";
import { InvokeContractEndpoint } from "./web-services/invoke-contract-endpoint";
import { InvokeContractJsonObjectEndpoint } from "./web-services/invoke-contract-endpoint-json-object";
import { isWeb3SigningCredentialNone } from "./model-type-guards";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import {
  GetPrometheusExporterMetricsEndpointV1,
  IGetPrometheusExporterMetricsEndpointV1Options,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";

export interface IPluginLedgerConnectorQuorumOptions
  extends ICactusPluginOptions {
  rpcApiHttpHost: string;
  logLevel?: LogLevelDesc;
  prometheusExporter?: PrometheusExporter;
  pluginRegistry: PluginRegistry;
}

export class PluginLedgerConnectorQuorum
  implements
    IPluginLedgerConnector<
      DeployContractSolidityBytecodeV1Request,
      DeployContractSolidityBytecodeV1Response,
      RunTransactionRequest,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService {
  private readonly pluginRegistry: PluginRegistry;
  public prometheusExporter: PrometheusExporter;
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly web3: Web3;
  private httpServer: Server | SecureServer | null = null;

  private endpoints: IWebServiceEndpoint[] | undefined;
  public static readonly CLASS_NAME = "PluginLedgerConnectorQuorum";

  public get className(): string {
    return PluginLedgerConnectorQuorum.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorQuorumOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.rpcApiHttpHost, `${fnTag} options.rpcApiHttpHost`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    const web3Provider = new Web3.providers.HttpProvider(
      this.options.rpcApiHttpHost,
    );
    this.web3 = new Web3(web3Provider);
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

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
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
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(endpoint);
    }
    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-quorum`;
  }

  public async getConsensusAlgorithmFamily(): Promise<
    ConsensusAlgorithmFamily
  > {
    return ConsensusAlgorithmFamily.Authority;
  }
  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily = await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  public async getContractInfoKeychain(
    req: InvokeContractV1Request,
  ): Promise<any> {
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
    (req as any).contractJSON = contractJSON;

    // if not exists a contract deployed, we deploy it
    const networkId = await this.web3.eth.net.getId();
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
    (req as any).contractAddress = contractJSON.networks[networkId].address;

    return this.invokeContract(req);
  }

  public async getContractInfo(
    req: InvokeContractJsonObjectV1Request,
  ): Promise<any> {
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

  public async invokeContract(req: any): Promise<InvokeContractV1Response> {
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

    const contractInstance: InstanceType<typeof Contract> = new this.web3.eth.Contract(
      abi,
      contractAddress,
    );

    const methodRef = contractInstance.methods[req.methodName];
    Checks.truthy(methodRef, `${fnTag} YourContract.${req.methodName}`);

    const method: ContractSendMethod = methodRef(...req.params);
    if (req.invocationType === EthContractInvocationType.Call) {
      contractInstance.methods[req.methodName];
      const callOutput = await (method as any).call();
      const success = true;
      return { success, callOutput };
    } else if (req.invocationType === EthContractInvocationType.Send) {
      if (isWeb3SigningCredentialNone(req.web3SigningCredential)) {
        throw new Error(`${fnTag} Cannot deploy contract with pre-signed TX`);
      }
      const web3SigningCredential = req.web3SigningCredential as
        | Web3SigningCredentialPrivateKeyHex
        | Web3SigningCredentialCactusKeychainRef;
      const payload = (method.send as any).request();
      const { params } = payload;
      const [transactionConfig] = params;
      if (!req.gas) {
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
        timeoutMs: req.timeoutMs || 60000,
      };
      const out = await this.transact(txReq);
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

    switch (req.web3SigningCredential.type) {
      case Web3SigningCredentialType.CactusKeychainRef: {
        return this.transactCactusKeychainRef(req);
      }
      case Web3SigningCredentialType.GethKeychainPassword: {
        return this.transactGethKeychain(req);
      }
      case Web3SigningCredentialType.PrivateKeyHex: {
        return this.transactPrivateKey(req);
      }
      case Web3SigningCredentialType.None: {
        if (req.transactionConfig.rawTransaction) {
          return this.transactSigned(req.transactionConfig.rawTransaction);
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

  public async transactSigned(
    rawTransaction: string,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactSigned()`;

    const receipt = await this.web3.eth.sendSignedTransaction(rawTransaction);

    if (receipt instanceof Error) {
      this.log.debug(`${fnTag} Web3 sendSignedTransaction failed`, receipt);
      throw receipt;
    } else {
      this.prometheusExporter.addCurrentTransaction();
      return { transactionReceipt: receipt };
    }
  }

  public async transactGethKeychain(
    txIn: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactGethKeychain()`;
    const { sendTransaction } = this.web3.eth.personal;
    const { transactionConfig, web3SigningCredential } = txIn;
    const {
      secret,
    } = web3SigningCredential as Web3SigningCredentialGethKeychainPassword;
    try {
      const txHash = await sendTransaction(transactionConfig, secret);
      const transactionReceipt = await this.pollForTxReceipt(txHash);
      return { transactionReceipt };
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
    const {
      secret,
    } = web3SigningCredential as Web3SigningCredentialPrivateKeyHex;

    const signedTx = await this.web3.eth.accounts.signTransaction(
      transactionConfig,
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
    const {
      ethAccount,
      keychainEntryKey,
      keychainId,
    } = web3SigningCredential as Web3SigningCredentialCactusKeychainRef;

    // locate the keychain plugin that has access to the keychain backend
    // denoted by the keychainID from the request.
    const keychainPlugin = this.pluginRegistry.findOneByKeychainId(
      keychainId as string,
    );

    Checks.truthy(keychainPlugin, `${fnTag} keychain for ID:"${keychainId}"`);

    // Now use the found keychain plugin to actually perform the lookup of
    // the private key that we need to run the transaction.
    const privateKeyHex = await keychainPlugin?.get(keychainEntryKey as string);

    if (!transactionConfig.gas) {
      this.log.debug(
        `${fnTag} Gas not specified in the transaction values. Using the estimate from web3`,
      );
      transactionConfig.gas = await this.web3.eth.estimateGas(
        transactionConfig,
      );
      this.log.debug(
        `${fnTag} Gas estimated from web3 is: `,
        transactionConfig.gas,
      );
    }

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
  ): Promise<TransactionReceipt> {
    const fnTag = `${this.className}#pollForTxReceipt()`;
    let txReceipt;
    let timedOut = false;
    let tries = 0;
    const startedAt = new Date();

    do {
      txReceipt = await this.web3.eth.getTransactionReceipt(txHash);
      tries++;
      timedOut = Date.now() >= startedAt.getTime() + timeoutMs;
    } while (!timedOut && !txReceipt);

    if (!txReceipt) {
      throw new Error(`${fnTag} Timed out ${timeoutMs}ms, polls=${tries}`);
    } else {
      return txReceipt;
    }
  }

  private async generateBytecode(req: any): Promise<string> {
    const tmpContract = new this.web3.eth.Contract(
      (req.contractJSON as any).abi,
    );
    const deployment = tmpContract.deploy({
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

    const receipt = await this.transact({
      transactionConfig: {
        data: await this.generateBytecode(req),
        from: web3SigningCredential.ethAccount,
        gas: req.gas,
        gasPrice: req.gasPrice,
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
      const networkId = await this.web3.eth.net.getId();
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
}
