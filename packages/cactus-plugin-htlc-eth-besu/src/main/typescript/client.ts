import fs from "fs";
import path from "path";
import Web3 from "web3";
import KeyEncoder from "key-encoder";
import { v4 as uuidv4 } from "uuid";
import { environment } from "./environment";
//import Helpers from "./helpers";
//import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  EthContractInvocationType,
  PluginLedgerConnectorBesu,
  IPluginLedgerConnectorBesuOptions,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  LogLevelDesc,
  Secp256k1Keys,
  KeyFormat,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
export default class Client {
  private static readonly CLASS_NAME = "Client";
  private readonly log: Logger;
  private web3: Web3;
  private connector: PluginLedgerConnectorBesu;
  private contracts: { [key: string]: any } = {};
  private abi: { [key: string]: any } = {};
  private readonly pluginRegistry: PluginRegistry;
  //  public Helpers: Helpers;

  public get className(): string {
    return Client.CLASS_NAME;
  }

  constructor() {
    const level = "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    //  const node = environment.NODE!;
    // this.log.info(`Creating new blockchain connection to ${node}`);
    this.web3 = new Web3(new Web3.providers.HttpProvider(""));

    const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
    const keychainId = uuidv4();
    const keychainRef = uuidv4();

    const { privateKey } = Secp256k1Keys.generateKeyPairsBuffer();
    const keyHex = privateKey.toString("hex");
    const pem = keyEncoder.encodePrivate(keyHex, KeyFormat.Raw, KeyFormat.PEM);

    const keychain = new PluginKeychainMemory({
      backend: new Map([[keychainRef, pem]]),
      keychainId,
      logLevel: level,
      instanceId: uuidv4(),
    });

    this.pluginRegistry = new PluginRegistry({ plugins: [keychain] });
    const logLevel: LogLevelDesc = "TRACE";
    const pluginOptions: IPluginLedgerConnectorBesuOptions = {
      instanceId: uuidv4(),
      rpcApiHttpHost: "",
      pluginRegistry: this.pluginRegistry,
      logLevel,
    };
    this.connector = new PluginLedgerConnectorBesu(pluginOptions);

    //this.Helpers = new Helpers(this.web3, this.contracts);
  }

  /**
   * Reads a value from the blockchain
   * @param functionName contract function name
   * @param paramsArray  parameters of the function
   * @param contractName string with contract name or contract instance
   * @param account account address
   * @return object
   */
  async sendCall(
    functionName: string,
    paramsArray: any,
    contractName: string,
    account: string,
  ) {
    try {
      this.log.info("Send call");
      if (contractName) {
        let contract;
        //  let contractAddress: string;
        if (contractName && typeof contractName === "string") {
          contract = this.contracts[contractName];

          if (typeof contract === "undefined") {
            throw new Error("Contract name not recognized");
          }
        }
        const result = await this.connector.invokeContract({
          contractAbi: this.abi[contractName],
          contractAddress: environment.CONTRACT_ADDRESS,
          invocationType: EthContractInvocationType.CALL,
          methodName: functionName,
          params: [
            "60107340ab9546874a0d68958c1888babba0b0429a55751ea7bdf3ed38adc442",
          ],
          web3SigningCredential: {
            ethAccount: environment.ACCOUNT_ADDRESS,
            type: Web3SigningCredentialType.PRIVATEKEYHEX,
            secret: environment.PRIVATE_KEY,
          },
        });
        return result;
      }
      throw new Error("sendCall() needs a the name of the contract");
    } catch (err) {
      throw err;
    }
  }

