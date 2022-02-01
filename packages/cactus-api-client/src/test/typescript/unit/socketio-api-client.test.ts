/** Base Class: packages/cactus-api-client/src/main/typescript/socketio-api-client.ts
 * Note:
 *    Don't use jest timer mocks here, they do not work well with node http module.
 *    With timer mocks tests will either hang or report open timeout handle.
 * Tests:
 *  - verifyValidatorJwt(),
 *  - SocketIOApiClient construction,
 *  - SocketIOApiClient.sendAsyncRequest(),
 *  - SocketIOApiClient.sendSyncRequest(),
 *  - SocketIOApiClient.watchBlocksV1(),
 */

const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const testTimeout = 1000 * 5; // 5 second timeout per test
const setupTimeout = 1000 * 60; // 1 minute timeout for setup

import "jest-extended";
import { cloneDeep } from "lodash";
import { sign, JwtPayload } from "jsonwebtoken";

// Unit Test logger setup
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
const log: Logger = LoggerProvider.getOrCreate({
  label: "socketio-api-client.test",
  level: testLogLevel,
});

// Default SocketIOApiClient config input
const defaultConfigOptions = {
  validatorID: "123validatorId321",
  validatorURL: "https://example:1234",
  validatorKeyPath: "./nonexistent/path/somekey.crt",
  logLevel: sutLogLevel,
  maxCounterRequestID: 3,
  syncFunctionTimeoutMillisecond: 50,
  socketOptions: {
    rejectUnauthorized: false,
    reconnection: false,
    timeout: 55555,
  },
};

// Generate private / public keys for test purposes
import { generateKeyPairSync } from "crypto";
const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
});

import { SocketIOTestSetupHelpers } from "@hyperledger/cactus-test-tooling";

// Mock public key reading
import fs from "fs";
jest
  .spyOn(fs, "readFile")
  .mockImplementation((_: unknown, callback: any) =>
    callback(
      null,
      Buffer.from(publicKey.export({ type: "spki", format: "pem" })),
    ),
  );

import {
  SocketIOApiClient,
  verifyValidatorJwt,
  SocketLedgerEvent,
} from "../../../main/typescript/socketio-api-client";

//////////////////////////////////
// Test Timeout
//////////////////////////////////

jest.setTimeout(testTimeout);

//////////////////////////////////
// verifyValidatorJwt()
//////////////////////////////////

describe("verifyValidatorJwt tests", () => {
  const mockKeyPath = "someKeyPath.pem";
  const message = {
    message: "Hello",
    from: "Someone",
  };
  let signedMessage = "";

  beforeAll(() => {
    log.debug("input message:", message);

    // Encrypt the message (from validator)
    signedMessage = sign(
      message,
      privateKey.export({ type: "sec1", format: "pem" }),
      {
        algorithm: "ES256",
        expiresIn: "1 day",
      },
    );
    expect(signedMessage).toBeTruthy();
    log.debug("signedMessage:", signedMessage);
  }, setupTimeout);

  test("Decrypts the payload from the validator using it's public key", async () => {
    // Verify (decrypt)
    const decryptedMessage = await verifyValidatorJwt(
      mockKeyPath,
      signedMessage,
    );

    // Assert decrypted message
    log.debug("decryptedMessage:", decryptedMessage);
    expect(decryptedMessage).toMatchObject(message);
    const decryptedJwt = decryptedMessage as JwtPayload;
    expect(decryptedJwt.iat).toBeNumber();
    expect(decryptedJwt.exp).toBeNumber();

    // Assert reading correct public key
    expect(((fs.readFile as unknown) as jest.Mock).mock.calls.length).toBe(1);
    expect(((fs.readFile as unknown) as jest.Mock).mock.calls[0][0]).toContain(
      mockKeyPath,
    );
  });

  test("Rejects malicious message", () => {
    // Reverse original message to produce wrong input
    const maliciousMessage = signedMessage.split("").reverse().join("");
    log.debug("maliciousMessage", maliciousMessage);

    // Verify (decrypt)
    return expect(verifyValidatorJwt(mockKeyPath, maliciousMessage)).toReject();
  });

  test("Rejects expired message", (done) => {
    // Encrypt the message (from validator) with short expiration time
    signedMessage = sign(
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
      await expect(verifyValidatorJwt(mockKeyPath, signedMessage)).toReject();
      done();
    }, 100);
  });
});

