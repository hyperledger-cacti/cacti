import {
  Web3SigningCredentialNone,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "./generated/openapi/typescript-axios/api";

export function isWeb3SigningCredentialPrivateKeyHex(x?: {
  type?: Web3SigningCredentialType;
}): x is Web3SigningCredentialPrivateKeyHex {
  return x?.type === Web3SigningCredentialType.PrivateKeyHex;
}

export function isWeb3SigningCredentialNone(x?: {
  type?: Web3SigningCredentialType;
}): x is Web3SigningCredentialNone {
  return x?.type === Web3SigningCredentialType.None;
}
