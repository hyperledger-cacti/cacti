/**
 * Manual tests for CDL connector.
 * Must be executed with access to CDL service.
 * Check out CDL connector readme for instructions on how to run these tests.
 * To run:
 * npx jest dist/lib/test/typescript/manual/cdl-connector-manual.test.js
 */

//////////////////////////////////
// Constants
//////////////////////////////////

// Setup: Obtain either accessToken or subscription key and fill matching authInfo structure below.
const cdlUrl = "https://en-apigateway.research.global.fujitsu.com/dataetrust/";
const cdlSubscriptionUrl =
  "https://en-apigateway.research.global.fujitsu.com/dataetrust/";
const skipCertCheck = true;
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

const rateLimitTimeout = 1000 * 2; // 2 seconds
const testLogLevel: LogLevelDesc = "info";
const sutLogLevel: LogLevelDesc = "info";
const setupTimeout = 1000 * 60; // 1 minute timeout for setup

// ApiClient settings
const syncReqTimeout = 1000 * 10; // 10 seconds

import http from "node:http";
import { AddressInfo } from "node:net";
import "jest-extended";
import express from "express";
import bodyParser from "body-parser";
import { v4 as uuidV4 } from "uuid";
import { Configuration } from "@hyperledger/cactus-core-api";

import {
  LogLevelDesc,
  LoggerProvider,
  Logger,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";

import {
  AuthInfoV1,
  DefaultApi as CDLApi,
  GetLineageOptionDirectionV1,
  GetLineageRequestV1,
  PluginLedgerConnectorCDL,
  RegisterHistoryDataRequestV1,
  SearchLineageRequestV1,
  SearchLineageTypeV1,
  TrailEventDetailsV1,
} from "../../../main/typescript/index";

// Logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "cdl-connector-manual.test",
  level: testLogLevel,
});

