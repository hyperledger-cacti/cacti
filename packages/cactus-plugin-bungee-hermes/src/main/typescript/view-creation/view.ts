import { v4 as uuidV4 } from "uuid";
import { Snapshot } from "./snapshot";
import MerkleTree from "merkletreejs";
import { Transaction } from "./transaction";
import { IPrivacyPolicy, IPrivacyPolicyValue } from "./privacy-policies";
import { PrivacyPolicyOpts } from "../generated/openapi/typescript-axios";
import { JsObjectSigner } from "@hyperledger/cactus-common";
import { stringify as safeStableStringify } from "safe-stable-stringify";

export interface IViewMetadata {
  viewId: string;
  viewProof: {
    transactionsMerkleRoot: string;
    statesMerkleRoot: string;
  };
  policy?: IPrivacyPolicyValue;
  creator: string;
  signature: string;
}

export class View {
  private key: string;
  private snapshot: Snapshot;
  private tI: string;
  private tF: string;
  private participant: string;
  private creator: string;
  private oldVersionsMetadata: IViewMetadata[] = [];
  private policy?: IPrivacyPolicyValue;
  private viewProof: {
    transactionsMerkleRoot: string;
    statesMerkleRoot: string;
  };

  constructor(
    creator: string,
    tI: string,
    tF: string,
    snapshot: Snapshot,
    id: string | undefined,
  ) {
    this.creator = creator;
    this.key = id ? id : uuidV4(); // FIXME receive as input maybe
    this.tI = tI;
    this.tF = tF;
    this.snapshot = snapshot;
    this.participant = snapshot.getParticipant();
    snapshot.pruneStates(this.tI, this.tF);
    this.viewProof = this.generateViewProof();
  }

  public setCreator(creator: string) {
    this.creator = creator;
  }
  public getTI() {
    return this.tI;
  }
  public getTF() {
    return this.tF;
  }

  public getCreator(): string {
    return this.creator;
  }

  public addPrevVersionMetadata(data: IViewMetadata) {
    this.oldVersionsMetadata.push(data);
  }

  public getPolicy() {
    return this.policy;
  }

  public getKey() {
    return this.key;
  }
  public getSnapshot(): Snapshot {
    return this.snapshot;
  }
  public updateViewProof() {
    this.viewProof = this.generateViewProof();
  }
  private generateViewProof(): {
    transactionsMerkleRoot: string;
    statesMerkleRoot: string;
  } {
    const states: string[] = [];
    const transactions: string[] = [];

    for (const state of this.snapshot.getStateBins()) {
      states.push(safeStableStringify(state.getStateProof()));
      for (const transaction of state.getTransactions()) {
        transactions.push(safeStableStringify(transaction.getProof()));
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
    return safeStableStringify(viewStr);
    // return this.snapshot.getSnapshotJson();
  }
  public getViewProof(): {
    transactionsMerkleRoot: string;
    statesMerkleRoot: string;
  } {
    return this.viewProof;
  }

  public getParticipant(): string {
    return this.participant;
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
  public setPrivacyPolicyValue(value: IPrivacyPolicyValue | undefined) {
    this.policy = value;
  }
  public setPrivacyPolicy(
    policy: PrivacyPolicyOpts,
    func: IPrivacyPolicy,
    signer: JsObjectSigner,
  ) {
    this.policy = {
      policy,
      policyHash: signer.dataHash(func.toString()),
    };
  }

  public setParticipant(participant: string) {
    this.participant = participant;
  }
  public setKey(key: string) {
    this.key = key;
  }

  public getOldVersionsMetadata(): IViewMetadata[] {
    return this.oldVersionsMetadata;
  }
}
