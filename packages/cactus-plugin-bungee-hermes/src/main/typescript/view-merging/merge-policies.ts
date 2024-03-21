import { MergePolicyOpts } from "../generated/openapi/typescript-axios";
import { IntegratedView } from "./integrated-view";
export interface IMergePolicy {
  (view: IntegratedView, ...args: string[]): IntegratedView;
}

export interface IMergePolicyValue {
  policy: MergePolicyOpts;
  policyHash?: string; //undefined if policy is NONE
}
export class MergePolicies {
  constructor() {}

  public pruneState(view: IntegratedView, stateId: string): IntegratedView {
    view.getExtendedStates().delete(stateId);
    return view;
  }

  public pruneStateFromView(
    view: IntegratedView,
    stateId: string,
    viewId: string,
  ): IntegratedView {
    view.getExtendedState(stateId)?.getStates().delete(viewId);
    return view;
  }

  public getMergePolicy(opts: MergePolicyOpts): IMergePolicy | undefined {
    switch (opts) {
      case MergePolicyOpts.NONE:
        return undefined;
        break;
      case MergePolicyOpts.PruneState:
        return this.pruneState;
        break;
      case MergePolicyOpts.PruneStateFromView:
        return this.pruneStateFromView;
        break;
      default:
        return undefined;
        break;
    }
  }
}
