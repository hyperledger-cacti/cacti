import { MergePolicyOpts } from "../generated/openapi/typescript-axios";
import { IntegratedView } from "./integrated-view";
export interface IMergePolicy {
  (view: IntegratedView, ...args: string[]): IntegratedView;
}

export interface IMergePolicyValue {
  policy: MergePolicyOpts;
  policyHash?: string; //undefined if policy is NONE
}

// Type guard for MergePolicyOpts
export function isMergePolicyOpts(value: unknown): value is MergePolicyOpts {
  return (
    typeof value === "string" &&
    Object.values(MergePolicyOpts).includes(value as MergePolicyOpts)
  );
}

// Type guard for IMergePolicyValue
export function isMergePolicyValue(obj: unknown): obj is IMergePolicyValue {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "policy" in obj && // Ensure 'policy' key exists
    isMergePolicyOpts((obj as Record<string, unknown>).policy) && // Check if policy is a valid MergePolicyOpts value
    (typeof (obj as Record<string, unknown>).policyHash === "string" ||
      typeof (obj as Record<string, unknown>).policyHash === "undefined") // Ensure 'policyHash' is either a string or undefined
  );
}

// Type guard for an array of IMergePolicyValue
export function isMergePolicyValueArray(
  input: unknown,
): input is IMergePolicyValue[] {
  return Array.isArray(input) && input.every(isMergePolicyValue);
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
