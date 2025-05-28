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
    expect(() =>
      validateSatpPrivacyPolicies({
        configValue: [iPrivacyPolicyValue],
      }),
    ).not.toThrow();

    iPrivacyPolicyValue = {
      policy: PrivacyPolicyOpts.SingleTransaction,
      policyHash: "test",
    } as IPrivacyPolicyValue;
    expect(() =>
      validateSatpPrivacyPolicies({
        configValue: [iPrivacyPolicyValue],
      }),
    ).not.toThrow();
  });

  it("should throw when input is not an array", () => {
    expect(() =>
      validateSatpPrivacyPolicies({
        configValue: {
          policy: PrivacyPolicyOpts.PruneState,
          policyHash: "test",
        } as IPrivacyPolicyValue,
      }),
    ).toThrow();
  });

  it("should throw when array contains a non-string policyHash", () => {
    expect(() =>
      validateSatpPrivacyPolicies({
        configValue: [
          {
            policy: PrivacyPolicyOpts.PruneState,
            policyHash: 123,
          },
        ],
      }),
    ).toThrow();
  });

  it("should throw when array contains a policy that is not a PrivacyPolicyOpts", () => {
    expect(() =>
      validateSatpPrivacyPolicies({
        configValue: [
          {
            policy: "PrivacyPolicyOpts",
            policyHash: "test",
          },
        ],
      }),
    ).toThrow();
  });
});
