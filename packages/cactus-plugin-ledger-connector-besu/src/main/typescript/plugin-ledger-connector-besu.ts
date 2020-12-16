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

import {
  DeployContractSolidityBytecodeV1Request,
  DeployContractSolidityBytecodeV1Response,
  EthContractInvocationType,
  InvokeContractV1Request,
  InvokeContractV1Response,
  RunTransactionRequest,
  RunTransactionResponse,
  SignTransactionRequest,
  SignTransactionResponse,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "./generated/openapi/typescript-axios/";

import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint";
import { InvokeContractEndpoint } from "./web-services/invoke-contract-endpoint";
import { isWeb3SigningCredentialNone } from "./model-type-guards";
import { BesuSignTransactionEndpointV1 } from "./web-services/sign-transaction-endpoint-v1";

export const E_KEYCHAIN_NOT_FOUND = "cactus.connector.besu.keychain_not_found";

export interface IPluginLedgerConnectorBesuOptions
  extends ICactusPluginOptions {
  rpcApiHttpHost: string;
  pluginRegistry: PluginRegistry;
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
    IPluginWebService {
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly web3: Web3;
  private readonly pluginRegistry: PluginRegistry;
  private httpServer: Server | SecureServer | null = null;

  public static readonly CLASS_NAME = "PluginLedgerConnectorBesu";

  public get className() {
    return PluginLedgerConnectorBesu.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorBesuOptions) {
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
    {
      const endpoint = new BesuSignTransactionEndpointV1({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-besu`;
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
      const web3SigningCredential = req.web3SigningCredential as Web3SigningCredentialPrivateKeyHex;

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
      // Web3SigningCredentialType.GETHKEYCHAINPASSWORD is removed as Hyperledger Besu doesn't support the PERSONAL api
      // for --rpc-http-api as per the discussion mentioned here
      // https://chat.hyperledger.org/channel/besu-contributors?msg=GqQXfW3k79ygRtx5Q
      case Web3SigningCredentialType.CACTUSKEYCHAINREF: {
        return this.transactCactusKeychainRef(req);
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
    const web3SigningCredential = req.web3SigningCredential as Web3SigningCredentialPrivateKeyHex;

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

  public async signTransaction(
    req: SignTransactionRequest
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

    const keychains = pluginRegistry.findManyByAspect<IPluginKeychain>(
      PluginAspect.KEYCHAIN
    );

    const keychain = keychains.find((kc) => kc.getKeychainId() === keychainId);

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
}
