import {
  IMergePolicyValue,
  isMergePolicyValueArray,
} from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-merging/merge-policies";

export function validateSatpMergePolicies(opts: {
  readonly configValue: unknown;
}): Array<IMergePolicyValue> {
  if (!opts || !opts.configValue) {
    return [];
  }

  if (!isMergePolicyValueArray(opts.configValue)) {
    throw new TypeError(`Invalid config.mergePolicies: ${opts.configValue}.`);
  }
  return opts.configValue;
}
