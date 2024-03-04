import { Server } from "http";

import { Server as SecureServer } from "https";

import { v4 as uuidv4 } from "uuid";

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  Configuration,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  IJsObjectSignerOptions,
  JsObjectSigner,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { ICactusApiServerOptions } from "@hyperledger/cactus-cmd-api-server";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  DefaultApi as FabricApi,
  RunTransactionRequest as FabricRunTransactionRequest,
  FabricSigningCredential,
  FabricContractInvocationType,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { Utils } from "./utils";
import { Transaction } from "./view-creation/transaction";
import { Proof } from "./view-creation/proof";
import { State } from "./view-creation/state";
import { View } from "./view-creation/view";
import { Snapshot } from "./view-creation/snapshot";
import path from "path";

export interface IPluginBUNGEEOptions extends ICactusPluginOptions {
  instanceId: string;
  participant: string;

  fabricPath?: string;
  fabricSigningCredential?: FabricSigningCredential;
  fabricChannelName?: string;
  fabricContractName?: string;
  fabricAssetID?: string;
  fabricAssetSize?: string;
  fabricConfig?: Configuration;
  fabricApi?: FabricApi;

  logLevel?: LogLevelDesc;
  keychainId?: string;
  keychain?: PluginKeychainMemory;
  apiServerOptions?: ICactusApiServerOptions;
  httpApi?: Server | SecureServer;
  disableSignalHandlers?: true;
}

export class PluginBUNGEEBenchmark {
  private bungeeSigner: JsObjectSigner;
  private privKeyBungee: string;
  private pubKeyBungee: string;
  private tI: string;
  private tF: string;

  private participant;

  private ledgerAssetsKey: string[];
  private ledgerStates: Map<string, State>; //Key, state
  private states: State[];
  public fabricApi?: FabricApi;
  public fabricSigningCredential?: FabricSigningCredential;
  public fabricChannelName?: string;
  public fabricContractName?: string;
  public fabricAssetID?: string;
  public fabricAssetSize?: string;
  private readonly instanceId: string;
  private readonly className: string;
  private level: LogLevelDesc;
  private logger: Logger;
  public pluginRegistry: PluginRegistry;
  private tsStartGetAllAssetsKey: number;
  private tsEndGetAllAssetsKey: number;
  private tsStartGetAllTxByKey: number;
  private tsEndGetAllTxByKey: number;
  private tsStartfabricGetTxReceiptByTxIDV1: number;
  private tsEndfabricGetTxReceiptByTxIDV1: number;
  private tsStartgenerateLedgerStates: number;
  private tsEndgenerateLedgerStates: number;
  private tsStartgenerateSnapshot: number;
  private tsEndgenerateSnapshot: number;
  private tsStartGenerateView: number;
  private tsEndGenerateView: number;
  private fileNameDate = Date.now();

  constructor(public readonly options: IPluginBUNGEEOptions) {
    this.tsStartGetAllAssetsKey = 0;
    this.tsEndGetAllAssetsKey = 0;
    this.tsStartGetAllTxByKey = 0;
    this.tsEndGetAllTxByKey = 0;
    this.tsStartfabricGetTxReceiptByTxIDV1 = 0;
    this.tsEndfabricGetTxReceiptByTxIDV1 = 0;
    this.tsStartgenerateLedgerStates = 0;
    this.tsEndgenerateLedgerStates = 0;
    this.tsStartgenerateSnapshot = 0;
    this.tsEndgenerateSnapshot = 0;
    this.tsStartGenerateView = 0;
    this.tsEndGenerateView = 0;

    this.className = "pluginBUNGEE";
    this.level = options.logLevel || "INFO";
    const label = this.getClassName();
    const level = this.level;
    this.logger = LoggerProvider.getOrCreate({ label, level });

    const keysRelPath = "../keys/";
    const pubKeyPath = path.join(__dirname, keysRelPath, "./bungee_pub.pem");
    const privKeyPath = path.join(__dirname, keysRelPath, "./bungee_priv.pem");
    this.pubKeyBungee = Utils.readKeyFromFile(pubKeyPath);
    this.privKeyBungee = Utils.readKeyFromFile(privKeyPath);
    const bungeeSignerOptions: IJsObjectSignerOptions = {
      privateKey: this.privKeyBungee,
      logLevel: "debug",
    };
    this.bungeeSigner = new JsObjectSigner(bungeeSignerOptions);

    this.instanceId = uuidv4();
    this.participant = options.participant;
    this.ledgerAssetsKey = [];
    this.ledgerStates = new Map<string, State>();
    this.states = [];
    this.tI = "";
    this.tF = "";

    this.pluginRegistry = new PluginRegistry();
    this.fabricApi = options.fabricApi;

    if (options.fabricPath != undefined) this.defineFabricConnection(options);
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-bungee`;
  }

  public getClassName(): string {
    return this.className;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  private defineFabricConnection(options: IPluginBUNGEEOptions): void {
    this.logger.info(`OPTIONS:: ${options}`);
    const fnTag = `${this.className}#defineFabricConnection()`;

    const config = new Configuration({ basePath: options.fabricPath });
    const apiClient = new FabricApi(config);
    this.fabricApi = apiClient;
    const notEnoughFabricParams: boolean =
      options.fabricSigningCredential == undefined ||
      options.fabricChannelName == undefined ||
      options.fabricContractName == undefined ||
      options.fabricAssetID == undefined;
    if (notEnoughFabricParams) {
      throw new Error(
        `${fnTag}, fabric params missing should have: signing credentials, contract name, channel name, asset ID`,
      );
    }
    this.fabricSigningCredential = options.fabricSigningCredential;
    this.fabricChannelName = options.fabricChannelName;
    this.fabricContractName = options.fabricContractName;
    this.fabricAssetID = options.fabricAssetID;
    this.fabricAssetSize = options.fabricAssetSize
      ? options.fabricAssetSize
      : "1";
  }

