import { State } from "../view-creation/state";

export class ExtendedState {
  private states: Map<string, State>;
  constructor() {
    this.states = new Map<string, State>();
  }
  public getState(viewId: string): State | undefined {
    return this.states.get(viewId);
  }
  public setState(viewId: string, state: State) {
    if (this.getState(viewId) == undefined) {
      this.states.set(viewId, state);
    }
  }
  public getStates(): Map<string, State> {
    return this.states;
  }
}
