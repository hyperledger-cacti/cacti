import "jest-extended";
import { validateSatpKeyPairJSON } from "../../../../main/typescript/services/validation/config-validating-functions/validate-key-pair-json";
import { KeyPairJSON } from "../../../../main/typescript/services/validation/config-validating-functions/validate-key-pair-json";

describe("validateKeyPairJson", () => {
  it("should pass with a valid key pair", () => {
    const keyPairJSON = {
      privateKey:
        "0x1c3a1e987fdabc9aeea47e457ad4db9732f7d7b6d2856d6e3f9b8d88ff6e227e",
      publicKey:
        "0x03a34e1d66b78e47fa1bba3445a6019acb5b9c87d0c6ad81c09e7d496682ae81fc",
    } as KeyPairJSON;
    const result = validateSatpKeyPairJSON({
      configValue: keyPairJSON,
    });
    expect(result).toEqual(keyPairJSON);
  });

  it("should throw if is not a valid key pair", () => {
    const invalidJson = {
      privateKey: "0xabc123",
      publicKey: "0xdef456",
    } as KeyPairJSON;
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalidJson,
      }),
    ).toThrowError(
      `Invalid config.keyPair values: ${JSON.stringify(invalidJson)}. 'publicKey' and 'privateKey' must be valid hex strings (e.g. starting with 0x and containing only hex digits).`,
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
      publicKey: "0xdef456",
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
      privateKey: "0xabc123",
    };
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalidJson,
      }),
    ).toThrow();
  });
});
