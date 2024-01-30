import { Proof } from "./proof";

export class Transaction {
  private id: string;
  private timeStamp: string;
  private proofs: Proof[];

  constructor(id: string, timeStamp: string) {
    this.id = id;
    this.timeStamp = timeStamp;
    this.proofs = [];
  }

  public printTransaction(): string {
    return "Transaction: \n " + this.id + " \n " + this.timeStamp;
  }

  public defineTxProofs(proofs: Proof[]): void {
    this.proofs = proofs;
  }
  public getId(): string {
    return this.id;
  }

  public getTxJson(): string {
    const tx = { Id: this.id, TimeStamp: this.timeStamp };
    return JSON.stringify(tx);
  }

  public getTxProofs(): string {
    const txProofs = { id: this.id, proofs: this.proofs };
    return JSON.stringify(txProofs);
  }

  public getTimeStamp(): string {
    return this.timeStamp;
  }
}
