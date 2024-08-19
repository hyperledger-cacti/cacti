import {
  IPrivacyPolicyValue,
  isPrivacyPolicyValueArray,
} from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-creation/privacy-policies";

export function validateSatpPrivacyPolicies(opts: {
  readonly configValue: unknown;
}): Array<IPrivacyPolicyValue> {
  if (!opts || !opts.configValue) {
    return [];
  }

  if (!isPrivacyPolicyValueArray(opts.configValue)) {
    throw new TypeError(`Invalid config.privacyPolicies: ${opts.configValue}.`);
  }
  return opts.configValue;
}
