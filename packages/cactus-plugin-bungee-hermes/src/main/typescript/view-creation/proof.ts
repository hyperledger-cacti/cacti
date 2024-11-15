// Proof is a general purpose type, used to represent signatures of diverse elements.
// Proof may be used, for example in Fabric, to represent an transaction endorsement
// Or simply the signature of a transaction upon is creation (in Besu)
import { stringify as safeStableStringify } from "safe-stable-stringify";

export class Proof {
  // The term creator refers to the ID of the entity who created the signature
  // For example endorserID in Fabric (when Proof represents an endorsement)
  //    or a transaction creator ID(in TransactionProof.transactionCreator)
  private creator: string;
  private mspid?: string;
  private signature?: string;

  constructor(settings: {
    creator: string;
    mspid?: string;
    signature?: string;
  }) {
    this.creator = settings.creator;
    this.mspid = settings.mspid ? settings.mspid : "undefined";
    this.signature = settings.signature ? settings.signature : "undefined";
  }

  public printEndorsement(): string {
    return (
      "Endorsement: \n " +
      this.creator +
      " \n " +
      this.mspid +
      " \n " +
      this.signature
    );
  }

  public getEndorsementJson(): string {
    const proof = {
      creator: this.creator,
      mspid: this.mspid,
      signature: this.signature,
    };
    return safeStableStringify(proof);
  }

  public getCreator(): string {
    return this.creator;
  }

  public getMspid(): string | undefined {
    return this.mspid;
  }

  public getSignature(): string | undefined {
    return this.signature;
  }
}
