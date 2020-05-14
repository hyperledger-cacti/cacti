import { IPluginLedgerConnector, IWebServiceEndpoint, IPluginWebService, PluginAspect } from '@hyperledger-labs/bif-core-api';
import { Logger, LoggerProvider } from '@hyperledger-labs/bif-common';

import Web3 from 'web3';
import { Contract, ContractSendMethod, ContractOptions, DeployOptions, SendOptions } from 'web3-eth-contract/types/index';
import { PromiEvent } from 'web3-core/types/index';
import { DeployContractEndpoint } from './web-services/deploy-contract-endpoint';

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

export class PluginLedgerConnectorQuorum implements IPluginLedgerConnector<any, Contract>, IPluginWebService {

  private readonly web3: Web3;
  private readonly log: Logger;

  constructor(public readonly options: IPluginLedgerConnectorQuorumOptions) {
    if (!options) {
      throw new Error(`PluginLedgerConnectorQuorum#ctor options falsy.`);
    }
    const web3Provider = new Web3.providers.HttpProvider(this.options.rpcApiHttpHost);
    this.web3 = new Web3(web3Provider);
    this.log = LoggerProvider.getOrCreate({ label: 'plugin-ledger-connector-quorum', level: 'trace' })
  }

  public installWebService(expressApp: any): IWebServiceEndpoint[] {
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint: IWebServiceEndpoint = new DeployContractEndpoint({ path: '/deploy-contract', plugin: this });
      expressApp.use(endpoint.getPath(), endpoint.getExpressRequestHandler());
      endpoints.push(endpoint);
    }
    return endpoints;
  }

  public getId(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-quorum`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.LEDGER_CONNECTOR
  }

  public async sendTransaction(options: ITransactionOptions): Promise<any> {
    return this.web3.eth.sendTransaction(options as any);
  }

  public instantiateContract(contractJsonArtifact: any, address?: string): Contract {
    const contractOptions: ContractOptions = {};
    return new this.web3.eth.Contract(contractJsonArtifact.abi, address, contractOptions);
  }

  public async deployContract(options: IQuorumDeployContractOptions): Promise<Contract> {

    if (!options.contractJsonArtifact) {
      throw new Error(`PluginLedgerConnectorQuorum#deployContract() options.contractJsonArtifact falsy.`);
    }

    try {
      const unlocked: boolean = await this.web3.eth.personal.unlockAccount(options.fromAddress, options.ethAccountUnlockPassword, 3600);
      this.log.debug(`Web3 Account unlock outcome: ${unlocked}`);
    } catch (ex) {
      throw new Error(`PluginLedgerConnectorQuorum#deployContract() failed to unlock account ${options.fromAddress}: ${ex.stack}`);
    }

    const contract: Contract = this.instantiateContract(options.contractJsonArtifact, options.fromAddress);
    this.log.debug(`Instantiated contract OK`);

    const deployOptions: DeployOptions = {
      data: '0x' + options.contractJsonArtifact.bytecode,
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
    const promiEventContract: PromiEvent<Contract> = deployTask.send(sendOptions);
    this.log.debug(`Called send OK with options: `, { sendOptions });

    try {
      this.log.debug(`Starting await for contract deployment promise...`);
      const deployedContract: Contract = await promiEventContract;
      this.log.debug(`Deployed contract OK.`);
      return deployedContract;
    } catch (ex) {
      const message = `PluginLedgerConnectorQuorum#deployContract() Failed to deploy contract: ${ex.stack}`;
      throw new Error(message);
    }
  }

  public async addPublicKey(publicKeyHex: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

}
