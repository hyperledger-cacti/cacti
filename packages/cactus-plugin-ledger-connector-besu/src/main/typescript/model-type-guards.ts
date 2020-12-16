import {
  Web3SigningCredentialNone,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "./generated/openapi/typescript-axios/api";

export function isWeb3SigningCredentialPrivateKeyHex(
  x: any
): x is Web3SigningCredentialPrivateKeyHex {
  return x?.type && x?.type === Web3SigningCredentialType.PRIVATEKEYHEX;
}

export function isWeb3SigningCredentialNone(
  x: any
): x is Web3SigningCredentialNone {
  return x?.type && x?.type === Web3SigningCredentialType.NONE;
}
