import "jest-extended";
import { validateSatpPrivacyPolicies } from "../../../../main/typescript/services/validation/config-validating-functions/validate-satp-privacy-policies";
import { IPrivacyPolicyValue } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-creation/privacy-policies";
import { PrivacyPolicyOpts } from "@hyperledger/cactus-plugin-bungee-hermes/src/main/typescript/generated/openapi/typescript-axios";

describe("validateSatpPrivacyPolicies", () => {
  it("should pass with an array", () => {
    let iPrivacyPolicyValue = {
      policy: PrivacyPolicyOpts.PruneState,
      policyHash: "test",
    } as IPrivacyPolicyValue;
    let result = validateSatpPrivacyPolicies({
      configValue: [iPrivacyPolicyValue],
    });
    expect(result).toEqual([iPrivacyPolicyValue]);

    iPrivacyPolicyValue = {
      policy: PrivacyPolicyOpts.SingleTransaction,
      policyHash: "test",
    } as IPrivacyPolicyValue;
    result = validateSatpPrivacyPolicies({
      configValue: [iPrivacyPolicyValue],
    });
    expect(result).toEqual([iPrivacyPolicyValue]);
  });

  it("should throw when input is not an array", () => {
    const iPrivacyPolicyValue = {
      policy: PrivacyPolicyOpts.PruneState,
      policyHash: "test",
    } as IPrivacyPolicyValue;
    expect(() =>
      validateSatpPrivacyPolicies({
        configValue: iPrivacyPolicyValue,
      }),
    ).toThrowError(`Invalid config.privacyPolicies: ${iPrivacyPolicyValue}.`);
  });

  it("should throw when array contains a non-string policyHash", () => {
    const iPrivacyPolicyValue = [
      {
        policy: PrivacyPolicyOpts.PruneState,
        policyHash: 123,
      },
    ];
    expect(() =>
      validateSatpPrivacyPolicies({
        configValue: iPrivacyPolicyValue,
      }),
    ).toThrowError(`Invalid config.privacyPolicies: ${iPrivacyPolicyValue}.`);
  });

  it("should throw when array contains a policy that is not a PrivacyPolicyOpts", () => {
    const iPrivacyPolicyValue = [
      {
        policy: "PrivacyPolicyOpts",
        policyHash: "test",
      },
    ];
    expect(() =>
      validateSatpPrivacyPolicies({
        configValue: iPrivacyPolicyValue,
      }),
    ).toThrowError(`Invalid config.privacyPolicies: ${iPrivacyPolicyValue}.`);
  });

  it("should pass with an array", () => {
    const result = validateSatpPrivacyPolicies({
      configValue: undefined,
    });
    expect(result).toEqual([]);
  });
});
