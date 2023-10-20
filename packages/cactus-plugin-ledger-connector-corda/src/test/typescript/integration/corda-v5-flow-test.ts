import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import "jest-extended";

import {
  CordaV5TestLedger,
  Containers,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  PluginLedgerConnectorCorda,
  CordaVersion,
} from "../../../main/typescript/plugin-ledger-connector-corda";
import { DefaultApi } from "../../../main/typescript/generated/openapi/typescript-axios/index";
import axios, { AxiosRequestConfig } from "axios";

const testCase = "Tests are passing on the JVM side";
const logLevel: LogLevelDesc = "TRACE";

import https from "https";

test.onFailure(async () => {
  await Containers.logDiagnostics({ logLevel });
});

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test("can get past logs of an account", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const cordaV5TestLedger = new CordaV5TestLedger();
  await cordaV5TestLedger.start();
  t.ok(cordaV5TestLedger, "cordaV5TestLedger started OK");

  test.onFinish(async () => {
    await cordaV5TestLedger.stop();
    await cordaV5TestLedger.destroy();
  });
  const sshConfig = await cordaV5TestLedger.getSshConfig();
  const connector: PluginLedgerConnectorCorda = new PluginLedgerConnectorCorda({
    instanceId: uuidv4(),
    sshConfigAdminShell: sshConfig,
    corDappsDir: "",
    logLevel,
    cordaVersion: CordaVersion.CORDA_V5,
    apiUrl: "https://127.0.0.1:8888",
  });
  const apiUrl = "https://127.0.0.1:8888";

  await connector.getOrCreateWebServices();

  const customHttpsAgent = new https.Agent({
    // Configure your custom settings here
    rejectUnauthorized: false, // Example: Allow self-signed certificates (use with caution)
  });

  const username = "admin";
  const password = "admin";
  const axiosConfig: AxiosRequestConfig = {
    baseURL: apiUrl,
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString(
        "base64",
      )}`,
    },
    httpsAgent: customHttpsAgent,
  };

  const axiosInstance = axios.create(axiosConfig);
  const apiClient = new DefaultApi(undefined, apiUrl, axiosInstance);

  const container = cordaV5TestLedger.getContainer();
  const cmd = ["./gradlew", "listVNodes"];
  const timeout = 180000; // 3 minutes
  const cwd = "/CSDE-cordapp-template-kotlin";
  const shortHashID = await Containers.exec(
    container,
    cmd,
    timeout,
    logLevel,
    cwd,
  );

  function extractShortHash(name: string) {
    const regex = new RegExp(`MyCorDapp\\s*([A-Z0-9]*)\\s*CN=${name}`);
    const match = shortHashID.match(regex);
    if (match) {
      return match[1];
    } else {
      return "err";
    }
  }

  const shortHashBob = extractShortHash("Bob");
  t.ok(shortHashBob, `Short hash ID for Bob: ${shortHashBob}`);

  const shortHashDave = extractShortHash("Dave");
  t.ok(shortHashDave, `Short hash ID for Dave: ${shortHashDave}`);

  const shortHashCharlie = extractShortHash("Charlie");
  t.ok(shortHashCharlie, `Short hash ID for Charlie: ${shortHashCharlie}`);

  const shortHashAlice = extractShortHash("Alice");
  t.ok(shortHashAlice, `Short hash ID for Alice: ${shortHashAlice}`);

  const request = {
    clientRequestId: "test-1",
    flowClassName:
      "com.r3.developers.csdetemplate.utxoexample.workflows.CreateNewChatFlow",
    requestBody: {
      chatName: "Test-1",
      otherMember: "CN=Bob, OU=Test Dept, O=R3, L=London, C=GB",
      message: "Testing",
    },
  };

  const listCPI = await apiClient.getCPIResponse();
  t.ok(listCPI, "getCPIResponse truthy OK");

  const startflow = await apiClient.startFlowParameters(
    shortHashCharlie,
    request,
  );

  t.ok(startflow.status, "startFlowParameters endpoint OK");

  await waitProcess(5);
  await waitForStatusChange(shortHashCharlie, "test-1");
  const checkflow = await apiClient.flowStatusResponse(
    shortHashCharlie,
    "test-1",
  );
  t.ok(checkflow.status, "flowStatusResponse endpoint OK");
  t.equal(checkflow.data.flowStatus, "COMPLETED", "flowStatus is COMPLETED");
  t.equal(checkflow.data.flowError, null, "flowError should be null");

  // Follow the flow as per https://docs.r3.com/en/platform/corda/5.0/developing-applications/getting-started/utxo-ledger-example-cordapp/running-the-chat-cordapp.html
  test("Simulate a conversation between Alice and Bob", async (t) => {
    //1. Alice creates a new chat
    const aliceCreateChat = {
      clientRequestId: "create-1",
      flowClassName:
        "com.r3.developers.csdetemplate.utxoexample.workflows.CreateNewChatFlow",
      requestBody: {
        chatName: "Chat with Bob",
        otherMember: "CN=Bob, OU=Test Dept, O=R3, L=London, C=GB",
        message: "Hello Bob",
      },
    };
    let startflowChat = await apiClient.startFlowParameters(
      shortHashAlice,
      aliceCreateChat,
    );
    t.ok(startflowChat.status, "startflowChat OK");
    await waitProcess(5);
    const checkflow = await apiClient.flowStatusResponse(
      shortHashAlice,
      "create-1",
    );
    t.ok(checkflow.status, "flowStatusResponse OK");

    await waitForStatusChange(shortHashAlice, "create-1");

    //2. Bob lists his chats
    const bobListChats = {
      clientRequestId: "list-1",
      flowClassName:
        "com.r3.developers.csdetemplate.utxoexample.workflows.ListChatsFlow",
      requestBody: {},
    };
    startflowChat = await apiClient.startFlowParameters(
      shortHashBob,
      bobListChats,
    );
    await waitProcess(10);
    const flowData = await waitForStatusChange(shortHashBob, "list-1");

    const flowResult =
      flowData !== null && flowData !== undefined ? flowData.flowResult : null;
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
      clientRequestId: "update-1",
      flowClassName:
        "com.r3.developers.csdetemplate.utxoexample.workflows.UpdateChatFlow",
      requestBody: {
        id: chatWithBobId,
        message: "Hi Alice",
      },
    };
    await apiClient.startFlowParameters(shortHashBob, bobUpdate1);
    await waitProcess(5);
    await waitForStatusChange(shortHashBob, "update-1");
    const bobUpdate2 = {
      clientRequestId: "update-2",
      flowClassName:
        "com.r3.developers.csdetemplate.utxoexample.workflows.UpdateChatFlow",
      requestBody: {
        id: chatWithBobId,
        message: "How are you today?",
      },
    };
    await apiClient.startFlowParameters(shortHashBob, bobUpdate2);
    await waitProcess(5);
    await waitForStatusChange(shortHashBob, "update-2");

    //4. Alice lists chat
    const aliceListsChat = {
      clientRequestId: "list-2",
      flowClassName:
        "com.r3.developers.csdetemplate.utxoexample.workflows.ListChatsFlow",
      requestBody: {},
    };
    await apiClient.startFlowParameters(shortHashAlice, aliceListsChat);
    await waitProcess(5);
    await waitForStatusChange(shortHashAlice, "list-2");

    //5. Alice checks the history of the chat with Bob
    const aliceHistoryRequest = {
      clientRequestId: "get-1",
      flowClassName:
        "com.r3.developers.csdetemplate.utxoexample.workflows.GetChatFlow",
      requestBody: {
        id: chatWithBobId,
        numberOfRecords: "4",
      },
    };
    await apiClient.startFlowParameters(shortHashAlice, aliceHistoryRequest);
    await waitProcess(5);
    await waitForStatusChange(shortHashAlice, "get-1");

    //6. Alice replies to Bob
    const aliceReply = {
      clientRequestId: "update-4",
      flowClassName:
        "com.r3.developers.csdetemplate.utxoexample.workflows.UpdateChatFlow",
      requestBody: {
        id: chatWithBobId,
        message: "I am very well thank you",
      },
    };
    await apiClient.startFlowParameters(shortHashAlice, aliceReply);
    await waitProcess(5);
    await waitForStatusChange(shortHashAlice, "update-4");

    //7. Bob gets the chat history
    const bobHistoryRequest = {
      clientRequestId: "get-2",
      flowClassName:
        "com.r3.developers.csdetemplate.utxoexample.workflows.GetChatFlow",
      requestBody: {
        id: chatWithBobId,
        numberOfRecords: "2",
      },
    };
    await apiClient.startFlowParameters(shortHashBob, bobHistoryRequest);
    await waitProcess(5);
    await waitForStatusChange(shortHashBob, "get-2");
  });

  test("Negative Test, invalid flow class name", async (t: Test) => {
    const invalidFlowName = "nonExistentFlow";
    const shortHash = shortHashBob;
    const request = {
      clientRequestId: "test-1",
      flowClassName: invalidFlowName,
      requestBody: {
        chatName: "Test-1",
        otherMember: "CN=Bob, OU=Test Dept, O=R3, L=London, C=GB",
        message: "Testing",
      },
    };
    try {
      await apiClient.startFlowParameters(shortHash, request);
      t.fail("Expected an error for an invalid flow name but it succeeded.");
    } catch (error) {
      t.pass("Failed as expected for an invalid flow name.");
    }
  });

  test("Negative Test, invalid username and password ", async (t: Test) => {
    const apiUrl = "https://127.0.0.1:8888";
    const username = "invalidUsername";
    const password = "invalidPassword";
    const axiosConfig: AxiosRequestConfig = {
      baseURL: apiUrl,
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString(
          "base64",
        )}`,
      },
    };
    const axiosInstance = axios.create(axiosConfig);
    const apiClient = new DefaultApi(undefined, apiUrl, axiosInstance);
    try {
      await apiClient.getCPIResponse();
      t.fail("Expected an error for unauthorized access but it succeeded.");
    } catch (error) {
      t.pass("Failed as expected for unauthorized access.");
    }
  });

  // function to wait for the status to change to COMPLETED
  async function waitForStatusChange(shortHash: string, flowName: string) {
    try {
      let checkFlowObject = await apiClient.flowStatusResponse(
        shortHash,
        flowName,
      );
      if (checkFlowObject.data.flowStatus === "COMPLETED") {
        return checkFlowObject.data;
      } else if (checkFlowObject.data.flowStatus === "RUNNING") {
        await new Promise((resolve) => setTimeout(resolve, 20000));
        await waitForStatusChange(shortHash, flowName);
      }
    } catch (error) {
      console.error(
        "An error occurred while waiting for status change:",
        error,
      );
    }
  }

  //Function to add a delay
  function waitProcess(seconds: number) {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, seconds * 1000);
    });
  }
});