  /**
   *
   * @abstract Create ledger state. Get all keys, iterate every key and get the respective transactions. For each transaction get the receipt
   * */
  public async generateLedgerStates(): Promise<string> {
    this.tsStartgenerateLedgerStates = performance.now();
    this.logger.info(`Generating ledger snapshot`);

    const assetsKey = await this.getAllAssetsKey();
    this.ledgerAssetsKey = assetsKey.split(",");

    //For each key in ledgerAssetsKey
    for (const assetKey of this.ledgerAssetsKey) {
      const assetValues: string[] = [];
      const txWithTimeS: Transaction[] = [];

      this.logger.info(assetKey);
      const txs = await this.getAllTxByKey(assetKey);

      //For each tx get receipt
      for (const tx of txs) {
        const endorsements: Proof[] = [];
        const receipt = JSON.parse(
          await this.fabricGetTxReceiptByTxIDV1(tx.getId()),
        );

        // Checks if tx was made by participant
        if (receipt.transactionCreator.mspid != this.participant) {
          continue;
        }

        assetValues.push(JSON.parse(receipt.rwsetWriteData).Value.toString());

        //Save endorsements of tx
        for (const endorsement of receipt.transactionEndorsement) {
          const signature64 = Buffer.from(endorsement.signature).toString(
            "base64",
          );
          endorsements.push(
            new Proof(endorsement.mspid, endorsement.endorserID, signature64),
          );
        }
        tx.defineTxProofs(endorsements);
        txWithTimeS.push(tx);
      }
      const state = new State(assetKey, assetValues, txWithTimeS);
      this.ledgerStates.set(assetKey, state);
      this.states.push(state);
    }

    this.ledgerStates.forEach((state: State, keyId: string) => {
      console.log(keyId, state);
      const assetState = this.ledgerStates.get(keyId);
      if (assetState != undefined) {
        this.logger.info(assetState);
        this.logger.info(JSON.parse(assetState.getStateJson()));
      }
    });

    // TESTS ONLY -> next receive ti tf
    const asset2 = this.ledgerStates.get("ASSET2");

    if (asset2 != undefined) {
      this.tI = asset2.getInitialTime();
    }

    const asset9 = this.ledgerStates.get("ASSET9");
    if (asset9 != undefined) {
      // this.tF = asset9.getTimeForTxN(5);
      this.tF = asset9.getFinalTime();
    }

    this.tsEndgenerateLedgerStates = performance.now();

    return "";
  }

  /**
   *
   * @abstract Returns Snapshot
   * */
  public generateSnapshot(): Snapshot {
    this.tsStartgenerateSnapshot = performance.now();
    const snapShotId = uuidv4();
    const snapshot = new Snapshot(snapShotId, this.participant, this.states);
    this.tsEndgenerateSnapshot = performance.now();
    return snapshot;
  }

  /**
   *
   * @abstract Returns view. Generate final view with signature
   *
   * @param snapshot - Ledger Snapshot
   * */
  public generateView(snapshot: Snapshot): string {
    this.tsStartGenerateView = performance.now();
    const crypto = require("crypto");

    this.logger.warn(this.pubKeyBungee);
    this.logger.warn(this.privKeyBungee);
    const view = new View(this.tI, this.tF, snapshot);

    const signer = crypto.createSign("SHA256");
    signer.write(JSON.stringify(view));
    signer.end();

    this.logger.warn(view.getViewStr());

    const signature = signer.sign(this.privKeyBungee, "base64");

    // this.saveToFile(__dirname + "/../../view/signed.json", JSON.stringify(view));

    const signedView = { View: view, Signature: signature };

    this.saveToFile(
      __dirname + "/../../view/viewFile_" + this.fileNameDate + ".json",
      JSON.stringify(signedView, null, 2),
    );

    this.tsEndGenerateView = performance.now();
    return JSON.stringify(signedView);
  }

