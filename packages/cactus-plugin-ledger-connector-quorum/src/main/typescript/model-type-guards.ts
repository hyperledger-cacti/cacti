import {
  Web3SigningCredentialCactusKeychainRef,
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

export function isWeb3SigningCredentialCactusKeychainRef(
  x: any
): x is Web3SigningCredentialCactusKeychainRef {
  return (
    !!x?.type &&
    x?.type === Web3SigningCredentialType.CACTUSKEYCHAINREF &&
    !!x?.keychainEntryKey &&
    typeof x?.keychainEntryKey === "string" &&
    x?.keychainEntryKey.trim().length > 0 &&
    !!x?.keychainId &&
    typeof x?.keychainId === "string" &&
    x?.keychainId.trim().length > 0
  );
}
