import {
  SolanaSigningCredential,
  SolanaSigningCredentialCactiKeychainRef,
  SolanaSigningCredentialNone,
  SolanaSigningCredentialPrivateKeyBase58,
  SolanaSigningCredentialType,
} from "../generated/openapi/typescript-axios";

export function isSolanaSigningCredentialPrivateKeyBase58(
  x?: SolanaSigningCredential,
): x is SolanaSigningCredentialPrivateKeyBase58 {
  return x?.type === SolanaSigningCredentialType.PrivateKeyBase58;
}

export function isSolanaSigningCredentialCactiKeychainRef(
  x?: SolanaSigningCredential,
): x is SolanaSigningCredentialCactiKeychainRef {
  return x?.type === SolanaSigningCredentialType.CactiKeychainRef;
}

export function isSolanaSigningCredentialNone(
  x?: SolanaSigningCredential,
): x is SolanaSigningCredentialNone {
  return x?.type === SolanaSigningCredentialType.None;
}
