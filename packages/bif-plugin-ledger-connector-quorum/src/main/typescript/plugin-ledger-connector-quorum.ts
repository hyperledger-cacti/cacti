import { IPluginLedgerConnector } from '@hyperledger-labs/bif-core-api';
import { Logger, LoggerProvider } from '@hyperledger-labs/bif-common';

import Web3 from 'web3';
import { Contract, ContractSendMethod, ContractOptions, DeployOptions } from 'web3-eth-contract/types/index';
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
    this.log = LoggerProvider.getOrCreate({ label: 'plugin-ledger-connector-quorum' })
  }

  public async sendTransaction(options: ITransactionOptions): Promise<any> {
    return this.web3.eth.sendTransaction(options as any);
  }

  public instantiateContract(contractJsonArtifact: any, address?: string): Contract {
    const contractOptions: ContractOptions = {};
    return new this.web3.eth.Contract(contractJsonArtifact.abi, address, contractOptions);
  }

  public async deployContract(options: any): Promise<any> {
    const contract: Contract = this.instantiateContract(options.contractJsonArtifact);

    const contractSendMethod: ContractSendMethod = contract.deploy({
      data: options.contractJsonArtifact.bytecode,
      arguments: []
    });

    const promiEventContract: PromiEvent<Contract> = contractSendMethod.send({
      from: options.from || this.web3.eth.defaultAccount,
      gas: options.gas || 10000000,
    });

    promiEventContract
      .on('confirmation', (confNumber: number, receipt: TransactionReceipt) => {
        this.log.debug(`deployContract() - confirmation: `, { confNumber, receipt });
      })
      .on('error', (error: Error) => {
        this.log.error(`deployContract() - error: `, error);
      })
      .on('receipt', (receipt: TransactionReceipt) => {
        this.log.error(`deployContract() - receipt: `, { receipt });
      })
      .on('transactionHash', (receipt: string) => {
        this.log.error(`deployContract() - transactionHash: `, { receipt });
      });

    const deployedContract: Contract = await promiEventContract;
    this.log.debug(`Successfully deployed contract.`, { deployedContract });
  }

  public async addPublicKey(publicKeyHex: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

}
