import {
  IPluginLedgerConnector,
  PluginAspect,
} from "@hyperledger/cactus-core-api";
import { any } from "joi";
import Web3 from "web3";
import EEAClient, { IWeb3InstanceExtended } from "web3-eea";

export interface IPluginLedgerConnectorBesuOptions {
  rpcApiHttpHost: string;
}

export interface IBesuDeployContractIn {
  /**
   * Ethereum private key with which to sign the transaction.
   */
  privateKey: string;

  /**
   * The Orion public key of the sender
   */
  publicKey: string;

  /**
   * JSON build artifact produced by the Solidity compiler from the contract
   * that you are deploying.
   */
  contractJsonArtifact: { abi: any; bytecode: string };
}

export interface IBesuDeployContractOut {
  transactionHash: string;
}

export interface IBesuRawTransactionIn {
  data: string;

  // Public key of recipient
  privateFrom?: string;

  // Orion public keys of recipients or privacyGroupId: Privacy group to receive the transaction
  privateFor: string[];

  // privateKey: Ethereum private key with which to sign the transaction.
  privateKey: string;
}

export interface IBesuTransactionIn {
  [key: string]: any;
  data: string;
  address?: string;
  privateKey?: string;
}

export interface IBesuTransactionOut {
  transactionHash: string;
}

export class PluginLedgerConnectorBesu
  implements
    IPluginLedgerConnector<
      IBesuDeployContractIn,
      IBesuDeployContractOut,
      IBesuTransactionIn,
      IBesuTransactionOut
    > {
  private readonly web3: Web3;
  private readonly web3Eea: IWeb3InstanceExtended;

  constructor(public readonly options: IPluginLedgerConnectorBesuOptions) {
    if (!options) {
      throw new Error(`PluginLedgerConnectorBesu#ctor options falsy.`);
    }
    const web3Provider = new Web3.providers.HttpProvider(
      this.options.rpcApiHttpHost
    );
    this.web3 = new Web3(web3Provider);
    this.web3Eea = EEAClient(this.web3, 2018);
  }

  public getId(): string {
    return `@hyperledger/cactus-plugin-ledger-connectur-besu`;
  }

  public getAspect(): PluginAspect {
    return PluginAspect.LEDGER_CONNECTOR;
  }

  public instantiateContract(
    contractJsonArtifact: { abi: any },
    address?: string
  ): any {
    const { abi } = contractJsonArtifact;
    const contract = new this.web3.eth.Contract(abi, address);
    return contract;
  }

  public async deployContract(
    options: IBesuDeployContractIn
  ): Promise<IBesuDeployContractOut> {
    const privateKey = options.privateKey.toLowerCase().startsWith("0x")
      ? options.privateKey.substring(2)
      : options.privateKey; // besu node's private key

    const publicKey = options.publicKey; // orion public key of the sender

    const allOrionPublicKeys: string[] = [options.publicKey]; // all orion public keys of receipients

    const contractOptions: IBesuRawTransactionIn = {
      data: options.contractJsonArtifact.bytecode,
      privateFrom: publicKey,
      privateFor: allOrionPublicKeys,
      privateKey,
    };

    const out = await this.transact(contractOptions);
    return out;
  }

  public async transact(
    options?: IBesuRawTransactionIn
  ): Promise<IBesuTransactionOut> {
    const transactionHash = await this.web3Eea.eea.sendRawTransaction(options);
    return { transactionHash };
  }
}
