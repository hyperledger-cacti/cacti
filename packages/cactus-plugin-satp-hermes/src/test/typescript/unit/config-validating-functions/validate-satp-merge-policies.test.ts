import "jest-extended";
import { validateSatpMergePolicies } from "../../../../main/typescript/services/validation/config-validating-functions/validate-satp-merge-policies";
import { IMergePolicyValue } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-merging/merge-policies";
import { MergePolicyOpts } from "@hyperledger/cactus-plugin-bungee-hermes/src/main/typescript/generated/openapi/typescript-axios/api";

describe("validateSatpMergePolicies", () => {
  it("should pass with a valid array", () => {
    let mergePolicyValue = {
      policy: MergePolicyOpts.NONE,
      policyHash: "test",
    } as IMergePolicyValue;
    let result = validateSatpMergePolicies({
      configValue: [mergePolicyValue],
    });
    expect(result).toEqual([mergePolicyValue]);

    mergePolicyValue = {
      policy: MergePolicyOpts.PruneState,
      policyHash: "test",
    } as IMergePolicyValue;
    result = validateSatpMergePolicies({
      configValue: [mergePolicyValue],
    });
    expect(result).toEqual([mergePolicyValue]);

    mergePolicyValue = {
      policy: MergePolicyOpts.PruneStateFromView,
      policyHash: "test",
    } as IMergePolicyValue;
    result = validateSatpMergePolicies({
      configValue: [mergePolicyValue],
    });
    expect(result).toEqual([mergePolicyValue]);

    mergePolicyValue = {
      policy: MergePolicyOpts.PruneStateFromView,
    } as IMergePolicyValue;
    result = validateSatpMergePolicies({
      configValue: [mergePolicyValue],
    });
    expect(result).toEqual([mergePolicyValue]);
  });

  it("should throw when input is not an array", () => {
    const iMergePolicyValue = {
      policy: MergePolicyOpts.NONE,
      policyHash: "test",
    } as IMergePolicyValue;
    expect(() =>
      validateSatpMergePolicies({
        configValue: iMergePolicyValue,
      }),
    ).toThrowError(`Invalid config.mergePolicies: ${iMergePolicyValue}.`);
  });

  it("should throw when array contains a non-string policyHash", () => {
    const input = [
      {
        policy: MergePolicyOpts.NONE,
        policyHash: 123,
      },
    ];
    expect(() =>
      validateSatpMergePolicies({
        configValue: input,
      }),
    ).toThrowError(`Invalid config.mergePolicies: ${input}.`);
  });

  it("should throw when array contains a policy that is not a MergePolicyOpts", () => {
    const input = [
      {
        policy: "MergePolicyOpts",
        policyHash: "test",
      },
    ];
    expect(() =>
      validateSatpMergePolicies({
        configValue: input,
      }),
    ).toThrowError(`Invalid config.mergePolicies: ${input}.`);
  });

  it("should throw when the configValue is a non object", () => {
    const result = validateSatpMergePolicies({
      configValue: undefined,
    });
    expect(result).toEqual([]);
  });
});
