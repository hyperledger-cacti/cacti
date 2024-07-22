import { PolicyAction } from "./policy-action";
import { PolicyCondition } from "./policy-condition";
import { IPolicyItemOptions, PolicyItem } from "./polity-item";
export interface IPolicyRuleOptions extends IPolicyItemOptions {
  policyAction: PolicyAction;
  policyCondition: PolicyCondition;
  roles: string[];
}
export class PolicyRule extends PolicyItem {
  private policyCondition: PolicyCondition;
  private policyAction: PolicyAction;
  private roles: string[];
  constructor(options: IPolicyRuleOptions) {
    super(options);
    this.policyAction = options.policyAction;
    this.policyCondition = options.policyCondition;
    this.roles = options.roles;
  }

  public async evaluateCondition(): Promise<boolean> {
    return this.policyCondition.evaluate();
  }

  public async executePolicyAction(): Promise<boolean> {
    return this.policyAction.execute();
  }

  public getRoles(): string[] {
    return this.roles;
  }
}
