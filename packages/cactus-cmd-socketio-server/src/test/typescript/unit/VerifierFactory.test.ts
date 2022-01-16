/* verifier/VerifierAuthentication.ts Unit Tests
 * Execute:
 *    cd cactus/packages/cactus-cmd-socketio-server && npm install && npx jest
 */

//////////////////////////
// TEST CONSTANTS
/////////////////////////

import "jest-extended";

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

// Mock ledger data
jest.mock("fs");
import { LPInfoHolder } from "../../../main/typescript/routing-interface/util/LPInfoHolder";
jest.mock("../../../main/typescript/routing-interface/util/LPInfoHolder");
const mockLedgerData = "{mockLedgerData}"
const mockGetLegerPluginInfo = jest.fn().mockReturnValue(mockLedgerData);
(LPInfoHolder as jest.Mock).mockImplementation(() => {
  return {
    getLegerPluginInfo: mockGetLegerPluginInfo
  };
});

// Mock Verifier
import { Verifier } from "../../../main/typescript/verifier/Verifier";
jest.mock("../../../main/typescript/verifier/Verifier");

import { VerifierFactory } from "../../../main/typescript/verifier/VerifierFactory";
import { VerifierEventListener } from "../../../main/typescript/verifier/LedgerPlugin";

//////////////////////////
// UNIT TESTS
/////////////////////////

describe("VerifierFactory getVerifier tests", () => {
  const listenerMock: VerifierEventListener = {
    onEvent: () => log.warn("listenerMock::onEvent() called!"),
  };
  const mockInfoHolder = new LPInfoHolder();
  let sut: VerifierFactory;

  beforeEach(() => {
    sut = new VerifierFactory(listenerMock, mockInfoHolder);
    expect(Object.keys(VerifierFactory.verifierHash).length).toBe(0);
  });

  afterEach(() => {
    VerifierFactory.verifierHash = {};
  });

  test("Adds newly seen verifier to internal hash", () => {
    const verifierId = "someVerifierId";

    const newVerifier = sut.getVerifier(verifierId);

    expect(mockGetLegerPluginInfo).toBeCalledWith(verifierId);
    expect(Verifier).toBeCalledWith(mockLedgerData);
    expect(Object.keys(VerifierFactory.verifierHash).length).toBe(1);
    expect(VerifierFactory.verifierHash[verifierId]).toBe(newVerifier);
  });

  test("Starts monitoring when requested on newly added verifier", () => {
    const verifierId = "someVerifierId";
    const appId = "myAppId";
    const monitorOptions = {name: "debug", debug: true};

    const newVerifier = sut.getVerifier(verifierId, appId, monitorOptions, true);

    expect(Object.keys(VerifierFactory.verifierHash).length).toBe(1);
    expect(newVerifier.startMonitor).toBeCalledWith(appId, monitorOptions, listenerMock);
  });

  test("Reuses already seen verifier from the hash", () => {
    // Add first verifier
    const verifierId = "someVerifierId";
    const newVerifier = sut.getVerifier(verifierId);
    expect(Object.keys(VerifierFactory.verifierHash).length).toBe(1);

    // Add another verifier
    const anotherVerifierId = "anotherVerifierId";
    const anotherVerifier = sut.getVerifier(anotherVerifierId);
    expect(Object.keys(VerifierFactory.verifierHash).length).toBe(2);
    expect(anotherVerifier).not.toBe(newVerifier);

    // Add first verifier again
    const newVerifierAgain = sut.getVerifier(verifierId);
    expect(Object.keys(VerifierFactory.verifierHash).length).toBe(2);
    expect(newVerifierAgain).toBe(newVerifier);
  });
});