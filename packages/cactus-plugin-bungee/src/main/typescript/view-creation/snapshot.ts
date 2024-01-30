import { State } from "./state";

export class Snapshot {
  private id: string;
  private participant;
  private version: number;
  private stateBins: State[]; //set of state bins

  constructor(id: string, participant: string, stateBins: State[]) {
    this.id = id;
    this.participant = participant;
    this.version = 1;
    this.stateBins = stateBins;
  }

  private getVersion(): number {
    return this.version;
  }

  private getId(): string {
    return this.id;
  }

  public pruneStates(tI: string, tF: string): void {
    for (const state of this.stateBins) {
      state.pruneState(tI, tF);
    }
  }

  public getLedgerStates(): State[] {
    return this.stateBins;
  }

  public getSnapshotJson(): string {
    const snapshotJson = {
      id: this.id,
      participant: this.participant,
      version: this.version,
      stateBins: this.stateBins,
    };

    return JSON.stringify(snapshotJson);
  }
}
