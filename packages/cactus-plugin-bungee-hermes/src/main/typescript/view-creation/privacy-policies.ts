import { PrivacyPolicyOpts } from "../generated/openapi/typescript-axios";
import { View } from "./view";

export interface IPrivacyPolicy {
  (view: View, ...args: string[]): View;
}
export interface IPrivacyPolicyValue {
  policy: PrivacyPolicyOpts;
  policyHash: string;
}
export class PrivacyPolicies {
  constructor() {}

  public pruneState(view: View, stateId: string): View {
    const snapshot = view.getSnapshot();
    snapshot.removeState(stateId);
    snapshot.update_TI_TF();
    return view;
  }

  public getPrivacyPolicy(opts: PrivacyPolicyOpts): IPrivacyPolicy | undefined {
    switch (opts) {
      case PrivacyPolicyOpts.PruneState:
        return this.pruneState;
        break;
      default:
        return undefined;
        break;
    }
  }
}
