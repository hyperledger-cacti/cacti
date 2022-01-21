/* verifier/Verifier.ts Unit Tests
 * Execute:
 *    cd cactus/packages/cactus-cmd-socketio-server && npm install && npx jest
 * Note:
 *    Don't use jest timer mocks here, they do not work well with node http module.
 *    With timer mocks tests will either hang or report open timeout handle.
 */

//////////////////////////
// TEST CONSTANTS
/////////////////////////

const testTimeout = 1000 * 5; // 5 second timeout per test
const setupTimeout = 1000 * 60; // 1 minute timeout for setup

const defaultConfig = {
  socketOptions: {
    rejectUnauthorized: false,
    reconnection: false,
    timeout: 55555,
  },
  logLevel: "silent", // will change level of logs from verifier
  verifier: {
    maxCounterRequestID: 3,
    syncFunctionTimeoutMillisecond: 50, // used by validator functions!
  },
};

const defaultLedgerData = {
  validatorID: "123validatorId321",
  validatorType: "socketio",
  validatorURL: "https://example:1234",
  validatorKeyPath: "./nonexistent/path/somekey.crt",
  ledgerInfo: { ledgerAbstract: "Test ledger" },
  apiInfo: [
    {
      apiType: "getNumericBalance",
      requestedData: [
        {
          dataName: "referedAddress",
          dataType: "string",
        },
      ],
    },
  ],
};

import "jest-extended";
import { cloneDeep } from "lodash";

// Mock default config
import * as ConfigUtil from "../../../main/typescript/routing-interface/util/ConfigUtil";
jest.mock("../../../main/typescript/routing-interface/util/ConfigUtil");
(ConfigUtil as any)["__configMock"] = defaultConfig;

const XMLHttpRequest = require("xmlhttprequest");
jest.mock("xmlhttprequest");

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

import { Verifier } from "../../../main/typescript/verifier/Verifier";

import {
  LedgerEvent,
  VerifierEventListener,
} from "../../../main/typescript/verifier/LedgerPlugin";

import { SocketIOTestSetupHelpers } from "@hyperledger/cactus-test-tooling";

//////////////////////////////
// TEST TIMEOUT
//////////////////////////////

jest.setTimeout(testTimeout);

//////////////////////////////
// CONSTRUCTOR TESTS
//////////////////////////////

describe("Construction Tests", () => {
  let testLedgerData: typeof defaultLedgerData;

  beforeEach(() => {
    testLedgerData = cloneDeep(defaultLedgerData);
  }, setupTimeout);

  afterEach(() => {
    Verifier.mapUrlSocket.clear();
  }, setupTimeout);

  test("Fields set from passed ledger info", () => {
    const sut = new Verifier(JSON.stringify(testLedgerData));
    expect(sut.validatorID).toEqual(testLedgerData.validatorID);
    expect(sut.validatorType).toEqual(testLedgerData.validatorType);
    expect(sut.validatorUrl).toEqual(testLedgerData.validatorURL);
    expect(sut.validatorKeyPath).toEqual(testLedgerData.validatorKeyPath);
    expect(sut.apiInfo).toEqual(testLedgerData.apiInfo);
  });

  test("Fails on wrong ledger data", () => {
    expect(() => new Verifier("")).toThrow(); // Empty
    expect(() => new Verifier('{"key": "val')).toThrow(); // Illformed JSON

    // Missing fields
    // TODO: Bug? validatorID is undefined now
    // let missingFieldInput = cloneDeep(testLedgerData);
    // delete missingFieldInput.validatorID;
    // expect(() => new Verifier(JSON.stringify(missingFieldInput))).toThrow();
  });

  test("Stores new socket for each socketio validator in lookup map", () => {
    expect(Verifier.mapUrlSocket.size).toEqual(0);

    // first validator
    expect(new Verifier(JSON.stringify(testLedgerData))).toBeTruthy();
    expect(Verifier.mapUrlSocket.size).toEqual(1);
    expect(Verifier.mapUrlSocket.has(testLedgerData.validatorID)).toBeTrue();
    expect(Verifier.mapUrlSocket.get(testLedgerData.validatorID)).toBeTruthy();

    //second validator
    testLedgerData.validatorID = "123abc";
    expect(new Verifier(JSON.stringify(testLedgerData))).toBeTruthy();
    expect(Verifier.mapUrlSocket.size).toEqual(2);
    expect(Verifier.mapUrlSocket.has(testLedgerData.validatorID)).toBeTrue();
    expect(Verifier.mapUrlSocket.get(testLedgerData.validatorID)).toBeTruthy();
  });

  test("Reuse socket for same socketio validator", () => {
    expect(Verifier.mapUrlSocket.size).toEqual(0);

    expect(new Verifier(JSON.stringify(testLedgerData))).toBeTruthy();
    expect(new Verifier(JSON.stringify(testLedgerData))).toBeTruthy();

    expect(Verifier.mapUrlSocket.size).toEqual(1);
    expect(Verifier.mapUrlSocket.has(testLedgerData.validatorID)).toBeTrue();
  });

  test("Doesn't store socket for openapi validator", () => {
    expect(Verifier.mapUrlSocket.size).toEqual(0);

    testLedgerData.validatorType = "openapi";
    expect(new Verifier(JSON.stringify(testLedgerData))).toBeTruthy();

    expect(Verifier.mapUrlSocket.size).toEqual(0);
  });
});

