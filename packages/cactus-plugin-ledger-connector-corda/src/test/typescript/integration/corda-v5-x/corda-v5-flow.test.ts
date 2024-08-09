import { v4 as uuidv4 } from "uuid";
import "jest-extended";
import {
  CordaV5TestLedger,
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import {
  PluginLedgerConnectorCorda,
  CordaVersion,
} from "../../../../main/typescript/plugin-ledger-connector-corda";
import { DefaultApi } from "../../../../main/typescript/generated/openapi/typescript-axios/index";

const logLevel: LogLevelDesc = "TRACE";

import http from "http";
import { extractShortHash } from "./../../../../../../cactus-test-tooling/src/main/typescript/corda/corda-v5-test-ledger";
import express from "express";
import bodyParser from "body-parser";
import { AddressInfo } from "net";
import { Configuration } from "@hyperledger/cactus-core-api";

describe("Corda Test Case", () => {
  const cordaV5TestLedger = new CordaV5TestLedger();
  let apiClient: DefaultApi;
  const expressApp = express();
  const server = http.createServer(expressApp);
  let plugin: PluginLedgerConnectorCorda;

  beforeAll(async () => {
    await cordaV5TestLedger.start();
    expect(cordaV5TestLedger).toBeTruthy();
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.toBeTruthy();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    const sshConfig = await cordaV5TestLedger.getSshConfig();

    plugin = new PluginLedgerConnectorCorda({
      instanceId: uuidv4(),
      sshConfigAdminShell: sshConfig,
      corDappsDir: "",
      logLevel,
      cordaVersion: CordaVersion.CORDA_V5,
      apiUrl: "https://127.0.0.1:8888",
    });
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    const config = new Configuration({ basePath: apiHost });
    await plugin.registerWebServices(expressApp);
    apiClient = new DefaultApi(config);
  });
  afterAll(async () => {
    await cordaV5TestLedger.stop();
    await cordaV5TestLedger.destroy();
    await Servers.shutdown(server);
  });
  let shortHashID: string;
  it("Listing VNodes", async () => {
    const container = cordaV5TestLedger.getContainer();
    const cmd = ["./gradlew", "listVNodes"];
    const timeout = 180000; // 3 minutes
    const cwd = "/CSDE-cordapp-template-kotlin";
    shortHashID = await Containers.exec(container, cmd, timeout, logLevel, cwd);
  });

  describe("Endpoint Testing", () => {
    let shortHashAlice = "";
    let shortHashBob = "";
    let shortHashCharlie = "";
    let shortHashDave = "";
    it("Extract short hash for Alice", () => {
      shortHashAlice = extractShortHash(shortHashID, "Alice");
      expect(shortHashAlice).toBeTruthy();
      expect(`Short hash ID for Alice: ${shortHashAlice}`).toMatch(
        /Short hash ID for Alice:/,
      );
      console.log(`Short hash ID for Alice: ${shortHashAlice}`);
    });
    it("Extract short hash for Bob", () => {
      shortHashBob = extractShortHash(shortHashID, "Bob");
      expect(shortHashBob).toBeTruthy();
      expect(`Short hash ID for Bob: ${shortHashBob}`).toMatch(
        /Short hash ID for Bob:/,
      );
      console.log(`Short hash ID for Bob: ${shortHashBob}`);
    });
    it("Extract short hash for Charlie", () => {
      shortHashCharlie = extractShortHash(shortHashID, "Charlie");
      expect(typeof shortHashCharlie === "string").toBe(true);
      expect(shortHashCharlie).toBeTruthy();
      expect(`Short hash ID for Charlie: ${shortHashCharlie}`).toMatch(
        /Short hash ID for Charlie:/,
      );
      console.log(`Short hash ID for Charlie: ${shortHashCharlie}`);
    });
    it("Extract short hash for Dave", () => {
      shortHashDave = extractShortHash(shortHashID, "Dave");
      expect(shortHashDave).toBeTruthy();
      expect(`Short hash ID for Dave: ${shortHashDave}`).toMatch(
        /Short hash ID for Dave:/,
      );
      console.log(`Short hash ID for Dave: ${shortHashDave}`);
    });

    it("Listing CPIs", async () => {
      const req = {
        username: "admin",
        password: "admin",
        rejectUnauthorized: false,
      };
      const listCPI = await apiClient.listCpiV1(req);
      expect(listCPI).toBeTruthy();
    });
    test("Simulate conversation between Alice and Bob", async () => {
      const username = "admin";
      const password = "admin";
      const rejectUnauthorized = false;
      //1. Alice creates a new chat
      const aliceCreateChat = {
        username,
        password,
        rejectUnauthorized,
        holdingIDShortHash: shortHashAlice,
        clientRequestId: "create-1",
        flowClassName:
          "com.r3.developers.csdetemplate.utxoexample.workflows.CreateNewChatFlow",
        requestBody: {
          chatName: "Chat with Bob",
          otherMember: "CN=Bob, OU=Test Dept, O=R3, L=London, C=GB",
          message: "Hello Bob",
        },
      };
      let startflowChat = await apiClient.startFlowV1(aliceCreateChat);
      expect(startflowChat).toBeTruthy();

      //2. Bob lists his chats
      const bobListChats = {
        username,
        password,
        rejectUnauthorized,
        holdingIDShortHash: shortHashBob,
        clientRequestId: "list-1",
        flowClassName:
          "com.r3.developers.csdetemplate.utxoexample.workflows.ListChatsFlow",
        requestBody: {},
      };
      startflowChat = await apiClient.startFlowV1(bobListChats);
      expect(startflowChat).toBeTruthy();
      const flowResult =
        startflowChat.data !== null && startflowChat.data !== undefined
          ? startflowChat.data.flowResult
          : null;
      const chatWithBobId = (() => {
        if (typeof flowResult === "string") {
          const parseFlowResult = JSON.parse(flowResult);
          const chatWithBobObj = parseFlowResult.find(
            (item: { chatName: string }) => item.chatName === "Chat with Bob",
          );
          return chatWithBobObj && "id" in chatWithBobObj
            ? chatWithBobObj.id
            : undefined;
        }
      })();
      //3. Bob updates chat twice
      const bobUpdate1 = {
        username,
        password,
        rejectUnauthorized,
        holdingIDShortHash: shortHashBob,
        clientRequestId: "update-1",
        flowClassName:
          "com.r3.developers.csdetemplate.utxoexample.workflows.UpdateChatFlow",
        requestBody: {
          id: chatWithBobId,
          message: "Hi Alice",
        },
      };
      const bobUpdate1Response = await apiClient.startFlowV1(bobUpdate1);
      expect(bobUpdate1Response).toBeTruthy();
      const bobUpdate2 = {
        username,
        password,
        rejectUnauthorized,
        holdingIDShortHash: shortHashBob,
        clientRequestId: "update-2",
        flowClassName:
          "com.r3.developers.csdetemplate.utxoexample.workflows.UpdateChatFlow",
        requestBody: {
          id: chatWithBobId,
          message: "How are you today?",
        },
      };
      const bobUpdate2Response = await apiClient.startFlowV1(bobUpdate2);
      expect(bobUpdate2Response).toBeTruthy();

      //4. Alice lists chat
      const aliceListsChat = {
        username,
        password,
        rejectUnauthorized,
        holdingIDShortHash: shortHashAlice,
        clientRequestId: "list-2",
        flowClassName:
          "com.r3.developers.csdetemplate.utxoexample.workflows.ListChatsFlow",
        requestBody: {},
      };
      const aliceList2Response = await apiClient.startFlowV1(aliceListsChat);
      expect(aliceList2Response).toBeTruthy();

      //5. Alice checks the history of the chat with Bob
      const aliceHistoryRequest = {
        username,
        password,
        rejectUnauthorized,
        holdingIDShortHash: shortHashAlice,
        clientRequestId: "get-1",
        flowClassName:
          "com.r3.developers.csdetemplate.utxoexample.workflows.GetChatFlow",
        requestBody: {
          id: chatWithBobId,
          numberOfRecords: "4",
        },
      };
      const aliceHistoryResponse =
        await apiClient.startFlowV1(aliceHistoryRequest);
      expect(aliceHistoryResponse).toBeTruthy();

      //6. Alice replies to Bob
      const aliceReply = {
        username,
        password,
        rejectUnauthorized,
        holdingIDShortHash: shortHashAlice,
        clientRequestId: "update-4",
        flowClassName:
          "com.r3.developers.csdetemplate.utxoexample.workflows.UpdateChatFlow",
        requestBody: {
          id: chatWithBobId,
          message: "I am very well thank you",
        },
      };

      const aliceReplyResponse = await apiClient.startFlowV1(aliceReply);
      expect(aliceReplyResponse).toBeTruthy();

      //7. Bob gets the chat history
      const bobHistoryRequest = {
        username,
        password,
        rejectUnauthorized,
        holdingIDShortHash: shortHashBob,
        clientRequestId: "get-2",
        flowClassName:
          "com.r3.developers.csdetemplate.utxoexample.workflows.GetChatFlow",
        requestBody: {
          id: chatWithBobId,
          numberOfRecords: "2",
        },
      };
      const bobHistoryResponse = await apiClient.startFlowV1(bobHistoryRequest);
      expect(bobHistoryResponse).toBeTruthy();

      //8. List Flows Endpoint Test
      const queryVar = {
        username,
        password,
        rejectUnauthorized,
        holdingIDShortHash: shortHashBob,
      };
      const response = await apiClient.listFlowV1(queryVar);
      expect(response).toBeTruthy();
    });

    describe("Negative Testing", () => {
      it("Invalid username and password", async () => {
        const request = {
          username: "invalidUsername",
          password: "invalidPassword",
          rejectUnauthorized: false,
        };
        try {
          await apiClient.listCpiV1(request);
          fail("Expected an error for unauthorized access but it succeeded.");
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      it("Invalid flow class name", async () => {
        const invalidFlowName = "nonExistentFlow";
        const request = {
          username: "admin",
          password: "admin",
          rejectUnauthorized: false,
          holdingIDShortHash: shortHashBob,
          clientRequestId: "test-1",
          flowClassName: invalidFlowName,
          requestBody: {
            chatName: "Test-1",
            otherMember: "CN=Bob, OU=Test Dept, O=R3, L=London, C=GB",
            message: "Testing",
          },
        };
        try {
          await apiClient.startFlowV1(request);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });
  });
});
