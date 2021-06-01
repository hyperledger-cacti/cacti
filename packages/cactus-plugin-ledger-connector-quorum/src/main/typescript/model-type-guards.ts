import {
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialGethKeychainPassword,
  Web3SigningCredentialNone,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "./generated/openapi/typescript-axios/api";

export function isWeb3SigningCredentialPrivateKeyHex(
  x: any,
): x is Web3SigningCredentialPrivateKeyHex {
  return x?.type && x?.type === Web3SigningCredentialType.PrivateKeyHex;
}

export function isWeb3SigningCredentialNone(
  x: any,
): x is Web3SigningCredentialNone {
  return x?.type && x?.type === Web3SigningCredentialType.None;
}

export function isWeb3SigningCredentialGethKeychainPassword(
  x: any,
): x is Web3SigningCredentialGethKeychainPassword {
  return x?.type && x?.type === Web3SigningCredentialType.GethKeychainPassword;
}

export function isWeb3SigningCredentialCactusKeychainRef(
  x: any,
): x is Web3SigningCredentialCactusKeychainRef {
  return (
    !!x?.type &&
    x?.type === Web3SigningCredentialType.CactusKeychainRef &&
    !!x?.keychainEntryKey &&
    typeof x?.keychainEntryKey === "string" &&
    x?.keychainEntryKey.trim().length > 0 &&
    !!x?.keychainId &&
    typeof x?.keychainId === "string" &&
    x?.keychainId.trim().length > 0
  );
}
