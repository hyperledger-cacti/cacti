import { Server } from "http";
import { Server as SecureServer } from "https";

import { Express } from "express";
import { promisify } from "util";
import { Optional } from "typescript-optional";
import Web3 from "web3";

import { ContractSendMethod } from "web3-eth-contract";
import { TransactionReceipt } from "web3-eth";

import {
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  PluginAspect,
  ICactusPlugin,
  ICactusPluginOptions,
  PluginRegistry,
  IPluginKeychain,
} from "@hyperledger/cactus-core-api";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { DeployContractSolidityBytecodeEndpoint } from "./web-services/deploy-contract-solidity-bytecode-endpoint";

import {
  DeployContractSolidityBytecodeV1Request,
  DeployContractSolidityBytecodeV1Response,
  EthContractInvocationType,
  InvokeContractV1Request,
  InvokeContractV1Response,
  RunTransactionRequest,
  RunTransactionResponse,
  Web3SigningCredential,
  Web3SigningCredentialGethKeychainPassword,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "./generated/openapi/typescript-axios/";

import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint";
import { InvokeContractEndpoint } from "./web-services/invoke-contract-endpoint";
import { isWeb3SigningCredentialNone } from "./model-type-guards";

export interface IPluginLedgerConnectorQuorumOptions
  extends ICactusPluginOptions {
  rpcApiHttpHost: string;
  logLevel?: LogLevelDesc;
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
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly web3: Web3;
  private httpServer: Server | SecureServer | null = null;

  public static readonly CLASS_NAME = "PluginLedgerConnectorQuorum";

  public get className() {
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
      this.options.rpcApiHttpHost
    );
    this.web3 = new Web3(web3Provider);
    this.instanceId = options.instanceId;
    this.pluginRegistry = options.pluginRegistry;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public async shutdown(): Promise<void> {
    const serverMaybe = this.getHttpServer();
    if (serverMaybe.isPresent()) {
      const server = serverMaybe.get();
      await promisify(server.close.bind(server))();
    }
  }

  public async installWebServices(
    expressApp: Express
  ): Promise<IWebServiceEndpoint[]> {
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new DeployContractSolidityBytecodeEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }
    {
      const endpoint = new RunTransactionEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }
    {
      const endpoint = new InvokeContractEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-quorum`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.LEDGER_CONNECTOR;
  }

  public async invokeContract(
    req: InvokeContractV1Request
  ): Promise<InvokeContractV1Response> {
    const fnTag = `${this.className}#invokeContract()`;

    const { invocationType } = req;

    let abi;
    if (typeof req.contractAbi === "string") {
      abi = JSON.parse(req.contractAbi);
    } else {
      abi = req.contractAbi;
    }

    const { contractAddress } = req;
    const aContract = new this.web3.eth.Contract(abi, contractAddress);
    const methodRef = aContract.methods[req.methodName];

    Checks.truthy(methodRef, `${fnTag} YourContract.${req.methodName}`);

    const method: ContractSendMethod = methodRef(...req.params);

    if (req.invocationType === EthContractInvocationType.CALL) {
      const callOutput = await (method as any).call(...req.params);
      return { callOutput };
    } else if (req.invocationType === EthContractInvocationType.SEND) {
      if (isWeb3SigningCredentialNone(req.web3SigningCredential)) {
        throw new Error(`${fnTag} Cannot deploy contract with pre-signed TX`);
      }
      const web3SigningCredential = req.web3SigningCredential as
        | Web3SigningCredentialGethKeychainPassword
        | Web3SigningCredentialPrivateKeyHex;

      const payload = (method.send as any).request();
      const { params } = payload;
      const [transactionConfig] = params;
      transactionConfig.from = web3SigningCredential.ethAccount;
      transactionConfig.gas = req.gas;
      transactionConfig.gasPrice = req.gasPrice;

      const txReq: RunTransactionRequest = {
        transactionConfig,
        web3SigningCredential,
        timeoutMs: req.timeoutMs || 60000,
      };
      const out = await this.transact(txReq);

      return out;
    } else {
      throw new Error(`${fnTag} Unsupported invocation type ${invocationType}`);
    }
  }

  public async transact(
    req: RunTransactionRequest
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transact()`;

    switch (req.web3SigningCredential.type) {
      case Web3SigningCredentialType.CACTUSKEYCHAINREF: {
        return this.transactCactusKeychainRef(req);
      }
      case Web3SigningCredentialType.GETHKEYCHAINPASSWORD: {
        return this.transactGethKeychain(req);
      }
      case Web3SigningCredentialType.PRIVATEKEYHEX: {
        return this.transactPrivateKey(req);
      }
      case Web3SigningCredentialType.NONE: {
        if (req.transactionConfig.rawTransaction) {
          return this.transactSigned(req.transactionConfig.rawTransaction);
        } else {
          throw new Error(
            `${fnTag} Expected pre-signed raw transaction ` +
              ` since signing credential is specified as` +
              `Web3SigningCredentialType.NONE`
          );
        }
      }
      default: {
        throw new Error(
          `${fnTag} Unrecognized Web3SigningCredentialType: ` +
            `${req.web3SigningCredential.type} Supported ones are: ` +
            `${Object.values(Web3SigningCredentialType).join(";")}`
        );
      }
    }
  }

  public async transactSigned(
    rawTransaction: string
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactSigned()`;

    const receipt = await this.web3.eth.sendSignedTransaction(rawTransaction);

    if (receipt instanceof Error) {
      this.log.debug(`${fnTag} Web3 sendSignedTransaction failed`, receipt);
      throw receipt;
    } else {
      return { transactionReceipt: receipt };
    }
  }

  public async transactGethKeychain(
    txIn: RunTransactionRequest
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
          `InnerException: ${ex.stack}`
      );
    }
  }

  public async transactPrivateKey(
    req: RunTransactionRequest
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transactPrivateKey()`;
    const { transactionConfig, web3SigningCredential } = req;
    const {
      secret,
    } = web3SigningCredential as Web3SigningCredentialPrivateKeyHex;

    const signedTx = await this.web3.eth.accounts.signTransaction(
      transactionConfig,
      secret
    );

    if (signedTx.rawTransaction) {
      return this.transactSigned(signedTx.rawTransaction);
    } else {
      throw new Error(
        `${fnTag} Failed to sign eth transaction. ` +
          `signedTransaction.rawTransaction is blank after .signTransaction().`
      );
    }
  }

  public async transactCactusKeychainRef(
    req: RunTransactionRequest
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
    const keychainPlugin = this.pluginRegistry
      .findManyByAspect<IPluginKeychain>(PluginAspect.KEYCHAIN)
      .find((k) => k.getKeychainId() === keychainId);

    Checks.truthy(keychainPlugin, `${fnTag} keychain for ID:"${keychainId}"`);

    // Now use the found keychain plugin to actually perform the lookup of
    // the private key that we need to run the transaction.
    const privateKeyHex = await keychainPlugin?.get<string>(keychainEntryKey);

    return this.transactPrivateKey({
      transactionConfig,
      web3SigningCredential: {
        ethAccount,
        type: Web3SigningCredentialType.PRIVATEKEYHEX,
        secret: privateKeyHex,
      },
    });
  }

  public async pollForTxReceipt(
    txHash: string,
    timeoutMs: number = 60000
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

  public async deployContract(
    req: DeployContractSolidityBytecodeV1Request
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#deployContract()`;
    Checks.truthy(req, `${fnTag} req`);

    if (isWeb3SigningCredentialNone(req.web3SigningCredential)) {
      throw new Error(`${fnTag} Cannot deploy contract with pre-signed TX`);
    }
    const web3SigningCredential = req.web3SigningCredential as
      | Web3SigningCredentialGethKeychainPassword
      | Web3SigningCredentialPrivateKeyHex;

    return this.transact({
      transactionConfig: {
        data: `0x${req.bytecode}`,
        from: web3SigningCredential.ethAccount,
        gas: req.gas,
        gasPrice: req.gasPrice,
      },
      web3SigningCredential,
    });
  }
}
