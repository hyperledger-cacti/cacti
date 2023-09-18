import "jest-extended";
import {
  isContractJsonDefinition,
  isContractKeychainDefinition,
  isDeployedContractJsonDefinition,
  isGasTransactionConfigEIP1559,
  isGasTransactionConfigLegacy,
  isWeb3Error,
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

  test("isContractJsonDefinition()", () => {
    expect(
      isContractJsonDefinition({
        contractJSON: {
          abi: "test",
        },
      }),
    ).toBe(true);

    expect(
      isContractJsonDefinition({
        foo: "1234",
      }),
    ).toBe(false);
    expect(isContractJsonDefinition({})).toBe(false);
  });

  test("isDeployedContractJsonDefinition()", () => {
    expect(
      isDeployedContractJsonDefinition({
        contractJSON: {
          abi: "test",
        },
        contractAddress: "asd",
      }),
    ).toBe(true);

    expect(
      isDeployedContractJsonDefinition({
        contractJSON: {
          abi: "test",
        },
      }),
    ).toBe(false);
    expect(
      isDeployedContractJsonDefinition({
        contractAddress: "asd",
      }),
    ).toBe(false);
    expect(
      isDeployedContractJsonDefinition({
        foo: "1234",
      }),
    ).toBe(false);
    expect(isDeployedContractJsonDefinition({})).toBe(false);
  });

  test("isContractKeychainDefinition()", () => {
    expect(
      isContractKeychainDefinition({
        contractName: "foo",
        keychainId: "bar",
      }),
    ).toBe(true);

    expect(
      isContractKeychainDefinition({
        contractName: "foo",
      }),
    ).toBe(false);
    expect(
      isContractKeychainDefinition({
        keychainId: "foo",
      }),
    ).toBe(false);
    expect(
      isContractKeychainDefinition({
        foo: "bar",
      }),
    ).toBe(false);
    expect(isContractKeychainDefinition({})).toBe(false);
  });

  test("isWeb3Error()", () => {
    expect(
      isWeb3Error({
        name: "Test",
        code: 123,
      }),
    ).toBe(true);

    expect(
      isWeb3Error({
        name: "Test",
      }),
    ).toBe(false);
    expect(
      isWeb3Error({
        code: 123,
      }),
    ).toBe(false);
    expect(
      isWeb3Error({
        foo: "bar",
      }),
    ).toBe(false);
    expect(isWeb3Error({})).toBe(false);
  });
});
