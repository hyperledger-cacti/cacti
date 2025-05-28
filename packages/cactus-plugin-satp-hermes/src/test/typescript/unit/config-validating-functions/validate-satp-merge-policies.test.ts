import "jest-extended";
import { validateSatpMergePolicies } from "../../../../main/typescript/services/validation/config-validating-functions/validate-satp-merge-policies";
import { IMergePolicyValue } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-merging/merge-policies";
import { MergePolicyOpts } from "@hyperledger/cactus-plugin-bungee-hermes/src/main/typescript/generated/openapi/typescript-axios/api";

/*export interface IMergePolicyValue {
  policy: MergePolicyOpts;
  policyHash?: string;
}*/
describe("validateSatpMergePolicies", () => {
  it("should pass with a valid array", () => {
    let mergePolicyValue = {
      policy: MergePolicyOpts.NONE,
      policyHash: "test",
    } as IMergePolicyValue;
    expect(() =>
      validateSatpMergePolicies({
        configValue: [mergePolicyValue],
      }),
    ).not.toThrow();

    mergePolicyValue = {
      policy: MergePolicyOpts.PruneState,
      policyHash: "test",
    } as IMergePolicyValue;
    expect(() =>
      validateSatpMergePolicies({
        configValue: [mergePolicyValue],
      }),
    ).not.toThrow();

    mergePolicyValue = {
      policy: MergePolicyOpts.PruneStateFromView,
      policyHash: "test",
    } as IMergePolicyValue;
    expect(() =>
      validateSatpMergePolicies({
        configValue: [mergePolicyValue],
      }),
    ).not.toThrow();

    mergePolicyValue = {
      policy: MergePolicyOpts.PruneStateFromView,
    } as IMergePolicyValue;
    expect(() =>
      validateSatpMergePolicies({
        configValue: [mergePolicyValue],
      }),
    ).not.toThrow();
  });

  it("should throw when input is not an array", () => {
    expect(() =>
      validateSatpMergePolicies({
        configValue: {
          policy: MergePolicyOpts.NONE,
          policyHash: "test",
        } as IMergePolicyValue,
      }),
    ).toThrow();
  });

  it("should throw when array contains a non-string policyHash", () => {
    expect(() =>
      validateSatpMergePolicies({
        configValue: [
          {
            policy: MergePolicyOpts.NONE,
            policyHash: 123,
          },
        ],
      }),
    ).toThrow();
  });

  it("should throw when array contains a policy that is not a MergePolicyOpts", () => {
    expect(() =>
      validateSatpMergePolicies({
        configValue: [
          {
            policy: "MergePolicyOpts",
            policyHash: "test",
          },
        ],
      }),
    ).toThrow();
  });
});
