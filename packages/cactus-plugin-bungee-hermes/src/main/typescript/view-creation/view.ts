import { v4 as uuidV4 } from "uuid";
import { Snapshot } from "./snapshot";
import MerkleTree from "merkletreejs";
import { Transaction } from "./transaction";
export class View {
  private key: string;
  private snapshot: Snapshot;
  private tI: string;
  private tF: string;
  private participant: string;
  private viewProof: {
    transactionsMerkleRoot: string;
    statesMerkleRoot: string;
  };

  constructor(
    tI: string,
    tF: string,
    snapshot: Snapshot,
    id: string | undefined,
  ) {
    this.key = id ? id : uuidV4(); // FIXME receive as input maybe
    this.tI = tI;
    this.tF = tF;
    this.snapshot = snapshot;
    this.participant = snapshot.getParticipant();
    snapshot.pruneStates(this.tI, this.tF);
    this.viewProof = this.generateViewProof();
  }
  public getKey() {
    return this.key;
  }
  public getSnapshot(): Snapshot {
    return this.snapshot;
  }
  private generateViewProof(): {
    transactionsMerkleRoot: string;
    statesMerkleRoot: string;
  } {
    const states: string[] = [];
    const transactions: string[] = [];

    for (const state of this.snapshot.getStateBins()) {
      states.push(JSON.stringify(state.getStateProof()));
      for (const transaction of state.getTransactions()) {
        transactions.push(JSON.stringify(transaction.getProof()));
      }
    }

    const statesTree = new MerkleTree(states, undefined, {
      sort: true,
      hashLeaves: true,
    });
    const transactionsTree = new MerkleTree(transactions, undefined, {
      sort: true,
      hashLeaves: true,
    });
    return {
      transactionsMerkleRoot: transactionsTree.getRoot().toString("hex"),
      statesMerkleRoot: statesTree.getRoot().toString("hex"),
    };
  }
  public getViewStr(): string {
    const viewStr = {
      tI: this.tI,
      tF: this.tF,
      snapshot: this.snapshot,
    };
    return JSON.stringify(viewStr);
    // return this.snapshot.getSnapshotJson();
  }
  public getViewProof(): {
    transactionsMerkleRoot: string;
    statesMerkleRoot: string;
  } {
    return this.viewProof;
  }

  public getAllTransactions(): Transaction[] {
    const transactions: Transaction[] = [];
    this.snapshot.getStateBins().forEach((state) => {
      state.getTransactions().forEach((transaction) => {
        transactions.push(transaction);
      });
    });
    return transactions;
  }
}
