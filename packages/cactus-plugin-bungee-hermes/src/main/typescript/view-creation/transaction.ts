import { Proof } from "./proof";
import { TransactionProof } from "./transaction-proof";
import { stringify as safeStableStringify } from "safe-stable-stringify";

export class Transaction {
  private id: string;
  private timeStamp: string;
  private proof: TransactionProof;
  private stateId?: string;
  private payload?: string;
  private target?: string;

  constructor(id: string, timeStamp: string, proof: TransactionProof) {
    this.id = id;
    this.timeStamp = timeStamp;
    this.proof = proof;
  }

  public printTransaction(): string {
    return "Transaction: \n " + this.id + " \n " + this.timeStamp;
  }

  public addEndorser(endorser: Proof): void {
    this.proof.addEndorser(endorser);
  }
  public getId(): string {
    return this.id;
  }

  public getTarget() {
    return this.target;
  }
  public getPayload() {
    return this.payload;
  }
  public getStateId() {
    return this.stateId;
  }

  //public setBlockN(n: number) {
  //  this.blockN = n;
  //}

  public setTarget(target: string) {
    this.target = target;
  }
  public setPayload(payload: string) {
    this.payload = payload;
  }
  public setStateId(stateId: string) {
    this.stateId = stateId;
  }

  public getTxJson(): string {
    const tx = { Id: this.id, TimeStamp: this.timeStamp };
    return safeStableStringify(tx);
  }

  public getProof(): TransactionProof {
    //const txProofs = { id: this.id, proof: this.proof };
    return this.proof;
  }

  public getTimeStamp(): string {
    return this.timeStamp;
  }
}
