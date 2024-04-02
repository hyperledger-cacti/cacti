import { v4 as uuidv4 } from "uuid";

export class CrossChainModel {
  private modelType: CrossChainModelType | undefined;
  private crossChainTransactions:
    | Map<string, CrossChainTransactionSchema>
    | undefined;
  private models = new Map<CrossChainModelType, string>();
  private id: string;
  private lastAggregationDate: Date;

  constructor() {
    this.id = uuidv4();
    this.crossChainTransactions = new Map<
      string,
      CrossChainTransactionSchema
    >();
    this.lastAggregationDate = new Date();
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
}

export enum CrossChainModelType {
  PetriNet,
  ProcessTree,
}

export type CrossChainTransactionSchema = {
  ccTxID: string;
  // the IDs of all cross chain events of the cross chain transaction
  processedCrossChainEvents: string[];
  latency: number;
  carbonFootprint: number | undefined;
  cost: number | undefined;
  throughput: number;
  latestUpdate: Date;
};
