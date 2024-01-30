export class Proof {
  private mspid: string;
  private endorserID: string;
  private signature: string;

  constructor(mspid: string, endorserID: string, signature: string) {
    this.mspid = mspid;
    this.endorserID = endorserID;
    this.signature = signature;
  }

  public printEndorsement(): string {
    return (
      "Endorsement: \n " +
      this.mspid +
      " \n " +
      this.endorserID +
      " \n " +
      this.signature
    );
  }

  public getEndorsementJson(): string {
    const proof = {
      mspid: this.mspid,
      endorserID: this.endorserID,
      signature: this.signature,
    };
    // JSON.stringify(Array.from(endors.entries()));
    return JSON.stringify(proof);
  }

  public getMspid(): string {
    return this.mspid;
  }

  public getEndorserID(): string {
    return this.endorserID;
  }

  public getSignature(): string {
    return this.signature;
  }
}
