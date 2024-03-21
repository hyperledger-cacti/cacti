import { v4 as uuidV4 } from "uuid";
import { Snapshot } from "./snapshot";

export class View {
  private key: string;
  private snapshot: Snapshot;
  private tI;
  private tF;
  private participant;

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
  }
  public getKey() {
    return this.key;
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
