import { Proof } from "./view-creation/proof";
import { Snapshot } from "./view-creation/snapshot";
import { State } from "./view-creation/state";
import { Block, StateProof } from "./view-creation/state-proof";
import { Transaction } from "./view-creation/transaction";
import { TransactionProof } from "./view-creation/transaction-proof";
import { View, IViewMetadata } from "./view-creation/view";

export function deserializeView(viewStr: string): View {
  const view = JSON.parse(JSON.parse(viewStr).view);
  const snapshot = view.snapshot;
  const states = snapshot.stateBins;
  const stateBin: State[] = [];
  for (const state of states) {
    const transactions = state.transactions;
    const txs: Transaction[] = [];
    for (const t of transactions) {
      const txProof: TransactionProof = new TransactionProof(
        new Proof({
          creator: t.proof.transactionCreator.creator,
          mspid: t.proof.transactionCreator.mspid,
          signature: t.proof.transactionCreator.signature,
        }),
        t.proof.hash,
      );
      const tx = new Transaction(t.id, t.timeStamp, txProof);

      if (t.proof.endorsements == undefined) {
        txs.push(tx);
        continue;
      }

      for (const endors of t.proof.endorsements) {
        const endorsement = new Proof({
          creator: endors.creator,
          mspid: endors.mspid,
          signature: endors.signature,
        });
        tx.addEndorser(endorsement);
      }
      txs.push(tx);
    }

    const stateN = new State(state.id, state.values, txs);
    const stateProofs: StateProof[] = [];
    for (const proof of state.stateProof) {
      const stateProof = new StateProof(
        proof.value,
        proof.version,
        proof.stateID,
      );

      proof.blocks.forEach((block: unknown) => {
        stateProof.addBlock(block as Block);
      });
      stateProofs.push(stateProof);
    }
    stateN.setStateProof(stateProofs);
    stateBin.push(stateN);
  }

  const snapshotNew = new Snapshot(snapshot.id, snapshot.participant, stateBin);
  snapshotNew.update_TI_TF();
  const viewNew = new View(
    view.creator,
    view.tI,
    view.tF,
    snapshotNew,
    view.key,
  );
  for (const metadata of view.oldVersionsMetadata) {
    viewNew.addPrevVersionMetadata(metadata as IViewMetadata);
  }
  viewNew.setPrivacyPolicyValue(view.policy);
  viewNew.setCreator(view.creator);

  if (
    viewNew.getViewProof().statesMerkleRoot != view.viewProof.statesMerkleRoot
  ) {
    throw Error("Error Parsing view. States root does not match");
  }
  if (
    viewNew.getViewProof().transactionsMerkleRoot !=
    view.viewProof.transactionsMerkleRoot
  ) {
    throw Error("Error Parsing view. Transactions root does not match");
  }
  return viewNew;
}
