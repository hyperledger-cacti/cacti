import test, { Test } from "tape";
import {
  isWeb3SigningCredentialGethKeychainPassword,
  isWeb3SigningCredentialNone,
  isWeb3SigningCredentialPrivateKeyHex,
} from "../../../main/typescript/model-type-guards";
import {
  Web3SigningCredentialGethKeychainPassword,
  Web3SigningCredentialType,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialNone,
} from "../../../main/typescript/public-api";

test("Type guards for OpenAPI spec model type definitons", (t1: Test) => {
  test("isWeb3SigningCredentialGethKeychainPassword()", (t2: Test) => {
    const valid: Web3SigningCredentialGethKeychainPassword = {
      secret: "yes",
      ethAccount: "fake-account",
      type: Web3SigningCredentialType.GETHKEYCHAINPASSWORD,
    };

    t2.true(
      isWeb3SigningCredentialGethKeychainPassword(valid),
      "Valid Web3SigningCredentialGethKeychainPassword recognized"
    );
    t2.false(
      isWeb3SigningCredentialGethKeychainPassword({}),
      "Invalid Web3SigningCredentialGethKeychainPassword not recognized"
    );
    t2.end();
  });

  test("isWeb3SigningCredentialPrivateKeyHex()", (t2: Test) => {
    const valid: Web3SigningCredentialPrivateKeyHex = {
      secret: "yes",
      ethAccount: "fake-account",
      type: Web3SigningCredentialType.PRIVATEKEYHEX,
    };

    t2.true(
      isWeb3SigningCredentialPrivateKeyHex(valid),
      "Valid Web3SigningCredentialPrivateKeyHex recognized"
    );
    t2.false(
      isWeb3SigningCredentialPrivateKeyHex({}),
      "Invalid Web3SigningCredentialPrivateKeyHex not recognized"
    );
    t2.end();
  });

  test("isWeb3SigningCredentialNone()", (t2: Test) => {
    const valid: Web3SigningCredentialNone = {
      type: Web3SigningCredentialType.NONE,
    };

    t2.true(
      isWeb3SigningCredentialNone(valid),
      "Valid Web3SigningCredentialNone recognized"
    );
    t2.false(
      isWeb3SigningCredentialNone({}),
      "Invalid Web3SigningCredentialNone not recognized"
    );
    t2.end();
  });

  t1.end();
});
