import {
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  PluginAspect,
} from "@hyperledger/cactus-core-api";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

import { promisify } from "util";
import { Optional } from "typescript-optional";
import { Server } from "http";
import { Server as SecureServer } from "https";
import Web3 from "web3";
import {
  Contract,
  ContractSendMethod,
  ContractOptions,
  DeployOptions,
  SendOptions,
} from "web3-eth-contract/types/index";
import { PromiEvent } from "web3-core/types/index";
import { DeployContractEndpoint } from "./web-services/deploy-contract-endpoint";

export interface IPluginLedgerConnectorQuorumOptions {
  rpcApiHttpHost: string;
}

/**
 * FIXME: This is under construction.
 */
export interface ITransactionOptions {
  privateKey?: string;
}

export interface IQuorumDeployContractOptions {
  ethAccountUnlockPassword: string; // The decryption key for geth to unlock the account
  fromAddress: string; // The address to use
  contractSourceCode?: string; // if provided then compile the contract through the API
  contractJsonArtifact?: { bytecode: string }; // use this if provided (the pre-compiled JSON artifact)
  gas?: number;
  gasPrice?: number;
}

export class PluginLedgerConnectorQuorum
  implements IPluginLedgerConnector<any, Contract>, IPluginWebService {
  private readonly web3: Web3;
  private readonly log: Logger;
  private httpServer: Server | SecureServer | null = null;

  constructor(public readonly options: IPluginLedgerConnectorQuorumOptions) {
    if (!options) {
      throw new Error(`PluginLedgerConnectorQuorum#ctor options falsy.`);
    }
    if (!options.rpcApiHttpHost) {
      throw new Error(
        `PluginLedgerConnectorQuorum#ctor options.rpcApiHttpHost falsy.`
      );
    }
    const web3Provider = new Web3.providers.HttpProvider(
      this.options.rpcApiHttpHost
    );
    this.web3 = new Web3(web3Provider);
    this.log = LoggerProvider.getOrCreate({
      label: "plugin-ledger-connector-quorum",
      level: "trace",
    });
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
    expressApp: any
  ): Promise<IWebServiceEndpoint[]> {
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const pluginId = this.getId(); // @hyperledger/cactus-plugin-ledger-connector-quorum
      const path = `/api/v1/plugins/${pluginId}/contract/deploy`;
      const endpoint: IWebServiceEndpoint = new DeployContractEndpoint({
        path,
        plugin: this,
      });
      expressApp.use(endpoint.getPath(), endpoint.getExpressRequestHandler());
      endpoints.push(endpoint);
      this.log.info(`Registered contract deployment endpoint at ${path}`);
    }
    return endpoints;
  }

  public getId(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-quorum`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.LEDGER_CONNECTOR;
  }

  public async sendTransaction(options: ITransactionOptions): Promise<any> {
    return this.web3.eth.sendTransaction(options as any);
  }

  public instantiateContract(
    contractJsonArtifact: any,
    address?: string
  ): Contract {
    const contractOptions: ContractOptions = {};
    return new this.web3.eth.Contract(
      contractJsonArtifact.abi,
      address,
      contractOptions
    );
  }

  public async deployContract(
    options: IQuorumDeployContractOptions
  ): Promise<Contract> {
    const fnTag = "PluginLedgerConnectorQuorum#deployContract()";
    if (!options.contractJsonArtifact) {
      throw new Error(`${fnTag} options.contractJsonArtifact falsy.`);
    }

    const { fromAddress } = options;

    try {
      const unlocked: boolean = await this.web3.eth.personal.unlockAccount(
        fromAddress,
        options.ethAccountUnlockPassword,
        3600
      );
      this.log.debug(`Web3 Account unlock outcome: ${unlocked}`);
    } catch (ex) {
      throw new Error(`${fnTag} failed to unlock ${fromAddress}: ${ex.stack}`);
    }

    const contract: Contract = this.instantiateContract(
      options.contractJsonArtifact,
      fromAddress
    );
    this.log.debug(`Instantiated contract OK`);

    const deployOptions: DeployOptions = {
      data: "0x" + options.contractJsonArtifact.bytecode,
    };
    this.log.debug(`Calling contract deployment...`);
    const deployTask: ContractSendMethod = contract.deploy(deployOptions);
    this.log.debug(`Called deploy task OK with options: `, { deployOptions });

    const sendOptions: SendOptions = {
      from: options.fromAddress,
      gas: options.gas || 1000000,
      gasPrice: `${options.gasPrice || 0}`,
    };

    this.log.debug(`Calling send on deploy task...`, { sendOptions });
    const promiEventContract = deployTask.send(sendOptions);
    this.log.debug(`Called send OK with options: `, { sendOptions });

    try {
      this.log.debug(`Starting await for contract deployment promise...`);
      const deployedContract: Contract = await promiEventContract;
      this.log.debug(`Deployed contract OK.`);
      return deployedContract;
    } catch (ex) {
      throw new Error(`${fnTag} Failed to deploy contract: ${ex.stack}`);
    }
  }

  public async addPublicKey(publicKeyHex: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
