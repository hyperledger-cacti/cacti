import { Proof } from "./proof";
import { stringify as safeStableStringify } from "safe-stable-stringify";

export class TransactionProof {
  private transactionCreator: Proof;

  //set of signed endorsements
  //only existent for some ledgers (example Fabric)
  private endorsements?: Proof[] = [];
  private hash: string;
  constructor(transactionCreator: Proof, hash: string) {
    this.transactionCreator = transactionCreator;
    this.hash = hash;
  }

  public addEndorser(endorser: Proof) {
    this.endorsements?.push(endorser);
  }

  public printEndorsement(): string {
    return (
      "Endorsement: \n " + this.transactionCreator + " \n " + this.endorsements
    );
  }

  public getEndorsementJson(): string {
    const proof = {
      transactionCreator: this.transactionCreator,
      endorsements: this.endorsements,
    };
    return safeStableStringify(proof);
  }

  public getCreator(): Proof {
    return this.transactionCreator;
  }
  public setCreator(transactionCreator: Proof) {
    this.transactionCreator = transactionCreator;
  }

  public getEndorsements(): Proof[] | undefined {
    return this.endorsements;
  }
}
