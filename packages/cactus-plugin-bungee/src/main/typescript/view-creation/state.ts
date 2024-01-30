import { Transaction } from "./transaction";

export class State {
  private id: string;
  private version: number;
  private values: string[]; //set of state bins
  private transactions: Transaction[];

  constructor(id: string, stateBins: string[], transactions: Transaction[]) {
    this.id = id;
    this.version = stateBins.length;
    this.values = stateBins;
    this.transactions = transactions;
  }

  public getStateJson(): string {
    const txs: string[] = [];
    const txEndorsements: string[] = [];

    for (const tx of this.transactions) {
      txs.push(tx.getTxJson());
      txEndorsements.push(tx.getTxProofs());
    }

    const jsonSnap = {
      id: this.id,
      version: this.getVersion(),
      values: this.values,
      transactions: txs,
      proofs: txEndorsements,
    };

    return JSON.stringify(jsonSnap);
  }

  //JUST FOR TESTING
  public getTimeForTxN(index: number): string {
    return this.transactions[index].getTimeStamp();
  }

  public getInitialTime(): string {
    if (this.transactions.length >= 1) {
      return this.transactions[this.transactions.length - 1].getTimeStamp();
    }
    return "";
  }

  public getFinalTime(): string {
    if (this.transactions.length >= 1) {
      return this.transactions[0].getTimeStamp();
    }
    return "";
  }

  private getVersion(): string {
    return this.version.toString();
  }

  public pruneState(tI: string, tF: string): void {
    const tInum = parseInt(tI);
    const tFnum = parseInt(tF);
    // eslint-disable-next-line prefer-const
    this.transactions.forEach((element, index) => {
      if (
        parseInt(element.getTimeStamp()) < tInum ||
        parseInt(element.getTimeStamp()) > tFnum
      ) {
        this.version = this.version - 1;
        this.transactions.splice(index, 1); //Remove tx
        this.values.splice(index, 1); //Remove state of tx
      }
    });
  }
}