//////////////////////////////
// SOCKETIO TESTS
//////////////////////////////

describe("SocketIO Validator Tests", function () {
  const reqContract = {};
  const reqMethod = { type: "web3Eth", command: "getBalance" };
  const reqArgs = ["06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97"];

  let testServer: SocketIOTestSetupHelpers.Server;
  let testServerPort: string;
  let clientSocket: SocketIOTestSetupHelpers.ClientSocket;
  let serverSocket: SocketIOTestSetupHelpers.ServerSocket;
  let sut: Verifier;

  beforeAll(async () => {
    [testServer, testServerPort] =
      await SocketIOTestSetupHelpers.createListeningMockServer();
  }, setupTimeout);

  afterAll((done) => {
    testServer.close(() => {
      log.debug("Test server closed");
      done();
    });
  }, setupTimeout);

  beforeEach(async () => {
    clientSocket = SocketIOTestSetupHelpers.createClientSocket(testServerPort);

    // Mock client socket in verifier
    sut = new Verifier(JSON.stringify(defaultLedgerData));
    Verifier.mapUrlSocket.set(defaultLedgerData.validatorID, clientSocket);
  }, setupTimeout);

  afterEach(() => {
    if (clientSocket) {
      clientSocket.close();
    }

    if (serverSocket) {
      serverSocket.disconnect(true);
    }

    testServer.sockets.removeAllListeners();

    Verifier.mapUrlSocket.clear();
  }, setupTimeout);

  //////////////////////////////
  // SYNC REQUEST
  //////////////////////////////

  describe("Sync Request Tests", function () {
    beforeEach(async () => {
      // Connect client and server sockets
      testServer.on("connection", (socket) => {
        log.debug("Server socket connected", socket.id);
        serverSocket = socket;
      });

      await SocketIOTestSetupHelpers.connectTestClient(clientSocket);
      expect(clientSocket.connected).toBeTrue();
      expect(serverSocket.connected).toBeTrue();
    }, setupTimeout);

    test("Returns 504 on request timeout", async () => {
      const reqPromise = sut.sendSyncRequest(reqContract, reqMethod, reqArgs);
      await expect(reqPromise).resolves.toEqual({ status: 504, amount: 0 }); // timeout
    });

    test("Sends request2 with valid arguments", () => {
      let reqReceived = new Promise<any>((resolve) => {
        serverSocket.on("request2", (req: any) => resolve(req));
      });

      const responseReceived = sut.sendSyncRequest(
        reqContract,
        reqMethod,
        reqArgs,
      );

      return Promise.all([
        expect(responseReceived).resolves.toEqual({ status: 504, amount: 0 }), // timeout
        reqReceived.then((req: any) => {
          expect(req.contract).toEqual(reqContract);
          expect(req.method).toEqual(reqMethod);
          expect(req.args).toEqual(reqArgs);
          expect(req.reqID).toBeString();
          expect(req.reqID.length).toBeGreaterThan(0);
        }),
      ]);
    });

    test("Sends unique request id until maxCounterRequestID", (done) => {
      const seenReqID = new Set<string>();
      let calledTimes = 0;

      serverSocket.on("request2", (req: any) => {
        expect(seenReqID).not.toContain(req.reqID);
        seenReqID.add(req.reqID);
        calledTimes++;
        if (calledTimes === defaultConfig.verifier.maxCounterRequestID) {
          expect(seenReqID.size).toEqual(
            defaultConfig.verifier.maxCounterRequestID,
          );
          done();
        }
      });

      // Send maxCounterRequestID requests
      for (let i = 0; i < defaultConfig.verifier.maxCounterRequestID; i++) {
        expect(
          sut.sendSyncRequest(reqContract, reqMethod, reqArgs),
        ).resolves.toEqual({ status: 504, amount: 0 }); // timeout
      }
    });

    test("Returns decoded response from the validator", () => {
      const encryptedData = "abcXXX123";
      const decryptedData = "1234";
      const responseStatus = 200;

      serverSocket.on("request2", (req: any) => {
        serverSocket.emit("response", {
          id: req.reqID,
          resObj: {
            data: encryptedData,
            status: responseStatus,
          },
        });
      });

      const verifyMock = jest.fn();
      verifyMock.mockResolvedValue({
        result: decryptedData,
        iat: 3333333333,
        exp: 7777777777,
      });
      sut.checkValidator = verifyMock;

      return expect(sut.sendSyncRequest(reqContract, reqMethod, reqArgs))
        .resolves.toEqual({ status: responseStatus, data: decryptedData })
        .then(() => {
          expect(verifyMock).toHaveBeenCalledTimes(1);
          expect(verifyMock).toBeCalledWith(
            defaultLedgerData.validatorKeyPath,
            encryptedData,
          );
        });
    });

    test("Doesn't process message from not verified validator", () => {
      serverSocket.on("request2", (req: any) => {
        serverSocket.emit("response", {
          id: req.reqID,
          resObj: {
            data: "abcXXX123",
            status: 200,
          },
        });
      });

      const verifyMock = jest.fn();
      verifyMock.mockRejectedValue({ message: "mock verify error" });
      sut.checkValidator = verifyMock;

      return expect(
        sut.sendSyncRequest(reqContract, reqMethod, reqArgs),
      ).resolves.toEqual({ status: 504, amount: 0 }); // timeout
    });

    test("Process only requests with matching ID", () => {
      serverSocket.on("request2", (req: any) => {
        serverSocket.emit("response", {
          id: "not_existing_id",
          resObj: {
            data: "abcXXX123",
            status: 200,
          },
        });
      });

      const verifyMock = jest.fn();
      sut.checkValidator = verifyMock;

      return expect(sut.sendSyncRequest(reqContract, reqMethod, reqArgs))
        .resolves.toEqual({ status: 504, amount: 0 }) // timeout
        .then(() => {
          expect(verifyMock).not.toBeCalled();
        });
    });
  });

  //////////////////////////////
  // MONITORING
  //////////////////////////////

  describe("Monitoring Tests", function () {
    const appId = "TestTrade";
    const options = { opt: "yes" };
    const onEventMock = jest.fn();
    const listenerMock: VerifierEventListener = {
      onEvent: onEventMock,
    };

    test("Triggers monitoring on validator", () => {
      // Connect client and server sockets
      expect.assertions(4);
      testServer.on("connection", (socket) => {
        log.debug("Server socket connected", socket.id);
        serverSocket = socket;

        serverSocket.on("startMonitor", (inOpts: typeof options) => {
          // Assert options passed
          expect(inOpts).toEqual(options);

          // Assert listener was saved
          expect(Object.keys(sut.eventListenerHash).length).toEqual(1);
          expect(sut.eventListenerHash[appId]).toBe(listenerMock);

          // Connection error for monitor exit
          serverSocket.emit("monitor_error", {
            code: 123,
            message: "Force exit error",
          });
        });
      });

      return expect(sut.startMonitor(appId, options, listenerMock)).toReject();
    });

    test("Triggers listener callbacks when received a message from a validator", (done) => {
      const decryptedBlockData = "fooDecrypted321";
      const eventStatus = 200;

      // 4 asserts * 2 listeners * 2 monitors
      expect.assertions(4 * 2 * 2);

      // Setup listener mock
      let onEventCalledTimes = 0;
      const onEventMock = (ev: LedgerEvent) => {
        onEventCalledTimes++;
        expect(ev.id).toEqual("");
        expect(ev.verifierId).toEqual(defaultLedgerData.validatorID);

        if (!ev.data) {
          done("Event data is empty or null!");
        } else {
          expect((ev.data as { [key: string]: number })["status"]).toEqual(
            eventStatus,
          );
          expect((ev.data as { [key: string]: string })["blockData"]).toEqual(
            decryptedBlockData,
          );
        }

        if (onEventCalledTimes === 2) {
          done();
        }
      };

      // Two listeners
      const listenerMockFirst: VerifierEventListener = { onEvent: onEventMock };
      const listenerMockSecond: VerifierEventListener = {
        onEvent: onEventMock,
      };

      // Server side logic for sending events
      testServer.on("connection", (socket) => {
        log.debug("Server socket connected", socket.id);
        serverSocket = socket;

        serverSocket.once("startMonitor", () => {
          serverSocket.emit("eventReceived", {
            // TODO - BUG?? why the monitor_error not handled by verifier?
            status: eventStatus,
            blockData: "fooSignedBlockData123xxx",
          });
        });
      });

      // Setup validator (success result)
      const verifyMock = jest.fn();
      verifyMock.mockResolvedValue({
        blockData: decryptedBlockData,
      });
      sut.checkValidator = verifyMock;

      // Should call onEvent for each listener
      sut
        .startMonitor("Trade1", options, listenerMockFirst)
        .catch((err) => done(err));
      sut
        .startMonitor("Trade2", options, listenerMockSecond)
        .catch((err) => done(err));
    });

    test("Doesn't call listener callback when response not validated correctly", () => {
      testServer.on("connection", (socket) => {
        log.debug("Server socket connected", socket.id);
        serverSocket = socket;

        serverSocket.on("startMonitor", () => {
          serverSocket.emit("eventReceived", {
            status: 200,
            blockData: "fooSignedBlockData123xxx",
          });

          setTimeout(
            () =>
              serverSocket.emit("monitor_error", {
                message: "Force close",
              }),
            150,
          );
        });
      });

      // Setup validator (failing result)
      const verifyMock = jest.fn();
      verifyMock.mockRejectedValue("Mock verify error");
      sut.checkValidator = verifyMock;

      expect.assertions(1);
      return sut.startMonitor(appId, options, listenerMock).catch(() => {
        expect(onEventMock).not.toBeCalled();
      });
    });

    test("Stopping monitoring removes listener and sends stopMonitor event if no listener left", (done) => {
      testServer.on("connection", (socket) => {
        log.debug("Server socket connected", socket.id);
        serverSocket = socket;

        serverSocket.on("stopMonitor", () => {
          log.debug("stopMonitor received");
          done();
        });
      });

      expect.assertions(4);

      // Start 3 monitors for separate appIDs
      sut
        .startMonitor("Trade1", options, listenerMock)
        .catch((err) => done(err));
      sut
        .startMonitor("Trade2", options, listenerMock)
        .catch((err) => done(err));
      sut
        .startMonitor("Trade3", options, listenerMock)
        .catch((err) => done(err));
      expect(Object.keys(sut.eventListenerHash).length).toEqual(3);

      // Stop one monitor
      sut.stopMonitor("Trade1");
      expect(Object.keys(sut.eventListenerHash).length).toEqual(2);
      expect(sut.eventListenerHash).not.toContain("Trade1");

      // Stop all - should emit stopMonitor event
      sut.stopMonitor();
      expect(Object.keys(sut.eventListenerHash).length).toEqual(0);

      // TODO - shouldn't stopMonitor() cancel promise created by assiciated startMonitor()?
    });
  });

  //////////////////////////////
  // ASYNC REQUEST
  //////////////////////////////

  describe("Send SocketIO Async Request Tests", function () {
    beforeEach(async () => {
      // Connect client and server sockets
      testServer.on("connection", (socket) => {
        log.debug("Server socket connected", socket.id);
        serverSocket = socket;
      });

      await SocketIOTestSetupHelpers.connectTestClient(clientSocket);
      expect(clientSocket.connected).toBeTrue();
      expect(serverSocket.connected).toBeTrue();
    }, setupTimeout);

    test("Sends request2 with valid args for socketio verifier", () => {
      let reqReceived = new Promise<any>((resolve) => {
        serverSocket.on("request2", (req: any) => resolve(req));
      });

      const responseReceived = sut.sendAsyncRequest(
        reqContract,
        reqMethod,
        reqArgs,
      );

      return Promise.all([
        expect(responseReceived).toResolve(),
        reqReceived.then((req: any) => {
          expect(req.contract).toEqual(reqContract);
          expect(req.method).toEqual(reqMethod);
          expect(req.args).toEqual(reqArgs);
        }),
      ]);
    });
  });
});

