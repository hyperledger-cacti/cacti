import { asciiToHex } from 'web3-utils';
import { IPluginLedgerConnector } from '@hyperledger-labs/bif-core-api';
import { Logger, LoggerProvider } from '@hyperledger-labs/bif-common';

import Web3 from 'web3';
import { Contract, ContractSendMethod, ContractOptions, DeployOptions, SendOptions } from 'web3-eth-contract/types/index';
import { PromiEvent, TransactionReceipt } from 'web3-core/types/index';

export interface IPluginLedgerConnectorQuorumOptions {
  rpcApiHttpHost: string;
}

export interface ITransactionOptions {
  privateKey?: string;
}

export class PluginLedgerConnectorQuorum implements IPluginLedgerConnector<any, any> {

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

  public async sendTransaction(options: ITransactionOptions): Promise<any> {
    return this.web3.eth.sendTransaction(options as any);
  }

  public instantiateContract(contractJsonArtifact: any, address?: string): Contract {
    const contractOptions: ContractOptions = {};
    return new this.web3.eth.Contract(contractJsonArtifact.abi, address, contractOptions);
  }

  public async deployContract(options: any): Promise<any> {
    try {
      const ethPassword = '';
      const unlocked: boolean = await this.web3.eth.personal.unlockAccount(options.from, ethPassword, 3600);
      this.log.debug(`Web3 Account unlock outcome: ${unlocked}`);
    } catch (ex) {
      throw new Error(`PluginLedgerConnectorQuorum#deployContract() failed to unlock account ${options.from}: ${ex.stack}`);
    }

    const fromAddress = options.from;
    const contract: Contract = this.instantiateContract(options.contractJsonArtifact, fromAddress);
    this.log.debug(`Instantiated contract OK`);

    let nonce: number;
    try {
      this.log.debug(`Getting transaction count (nonce for account)`);
      nonce = await this.web3.eth.getTransactionCount(fromAddress);
      this.log.debug(`Transaction count (nonce) acquird OK: ${nonce}`);
    } catch (ex) {
      throw new Error(`Failed to obtain nonce: ${ex.stack}`);
    }

    const deployOptions: DeployOptions = {
      data: '0x' + options.contractJsonArtifact.bytecode,
    };
    this.log.debug(`Calling contract deployment...`);
    const deployTask: ContractSendMethod = contract.deploy(deployOptions);
    this.log.debug(`Called deploy task OK with options: `, { deployOptions });

    // try {
    //   this.log.debug(`Asking ledger for gas estimate...`);
    //   const gasEstimate = await deployTask.estimateGas({ gas: 5000000, });
    //   this.log.debug(`Got GasEstimate=${gasEstimate}`);
    //   // const gas = gasEstimate * 3; // offer triple the gas estimate to be sure
    // } catch (ex) {
    //   throw new Error(`PluginLedgerConnectorQuorum#deployContract() failed to get gas estimate: ${ex.stack}`);
    // }

    const sendOptions: SendOptions = {
      from: fromAddress,
      gas: 1500000,
      gasPrice: '0',
    };

    this.log.debug(`Calling send on deploy task...`);
    const promiEventContract: PromiEvent<Contract> = deployTask.send(sendOptions);
    this.log.debug(`Called send OK with options: `, { sendOptions });

    // promiEventContract
    //   .once('confirmation', (confNumber: number, receipt: TransactionReceipt) => {
    //     this.log.debug(`deployContract() - confirmation: `, { confNumber, receipt });
    //   })
    //   .once('error', (error: Error) => {
    //     this.log.error(`deployContract() - error: `, error);
    //   })
    //   .once('receipt', (receipt: TransactionReceipt) => {
    //     this.log.debug(`deployContract() - receipt: `, { receipt });
    //   })
    //   .once('transactionHash', (receipt: string) => {
    //     this.log.debug(`deployContract() - transactionHash: `, { receipt });
    //   });

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
