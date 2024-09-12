/* verifier/ValidatorAuthentication.ts Unit Tests
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

const logLevel: LogLevelDesc = "info";
const log: Logger = LoggerProvider.getOrCreate({
  label: "test-cmd-socketio-verifier",
  level: logLevel,
});

// Generate private / public keys for test purposes
import { generateKeyPairSync } from "crypto";
const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
});

const mockConfig = {
  sslParam: {
    port: 0,
    keyValue: privateKey.export({ type: "sec1", format: "pem" }),
    certValue: publicKey,
    jwtAlgo: "ES256",
  },
  logLevel: logLevel,
};

jest.mock("config");
import config from "config";
(config.has as jest.Mock).mockImplementation(() => true);
(config.get as jest.Mock).mockImplementation((keyPath: string) => {
  let entry = mockConfig as any;
  keyPath.split(".").forEach((key: string) => (entry = entry[key]));
  return entry;
});

import { signMessageJwt } from "../../../main/typescript/verifier/validator-authentication";

//////////////////////////
// UNIT TESTS
/////////////////////////

test("Static method sign encrypts payload using private key", () => {
  const message = {
    message: "Hello",
    from: "Someone",
  };

  // Call sign
  const signedMessage = signMessageJwt(message);

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
