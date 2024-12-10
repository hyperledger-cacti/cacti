import MerkleTree from "merkletreejs";
import { v4 as uuidV4 } from "uuid";
import { State } from "../view-creation/state";
import { ExtendedState } from "./extended-state";
import { IMergePolicy, IMergePolicyValue } from "./merge-policies";

import { Transaction } from "../view-creation/transaction";
import { IViewMetadata } from "../view-creation/view";
import { MergePolicyOpts } from "../generated/openapi/typescript-axios";
import { JsObjectSigner } from "@hyperledger/cactus-common";
import { stringify as safeStableStringify } from "safe-stable-stringify";

export class IntegratedView {
  private id: string;
  private stateList: Map<string, ExtendedState>;
  private tI: string;
  private tF: string;
  private participants: string[];
  //metadata about the views included in the Integrated View
  private viewsMetadata: IViewMetadata[] = [];
  //id of the privacy policy in the plugin instance, and hash of the policy function code used.
  private integratedViewProof: {
    transactionsMerkleRoot: string;
    statesMerkleRoot: string;
    viewsMerkleRoot: string;
  };
  private privacyPolicy: IMergePolicyValue;
  constructor(
    privacyPolicyId: MergePolicyOpts,
    privacyPolicy: IMergePolicy | undefined,
    signer: JsObjectSigner,
  ) {
    this.stateList = new Map<string, ExtendedState>();
    this.id = uuidV4();
    //these are invalid values, they are changed in the process of merging Views
    this.tI = "-1";
    this.tF = "-1";

    this.participants = [];
    this.privacyPolicy = {
      policy: privacyPolicyId,
      policyHash: privacyPolicy
        ? signer.dataHash(privacyPolicy.toString())
        : undefined,
    };

    this.integratedViewProof = this.generateIntegratedViewProof();
  }
  public getTI(): string {
    return this.tI;
  }

  public addIncludedViewMetadata(data: IViewMetadata) {
    this.viewsMetadata.push(data);
  }
  public setTI(tI: string) {
    this.tI = tI;
  }
  public getTF(): string {
    return this.tF;
  }
  public setTF(TF: string) {
    this.tF = TF;
  }
  public addParticipant(participant: string) {
    this.participants.push(participant);
  }
  public isParticipant(participant: string): boolean {
    return this.participants.includes(participant);
  }
  public getExtendedState(stateId: string): ExtendedState | undefined {
    return this.stateList.get(stateId);
  }

  public setIntegratedViewProof() {
    this.integratedViewProof = this.generateIntegratedViewProof();
  }

  public getIntegratedViewProof(): {
    transactionsMerkleRoot: string;
    statesMerkleRoot: string;
  } {
    return this.integratedViewProof;
  }

  public getExtendedStates(): Map<string, ExtendedState> {
    return this.stateList;
  }

  public createExtendedState(stateId: string) {
    if (this.getExtendedState(stateId) == undefined) {
      this.stateList.set(stateId, new ExtendedState());
    }
  }
  public addStateInExtendedState(
    stateId: string,
    viewId: string,
    state: State,
  ) {
    const extendedState = this.getExtendedState(stateId);
    if (extendedState != undefined) {
      extendedState.setState(viewId, state);
    }
  }

  public getState(stateId: string, viewId: string): State | undefined {
    return this.getExtendedState(stateId)?.getState(viewId);
  }

  private generateIntegratedViewProof(): {
    transactionsMerkleRoot: string;
    statesMerkleRoot: string;
    viewsMerkleRoot: string;
  } {
    const states: string[] = [];
    const transactions: string[] = [];
    this.getAllTransactions().forEach((transaction) => {
      transactions.push(safeStableStringify(transaction.getProof()));
    });

    this.getAllStates().forEach((state) => {
      states.push(safeStableStringify(state.getStateProof()));
    });
    const statesTree = new MerkleTree(states, undefined, {
      sort: true,
      hashLeaves: true,
    });
    const transactionsTree = new MerkleTree(transactions, undefined, {
      sort: true,
      hashLeaves: true,
    });
    const viewsTree = new MerkleTree(
      this.viewsMetadata.map((x) => safeStableStringify(x)),
      undefined,
      {
        sort: true,
        hashLeaves: true,
      },
    );
    return {
      transactionsMerkleRoot: transactionsTree.getRoot().toString("hex"),
      statesMerkleRoot: statesTree.getRoot().toString("hex"),
      viewsMerkleRoot: viewsTree.getRoot().toString("hex"),
    };
  }

  public getAllTransactions(): Transaction[] {
    const transactions: Transaction[] = [];
    Array.from(this.getExtendedStates().values()).forEach((extendedState) => {
      for (const state of Array.from(extendedState.getStates().values())) {
        for (const transaction of state.getTransactions()) {
          transactions.push(transaction);
        }
      }
    });
    return transactions;
  }

  public getAllStates(): State[] {
    const states: State[] = [];
    Array.from(this.getExtendedStates().values()).forEach((extendedState) => {
      for (const state of Array.from(extendedState.getStates().values())) {
        states.push(state);
      }
    });
    return states;
  }
}
