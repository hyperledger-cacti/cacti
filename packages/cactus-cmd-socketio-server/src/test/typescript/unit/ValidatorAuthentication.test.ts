/* verifier/ValidatorAuthentication.ts Unit Tests
 * Execute:
 *    cd cactus/packages/cactus-cmd-socketio-server && npm install && npx jest
 */

//////////////////////////
// TEST CONSTANTS
/////////////////////////

import "jest-extended";
import jwt from "jsonwebtoken";

// Init test logger
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

const logLevel: LogLevelDesc = "error";
const log: Logger = LoggerProvider.getOrCreate({
  label: "test-cmd-socketio-verifier",
  level: logLevel,
});

// Generate private / public keys for test purposes
import { generateKeyPairSync } from "crypto";
const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
});

// Mock private key reading
import { readFileSync } from "fs";
jest.mock("fs");
(readFileSync as jest.Mock).mockReturnValue(
  privateKey.export({ type: "sec1", format: "pem" }),
);

import { config } from "../../../main/typescript/common/core/config/default";
import { ValidatorAuthentication } from "../../../main/typescript/verifier/ValidatorAuthentication";

//////////////////////////
// UNIT TESTS
/////////////////////////

test("Validator loads private key from it's config path", () => {
  // Called once
  expect((readFileSync as jest.Mock).mock.calls.length).toBe(1);

  // 1'st argument of the 1'st call.
  expect((readFileSync as jest.Mock).mock.calls[0][0]).toContain(
    config.validatorKeyPath,
  );
});

test("Static method sign encrypts payload using private key", () => {
  const message = {
    message: "Hello",
    from: "Someone",
  };

  // Call sign
  const signedMessage = ValidatorAuthentication.sign(message);

  // Assert signed message
  log.debug("signedMessage:", signedMessage);
  expect(signedMessage).toBeString();
  expect(signedMessage.length).toBeGreaterThan(0);
  expect(signedMessage).not.toContain(message.message);
  expect(signedMessage).not.toContain(message.from);

  // Decrypt the message
  const decryptedMessage = jwt.verify(
    signedMessage,
    publicKey.export({ type: "spki", format: "pem" }),
    { algorithms: ["ES256"] },
  );
  log.debug("decryptedMessage:", decryptedMessage);
  expect(decryptedMessage).toMatchObject(message);

  const decryptedJwt = decryptedMessage as { iat: number; exp: number };

  // Assert issue at
  expect(decryptedJwt.iat).toBeNumber();
  const iatDate = new Date(decryptedJwt.iat * 1000);
  log.debug("now:", new Date(Date.now()));
  log.debug("iat:", iatDate);
  expect(iatDate).toBeValidDate();
  expect(iatDate <= new Date(Date.now())).toBeTrue();

  // Assert expire at
  expect(decryptedJwt.exp).toBeNumber();
  const expDate = new Date(decryptedJwt.exp * 1000);
  log.debug("exp:", expDate);
  expect(expDate).toBeValidDate();
  expect(expDate >= new Date(Date.now())).toBeTrue();
});