//////////////////////////////
// OPEN API ASYNC REQ TESTS
//////////////////////////////

test("makeOpenApiEvent creates valid ledger event", () => {
  const response = { data: "Some mock response" };
  const validatorId = "TestVal";

  const event = Verifier.makeOpenApiEvent(response, validatorId);

  expect(event.id).toEqual("");
  expect(event.verifierId).toEqual(validatorId);
  expect(
    (event.data as { [key: string]: string })["txId"].length,
  ).toBeGreaterThan(0);
  expect(
    (event.data as { [key: string]: Array<object> })["blockData"].length,
  ).toEqual(1);
  expect(
    (event.data as { [key: string]: Array<object> })["blockData"][0],
  ).toEqual(response);
});

describe("OpenAPI Async Request Tests", function () {
  const reqContract = {};
  const reqMethod = { type: "web3Eth", command: "sendRawTransaction" };
  const reqArgs = { args: [{ arg1: "val1" }, { arg2: "val2" }] };
  const responseObject = {
    someKey: "someVal",
  };
  const XMLReqMock = {
    open: jest.fn(),
    send: jest.fn(),
    setRequestHeader: jest.fn(),
    responseText: JSON.stringify(responseObject),
    onload: () =>
      log.warn("Placeholder onload was not replaced in the test code"),
  };
  let sut: Verifier;

  beforeAll(async () => {
    (XMLHttpRequest.XMLHttpRequest as jest.Mock).mockImplementation(
      () => XMLReqMock,
    );
  }, setupTimeout);

  beforeEach(async () => {
    sut = new Verifier(JSON.stringify(defaultLedgerData));
    sut.validatorType = "openapi";
  }, setupTimeout);

  test("Sends valid HTTP request for openapi verifier", async () => {
    sut.validatorUrl = "https://example:1234/"; // TODO - bug - fails when URL without trailing backslash
    const expectedUrl = "https://example:1234/sendRawTransaction";

    await expect(
      sut.sendAsyncRequest(reqContract, reqMethod, reqArgs),
    ).toResolve();

    expect(XMLReqMock.open).toBeCalledWith("POST", expectedUrl);
    expect(XMLReqMock.setRequestHeader).toBeCalledWith(
      "Content-Type",
      "application/json",
    );
    expect(XMLReqMock.send).toBeCalledWith(JSON.stringify(reqArgs.args));
  });

  test("Sends event from ledger to listeners for openapi verifier", async () => {
    const onEventMock = jest.fn();
    const listenerMock: VerifierEventListener = {
      onEvent: onEventMock,
    };
    sut.eventListenerHash["TestApp"] = listenerMock;

    await expect(
      sut.sendAsyncRequest(reqContract, reqMethod, reqArgs),
    ).toResolve();

    XMLReqMock.onload();
    expect(onEventMock).toHaveBeenCalledWith({
      id: "",
      verifierId: "123validatorId321",
      data: {
        txId: "openapi-txid-00001", // hardcoded in implementation
        blockData: [{ someKey: "someVal" }],
      },
    });
  });

  test("Returns an error for unknown validator type", () => {
    sut.validatorType = "unknown_type";

    return expect(
      sut.sendAsyncRequest(reqContract, reqMethod, reqArgs),
    ).rejects.toMatchObject({
      resObj: {
        status: 504,
      },
    });
  });
});
