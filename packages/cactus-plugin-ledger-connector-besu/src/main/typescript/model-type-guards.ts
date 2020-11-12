import {
  Web3SigningCredentialGethKeychainPassword,
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

export function isWeb3SigningCredentialGethKeychainPassword(
  x: any
): x is Web3SigningCredentialGethKeychainPassword {
  return x?.type && x?.type === Web3SigningCredentialType.GETHKEYCHAINPASSWORD;
}
