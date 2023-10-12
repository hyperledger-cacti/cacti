/**
 * Manual tests for CDL connector.
 * Must be exectued with access to CDL service.
 * Check out CDL connector readme for instructions on how to run these tests.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Setup: Start validator first and store it's crt under this path
const VALIDATOR_KEY_PATH =
  "/etc/cactus/connector-cdl-socketio/CA/connector.crt";

// Setup: Obtain eitehr accessToken or subscription key and fill matching authInfo structure below.
// const authInfo = {
//   accessToken: "_____accessToken_____"
//   trustAgentId: "_____trustAgentId_____",
// };
const authInfo = {
  subscriptionKey: "_____subscriptionKey_____",
  trustAgentId: "_____trustAgentId_____",
  trustAgentRole: "_____trustAgentRole_____",
  trustUserId: "_____trustUserId_____",
  trustUserRole: "_____trustUserRole_____",
};

const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const setupTimeout = 1000 * 60; // 1 minute timeout for setup

// ApiClient settings
const syncReqTimeout = 1000 * 10; // 10 seconds

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
} from "@hyperledger/cactus-common";
import { SocketIOApiClient } from "@hyperledger/cactus-api-client";

import "jest-extended";
import { Server as HttpsServer } from "https";
import { v4 as uuidv4 } from "uuid";

import * as cdlConnector from "../../../main/typescript/index";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "cdl-connector-manual.test",
  level: testLogLevel,
});

describe("CDL Connector manual tests", () => {
  let connectorServer: HttpsServer;
  let apiClient: SocketIOApiClient;

  //////////////////////////////////
  // Helper Methods
  //////////////////////////////////

  async function registerHistoryDataOnCDL(args: any = {}) {
    const response = await apiClient.sendSyncRequest(
      {},
      {
        type: "registerHistoryData",
        authInfo,
      },
      args,
    );

    log.debug("registerHistoryData response:", JSON.stringify(response));

    expect(response.status).toEqual(200);
    expect(response.data.result).toEqual("OK");
    const event = response.data.detail;
    expect(event).toBeTruthy();
    expect(event["cdl:Lineage"]).toBeTruthy();
    expect(event["cdl:Lineage"]["cdl:EventId"]).toBeTruthy();
    expect(event["cdl:Lineage"]["cdl:LineageId"]).toBeTruthy();
    expect(event["cdl:Tags"]).toBeTruthy();
    expect(event["cdl:Verification"]).toBeTruthy();
    return event;
  }

  async function getLineageFromCDL(args: any = {}): Promise<any[]> {
    const response = await apiClient.sendSyncRequest(
      {},
      {
        type: "getLineage",
        authInfo,
      },
      args,
    );

    log.debug("getLineage response:", JSON.stringify(response));

    expect(response.status).toEqual(200);
    expect(response.data.result).toEqual("OK");
    const eventList = response.data.detail;
    expect(eventList).toBeTruthy();
    expect(eventList.length).toBeGreaterThan(0);
    return eventList;
  }

  async function searchByHeaderOnCDL(args: any = {}): Promise<any[]> {
    const response = await apiClient.sendSyncRequest(
      {},
      {
        type: "searchByHeader",
        authInfo,
      },
      args,
    );

    log.debug("searchByHeaderOnCDL response:", JSON.stringify(response));

    expect(response.status).toEqual(200);
    expect(response.data.result).toEqual("OK");
    const eventList = response.data.detail;
    expect(eventList).toBeTruthy();
    return eventList;
  }

  async function searchByGlobalDataOnCDL(args: any = {}): Promise<any[]> {
    const response = await apiClient.sendSyncRequest(
      {},
      {
        type: "searchByGlobalData",
        authInfo,
      },
      args,
    );

    log.debug("searchByGlobalData response:", JSON.stringify(response));

    expect(response.status).toEqual(200);
    expect(response.data.result).toEqual("OK");
    const eventList = response.data.detail;
    expect(eventList).toBeTruthy();
    return eventList;
  }

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    // Run the connector
    connectorServer = await cdlConnector.startCDLSocketIOConnector();
    expect(connectorServer).toBeTruthy();
    const connectorAddress = connectorServer.address();
    if (!connectorAddress || typeof connectorAddress === "string") {
      throw new Error("Unexpected CDL connector AddressInfo type");
    }
    log.info(
      "CDL-SocketIO Connector started on:",
      `${connectorAddress.address}:${connectorAddress.port}`,
    );

    // Create ApiClient instance
    const apiConfigOptions = {
      validatorID: "cdl-connector-manual.test",
      validatorURL: `https://localhost:${connectorAddress.port}`,
      validatorKeyPath: VALIDATOR_KEY_PATH,
      logLevel: sutLogLevel,
      maxCounterRequestID: 1000,
      syncFunctionTimeoutMillisecond: syncReqTimeout,
      socketOptions: {
        rejectUnauthorized: false,
        reconnection: false,
        timeout: syncReqTimeout * 2,
      },
    };
    log.debug("ApiClient config:", apiConfigOptions);
    apiClient = new SocketIOApiClient(apiConfigOptions);
  }, setupTimeout);

  afterAll(async () => {
    log.info("FINISHING THE TESTS");

    if (apiClient) {
      log.info("Close ApiClient connection...");
      apiClient.close();
    }

    if (connectorServer) {
      log.info("Stop the CDL connector...");
      await new Promise<void>((resolve) =>
        connectorServer.close(() => resolve()),
      );
    }

    // SocketIOApiClient has timeout running for each request which is not cancellable at the moment.
    // Wait timeout amount of seconds to make sure all handles are closed.
    await new Promise((resolve) => setTimeout(resolve, syncReqTimeout));
  }, setupTimeout);

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Test if connector was started correctly and communication is possible
   */
  test("Get connector status", async () => {
    const argsParam = {
      args: ["test1", "test2"],
    };

    const response = await apiClient.sendSyncRequest(
      {},
      {
        type: "status",
      },
      argsParam,
    );

    log.debug("Status response:", response);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual("OK.");
  });

  test(
    "Request fails when authInfo is missing",
    async () => {
      const response = await apiClient.sendSyncRequest(
        {},
        {
          type: "registerHistoryData",
        },
        {
          eventId: "",
          lineageId: "",
          tags: {},
          properties: {
            prop1: "shouldFail",
            prop2: "shouldFail",
          },
        },
      );
      expect(response.status).toEqual(504);
    },
    syncReqTimeout * 2,
  );

  test(
    "Request fails when mixed authInfo is used",
    async () => {
      const response = await apiClient.sendSyncRequest(
        {},
        {
          type: "registerHistoryData",
          authInfo: {
            accessToken: "foo-accessToken",
            subscriptionKey: "foo-subscriptionKey",
            trustAgentId: "foo-trustAgentId",
            trustAgentRole: "foo-trustAgentRole",
            trustUserId: "foo-trustUserId",
            trustUserRole: "foo-trustUserRole",
          },
        },
        {
          eventId: "",
          lineageId: "",
          tags: {},
          properties: {
            prop1: "shouldFail",
            prop2: "shouldFail",
          },
        },
      );
      expect(response.status).toEqual(504);
    },
    syncReqTimeout * 2,
  );

  test("Register single history data", async () => {
    const newEvent = await registerHistoryDataOnCDL({
      eventId: "",
      lineageId: "",
      tags: {
        test: "abc",
      },
      properties: {
        prop1: "abc",
        prop2: "cba",
      },
    });

    // Check custom properties and tags
    expect(newEvent["cdl:Event"]["prop1"]).toEqual("abc");
    expect(newEvent["cdl:Event"]["prop2"]).toEqual("cba");
    expect(newEvent["cdl:Tags"]["test"]).toEqual("abc");
  });

  test("Register history data in signle lineage", async () => {
    const firstEvent = await registerHistoryDataOnCDL();
    const firstEventId = firstEvent["cdl:Lineage"]["cdl:EventId"];

    const secondEvent = await registerHistoryDataOnCDL({
      lineageId: firstEventId,
    });

    // Check if two events belong to same lineage
    expect(secondEvent["cdl:Lineage"]["cdl:LineageId"]).toEqual(firstEventId);
  });

  /**
   * Tests for getLineage endpoint
   */
  describe("Get lineage tests", () => {
    const eventsInLineage: string[] = [];

    beforeAll(async () => {
      const firstEvent = await registerHistoryDataOnCDL();
      const firstEventId = firstEvent["cdl:Lineage"]["cdl:EventId"];
      log.info("First eventId (lineageId):", firstEventId);
      eventsInLineage.push(firstEventId);

      for (let i = 0; i < 2; i++) {
        const event = await registerHistoryDataOnCDL({
          lineageId: firstEventId,
        });
        eventsInLineage.push(event["cdl:Lineage"]["cdl:EventId"]);
      }

      log.info("Events in test lineage:", eventsInLineage);
    });

    // both middle
    test("Get lineage forward all (default) on the first event (lineageId)", async () => {
      const eventList = await getLineageFromCDL({
        eventId: eventsInLineage[0],
        direction: "forward",
        depth: "-1",
      });

      // Forward from first should return all events in lineage
      expect(eventList.length).toEqual(eventsInLineage.length);
    });

    test("Get lineage forward all (default) on the last event", async () => {
      const eventList = await getLineageFromCDL({
        eventId: eventsInLineage[eventsInLineage.length - 1],
        direction: "forward",
        depth: "-1",
      });

      // Forward from last should return only one event
      expect(eventList.length).toEqual(1);
    });

    test("Get lineage backward all on the last event", async () => {
      const eventList = await getLineageFromCDL({
        eventId: eventsInLineage[eventsInLineage.length - 1],
        direction: "backward",
        depth: "-1",
      });

      // Backward from last should return all events in lineage
      expect(eventList.length).toEqual(eventsInLineage.length);
    });

    test("Get lineage both all on the middle event", async () => {
      const eventList = await getLineageFromCDL({
        eventId: eventsInLineage[1],
        direction: "both",
        depth: "-1",
      });

      // Both on middle event should return all events in lineage
      expect(eventList.length).toEqual(eventsInLineage.length);
    });
  });

  /**
   * Tests for searchByHeader and searchByGlobalData endpoints
   */
  describe("Search data tests", () => {
    const privateTagValue = uuidv4();
    const customEventPropValue = uuidv4();
    let searchedEvent: any;
    let searchedEventTimestamp: string;

    beforeAll(async () => {
      searchedEvent = await registerHistoryDataOnCDL({
        tags: {
          privateTag: privateTagValue,
        },
        properties: {
          customEventProp: customEventPropValue,
        },
      });
      log.info("Event to search for:", searchedEvent);

      searchedEventTimestamp =
        searchedEvent["cdl:Lineage"]["cdl:DataRegistrationTimeStamp"];
    });

    test("Search header data using exact match", async () => {
      log.info(
        "Search for events with exact timestamp:",
        searchedEventTimestamp,
      );
      const events = await searchByHeaderOnCDL({
        searchType: "exactmatch",
        fields: {
          "cdl:DataRegistrationTimeStamp": searchedEventTimestamp,
        },
      });

      expect(events).toBeTruthy();
      expect(events.length).toBeGreaterThan(0);
      for (const e of events) {
        expect(e["cdl:Lineage"]["cdl:DataRegistrationTimeStamp"]).toEqual(
          searchedEventTimestamp,
        );
      }
    });

    test("Search header data using partial match", async () => {
      const datePart = searchedEventTimestamp.split("T")[0];
      log.info("Search for events with partialmatch (date):", datePart);

      const events = await searchByHeaderOnCDL({
        searchType: "partialmatch",
        fields: {
          "cdl:DataRegistrationTimeStamp": datePart,
        },
      });

      expect(events).toBeTruthy();
      expect(events.length).toBeGreaterThan(0);
      for (const e of events) {
        expect(e["cdl:Lineage"]["cdl:DataRegistrationTimeStamp"]).toMatch(
          datePart,
        );
      }
    });

    test("Search header data using regex match", async () => {
      const datePart = searchedEventTimestamp.split("T")[0];
      const dateRegex = `^${datePart}.*$`;
      log.info("Search for events with regexpmatch:", dateRegex);

      const events = await searchByHeaderOnCDL({
        searchType: "regexpmatch",
        fields: {
          "cdl:DataRegistrationTimeStamp": dateRegex,
        },
      });

      expect(events).toBeTruthy();
      expect(events.length).toBeGreaterThan(0);
      for (const e of events) {
        expect(e["cdl:Lineage"]["cdl:DataRegistrationTimeStamp"]).toMatch(
          datePart,
        );
      }
    });

    test("Search global data using exact match", async () => {
      log.info(
        "Search for events with exact customEventProp:",
        customEventPropValue,
      );
      const events = await searchByGlobalDataOnCDL({
        searchType: "exactmatch",
        fields: {
          customEventProp: customEventPropValue,
        },
      });

      expect(events).toBeTruthy();
      expect(events.length).toEqual(1);
      for (const e of events) {
        expect(e["cdl:Event"]["customEventProp"]).toEqual(customEventPropValue);
      }
    });
  });
});