  /**
   *
   * @abstract Returns transaction receipt.
   *
   * @param transactionId - Transaction id to return the receipt
   * */
  async fabricGetTxReceiptByTxIDV1(transactionId: string): Promise<string> {
    this.tsStartfabricGetTxReceiptByTxIDV1 = performance.now();

    const receiptLockRes = await this.fabricApi?.getTransactionReceiptByTxIDV1({
      signingCredential: this.fabricSigningCredential,
      channelName: this.fabricChannelName,
      contractName: "qscc",
      invocationType: FabricContractInvocationType.Call,
      methodName: "GetBlockByTxID",
      params: [this.fabricChannelName, transactionId],
    } as FabricRunTransactionRequest);

    this.tsEndfabricGetTxReceiptByTxIDV1 = performance.now();
    return JSON.stringify(receiptLockRes?.data);
  }

  /**
   *
   * @abstract Returns all assets key found in the world state.
   * */
  async getAllAssetsKey(): Promise<string> {
    this.tsStartGetAllAssetsKey = performance.now();
    const response = await this.fabricApi?.runTransactionV1({
      signingCredential: this.fabricSigningCredential,
      channelName: this.fabricChannelName,
      contractName: this.fabricContractName,
      methodName: "GetAllAssetsKey",
      invocationType: FabricContractInvocationType.Call,
      params: [],
    } as FabricRunTransactionRequest);

    if (response != undefined) {
      this.tsEndGetAllAssetsKey = performance.now();
      return response.data.functionOutput;
    }

    return "response undefined";
  }

  /**
   *
   * @abstract Returns an array of all transactions for a specific key.
   *
   * @param key - Key used to get correspondent transactions
   * */
  async getAllTxByKey(key: string): Promise<Transaction[]> {
    this.tsStartGetAllTxByKey = performance.now();
    const response = await this.fabricApi?.runTransactionV1({
      signingCredential: this.fabricSigningCredential,
      channelName: this.fabricChannelName,
      contractName: this.fabricContractName,
      methodName: "GetAllTxByKey",
      invocationType: FabricContractInvocationType.Call,
      params: [key],
    } as FabricRunTransactionRequest);

    if (response != undefined) {
      this.tsEndGetAllTxByKey = performance.now();
      return Utils.txsStringToTxs(response.data.functionOutput);
    }

    return [];
  }

  /**
   *
   * @abstract Returns all the transactions for a specific key in string format.
   *
   * @param key - Key (id) used to get correspondent transactions
   * */
  async getAllTxByKeyString(key: string): Promise<string> {
    const response = await this.fabricApi?.runTransactionV1({
      signingCredential: this.fabricSigningCredential,
      channelName: this.fabricChannelName,
      contractName: this.fabricContractName,
      methodName: "GetAllTxByKey",
      invocationType: FabricContractInvocationType.Call,
      params: [key],
    } as FabricRunTransactionRequest);

    if (response != undefined) {
      return response.data.functionOutput;
    }

    return "";
  }

  public generateBenchmarkReport(
    numberOfTransactions: number,
    tsStartTotalTime: number,
    tsEndTotalTime: number,
    tsStartTransactionsTime: number,
    tsEndTransactionsTime: number,
  ): void {
    const report = {
      tsStartGetAllAssetsKey: this.tsStartGetAllAssetsKey,
      tsEndGetAllAssetsKey: this.tsEndGetAllAssetsKey,
      tsStartGetAllTxByKey: this.tsStartGetAllTxByKey,
      tsEndGetAllTxByKey: this.tsEndGetAllTxByKey,
      tsStartfabricGetTxReceiptByTxIDV1: this.tsStartfabricGetTxReceiptByTxIDV1,
      numberOfTransactions: numberOfTransactions,
      tsEndfabricGetTxReceiptByTxIDV1: this.tsEndfabricGetTxReceiptByTxIDV1,
      tsStartgenerateLedgerStates: this.tsStartgenerateLedgerStates,
      tsEndgenerateLedgerStates: this.tsEndgenerateLedgerStates,
      tsStartgenerateSnapshot: this.tsStartgenerateSnapshot,
      tsEndgenerateSnapshot: this.tsEndgenerateSnapshot,
      tsStartGenerateView: this.tsStartGenerateView,
      tsEndGenerateView: this.tsEndGenerateView,
      tsStartTotalTime: tsStartTotalTime,
      tsEndTotalTime: tsEndTotalTime,
      tsStartTransactionsTime: tsStartTransactionsTime,
      tsEndTransactionsTime: tsEndTransactionsTime,
    };
    const reportString = JSON.stringify(report, null, 2);
    this.saveToFile(
      __dirname + "/../../report/report_" + this.fileNameDate + ".json",
      reportString,
    );
  }

  /**
   *
   * @abstract Save view in json file.
   *
   * @param fileName - File name or path + file name
   * @param data - View in a string format to write inside the json file
   * */
  public saveToFile(fileName: string, data: string): void {
    const fs = require("fs");
    fs.writeFileSync(fileName, data, function (err: boolean) {
      if (err) {
        return console.log("error");
      }
    });
  }
}