//////////////////////////////////
// SocketIOApiClient Constructor
//////////////////////////////////

describe("Construction Tests", () => {
  let sut: SocketIOApiClient;

  beforeAll(async () => {
    sut = new SocketIOApiClient(defaultConfigOptions);
  }, setupTimeout);

  test("Sets options field from constructor argument", () => {
    expect(sut.options).toEqual(defaultConfigOptions);
  });

  test("Sets className field for the class", () => {
    expect(sut.className).toEqual("SocketIOApiClient");
  });

  test("Throws on empty required options fields", () => {
    // Empty validatorID
    let configOptions = cloneDeep(defaultConfigOptions);
    configOptions.validatorID = "";
    expect(() => new SocketIOApiClient(configOptions)).toThrow();

    // Empty validatorURL
    configOptions = cloneDeep(defaultConfigOptions);
    configOptions.validatorURL = "";
    expect(() => new SocketIOApiClient(configOptions)).toThrow();

    // Empty validatorKeyPath
    configOptions = cloneDeep(defaultConfigOptions);
    configOptions.validatorKeyPath = "";
    expect(() => new SocketIOApiClient(configOptions)).toThrow();
  });
});

//////////////////////////////////
// SocketIOApiClient Logic
//////////////////////////////////

describe("SocketIOApiClient Tests", function () {
  const reqContract = {};
  const reqMethod = { type: "web3Eth", command: "getBalance" };
  const reqArgs = ["06fc56347d91c6ad2dae0c3ba38eb12ab0d72e97"];

  let testServer: SocketIOTestSetupHelpers.Server;
  let testServerPort: string;
  let clientSocket: SocketIOTestSetupHelpers.ClientSocket;
  let serverSocket: SocketIOTestSetupHelpers.ServerSocket;
  let sut: SocketIOApiClient;

  beforeAll(async () => {
    [
      testServer,
      testServerPort,
    ] = await SocketIOTestSetupHelpers.createListeningMockServer();
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
    sut = new SocketIOApiClient(defaultConfigOptions);
    (sut as any)["socket"] = clientSocket;
  }, setupTimeout);

  afterEach(() => {
    if (clientSocket) {
      clientSocket.close();
    }

    if (serverSocket) {
      serverSocket.disconnect(true);
    }

    testServer.sockets.removeAllListeners();
  }, setupTimeout);

  //////////////////////////////////
  // sendAsyncRequest()
  //////////////////////////////////

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
      const reqReceived = new Promise<any>((resolve) => {
        serverSocket.on("request2", (req: any) => resolve(req));
      });

      sut.sendAsyncRequest(reqContract, reqMethod, reqArgs);

      return reqReceived.then((req: any) => {
        expect(req.contract).toEqual(reqContract);
        expect(req.method).toEqual(reqMethod);
        expect(req.args).toEqual(reqArgs);
      });
    });
  });

  //////////////////////////////////
  // sendSyncRequest()
  //////////////////////////////////

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
      await expect(reqPromise).resolves.toEqual({ status: 504 }); // timeout
    });

    test("Sends request2 with valid arguments", () => {
      const reqReceived = new Promise<any>((resolve) => {
        serverSocket.on("request2", (req: any) => resolve(req));
      });

      const responseReceived = sut.sendSyncRequest(
        reqContract,
        reqMethod,
        reqArgs,
      );

      return Promise.all([
        expect(responseReceived).resolves.toEqual({ status: 504 }), // timeout
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
      const maxCounterRequestID = defaultConfigOptions.maxCounterRequestID;
      let calledTimes = 0;

      serverSocket.on("request2", (req: any) => {
        expect(seenReqID).not.toContain(req.reqID);
        seenReqID.add(req.reqID);
        calledTimes++;
        if (calledTimes === maxCounterRequestID) {
          expect(seenReqID.size).toEqual(maxCounterRequestID);
          done();
        }
      });

      // Send maxCounterRequestID requests
      for (let i = 0; i < maxCounterRequestID; i++) {
        expect(
          sut.sendSyncRequest(reqContract, reqMethod, reqArgs),
        ).resolves.toEqual({ status: 504 }); // timeout
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
            defaultConfigOptions.validatorKeyPath,
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
      ).resolves.toEqual({ status: 504 }); // timeout
    });

    test("Process only requests with matching ID", () => {
      serverSocket.on("request2", () => {
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
        .resolves.toEqual({ status: 504 }) // timeout
        .then(() => {
          expect(verifyMock).not.toBeCalled();
        });
    });
  });

  //////////////////////////////////
  // watchBlocksV1()
  //////////////////////////////////

  describe("Monitoring Tests", function () {
    const options = { opt: "yes" };
    const monitorError = {
      code: 404,
      message: "Mock Validator Monitor Error",
    };

    test("Sends stopMonitor and report error on monitor error", (done) => {
      expect.assertions(1);

      // Connect client and server sockets
      testServer.on("connection", (socket) => {
        log.debug("Server socket connected", socket.id);
        serverSocket = socket;

        serverSocket.on("stopMonitor", () => {
          log.info("stopMonitor received - OK");
          done();
        });

        serverSocket.emit("monitor_error", monitorError);
      });

      sut.watchBlocksV1().subscribe({
        next() {
          done(new Error("Shouldn't trigger new block message"));
        },
        error(err) {
          log.info("Monitor_error received on the Verifier side.");
          expect(err).toEqual(monitorError); // race-condition? Will it always happen before emit?
        },
      });
    });

    test("Sends stopMonitor on unsubscribe", (done) => {
      // Connect client and server sockets
      testServer.on("connection", (socket) => {
        log.debug("Server socket connected", socket.id);
        serverSocket = socket;

        serverSocket.on("stopMonitor", () => {
          log.info("stopMonitor received - OK");
          done();
        });
      });

      const observer = sut.watchBlocksV1().subscribe({
        next() {
          done(new Error("Shouldn't trigger new block message"));
        },
        error() {
          done(new Error("Shouldn't report any errors"));
        },
      });

      observer.unsubscribe();
    });

    test("Sends startMonitor to the validator", (done) => {
      expect.assertions(1);

      // Connect client and server sockets
      testServer.on("connection", (socket) => {
        log.debug("Server socket connected", socket.id);
        serverSocket = socket;

        serverSocket.on("startMonitor", (inOpts: typeof options) => {
          // Assert options passed
          expect(inOpts).toEqual(options);

          // Force premature exit
          serverSocket.emit("monitor_error", monitorError);
        });
      });

      sut.watchBlocksV1(options).subscribe({
        next() {
          done(new Error("Shouldn't trigger new block message"));
        },
        error(err) {
          log.info("watchBlocksV1 returned error:", err);
          done();
        },
      });
    });

    test("Pushes new blocks from the validator", (done) => {
      const decryptedBlockData = "fooDecrypted321";
      const eventStatus = 200;

      // Server side logic for sending events
      testServer.on("connection", (socket) => {
        log.debug("Server socket connected", socket.id);
        serverSocket = socket;

        serverSocket.once("startMonitor", () => {
          serverSocket.emit("eventReceived", {
            status: eventStatus,
            blockData: "fooSignedBlockData123xxx",
          });
        });
      });

      // Setup checkValidator results (success)
      const checkValidatorMock = jest.fn();
      checkValidatorMock.mockResolvedValue({
        blockData: decryptedBlockData,
      });
      sut.checkValidator = checkValidatorMock;

      // Receive events from the validator
      sut.watchBlocksV1(options).subscribe({
        next(ev: SocketLedgerEvent) {
          expect(ev.id).toEqual("");
          expect(ev.verifierId).toEqual(defaultConfigOptions.validatorID);

          if (!ev.data) {
            done("Event data is empty or null!");
          } else {
            expect((ev.data as { [key: string]: number })["status"]).toEqual(
              eventStatus,
            );
            expect((ev.data as { [key: string]: string })["blockData"]).toEqual(
              decryptedBlockData,
            );

            done();
          }
        },
        error(err) {
          done(err);
        },
      });
    });

    test("Doesn't push new blocks from not verified validator", (done) => {
      // Server side logic for sending events
      testServer.on("connection", (socket) => {
        log.debug("Server socket connected", socket.id);
        serverSocket = socket;

        serverSocket.on("startMonitor", () => {
          serverSocket.emit("eventReceived", {
            status: 200,
            blockData: "fooSignedBlockData123xxx",
          });

          // Force finish the test after a while
          setTimeout(
            () => serverSocket.emit("monitor_error", monitorError),
            150,
          );
        });
      });

      // Setup checkValidator results (failure)
      const checkValidatorMock = jest.fn();
      checkValidatorMock.mockRejectedValue("Mock verify error");
      sut.checkValidator = checkValidatorMock;

      // Receive events from the validator
      sut.watchBlocksV1(options).subscribe({
        next(ev: SocketLedgerEvent) {
          done("New block was pushed but it shouldn't, event:", ev);
        },
        error(err) {
          expect(err).toEqual(monitorError);
          done();
        },
      });
    });

    test("Replies last message in multiple subscribers", async () => {
      const decryptedBlockData = "fooDecrypted321";
      const eventStatus = 200;

      // Server side logic for sending events
      testServer.on("connection", (socket) => {
        log.debug("Server socket connected", socket.id);
        serverSocket = socket;

        serverSocket.once("startMonitor", () => {
          serverSocket.emit("eventReceived", {
            status: eventStatus,
            blockData: "fooSignedBlockData123xxx",
          });
        });
      });

      // Setup checkValidator results (success)
      const checkValidatorMock = jest.fn();
      checkValidatorMock.mockResolvedValue({
        blockData: decryptedBlockData,
      });
      sut.checkValidator = checkValidatorMock;

      const blockObservable = sut.watchBlocksV1(options);

      // Receive event on first observer
      const firstResults = await new Promise<SocketLedgerEvent>(
        (resolve, reject) => {
          blockObservable.subscribe({
            next(ev: SocketLedgerEvent) {
              if (!ev.data) {
                reject("First event data is empty or null!"); // todo - test negative
              } else {
                log.info("First observer received event:", ev);
                resolve(ev);
              }
            },
            error(err) {
              reject(err);
            },
          });
        },
      );

      // Receive the same event on second observer
      const secondResults = await new Promise<SocketLedgerEvent>(
        (resolve, reject) => {
          blockObservable.subscribe({
            next(ev: SocketLedgerEvent) {
              if (!ev.data) {
                reject("Second event data is empty or null!");
              } else {
                log.info("Second observer received event:", ev);
                resolve(ev);
              }
            },
            error(err) {
              reject(err);
            },
          });
        },
      );

      expect(secondResults).toEqual(firstResults);
    });

    test("Repeat watchBlocksV1 after previous monitor observable finished", async () => {
      // Server side logic for sending events
      testServer.on("connection", (socket) => {
        log.debug("Server socket connected", socket.id);
        serverSocket = socket;

        serverSocket.on("startMonitor", () => {
          serverSocket.emit("eventReceived", {
            status: 200,
            blockData: "fooSignedBlockData123xxx",
          });
        });
      });

      // Setup checkValidator results (success)
      const checkValidatorMock = jest.fn();
      checkValidatorMock.mockResolvedValue({
        blockData: "fooDecrypted321",
      });
      sut.checkValidator = checkValidatorMock;

      const firstResults = await new Promise<SocketLedgerEvent>(
        (resolve, reject) => {
          const sub = sut.watchBlocksV1(options).subscribe({
            next(ev: SocketLedgerEvent) {
              if (!ev.data) {
                sub.unsubscribe();
                reject("First event data is empty or null!"); // todo - test negative
              } else {
                log.info("First observer received event:", ev);
                sub.unsubscribe();
                resolve(ev);
              }
            },
            error(err) {
              sub.unsubscribe();
              reject(err);
            },
          });
        },
      );

      const secondResults = await new Promise<SocketLedgerEvent>(
        (resolve, reject) => {
          const sub = sut.watchBlocksV1(options).subscribe({
            next(ev: SocketLedgerEvent) {
              if (!ev.data) {
                sub.unsubscribe();
                reject("2nd event data is empty or null!"); // todo - test negative
              } else {
                log.info("2nd observer received event:", ev);
                sub.unsubscribe();
                resolve(ev);
              }
            },
            error(err) {
              sub.unsubscribe();
              reject(err);
            },
          });
        },
      );

      expect(secondResults).toEqual(firstResults);
    });
  });
});
