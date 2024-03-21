import { Proof } from "./proof";

export class TransactionProof {
  private transactionCreator: Proof;

  //set of signed endorsements
  //only existent for some ledgers (example Fabric)
  private endorsements?: Proof[] = [];

  constructor(transactionCreator: Proof) {
    this.transactionCreator = transactionCreator;
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
    return JSON.stringify(proof);
  }

  public getCreator(): Proof {
    return this.transactionCreator;
  }

  public getEndorsements(): Proof[] | undefined {
    return this.endorsements;
  }
}
