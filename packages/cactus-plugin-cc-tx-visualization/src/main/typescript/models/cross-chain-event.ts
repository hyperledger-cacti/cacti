export type CrossChainEvent = {
  caseID: string;
  receiptID: string;
  timestamp: Date;
  blockchainID: string;
  invocationType: string;
  methodName: string;
  parameters: string[];
  identity: string;
  cost?: number | string;
  carbonFootprint?: number | string;
  latency?: number;
  revenue?: number;
};

export interface ICrossChainEventLog {
  name: string;
}

export class CrossChainEventLog {
  private crossChainEvents: CrossChainEvent[] = [];
  private creationDate: Date;
  private lastUpdateDate: Date;
  public readonly logName: string;
  //TODO: add a pause boolean?

  constructor(options: ICrossChainEventLog) {
    this.creationDate = new Date();
    this.lastUpdateDate = new Date();
    this.logName = options.name;
  }

  get logEntries(): CrossChainEvent[] {
    return this.crossChainEvents;
  }

  public numberEvents(): number {
    return this.crossChainEvents.length;
  }
  public getCreationDate(): Date {
    return this.creationDate;
  }

  public getLastUpdateDate(): Date {
    return this.lastUpdateDate;
  }

  public purgeLogs(): void {
    this.crossChainEvents = [];
  }

  public addCrossChainEvent(event: CrossChainEvent): void {
    this.crossChainEvents.push(event);
    this.lastUpdateDate = new Date();
  }

  public getCrossChainLogAttributes(): string[] {
    return [
      "caseID",
      "receiptID",
      "timestamp",
      "blockchainID",
      "invocationType",
      "methodName",
      "parameters",
      "identity",
      "cost",
      "carbonFootprint",
      "latency",
      "revenue",
    ];
  }
}
