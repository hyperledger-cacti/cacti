import { State } from "./state";
import { stringify as safeStableStringify } from "safe-stable-stringify";

export class Snapshot {
  private id: string;
  private participant;
  private stateBins: State[]; //set of state bins
  private tI: string = "";
  private tF: string = "";

  constructor(id: string, participant: string, stateBins: State[]) {
    this.id = id;
    this.participant = participant;
    this.stateBins = stateBins;
  }
  public getParticipant(): string {
    return this.participant;
  }
  private getId(): string {
    return this.id;
  }

  public getTI() {
    return this.tI;
  }
  public getTF() {
    return this.tF;
  }
  public setTF(tF: string) {
    this.tF = tF;
  }

  public setTI(tI: string) {
    this.tI = tI;
  }

  public update_TI_TF() {
    let ti = 999999999999999;
    let tf = 0;
    for (const bin of this.stateBins) {
      const tI = Number(bin.getInitialTime());
      const tF = Number(bin.getFinalTime());
      if (tf < tF) {
        tf = tF;
      }
      if (ti > tI) {
        ti = tI;
      }
    }
    this.tF = tf.toString();
    this.tI = ti.toString();
  }

  public pruneStates(tI: string, tF: string): void {
    for (const state of this.stateBins) {
      state.pruneState(tI, tF);
    }
  }

  public getStateBins() {
    return this.stateBins;
  }

  public filterStates(tI: string, tF: string): void {
    const finalT = BigInt(tF);
    const initialT = BigInt(tI);
    const stateBins: State[] = [];
    for (const state of this.stateBins) {
      if (
        BigInt(state.getInitialTime()) > finalT ||
        BigInt(state.getFinalTime()) < initialT
      ) {
        continue;
      }
      stateBins.push(state);
    }
    this.stateBins = stateBins;
  }

  public selectStates(states: string[]): void {
    const stateBins: State[] = [];
    for (const state of this.stateBins) {
      if (states.includes(state.getId())) {
        stateBins.push(state);
      }
    }
    this.stateBins = stateBins;
  }

  public filterTransaction(stateId: string, transaction: string): void {
    this.selectStates([stateId]);
    const state = this.stateBins[0];
    state.selectTransactions([transaction]);
  }

  public getSnapshotJson(): string {
    const snapshotJson = {
      id: this.id,
      participant: this.participant,
      stateBins: this.stateBins,
    };

    return safeStableStringify(snapshotJson);
  }

  public removeState(stateId: string) {
    this.stateBins = this.stateBins.filter((state) => {
      return state.getId() !== stateId;
    });
    this.update_TI_TF();
  }
}
