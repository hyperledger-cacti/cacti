import { PrivacyPolicyOpts } from "../generated/openapi/typescript-axios";
import { View } from "./view";

export interface IPrivacyPolicy {
  (view: View, ...args: string[]): View;
}
export interface IPrivacyPolicyValue {
  policy: PrivacyPolicyOpts;
  policyHash: string;
}

// Type guard for PrivacyPolicyOpts
export function isPrivacyPolicyOpts(
  value: unknown,
): value is PrivacyPolicyOpts {
  return (
    typeof value === "string" &&
    Object.values(PrivacyPolicyOpts).includes(value as PrivacyPolicyOpts)
  );
}

// Type guard for IPrivacyPolicyValue
export function isPrivacyPolicyValue(obj: unknown): obj is IPrivacyPolicyValue {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "policy" in obj && // Ensure 'policy' key exists
    isPrivacyPolicyOpts((obj as Record<string, unknown>).policy) && // Check if policy is a valid PrivacyPolicyOpts value
    typeof (obj as Record<string, unknown>).policyHash === "string" // Ensure 'policyHash' is a string
  );
}

// Type guard for an array of IPrivacyPolicyValue
export function isPrivacyPolicyValueArray(
  input: unknown,
): input is Array<IPrivacyPolicyValue> {
  return Array.isArray(input) && input.every(isPrivacyPolicyValue);
}

export class PrivacyPolicies {
  constructor() {}

  public pruneState(view: View, stateId: string): View {
    const snapshot = view.getSnapshot();
    snapshot.removeState(stateId);
    snapshot.update_TI_TF();
    return view;
  }

  public singleTransaction(
    view: View,
    stateId: string,
    transactionId: string,
  ): View {
    const snapshot = view.getSnapshot();
    snapshot.filterTransaction(stateId, transactionId);
    return view;
  }

  public getPrivacyPolicy(opts: PrivacyPolicyOpts): IPrivacyPolicy | undefined {
    switch (opts) {
      case PrivacyPolicyOpts.PruneState:
        return this.pruneState;
        break;
      case PrivacyPolicyOpts.SingleTransaction:
        return this.singleTransaction;
        break;
      default:
        return undefined;
        break;
    }
  }
}
