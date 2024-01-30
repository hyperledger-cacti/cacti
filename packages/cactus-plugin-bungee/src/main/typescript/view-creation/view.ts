import { Snapshot } from "./snapshot";

export class View {
  private snapshot;
  private tI;
  private tF;

  constructor(tI: string, tF: string, snapshot: Snapshot) {
    this.tI = tI;
    this.tF = tF;
    this.snapshot = snapshot;
    this.pruneSnapshot();
  }

  private pruneSnapshot(): void {
    if (this.tI != "0" && this.tF != "0") {
      this.snapshot.pruneStates(this.tI, this.tF);
    }
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
}
