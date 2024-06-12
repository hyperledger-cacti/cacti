import { LedgerType } from "@hyperledger/cactus-core-api";
import { v4 as uuidv4 } from "uuid";

export class CrossChainModel {
  private modelType: CrossChainModelType | undefined;
  private crossChainTransactions:
    | Map<string, CrossChainTransactionSchema>
    | undefined;
  private models = new Map<CrossChainModelType, string>();
  private id: string;
  private lastAggregationDate: Date;
  private crossChainState: Map<
    string,
    [AssetState | undefined, AssetState | undefined]
  >;
  private sourceLedgerMethods: string[] = [];
  private targetLedgerMethods: string[] = [];

  constructor() {
    this.id = uuidv4();
    this.crossChainTransactions = new Map<
      string,
      CrossChainTransactionSchema
    >();
    this.lastAggregationDate = new Date();
    this.crossChainState = new Map<
      string,
      [AssetState | undefined, AssetState | undefined]
    >();
  }

  get lastAggregation(): Date {
    return this.lastAggregationDate;
  }

  get ccModelType(): CrossChainModelType | undefined {
    return this.modelType;
  }

  public setType(modelType: CrossChainModelType): void {
    this.modelType = modelType;
  }

  public setLastAggregationDate(date: Date): void {
    this.lastAggregationDate = date;
  }

  public saveModel(type: CrossChainModelType, model: string): void {
    this.models.set(type, model);
  }

  public getModel(type: CrossChainModelType): string | undefined {
    if (this.models.has(type)) {
      return this.models.get(type);
    }
  }

  public getOneCCTx(txKey: string): CrossChainTransactionSchema | undefined {
    if (this.crossChainTransactions && this.crossChainTransactions.has(txKey)) {
      return this.crossChainTransactions.get(txKey);
    }
  }

  public getCCTxs(): Map<string, CrossChainTransactionSchema> | undefined {
    if (this.crossChainTransactions) {
      return this.crossChainTransactions;
    }
  }

  public setCCTxs(
    key: string,
    mapDefintion: CrossChainTransactionSchema,
  ): void {
    this.crossChainTransactions?.set(key, mapDefintion);
  }

  public setSourceLedgerMethod(methodName: string): void {
    this.sourceLedgerMethods.push(methodName);
  }

  public sourceLedgerIncludesMethod(methodName: string): boolean {
    return this.sourceLedgerMethods.includes(methodName);
  }

  public setTargetLedgerMethod(methodName: string): void {
    this.targetLedgerMethods.push(methodName);
  }

  public targetLedgerIncludesMethod(methodName: string): boolean {
    return this.targetLedgerMethods.includes(methodName);
  }

  public setAssetStateSourceLedger(ccTxID: string, details: AssetState): void {
    const prevState = this.crossChainState.get(ccTxID);
    if (!prevState) {
      this.crossChainState.set(ccTxID, [details, undefined]);
      return;
    }
    this.crossChainState.set(ccTxID, [details, prevState[1]]);
  }

  public setAssetStateTargetLedger(ccTxID: string, details: AssetState): void {
    const prevState = this.crossChainState.get(ccTxID);
    if (!prevState) {
      this.crossChainState.set(ccTxID, [undefined, details]);
      return;
    }
    this.crossChainState.set(ccTxID, [prevState[0], details]);
  }

  public getCrossChainState(): string | undefined {
    let ccState: string = "";
    for (const [
      ccTxID,
      [assetStateSource, assetStateTarget],
    ] of this.crossChainState.entries()) {
      let txData: string;
      if (assetStateSource && assetStateTarget) {
        txData =
          ccTxID +
          "\n" +
          assetStateSource.assetID +
          ";" +
          assetStateSource.assetState +
          ";" +
          assetStateSource.ledger +
          ";" +
          assetStateSource.lastStateUpdate +
          "\n" +
          assetStateTarget.assetID +
          ";" +
          assetStateTarget.assetState +
          ";" +
          assetStateTarget.ledger +
          ";" +
          assetStateTarget.lastStateUpdate +
          "\n";
      } else if (assetStateSource) {
        txData =
          ccTxID +
          "\n" +
          assetStateSource.assetID +
          ";" +
          assetStateSource.assetState +
          ";" +
          assetStateSource.ledger +
          ";" +
          assetStateSource.lastStateUpdate +
          "\n";
      } else if (assetStateTarget) {
        txData =
          ccTxID +
          "\n" +
          assetStateTarget.assetID +
          ";" +
          assetStateTarget.assetState +
          ";" +
          assetStateTarget.ledger +
          ";" +
          assetStateTarget.lastStateUpdate +
          "\n";
      } else {
        continue;
      }
      ccState = ccState + txData + "\n";
    }
    return ccState;
  }
}

export enum CrossChainModelType {
  PetriNet,
  ProcessTree,
}

export type CrossChainTransactionSchema = {
  // the IDs of all cross chain events of the cross chain transaction
  processedCrossChainEvents: string[];
  latency: number;
  carbonFootprint: number | undefined;
  cost: number | undefined;
  throughput: number;
  latestUpdate: Date;
};

export type AssetState = {
  assetID: string;
  assetState: string;
  ledger: LedgerType;
  lastStateUpdate: Date;
};
