/* Base Class: packages/cactus-api-client/src/main/typescript/verifier.ts
 */

const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const testTimeout = 1000 * 5; // 5 second timeout per test
const setupTimeout = 1000 * 60; // 1 minute timeout for setup

import "jest-extended";
import { Observable } from "rxjs";

import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
const log: Logger = LoggerProvider.getOrCreate({
  label: "verifier.test",
  level: testLogLevel,
});

import { ISocketApiClient } from "@hyperledger/cactus-core-api";
import {
  Verifier,
  VerifierEventListener,
} from "../../../main/typescript/verifier";

//////////////////////////////////
// Test Timeout
//////////////////////////////////

jest.setTimeout(testTimeout);

//////////////////////////////////
// Mocks
//////////////////////////////////

class MockApiClient<T> implements ISocketApiClient<T> {
  // isWatchBlocksRunning = jest
  //   .fn()
  //   .mockName("isWatchBlocksRunning")
  //   .mockReturnValueOnce(true)
  //   .mockReturnValue(false);
  sendAsyncRequest = jest.fn().mockName("sendAsyncRequest");
  sendSyncRequest = jest.fn().mockName("sendSyncRequest");
  watchBlocksV1 = jest.fn().mockName("watchBlocksV1");
}

class MockEventListener<T> implements VerifierEventListener<T> {
  onEvent = jest.fn().mockName("onEvent");
  onError = jest.fn().mockName("onError");
}

//////////////////////////////
// Monitoring Tests
//////////////////////////////

describe("Monitoring Tests", () => {
  // Assume block data format is string
  let apiClientMock: MockApiClient<string>;
  let sut: Verifier<MockApiClient<string>>;
  let eventListenerMock: MockEventListener<string>;

  beforeEach(() => {
    apiClientMock = new MockApiClient();
    apiClientMock.watchBlocksV1.mockReturnValue(
      new Observable(() => log.debug("Mock subscribe called")),
    );
    sut = new Verifier(apiClientMock, sutLogLevel);
    eventListenerMock = new MockEventListener();
  }, setupTimeout);

  test("Entry is added to runningMonitors for new monitoring requests", () => {
    const monitorOptions = { test: true };
    expect(sut.runningMonitors.size).toEqual(0);
    sut.startMonitor("someId", eventListenerMock, monitorOptions);
    expect(sut.runningMonitors.size).toEqual(1);
    expect(apiClientMock.watchBlocksV1).toBeCalledWith(monitorOptions);
  });

  // test("ApiClient is called without monitorOptions if monitor was already started", () => {
  //   const monitorOptions = { test: true };
  //   sut.startMonitor("someId", eventListenerMock, monitorOptions);
  //   sut.startMonitor("anotherId", eventListenerMock, monitorOptions);
  //   expect(apiClientMock.watchBlocksV1).lastCalledWith(undefined);
  // });

  test("Running multiple monitors with same ID throws an Error", () => {
    sut.startMonitor("someId", eventListenerMock);
    expect(() => sut.startMonitor("someId", eventListenerMock)).toThrow();
  });

  test("In case of ApiClient exception runningMonitors is not updated", () => {
    apiClientMock = new MockApiClient();
    apiClientMock.watchBlocksV1.mockImplementation(() => {
      throw Error("Some mock error in watchBlocks");
    });
    sut = new Verifier(apiClientMock, sutLogLevel);

    expect(sut.runningMonitors.size).toEqual(0);
    sut.startMonitor("someId", eventListenerMock);
    expect(sut.runningMonitors.size).toEqual(0);
  });

  test("stopMonitor throws error when called with unknown monitor id", () => {
    expect(() => sut.stopMonitor("someId")).toThrow();
  });

  test("onEvent callback is called when new block was received", (done) => {
    // Our mock block data is just a string
    const mockBlockData = "MockBlockData";
    apiClientMock = new MockApiClient();
    apiClientMock.watchBlocksV1.mockReturnValueOnce(
      new Observable((subscriber) => {
        log.debug("Observable has started...");
        subscriber.next(mockBlockData);
      }),
    );
    sut = new Verifier(apiClientMock, sutLogLevel);

    eventListenerMock = new MockEventListener();
    eventListenerMock.onEvent.mockImplementation((blockData: string) => {
      log.debug("onEvent() called with blockData:", blockData);
      expect(blockData).toEqual(mockBlockData);
      done();
    });

    sut.startMonitor("someId", eventListenerMock);
  });

  test("onError callback is called in when monitoring failed", (done) => {
    const mockError = Error("Something terrible");
    apiClientMock = new MockApiClient();
    apiClientMock.watchBlocksV1.mockReturnValueOnce(
      new Observable((subscriber) => {
        log.debug("Observable has started...");
        subscriber.error(mockError);
      }),
    );
    sut = new Verifier(apiClientMock, sutLogLevel);

    eventListenerMock = new MockEventListener();
    eventListenerMock.onError.mockImplementation((err: any) => {
      log.debug("onError() called with error:", err);
      expect(err).toEqual(mockError);
      done();
    });

    sut.startMonitor("someId", eventListenerMock);
  });

  test("stopMonitor unsubscribes and deletes entry from runningMonitors", () => {
    const thisAppId = "someId";

    // Start monitor
    expect(sut.runningMonitors.size).toEqual(0);
    sut.startMonitor(thisAppId, eventListenerMock);
    expect(sut.runningMonitors.size).toEqual(1);

    // Assert monitor is running
    const mon = sut.runningMonitors.get(thisAppId);
    expect(mon?.closed).toBeFalse();

    // Stop monitor
    sut.stopMonitor(thisAppId);

    // Assert monitor closed and removed from runningMonitors
    expect(sut.runningMonitors.size).toEqual(0);
    expect(mon?.closed).toBeTrue();
  });
});
