import {
  Web3SigningCredentialType,
  Web3SigningCredentialNone,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

export function isWeb3SigningCredentialNone(x?: {
  type?: Web3SigningCredentialType;
}): x is Web3SigningCredentialNone {
  return x?.type === Web3SigningCredentialType.None;
}
