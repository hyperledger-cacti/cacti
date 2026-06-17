import {
  SolanaSigningCredentialType,
  isSolanaSigningCredentialPrivateKeyBase58,
  isSolanaSigningCredentialCactiKeychainRef,
  isSolanaSigningCredentialNone,
} from "../../../main/typescript/public-api";
import type { SolanaSigningCredential } from "../../../main/typescript/public-api";

describe("Solana signing credential type guards", () => {
  const privateKeyBase58Cred: SolanaSigningCredential = {
    type: SolanaSigningCredentialType.PrivateKeyBase58,
    privateKeyBase58: "abc123",
  };

  const keychainRefCred: SolanaSigningCredential = {
    type: SolanaSigningCredentialType.CactiKeychainRef,
    keychainId: "kc-1",
    keychainEntryKey: "entry-key",
  };

  const noneCred: SolanaSigningCredential = {
    type: SolanaSigningCredentialType.None,
  };

  // --- isSolanaSigningCredentialPrivateKeyBase58 ---

  test("identifies PRIVATE_KEY_BASE58 correctly", () => {
    expect(
      isSolanaSigningCredentialPrivateKeyBase58(privateKeyBase58Cred),
    ).toBe(true);
  });

  test("rejects CACTI_KEYCHAIN_REF as PRIVATE_KEY_BASE58", () => {
    expect(isSolanaSigningCredentialPrivateKeyBase58(keychainRefCred)).toBe(
      false,
    );
  });

  test("rejects NONE as PRIVATE_KEY_BASE58", () => {
    expect(isSolanaSigningCredentialPrivateKeyBase58(noneCred)).toBe(false);
  });

  test("rejects undefined as PRIVATE_KEY_BASE58", () => {
    expect(isSolanaSigningCredentialPrivateKeyBase58(undefined)).toBe(false);
  });

  // --- isSolanaSigningCredentialCactiKeychainRef ---

  test("identifies CACTI_KEYCHAIN_REF correctly", () => {
    expect(isSolanaSigningCredentialCactiKeychainRef(keychainRefCred)).toBe(
      true,
    );
  });

  test("rejects PRIVATE_KEY_BASE58 as CACTI_KEYCHAIN_REF", () => {
    expect(
      isSolanaSigningCredentialCactiKeychainRef(privateKeyBase58Cred),
    ).toBe(false);
  });

  test("rejects NONE as CACTI_KEYCHAIN_REF", () => {
    expect(isSolanaSigningCredentialCactiKeychainRef(noneCred)).toBe(false);
  });

  test("rejects undefined as CACTI_KEYCHAIN_REF", () => {
    expect(isSolanaSigningCredentialCactiKeychainRef(undefined)).toBe(false);
  });

  // --- isSolanaSigningCredentialNone ---

  test("identifies NONE correctly", () => {
    expect(isSolanaSigningCredentialNone(noneCred)).toBe(true);
  });

  test("rejects PRIVATE_KEY_BASE58 as NONE", () => {
    expect(isSolanaSigningCredentialNone(privateKeyBase58Cred)).toBe(false);
  });

  test("rejects CACTI_KEYCHAIN_REF as NONE", () => {
    expect(isSolanaSigningCredentialNone(keychainRefCred)).toBe(false);
  });

  test("rejects undefined as NONE", () => {
    expect(isSolanaSigningCredentialNone(undefined)).toBe(false);
  });

  // --- Exhaustiveness: every guard rejects every other credential ---

  const allCreds: SolanaSigningCredential[] = [
    privateKeyBase58Cred,
    keychainRefCred,
    noneCred,
  ];

  test.each(allCreds)(
    "exactly one guard returns true for each credential",
    (cred) => {
      const hits = [
        isSolanaSigningCredentialPrivateKeyBase58(cred),
        isSolanaSigningCredentialCactiKeychainRef(cred),
        isSolanaSigningCredentialNone(cred),
      ].filter(Boolean);
      expect(hits).toHaveLength(1);
    },
  );
});
