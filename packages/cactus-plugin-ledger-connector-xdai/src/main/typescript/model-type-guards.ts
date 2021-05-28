import {
  Web3SigningCredentialNone,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "./generated/openapi/typescript-axios/api";

export function isWeb3SigningCredentialPrivateKeyHex(
  x: unknown,
): x is Web3SigningCredentialPrivateKeyHex {
  return (
    (x as Web3SigningCredentialPrivateKeyHex)?.type ===
    Web3SigningCredentialType.PrivateKeyHex
  );
}

export function isWeb3SigningCredentialNone(
  x: unknown,
): x is Web3SigningCredentialNone {
  return (
    (x as Web3SigningCredentialNone)?.type === Web3SigningCredentialType.None
  );
}
