/* verifier/VerifierAuthentication.ts Unit Tests
 * Execute:
 *    cd cactus/packages/cactus-cmd-socketio-server && npm install && npx jest
 */

//////////////////////////
// TEST CONSTANTS
/////////////////////////

import "jest-extended";
import jwt from "jsonwebtoken";

// Mock config
jest.mock("../../../main/typescript/routing-interface/util/ConfigUtil");

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

// Mock public key reading
import { readFileSync } from "fs";
jest.mock("fs");
(readFileSync as jest.Mock).mockReturnValue(
  publicKey.export({ type: "spki", format: "pem" }),
);

import { VerifierAuthentication } from "../../../main/typescript/verifier/VerifierAuthentication";

//////////////////////////
// UNIT TESTS
/////////////////////////

describe("Verifier verify message tests", () => {
  const mockKeyPath = "someKeyPath.pem";
  const message = {
    message: "Hello",
    from: "Someone",
  };
  let signedMessage: string = "";

  beforeAll(() => {
    log.debug("input message:", message);

    // Encrypt the message (from validator)
    signedMessage = jwt.sign(
      message,
      privateKey.export({ type: "sec1", format: "pem" }),
      {
        algorithm: "ES256",
        expiresIn: "1 day",
      },
    );
    expect(signedMessage).toBeTruthy();
    log.debug("signedMessage:", signedMessage);
  });

  test("Decrypts the payload from the validator using it's public key", async () => {
    // Verify (decrypt)
    const decryptedMessage = await VerifierAuthentication.verify(
      mockKeyPath,
      signedMessage,
    );

    // Assert decrypted message
    log.debug("decryptedMessage:", decryptedMessage);
    expect(decryptedMessage).toMatchObject(message);
    const decryptedJwt = decryptedMessage as jwt.JwtPayload;
    expect(decryptedJwt.iat).toBeNumber();
    expect(decryptedJwt.exp).toBeNumber();

    // Assert reading correct public key
    expect((readFileSync as jest.Mock).mock.calls.length).toBe(1);
    expect((readFileSync as jest.Mock).mock.calls[0][0]).toContain(mockKeyPath);
  });

  test("Rejects malicious message", () => {
    // Reverse original message to produce wrong input
    const maliciousMessage = signedMessage.split("").reverse().join("");
    log.debug("maliciousMessage", maliciousMessage);

    // Verify (decrypt)
    return expect(
      VerifierAuthentication.verify(mockKeyPath, maliciousMessage),
    ).toReject();
  });

  test("Rejects expired message", (done) => {
    // Encrypt the message (from validator) with short expiration time
    signedMessage = jwt.sign(
      message,
      privateKey.export({ type: "sec1", format: "pem" }),
      {
        algorithm: "ES256",
        expiresIn: "1",
      },
    );
    expect(signedMessage).toBeTruthy();

    setTimeout(async () => {
      // Verify after short timeout
      await expect(
        VerifierAuthentication.verify(mockKeyPath, signedMessage),
      ).toReject();
      done();
    }, 100);
  });
});
