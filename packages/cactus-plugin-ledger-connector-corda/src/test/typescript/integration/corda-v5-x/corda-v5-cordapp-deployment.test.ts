import "jest-extended";
import { CordaV5TestLedger } from "@hyperledger/cactus-test-tooling";
import fetch from "node-fetch";
import FormData from "form-data";
import https from "https";

describe("Corda Test Case", () => {
  const cordaV5TestLedger = new CordaV5TestLedger({
    imageName: "cactuts/cordappdeployment",
    imageVersion: "latest",
  });
  beforeAll(async () => {
    await cordaV5TestLedger.start();
    expect(cordaV5TestLedger).toBeTruthy();
  });
  afterAll(async () => {
    await cordaV5TestLedger.stop();
    await cordaV5TestLedger.destroy();
  });

  describe("Upload Certificates and CPI ", () => {
    const username = "admin";
    const password = "admin";
    const auth =
      "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
    let cpiHash = "";
    let aliceHoldingId = "";
    let bobHoldingId = "";
    let charlieHoldingId = "";
    let daveHoldingId = "";
    let notaryRep1HoldingId = "";
    let operatorCpiHash = "";
    const agent = new https.Agent({ rejectUnauthorized: false });
    test("Get and upload digicert-ca", async () => {
      const cpiFilePath = "/CSDE-cordapp-template-kotlin/config/r3-ca-key.pem";
      const r3KeyBuffer =
        await cordaV5TestLedger.getFileFromContainer(cpiFilePath);
      const form = new FormData();
      form.append("alias", "digicert-ca");
      form.append("certificate", r3KeyBuffer, "r3-ca-key.pem");
      const response = await fetch(
        "https://localhost:8888/api/v1/certificates/cluster/code-signer",
        {
          method: "PUT",
          body: form,
          headers: {
            accept: "*/*",
            Authorization: auth,
            ...form.getHeaders(),
          },
          agent: agent,
        },
      );
      expect(response.status).toBe(204);
    });
    test("Get and upload default key", async () => {
      const defaultKeyFilePath =
        "/CSDE-cordapp-template-kotlin/config/gradle-plugin-default-key.pem";
      const defaultKeyBuffer =
        await cordaV5TestLedger.getFileFromContainer(defaultKeyFilePath);
      const form = new FormData();
      form.append("alias", "gradle-plugin-default-key");
      form.append(
        "certificate",
        defaultKeyBuffer,
        "gradle-plugin-default-key.pem",
      );
      const response = await fetch(
        "https://localhost:8888/api/v1/certificates/cluster/code-signer",
        {
          method: "PUT",
          body: form,
          headers: {
            accept: "*/*",
            Authorization: auth,
            ...form.getHeaders(),
          },
          agent: agent,
        },
      );
      expect(response.status).toBe(204);
    });
    test("Get and upload signing key", async () => {
      const signingKeyFilePath =
        "/CSDE-cordapp-template-kotlin/workspace/signingkey1.pem";
      const signingKeyBuffer =
        await cordaV5TestLedger.getFileFromContainer(signingKeyFilePath);
      const form = new FormData();
      form.append("alias", "my-signing-key");
      form.append("certificate", signingKeyBuffer, "signingkey1.pem");
      const response = await fetch(
        "https://localhost:8888/api/v1/certificates/cluster/code-signer",
        {
          method: "PUT",
          body: form,
          headers: {
            accept: "*/*",
            Authorization: auth,
            ...form.getHeaders(),
          },
          agent: agent,
        },
      );
      expect(response.status).toBe(204);
    });
    test("Query Certificates", async () => {
      const response = await fetch(
        "https://localhost:8888/api/v1/certificates/cluster/code-signer",
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      expect(response.status).toBe(200);
    });
    test("Get and upload CPI", async () => {
      const cpiFilePath =
        "/CSDE-cordapp-template-kotlin/workflows/build/MyCorDapp-1.0-SNAPSHOT.cpi";
      const cpiBuffer =
        await cordaV5TestLedger.getFileFromContainer(cpiFilePath);
      const form = new FormData();
      form.append("upload", cpiBuffer, "MyCorDapp-1.0-SNAPSHOT.cpi");
      let response = await fetch("https://localhost:8888/api/v1/cpi", {
        method: "POST",
        body: form,
        headers: {
          accept: "*/*",
          Authorization: auth,
          ...form.getHeaders(),
        },
        agent: agent,
      });
      let responseBody = await response.json();
      expect(response.status).toBe(200);
      const requestId = responseBody.id;

      // Wait time to make sure upload is done
      await new Promise((resolve) => setTimeout(resolve, 5000));

      response = await fetch(
        `https://localhost:8888/api/v1/cpi/status/${requestId}`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      responseBody = await response.json();
      cpiHash = responseBody.cpiFileChecksum;

      // Notary Server
      const operatorCpiFilePath =
        "/CSDE-cordapp-template-kotlin/workflows/build/NotaryServer-1.0-SNAPSHOT.cpi";
      const operatorCpiBuffer =
        await cordaV5TestLedger.getFileFromContainer(operatorCpiFilePath);
      const form2 = new FormData();
      form2.append(
        "upload",
        operatorCpiBuffer,
        "NotaryServer-1.0-SNAPSHOT.cpi",
      );
      let response2 = await fetch("https://localhost:8888/api/v1/cpi", {
        method: "POST",
        body: form2,
        headers: {
          accept: "*/*",
          Authorization: auth,
          ...form2.getHeaders(),
        },
        agent: agent,
      });
      let response2Body = await response2.json();
      console.log("check response body " + JSON.stringify(response2Body));
      expect(response2.status).toBe(200);
      const operatorRequestId = response2Body.id;

      // Wait time to make sure upload is done
      await new Promise((resolve) => setTimeout(resolve, 5000));

      response2 = await fetch(
        `https://localhost:8888/api/v1/cpi/status/${operatorRequestId}`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      response2Body = await response2.json();
      operatorCpiHash = response2Body.cpiFileChecksum;
    });
    test("Create Virtual Nodes", async () => {
      const X500Alice = "CN=Alice, OU=Test Dept, O=R3, L=London, C=GB";
      const X500Bob = "CN=Bob, OU=Test Dept, O=R3, L=London, C=GB";
      const X500Charlie = "CN=Charlie, OU=Test Dept, O=R3, L=London, C=GB";
      const X500Dave = "CN=Dave, OU=Test Dept, O=R3, L=London, C=GB";
      const X500NotaryRep1 =
        "CN=NotaryRep1, OU=Test Dept, O=R3, L=London, C=GB";
      let responseAlice = await fetch(
        `https://localhost:8888/api/v1/virtualnode`,
        {
          method: "POST",
          body: JSON.stringify({
            cpiFileChecksum: cpiHash,
            x500Name: X500Alice,
          }),
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      let responseBodyAlice = await responseAlice.json();
      aliceHoldingId = responseBodyAlice.requestId;

      // Wait time to make sure Node creation is done
      await new Promise((resolve) => setTimeout(resolve, 5000));

      responseAlice = await fetch(
        `https://localhost:8888/api/v1/virtualnode/status/${aliceHoldingId}`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      responseBodyAlice = await responseAlice.json();
      expect(responseBodyAlice.status).toBe("SUCCEEDED");

      //BOB
      let responseBob = await fetch(
        `https://localhost:8888/api/v1/virtualnode`,
        {
          method: "POST",
          body: JSON.stringify({
            cpiFileChecksum: cpiHash,
            x500Name: X500Bob,
          }),
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      let responseBodyBob = await responseBob.json();
      bobHoldingId = responseBodyBob.requestId;

      // Wait time to make sure Node creation is done
      await new Promise((resolve) => setTimeout(resolve, 5000));
      responseBob = await fetch(
        `https://localhost:8888/api/v1/virtualnode/status/${bobHoldingId}`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      responseBodyBob = await responseBob.json();
      expect(responseBodyBob.status).toBe("SUCCEEDED");
      // Charlie
      let responseCharlie = await fetch(
        `https://localhost:8888/api/v1/virtualnode`,
        {
          method: "POST",
          body: JSON.stringify({
            cpiFileChecksum: cpiHash,
            x500Name: X500Charlie,
          }),
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      let responseBodyCharlie = await responseCharlie.json();
      charlieHoldingId = responseBodyCharlie.requestId;

      // Wait time to make sure Node creation is done
      await new Promise((resolve) => setTimeout(resolve, 5000));
      responseCharlie = await fetch(
        `https://localhost:8888/api/v1/virtualnode/status/${charlieHoldingId}`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      responseBodyCharlie = await responseCharlie.json();
      expect(responseBodyCharlie.status).toBe("SUCCEEDED");
      // Dave
      let responseDave = await fetch(
        `https://localhost:8888/api/v1/virtualnode`,
        {
          method: "POST",
          body: JSON.stringify({
            cpiFileChecksum: cpiHash,
            x500Name: X500Dave,
          }),
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      let responseBodyDave = await responseDave.json();
      daveHoldingId = responseBodyDave.requestId;

      // Wait time to make sure Node creation is done
      await new Promise((resolve) => setTimeout(resolve, 5000));
      responseDave = await fetch(
        `https://localhost:8888/api/v1/virtualnode/status/${daveHoldingId}`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      responseBodyDave = await responseDave.json();
      expect(responseBodyDave.status).toBe("SUCCEEDED");
      //NotaryRep1
      let responseNotaryRep1 = await fetch(
        `https://localhost:8888/api/v1/virtualnode`,
        {
          method: "POST",
          body: JSON.stringify({
            cpiFileChecksum: operatorCpiHash,
            x500Name: X500NotaryRep1,
          }),
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      let responseBodyNotaryRep1 = await responseNotaryRep1.json();
      notaryRep1HoldingId = responseBodyNotaryRep1.requestId;

      // Wait time to make sure Node creation is done
      await new Promise((resolve) => setTimeout(resolve, 5000));
      responseNotaryRep1 = await fetch(
        `https://localhost:8888/api/v1/virtualnode/status/${notaryRep1HoldingId}`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      responseBodyNotaryRep1 = await responseNotaryRep1.json();
      expect(responseBodyNotaryRep1.status).toBe("SUCCEEDED");
    });
    test("Register Virtual Nodes", async () => {
      let responseAlice = await fetch(
        `https://localhost:8888/api/v1/membership/${aliceHoldingId}`,
        {
          method: "POST",
          body: JSON.stringify({
            context: {
              "corda.key.scheme": "CORDA.ECDSA.SECP256R1",
            },
          }),
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      let responseBodyAlice = await responseAlice.json();
      const aliceRequestId = responseBodyAlice.registrationId;
      // Wait time to make sure Approval is done
      await new Promise((resolve) => setTimeout(resolve, 30000));
      responseAlice = await fetch(
        `https://localhost:8888/api/v1/membership/${aliceHoldingId}/${aliceRequestId}`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      responseBodyAlice = await responseAlice.json();
      console.log(
        "checking alice approval " + JSON.stringify(responseBodyAlice),
      );
      expect(responseBodyAlice.registrationStatus).toBe("APPROVED");

      //BOB
      let responseBob = await fetch(
        `https://localhost:8888/api/v1/membership/${bobHoldingId}`,
        {
          method: "POST",
          body: JSON.stringify({
            context: {
              "corda.key.scheme": "CORDA.ECDSA.SECP256R1",
            },
          }),
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      let responseBodyBob = await responseBob.json();
      const bobRequestId = responseBodyBob.registrationId;
      // Wait time to make sure Approval is done
      await new Promise((resolve) => setTimeout(resolve, 30000));
      responseBob = await fetch(
        `https://localhost:8888/api/v1/membership/${bobHoldingId}/${bobRequestId}`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      responseBodyBob = await responseBob.json();
      console.log("checking bob approval " + JSON.stringify(responseBodyBob));
      expect(responseBodyBob.registrationStatus).toBe("APPROVED");

      //Charlie
      let responseCharlie = await fetch(
        `https://localhost:8888/api/v1/membership/${charlieHoldingId}`,
        {
          method: "POST",
          body: JSON.stringify({
            context: {
              "corda.key.scheme": "CORDA.ECDSA.SECP256R1",
            },
          }),
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      let responseBodyCharlie = await responseCharlie.json();
      const charlieRequestId = responseBodyCharlie.registrationId;
      // Wait time to make sure Approval is done
      await new Promise((resolve) => setTimeout(resolve, 30000));
      responseCharlie = await fetch(
        `https://localhost:8888/api/v1/membership/${charlieHoldingId}/${charlieRequestId}`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      responseBodyCharlie = await responseCharlie.json();
      console.log(
        "checking charlie approval " + JSON.stringify(responseBodyCharlie),
      );
      expect(responseBodyCharlie.registrationStatus).toBe("APPROVED");
      //Dave
      let responseDave = await fetch(
        `https://localhost:8888/api/v1/membership/${daveHoldingId}`,
        {
          method: "POST",
          body: JSON.stringify({
            context: {
              "corda.key.scheme": "CORDA.ECDSA.SECP256R1",
            },
          }),
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      let responseBodyDave = await responseDave.json();
      const daveRequestId = responseBodyDave.registrationId;
      // Wait time to make sure Approval is done
      await new Promise((resolve) => setTimeout(resolve, 30000));
      responseDave = await fetch(
        `https://localhost:8888/api/v1/membership/${daveHoldingId}/${daveRequestId}`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      responseBodyDave = await responseDave.json();
      console.log("checking dave approval " + JSON.stringify(responseBodyDave));
      expect(responseBodyDave.registrationStatus).toBe("APPROVED");
      //NotaryRep
      let responseNotaryRep1 = await fetch(
        `https://localhost:8888/api/v1/membership/${notaryRep1HoldingId}`,
        {
          method: "POST",
          body: JSON.stringify({
            context: {
              "corda.key.scheme": "CORDA.ECDSA.SECP256R1",
            },
          }),
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      let responseBodyNotaryRep1 = await responseNotaryRep1.json();
      const notaryRep1RequestId = responseBodyNotaryRep1.registrationId;
      // Wait time to make sure Approval is done
      await new Promise((resolve) => setTimeout(resolve, 60000));
      responseNotaryRep1 = await fetch(
        `https://localhost:8888/api/v1/membership/${notaryRep1HoldingId}/${notaryRep1RequestId}`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
          },
          agent: agent,
        },
      );
      responseBodyNotaryRep1 = await responseNotaryRep1.json();
      console.log(
        "checking notaryRep1 approval " +
          JSON.stringify(responseBodyNotaryRep1),
      );
      expect(responseBodyNotaryRep1.registrationStatus).toBe("APPROVED");
    });
    test("Start Sample Flow", async () => {
      const createSampleFlow = {
        clientRequestId: "create-1",
        flowClassName:
          "com.r3.developers.csdetemplate.utxoexample.workflows.CreateNewChatFlow",
        requestBody: {
          chatName: "Chat with Bob",
          otherMember: "CN=Bob, OU=Test Dept, O=R3, L=London, C=GB",
          message: "Hello Bob",
        },
      };
      const cordaReqBuff = Buffer.from(JSON.stringify(createSampleFlow));
      const response = await fetch(
        `https://localhost:8888/api/v1/flow/${aliceHoldingId}`,
        {
          method: `POST`,
          headers: {
            Authorization: auth,
          },
          body: cordaReqBuff,
          agent,
        },
      );
      const responseBody = await response.json();
      expect(responseBody.flowStatus).toBe("START_REQUESTED");
    });
    test("Get sample flow", async () => {
      const response2 = await fetch(
        `https://localhost:8888/api/v1/flow/${aliceHoldingId}/create-1`,
        {
          method: `GET`,
          headers: {
            Authorization: auth,
          },
          agent,
        },
      );
      const response2Body = await response2.json();
      console.log(response2Body);
      expect(response2Body.flowStatus).toBe("COMPLETED");
    });
  });
});