  /**
   * Creates a transaction ready to be signed with a user defined address
   * @param functionName contract function name
   * @param functionParams parameters of the function
   * @param contractName name of contract
   * @param contractAddress address of contract
   * @param account sender account
   * @param pKey sender privateKey for sign tx
   * @param wei wei for payable functions
   * @return transactionReceipt
   */
  async sendTx(
    functionName: string,
    functionParams: any[],
    contractName: string,
    contractAddress: string,
    account: string,
    pKey: string,
    wei?: string,
  ) {
    try {
      const tx = await this.createTx(
        functionName,
        functionParams,
        contractName,
      );
      const signedTx = await this.signTx(
        pKey,
        tx,
        account,
        contractAddress,
        wei,
      );
      const transactionReceipt = await this.sendSignedTransaction(signedTx!);
      return transactionReceipt;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Creates a transaction ready to be signed with a user defined address
   * @param functionName contract function name
   * @param functionParamsArray parameters of the function
   * @param contractName instance of contract
   * @param contractAddress (optional) address of contract
   * @return abi
   */
  private async createTx(
    functionName: string,
    functionParamsArray: any,
    contractName: string,
  ) {
    try {
      const contractInstance = this.contracts[contractName];
      const contractCode = await this.web3.eth.getCode(
        contractInstance._address,
      );
      if (contractCode === "0x")
        throw new Error("There is no contract with the specified address");
      const bytecode = contractInstance.methods[functionName](
        ...functionParamsArray,
      ).encodeABI();
      return bytecode;
    } catch (err) {
      throw new Error(err);
    }
  }

  /**
   * Signs the payload data, signing is done externally, used strictly for testing
   * @param privateKey privateKey of account for sign
   * @param bytecode transaction to be signed
   * @param sender account to send
   * @param contractAddress contract address to be sended
   * @param gas (optional) estimated gas limit
   * @param gasPrice (optional) estimated gas price
   * @param value (optional) ether to be send
   * @param nonce (optional) nonce of account
   * @return signedTx
   */
  private async signTx(
    privateKey: string,
    bytecode: any,
    sender: string,
    contractAddress: string,
    value?: string,
    gas?: number,
    gasPrice?: string,
    nonce?: number,
  ) {
    try {
      if (!gas) gas = 6721975;
      if (!nonce)
        nonce = await this.web3.eth.getTransactionCount(sender, "pending");
      if (!gasPrice)
        gasPrice = this.web3.utils.toHex(await this.web3.eth.getGasPrice());
      if (gasPrice == "0x0") gasPrice = "0x2312D00";
      if (!value) {
        value = "0x00";
      } else {
        value = this.web3.utils.toWei(value, "wei");
      }

      const transaction = {
        from: sender,
        nonce,
        gasPrice,
        gas,
        to: contractAddress,
        value,
        data: bytecode,
      };
      const sign = await this.web3.eth.accounts.signTransaction(
        transaction,
        privateKey,
      );
      const signedTx = sign.rawTransaction;

      return signedTx;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Sends a signed transaction and provides the results in different callbacks for the different states of the transaction
   * @param signedTx signed transaction
   * @return transactionReceipt
   */
  private async sendSignedTransaction(signedTx: string) {
    try {
      const transactionReceipt = await this.web3.eth.sendSignedTransaction(
        signedTx,
      );
      return transactionReceipt;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Loads all the contracts specified in the configuration contractsPath
   * @param contractsPath Paths with the compiled smart contracts
   * @return Map with the loaded contract instances
   */
  public async loadContracts(contractsPath: string) {
    const networkId = await this.web3.eth.net.getId();
    this.log.info("NETWORKID:" + networkId);
    fs.readdirSync(contractsPath).forEach(async (contractNameWithExt) => {
      const splitted = contractNameWithExt.split(".", 1);
      const contractName = splitted[0];
      const filePath = path.join(contractsPath, contractNameWithExt);
      try {
        this.log.info("Contract name: " + contractName);
        const parsedContract = JSON.parse(
          fs.readFileSync(filePath, { encoding: "utf-8" }),
        );
        /*  if (parsedContract.networks[networkId] != undefined) {
          if (parsedContract.networks[networkId].address == undefined) {
            throw new Error("There is no contract with the specified address");
          }
        } else {
          throw new Error("There is no contract with the specified address");
        }*/

        //       this.log.info("Address: " + parsedContract.networks[networkId].address);
        const contractInstance = new this.web3.eth.Contract(
          parsedContract.abi,
          environment.CONTRACT_ADDRESS,
          //parsedContract.networks[networkId].address,
        );
        this.contracts[contractName] = contractInstance;
      } catch (error) {
        this.log.error(error);
        throw error;
      }
    });
  }
}
