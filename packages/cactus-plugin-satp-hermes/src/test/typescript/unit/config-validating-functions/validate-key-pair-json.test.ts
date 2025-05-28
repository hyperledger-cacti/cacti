import "jest-extended";
import { validateSatpKeyPairJSON } from "../../../../main/typescript/services/validation/config-validating-functions/validate-key-pair-json";
import { KeyPairJSON } from "../../../../main/typescript/services/validation/config-validating-functions/validate-key-pair-json";

describe("validateKeyPairJson", () => {
  it("should pass with a valid key pair", () => {
    const keyPairJSON = {
      privateKey:
        "38c732b7b86d752c5c051a9c944a683da994eac1cc1544462518b90f89d8146d",
      publicKey:
        "036256069f81bcaae52a64965b8add79521ee54cb2ad3d85de5250d78cf0fc171c",
    } as KeyPairJSON;
    const result = validateSatpKeyPairJSON({
      configValue: keyPairJSON,
    });
    expect(result).toEqual(keyPairJSON);
  });

  it("should throw if is a key pair with too short hex strings", () => {
    const invalidJson = {
      privateKey: "abc123",
      publicKey: "def456",
    } as KeyPairJSON;
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalidJson,
      }),
    ).toThrowError(
      `Invalid config.keyPair: ${JSON.stringify(invalidJson)}. 'publicKey' must be 66-character hex, 'privateKey' must be 64-character hex.`,
    );
  });

  it("should throw if is a key pair with too long hex strings", () => {
    const invalidJson = {
      privateKey:
        "38c732b7b86d752c5c051a9c944a683da994eac1cc1544462518b90f89d8146ds3",
      publicKey:
        "036256069f81bcaae52a64965b8add79521ee54cb2ad3d85de5250d78cf0fc171cd3",
    } as KeyPairJSON;
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalidJson,
      }),
    ).toThrowError(
      `Invalid config.keyPair: ${JSON.stringify(invalidJson)}. 'publicKey' must be 66-character hex, 'privateKey' must be 64-character hex.`,
    );
  });

  it("should throw if is a public key with too short hex strings", () => {
    const invalidJson = {
      privateKey:
        "38c732b7b86d752c5c051a9c944a683da994eac1cc1544462518b90f89d8146d",
      publicKey:
        "036256069f81bcaae52a64965b8add791ee54cb2ad3d85de5250d78cf0fc171c",
    } as KeyPairJSON;
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalidJson,
      }),
    ).toThrowError(
      `Invalid config.keyPair: ${JSON.stringify(invalidJson)}. 'publicKey' must be 66-character hex, 'privateKey' must be 64-character hex.`,
    );
  });

  it("should throw if is a private key with too short hex strings", () => {
    const invalidJson = {
      privateKey:
        "38c732b7b86d752c5c051a944a683da994eac1cc1544462518b90f89d8146d",
      publicKey:
        "036256069f81bcaae52a64965b8add79521ee54cb2ad3d85de5250d78cf0fc171c",
    } as KeyPairJSON;
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalidJson,
      }),
    ).toThrowError(
      `Invalid config.keyPair: ${JSON.stringify(invalidJson)}. 'publicKey' must be 66-character hex, 'privateKey' must be 64-character hex.`,
    );
  });

  it("should throw if is a public key with too long hex strings", () => {
    const invalidJson = {
      privateKey:
        "38c732b7b86d752c5c051a9c944a683da994eac1cc1544462518b90f89d8146d",
      publicKey:
        "036256069f81bcaae52a64965b8add79521ee54cb2ad3d85de5250d78cf0fc171ce4",
    } as KeyPairJSON;
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalidJson,
      }),
    ).toThrowError(
      `Invalid config.keyPair: ${JSON.stringify(invalidJson)}. 'publicKey' must be 66-character hex, 'privateKey' must be 64-character hex.`,
    );
  });

  it("should throw if is a private key with too long hex strings", () => {
    const invalidJson = {
      privateKey:
        "38c732b7b86d752c5c051a9c944a683da994eac1cc1544462518b90f89d8146d",
      publicKey:
        "036256069f81bcaae52a64965b8add79521ee54cb2ad3d85de5250d78cf0fc171r3c",
    } as KeyPairJSON;
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalidJson,
      }),
    ).toThrowError(
      `Invalid config.keyPair: ${JSON.stringify(invalidJson)}. 'publicKey' must be 66-character hex, 'privateKey' must be 64-character hex.`,
    );
  });

  it("should throw if input is not an object", () => {
    const invalid = "not-an-object";
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalid,
      }),
    ).toThrowError(
      `Invalid config.keyPair: ${JSON.stringify(invalid)}. Expected a keyPair object with 'publicKey' and 'privateKey' string fields.`,
    );
  });

  it("should throw if privateKey is missing", () => {
    const invalidJson = {
      publicKey: "def456",
    };
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalidJson,
      }),
    ).toThrowError(
      `Invalid config.keyPair: ${JSON.stringify(invalidJson)}. Expected a keyPair object with 'publicKey' and 'privateKey' string fields.`,
    );
  });

  it("should throw if publicKey is missing", () => {
    const invalidJson = {
      privateKey: "abc123",
    };
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalidJson,
      }),
    ).toThrow();
  });
});
