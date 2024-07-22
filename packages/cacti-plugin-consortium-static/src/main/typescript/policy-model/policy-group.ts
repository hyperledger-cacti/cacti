import { Checks } from "@hyperledger/cactus-common";
import { PolicyRule } from "./policy-rule";
import { IPolicyItemOptions, PolicyItem } from "./polity-item";
import MerkleTree from "merkletreejs";
import { stringify as safeStableStringify } from "safe-stable-stringify";

export interface IPolicyGroupOptions extends IPolicyItemOptions {
  role: string;
}

export class PolicyGroup extends PolicyItem {
  private policyGroups: Map<string, PolicyGroup>;
  private policyRules: Map<string, PolicyRule>;
  private role: string;
  private inheritedRoles: string[];

  constructor(options: IPolicyGroupOptions) {
    Checks.nonBlankString(options.role);
    super(options);
    this.role = options.role;
    this.policyGroups = new Map<string, PolicyGroup>();
    this.policyRules = new Map<string, PolicyRule>();
    this.inheritedRoles = [];
  }

  public setInheritedRoles(roles: string[]) {
    this.inheritedRoles = roles;
  }
  public getRoles(): string[] {
    return Array.prototype.concat(this.inheritedRoles, [this.role]);
  }

  public addGroup(group: PolicyGroup) {
    if (group.getId() === this.getId()) {
      throw Error(
        "Can't add subgroup" + group.getId() + " to group " + this.getId(),
      );
    }
    if (this.policyGroups.get(group.getId())) {
      throw Error(
        "Group " + group.getId() + " already exists in " + this.getId(),
      );
    }

    //TODO: verify role (must be unique)

    group.setInheritedRoles(this.getRoles());
    this.policyGroups.set(group.getId(), group);
  }

  public addRule(rule: PolicyRule) {
    if (!rule.getRoles().includes(this.role)) {
      throw Error(
        "PolicyRule" +
          rule.getId() +
          " is not targeted to policy group with role " +
          this.role,
      );
    }
    if (this.policyRules.get(rule.getId())) {
      throw Error(
        "PolicyRule " +
          rule.getId() +
          " already exists in Group " +
          this.getId(),
      );
    }

    this.policyRules.set(rule.getId(), rule);
  }

  public getPolicySubGroupById(id: string): PolicyGroup | undefined {
    if (this.policyGroups.get(id)) {
      return this.policyGroups.get(id);
    }

    for (const group of this.policyGroups.values()) {
      const g = group.getPolicySubGroupById(id);
      if (g) {
        return g;
      }
    }

    return undefined;
  }

  public getPolicySubGroupByRole(role: string): PolicyGroup | undefined {
    for (const group of this.policyGroups.values()) {
      if (group.getRoles()[group.getRoles().length - 1] === role) {
        return group;
      }
    }
  }
  public getPolicySubGroupByRoles(roles: string[]): PolicyGroup | undefined {
    if (roles.length < 1) return undefined;
    let group = this.getPolicySubGroupByRole(roles[0]);
    if (!group) {
      return undefined;
    }
    for (const role of roles) {
      group = group?.getPolicySubGroupByRole(role);
      if (!group) {
        return undefined;
      }
    }
    return group;
  }

  public buildTreeProof(tree?: { rules: string[]; groups: string[] }): string {
    if (!tree) {
      tree = this.buildTree();
    }
    return new MerkleTree(
      Array.prototype.concat(tree.rules, tree.groups),
      undefined,
      {
        sort: true,
        hashLeaves: true,
      },
    )
      .getRoot()
      .toString("hex");
  }

  public buildTree(): {
    rules: string[];
    groups: string[];
  } {
    const tree: {
      rules: string[];
      groups: string[];
    } = {
      rules: [],
      groups: [],
    };
    for (const group of this.policyGroups.values()) {
      const tr = group.buildTree();
      tree.rules = Array.prototype.concat(tree.rules, tr.rules);
      tree.groups = Array.prototype.concat(tree.groups, tr.groups);
    }
    const rules = Array.from(this.policyRules.values()).map((rule) => {
      return safeStableStringify(rule.asIPolicy());
    });
    const groups = Array.from(this.policyRules.values()).map((rule) => {
      return safeStableStringify(rule.asIPolicy());
    });

    tree.rules = Array.prototype.concat(tree.rules, rules);
    tree.groups = Array.prototype.concat(tree.groups, groups);

    return tree;
  }
}
