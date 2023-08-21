import "jest-extended";
import {
  isGasTransactionConfigEIP1559,
  isGasTransactionConfigLegacy,
  isWeb3SigningCredentialGethKeychainPassword,
  isWeb3SigningCredentialNone,
  isWeb3SigningCredentialPrivateKeyHex,
} from "../../../main/typescript/types/model-type-guards";
import {
  Web3SigningCredentialGethKeychainPassword,
  Web3SigningCredentialType,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialNone,
} from "../../../main/typescript/public-api";

describe("Type guards for OpenAPI spec model type definitions", () => {
  test("isWeb3SigningCredentialGethKeychainPassword()", () => {
    const valid: Web3SigningCredentialGethKeychainPassword = {
      secret: "yes",
      ethAccount: "fake-account",
      type: Web3SigningCredentialType.GethKeychainPassword,
    };

    expect(isWeb3SigningCredentialGethKeychainPassword(valid)).toBe(true);
    expect(isWeb3SigningCredentialGethKeychainPassword({})).not.toBe(true);
  });

  test("isWeb3SigningCredentialPrivateKeyHex()", () => {
    const valid: Web3SigningCredentialPrivateKeyHex = {
      secret: "yes",
      ethAccount: "fake-account",
      type: Web3SigningCredentialType.PrivateKeyHex,
    };

    expect(isWeb3SigningCredentialPrivateKeyHex(valid)).toBe(true);
    expect(isWeb3SigningCredentialPrivateKeyHex({})).not.toBe(true);
  });

  test("isWeb3SigningCredentialNone()", () => {
    const valid: Web3SigningCredentialNone = {
      type: Web3SigningCredentialType.None,
    };

    expect(isWeb3SigningCredentialNone(valid)).toBe(true);
    expect(isWeb3SigningCredentialNone({})).not.toBe(true);
  });

  test("isGasTransactionConfigLegacy()", () => {
    expect(
      isGasTransactionConfigLegacy({
        gas: "1234",
      }),
    ).toBe(true);
    expect(
      isGasTransactionConfigLegacy({
        gasPrice: "1234",
      }),
    ).toBe(true);

    expect(
      isGasTransactionConfigLegacy({
        gasLimit: "1234",
      }),
    ).toBe(false);
    expect(
      isGasTransactionConfigLegacy({
        maxFeePerGas: "1234",
      }),
    ).toBe(false);
    expect(
      isGasTransactionConfigLegacy({
        maxPriorityFeePerGas: "1234",
      }),
    ).toBe(false);
    expect(isGasTransactionConfigLegacy({})).toBe(false);
  });

  test("isGasTransactionConfigEIP1559()", () => {
    expect(
      isGasTransactionConfigEIP1559({
        gasLimit: "1234",
      }),
    ).toBe(true);
    expect(
      isGasTransactionConfigEIP1559({
        maxFeePerGas: "1234",
      }),
    ).toBe(true);
    expect(
      isGasTransactionConfigEIP1559({
        maxPriorityFeePerGas: "1234",
      }),
    ).toBe(true);

    expect(
      isGasTransactionConfigEIP1559({
        gas: "1234",
      }),
    ).toBe(false);
    expect(
      isGasTransactionConfigEIP1559({
        gasPrice: "1234",
      }),
    ).toBe(false);
    expect(isGasTransactionConfigEIP1559({})).toBe(false);
  });
});