describe("CDL Connector manual tests", () => {
  let apiClient: CDLApi;
  let connector: PluginLedgerConnectorCDL;
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);

  //////////////////////////////////
  // Helper Methods
  //////////////////////////////////

  async function registerHistoryDataOnCDL(
    request: RegisterHistoryDataRequestV1,
  ) {
    const response = await apiClient.registerHistoryDataV1(request);

    const status = response.status;
    log.info(
      "registerHistoryDataOnCDL done. Status",
      status,
      response.statusText,
    );
    expect(status).toEqual(200);

    expect(response.data).toBeTruthy();
    expect(response.data.result).toEqual("OK");
    expect(response.data.detail).toBeTruthy();
    const event = response.data.detail;
    log.debug("registerHistoryDataOnCDL event", event);
    expect(event).toBeTruthy();
    expect(event["cdl:Lineage"]).toBeTruthy();
    expect(event["cdl:Lineage"]["cdl:EventId"]).toBeTruthy();
    expect(event["cdl:Lineage"]["cdl:LineageId"]).toBeTruthy();
    expect(event["cdl:Tags"]).toBeTruthy();
    expect(event["cdl:Verification"]).toBeTruthy();
    return event;
  }

  async function getLineageFromCDL(
    request: GetLineageRequestV1,
  ): Promise<TrailEventDetailsV1[]> {
    const response = await apiClient.getLineageV1(request);

    const status = response.status;
    log.info("getLineageFromCDL done. Status", status, response.statusText);
    expect(status).toEqual(200);

    expect(response.data).toBeTruthy();
    expect(response.data.result).toEqual("OK");
    expect(response.data.detail).toBeTruthy();
    const eventList = response.data.detail;
    log.debug("getLineageFromCDL eventList", eventList);
    expect(eventList).toBeTruthy();
    expect(eventList.length).toBeGreaterThan(0);
    return eventList;
  }

  async function searchByHeaderOnCDL(
    request: SearchLineageRequestV1,
  ): Promise<TrailEventDetailsV1[]> {
    const response = await apiClient.searchLineageByHeaderV1(request);

    const status = response.status;
    log.info("searchByHeaderOnCDL done. Status", status, response.statusText);
    expect(status).toEqual(200);

    expect(response.data).toBeTruthy();
    expect(response.data.result).toEqual("OK");
    expect(response.data.detail).toBeTruthy();
    const eventList = response.data.detail;
    log.debug("searchByHeaderOnCDL eventList", eventList);
    expect(eventList).toBeTruthy();
    return eventList;
  }

  async function searchByGlobalDataOnCDL(
    request: SearchLineageRequestV1,
  ): Promise<TrailEventDetailsV1[]> {
    const response = await apiClient.searchLineageByGlobalDataV1(request);

    const status = response.status;
    log.info(
      "searchByGlobalDataOnCDL done. Status",
      status,
      response.statusText,
    );
    expect(status).toEqual(200);

    expect(response.data).toBeTruthy();
    expect(response.data.result).toEqual("OK");
    expect(response.data.detail).toBeTruthy();
    const eventList = response.data.detail;
    log.debug("searchByGlobalDataOnCDL eventList", eventList);
    expect(eventList).toBeTruthy();
    return eventList;
  }

  //////////////////////////////////
  // Environment Setup
  //////////////////////////////////

  beforeAll(async () => {
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    apiClient = new CDLApi(new Configuration({ basePath: apiHost }));

    connector = new PluginLedgerConnectorCDL({
      instanceId: uuidV4(),
      logLevel: sutLogLevel,
      cdlApiGateway: {
        url: cdlUrl,
        userAgent: "cactiCdlConnectorManualTest",
        skipCertCheck,
      },
      cdlApiSubscriptionGateway: {
        url: cdlSubscriptionUrl,
        userAgent: "cactiCdlConnectorManualTest",
        skipCertCheck,
      },
    });
    await connector.getOrCreateWebServices();
    await connector.registerWebServices(expressApp);
  }, setupTimeout);

  afterAll(async () => {
    log.info("Close connector server...");
    await Servers.shutdown(server);

    if (connector) {
      log.info("Close the connector...");
      await connector.shutdown();
    }
  }, setupTimeout);

  afterEach(async () => {
    // Limit number of requests send to prevent errors
    await new Promise((resolve) => setTimeout(resolve, rateLimitTimeout));
  });

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  test(
    "Request fails when authInfo is missing",
    async () => {
      try {
        await registerHistoryDataOnCDL({
          authInfo: {} as AuthInfoV1,
          tags: {
            test: "abc",
          },
          properties: {
            prop1: "abc",
            prop2: "cba",
          },
        });
        expect(true).toBeFalse(); // Should fail!
      } catch (error) {
        log.info("Failed as expected!");
      }
    },
    syncReqTimeout * 2,
  );

  test(
    "Request fails when mixed authInfo is used",
    async () => {
      try {
        await registerHistoryDataOnCDL({
          authInfo: {
            accessToken: "foo-accessToken",
            subscriptionKey: "foo-subscriptionKey",
            trustAgentId: "foo-trustAgentId",
            trustAgentRole: "foo-trustAgentRole",
            trustUserId: "foo-trustUserId",
            trustUserRole: "foo-trustUserRole",
          },
          tags: {
            test: "abc",
          },
          properties: {
            prop1: "abc",
            prop2: "cba",
          },
        });
        expect(true).toBeFalse(); // Should fail!
      } catch (error) {
        log.info("Failed as expected!");
      }
    },
    syncReqTimeout * 2,
  );

  test("Register single history data", async () => {
    const newEvent = await registerHistoryDataOnCDL({
      authInfo,
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

  test("Register history data in single lineage", async () => {
    const firstEvent = await registerHistoryDataOnCDL({
      authInfo,
    });
    const firstEventId = firstEvent["cdl:Lineage"]["cdl:EventId"].toString();

    const secondEvent = await registerHistoryDataOnCDL({
      authInfo,
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
      const firstEvent = await registerHistoryDataOnCDL({
        authInfo,
      });
      const firstEventId = firstEvent["cdl:Lineage"]["cdl:EventId"].toString();
      log.info("First eventId (lineageId):", firstEventId);
      eventsInLineage.push(firstEventId);

      for (let i = 0; i < 2; i++) {
        const event = await registerHistoryDataOnCDL({
          authInfo,
          lineageId: firstEventId,
        });
        eventsInLineage.push(event["cdl:Lineage"]["cdl:EventId"].toString());
      }

      log.info("Events in test lineage:", eventsInLineage);
    });

    // both middle
    test("Get lineage forward all (default) on the first event (lineageId)", async () => {
      const eventList = await getLineageFromCDL({
        authInfo,
        eventId: eventsInLineage[0],
        direction: GetLineageOptionDirectionV1.Forward,
        depth: "-1",
      });

      // Forward from first should return all events in lineage
      expect(eventList.length).toEqual(eventsInLineage.length);
    });

    test("Get lineage forward all (default) on the last event", async () => {
      const eventList = await getLineageFromCDL({
        authInfo,
        eventId: eventsInLineage[eventsInLineage.length - 1],
        direction: GetLineageOptionDirectionV1.Forward,
        depth: "-1",
      });

      // Forward from last should return only one event
      expect(eventList.length).toEqual(1);
    });

    test("Get lineage backward all on the last event", async () => {
      const eventList = await getLineageFromCDL({
        authInfo,
        eventId: eventsInLineage[eventsInLineage.length - 1],
        direction: GetLineageOptionDirectionV1.Backward,
        depth: "-1",
      });

      // Backward from last should return all events in lineage
      expect(eventList.length).toEqual(eventsInLineage.length);
    });

    test("Get lineage both all on the middle event", async () => {
      const eventList = await getLineageFromCDL({
        authInfo,
        eventId: eventsInLineage[1],
        direction: GetLineageOptionDirectionV1.Both,
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
    const privateTagValue = uuidV4();
    const customEventPropValue = uuidV4();
    let searchedEvent: TrailEventDetailsV1;
    let searchedEventTimestamp: string;

    beforeAll(async () => {
      searchedEvent = await registerHistoryDataOnCDL({
        authInfo,
        tags: {
          privateTag: privateTagValue,
        },
        properties: {
          customEventProp: customEventPropValue,
        },
      });
      log.info("Event to search for:", searchedEvent);

      searchedEventTimestamp =
        searchedEvent["cdl:Lineage"][
          "cdl:DataRegistrationTimeStamp"
        ].toString();
    });

    test("Search header data using exact match", async () => {
      log.info(
        "Search for events with exact timestamp:",
        searchedEventTimestamp,
      );
      const events = await searchByHeaderOnCDL({
        authInfo,
        searchType: SearchLineageTypeV1.ExactMatch,
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
        authInfo,
        searchType: SearchLineageTypeV1.PartialMatch,
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
        authInfo,
        searchType: SearchLineageTypeV1.RegexMatch,
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
        authInfo,
        searchType: SearchLineageTypeV1.ExactMatch,
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
