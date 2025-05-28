import "jest-extended";
import { validateSatpKeyPairJSON } from "../../../../main/typescript/services/validation/config-validating-functions/validate-key-pair-json";
import { KeyPairJSON } from "../../../../main/typescript/services/validation/config-validating-functions/validate-key-pair-json";

describe("validateKeyPairJson", () => {
  it("should pass with a valid key pair", () => {
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: {
          privateKey: "0xabc123",
          publicKey: "0xdef456",
        } as KeyPairJSON,
      }),
    ).not.toThrow();
  });

  it("should throw if input is not an object", () => {
    const invalid = "not-an-object";
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalid,
      }),
    ).toThrow();
  });

  it("should throw if privateKey is missing", () => {
    const invalidJson = {
      publicKey: "0xdef456",
    };
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalidJson,
      }),
    ).toThrow();
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

  /*it("should throw if is not a KeyPairJSON", () => {
    const invalidJson = {
      privateKey: "0xabc123",
      publicKey: "0xdef456",
    };
    expect(() =>
      validateSatpKeyPairJSON({
        configValue: invalidJson,
      }),
    ).toThrow();
  });*/
});
