import {
  Web3SigningCredentialNone,
  Web3SigningCredentialMnemonicString,
  Web3SigningCredentialType,
  Web3SigningCredentialCactusKeychainRef,
} from "./generated/openapi/typescript-axios/api";

export function isWeb3SigningCredentialMnemonicString(x?: {
  type?: Web3SigningCredentialType;
}): x is Web3SigningCredentialMnemonicString {
  return x?.type === Web3SigningCredentialType.MnemonicString;
}

export function isWeb3SigningCredentialCactusRef(x?: {
  type?: Web3SigningCredentialType;
}): x is Web3SigningCredentialCactusKeychainRef {
  return x?.type === Web3SigningCredentialType.CactusKeychainRef;
}

export function isWeb3SigningCredentialNone(x?: {
  type?: Web3SigningCredentialType;
}): x is Web3SigningCredentialNone {
  return x?.type === Web3SigningCredentialType.None;
}
