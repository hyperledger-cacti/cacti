import { StateProof } from "./state-proof";
import { Transaction } from "./transaction";
import { stringify as safeStableStringify } from "safe-stable-stringify";

export class State {
  private id: string;
  private version: number;
  private values: string[];
  private transactions: Transaction[];
  private stateProof: StateProof[] = [];

  constructor(id: string, stateBins: string[], transactions: Transaction[]) {
    this.id = id;
    this.version = transactions.length;
    this.values = stateBins;
    this.transactions = transactions;
  }

  public getStateProof(): StateProof[] {
    return this.stateProof;
  }
  public getId(): string {
    return this.id;
  }

  public getValues(): string[] {
    return this.values;
  }

  public setStateProof(proof: StateProof[]) {
    this.stateProof = proof;
  }

  public getStateJson(): string {
    const txs: string[] = [];
    const txEndorsements: string[] = [];

    for (const tx of this.transactions) {
      txs.push(tx.getTxJson());
      txEndorsements.push(safeStableStringify(tx.getProof()));
    }

    const jsonSnap = {
      id: this.id,
      version: this.getVersion(),
      values: this.values,
      transactions: txs,
      proofs: txEndorsements,
    };

    return safeStableStringify(jsonSnap);
  }

  public getTransactions() {
    return this.transactions;
  }

  public selectTransactions(txs: string[]): void {
    const transactions: Transaction[] = [];
    for (const tx of this.transactions) {
      if (txs.includes(tx.getId())) {
        transactions.push(tx);
      }
    }
    this.transactions = transactions;
  }

  public getInitialTime(): string {
    if (this.transactions.length >= 1) {
      return this.transactions[0].getTimeStamp();
    }
    return "";
  }

  public getFinalTime(): string {
    if (this.transactions.length >= 1) {
      return this.transactions[this.transactions.length - 1].getTimeStamp();
    }
    return "";
  }
  public getValue(): string {
    return this.values[this.values.length - 1];
  }

  public getVersion(): string {
    return this.version.toString();
  }

  public pruneState(tI: string, tF: string): void {
    const initialT = BigInt(tI);
    const finalT = BigInt(tF);
    // eslint-disable-next-line prefer-const
    this.transactions.forEach((element, index) => {
      if (
        BigInt(element.getTimeStamp()) < initialT ||
        BigInt(element.getTimeStamp()) > finalT
      ) {
        //this.version = this.version - 1;
        this.transactions.splice(index, 1); //Remove tx
        this.values?.splice(index, 1); //Remove state of tx
      }
    });
  }
}
