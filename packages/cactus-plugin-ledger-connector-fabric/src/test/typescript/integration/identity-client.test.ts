import "jest-extended";
import axios from "axios";
import { v4 as internalIpV4 } from "internal-ip";
import {
  Containers,
  VaultTestServer,
  K_DEFAULT_VAULT_HTTP_PORT,
  WsTestServer,
  WS_IDENTITY_HTTP_PORT,
} from "@hyperledger/cactus-test-tooling";
import { InternalIdentityClient } from "../../../main/typescript/identity/internal/client";
import { VaultTransitClient } from "../../../main/typescript/identity/vault-client";
import { WebSocketClient } from "../../../main/typescript/identity/web-socket-client";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { createHash } from "crypto";
import { ECCurveType } from "../../../main/typescript/identity/internal/crypto-util";
import { KJUR } from "jsrsasign";
import { WsWallet, ECCurveType as ECCurveTypeW } from "ws-wallet";
import { WsIdentityClient } from "ws-identity-client";

// a generic test suite for testing all the identity clients
// supported by this package
describe("identity clients test", () => {
  const logLevel: LogLevelDesc = "ERROR";
  const testClients: Map<string, InternalIdentityClient> = new Map();
  const testECP256 = "test-ec-p256";
  const testECP384 = "test-ec-p384";
  const testNotFoundKey = "keyNotFound";
  let wsTestContainer: WsTestServer;
  let vaultTestContainer: VaultTestServer;
  let IpAdd: string;
  let wsWallet256: WsWallet;
  let wsWallet384: WsWallet;
  let vaultHost: string;
  // let wsPathPrefix: any;
  let wsUrl: string;
  beforeAll(async () => {
    IpAdd = (await internalIpV4()) as string;

    // setup web-socket client
    wsTestContainer = new WsTestServer({
      logLevel,
      imageVersion: "0.0.1",
    });
    await wsTestContainer.start();
    let ci = await Containers.getById(wsTestContainer.containerId);
    const wsHostPort = await Containers.getPublicPort(
      WS_IDENTITY_HTTP_PORT,
      ci,
    );
    // setup vault client
    vaultTestContainer = new VaultTestServer({});
    await vaultTestContainer.start();
    ci = await Containers.getById(vaultTestContainer.containerId);
    const hostPort = await Containers.getPublicPort(
      K_DEFAULT_VAULT_HTTP_PORT,
      ci,
    );
    vaultHost = `http://${IpAdd}:${hostPort}`;
    wsUrl = `http://${IpAdd}:${wsHostPort}`;

    // External client with private key
    wsWallet256 = new WsWallet({
      keyName: "256",
      logLevel,
      strictSSL: false,
    });

    // establish session Id to be used by external client with p384 key
    wsWallet384 = new WsWallet({
      keyName: "384",
      curve: "p384" as ECCurveTypeW,
      logLevel,
      strictSSL: false,
    });

    const mountPath = "/transit";
    const testToken = "myroot";
    // mount transit secret engine

    await axios.post(
      vaultHost + "/v1/sys/mounts" + mountPath,
      {
        type: "transit",
      },
      {
        headers: {
          "X-Vault-Token": testToken,
        },
      },
    );
    await axios.post(
      vaultHost + "/v1" + mountPath + "/keys/" + testECP256,
      {
        type: "ecdsa-p256",
      },
      {
        headers: {
          "X-Vault-Token": testToken,
        },
      },
    );
    await axios.post(
      vaultHost + "/v1" + mountPath + "/keys/" + testECP384,
      {
        type: "ecdsa-p384",
      },
      {
        headers: {
          "X-Vault-Token": testToken,
        },
      },
    );
    testClients.set(
      "vault-client",
      new VaultTransitClient({
        endpoint: vaultHost,
        mountPath: mountPath,
        token: testToken,
        logLevel: logLevel,
      }),
    );

    const wsIdClient = new WsIdentityClient({
      apiVersion: "v1",
      endpoint: wsUrl,
      rpDefaults: {
        strictSSL: false,
      },
    });

    const wsPathPrefix = "/identity";
    {
      const newSidResp = JSON.parse(
        await wsIdClient.write(
          "session/new",
          {
            pubKeyHex: wsWallet256.getPubKeyHex(),
            keyName: wsWallet256.keyName,
          },
          {},
        ),
      );
      const { signature, sessionId } = await wsWallet256.open(
        newSidResp.sessionId,
        newSidResp.url,
      );

      testClients.set(
        "web-socket-client-256",
        new WebSocketClient({
          endpoint: wsUrl,
          pathPrefix: wsPathPrefix,
          signature,
          sessionId,
          logLevel,
        }),
      );
    }
    {
      const newSidResp = JSON.parse(
        await wsIdClient.write(
          "session/new",
          {
            pubKeyHex: wsWallet384.getPubKeyHex(),
            keyName: wsWallet384.keyName,
          },
          {},
        ),
      );
      const { signature, sessionId } = await wsWallet384.open(
        newSidResp.sessionId,
        newSidResp.url,
      );
      testClients.set(
        "web-socket-client-384",
        new WebSocketClient({
          endpoint: wsUrl,
          pathPrefix: wsPathPrefix,
          signature,
          sessionId,
          logLevel,
        }),
      );
    }
  });
  afterAll(async () => {
    await wsTestContainer.stop();
    await wsTestContainer.destroy();
    await vaultTestContainer.stop();
    await vaultTestContainer.destroy();
    await wsWallet384.close();
    await wsWallet256.close();
  });

  it("sign and verify for all clients", async () => {
    const digest = Buffer.from("Hello Cactus");
    const hashDigest = createHash("sha256").update(digest).digest();

    for (const [clientName, client] of testClients.entries()) {
      if (
        clientName === "web-socket-client-256" ||
        clientName === "vault-client"
      ) {
        const { sig, crv } = await client.sign(testECP256, hashDigest);
        expect(crv).toBe(ECCurveType.P256);
        expect(sig).toBeTruthy();

        // ASN.1 encoding check
        const pSig = (KJUR.crypto.ECDSA as any).parseSigHexInHexRS(
          sig.toString("hex"),
        );
        const re = /[0-9A-Fa-f]{6}/g;
        expect(re.test(pSig.r)).toBeTruthy();
        expect(re.test(pSig.s)).toBeTruthy();

        // Signature verification
        const pub = await client.getPub(testECP256);
        const verify = new KJUR.crypto.Signature({ alg: "SHA256withECDSA" });
        verify.init(pub);
        verify.updateHex(digest.toString("hex"));
        expect(verify.verify(sig.toString("hex"))).toBeTruthy();
      }

      if (
        clientName === "web-socket-client-384" ||
        clientName === "vault-client"
      ) {
        const { sig, crv } = await client.sign(testECP384, hashDigest);
        expect(crv).toBe(ECCurveType.P384);
        expect(sig).toBeTruthy();

        // ASN.1 encoding check
        const pSig = (KJUR.crypto.ECDSA as any).parseSigHexInHexRS(
          sig.toString("hex"),
        );
        const re = /[0-9A-Fa-f]{6}/g;
        expect(re.test(pSig.r)).toBeTruthy();
        expect(re.test(pSig.s)).toBeTruthy();

        // Signature verification
        const pub = await client.getPub(testECP384);
        const verify = new KJUR.crypto.Signature({ alg: "SHA256withECDSA" });
        verify.init(pub);
        verify.updateHex(digest.toString("hex"));
        expect(verify.verify(sig.toString("hex"))).toBeTruthy();
      }
    }
  });

  it("getPub for all clients", async () => {
    for (const [clientName, client] of testClients.entries()) {
      if (
        clientName === "web-socket-client-256" ||
        clientName === "vault-client"
      ) {
        const pub = await client.getPub(testECP256);
        expect(pub).toBeTruthy();
        expect((pub as any).curveName).toBe("secp256r1");
      }
      if (clientName === "vault-client") {
        const pub = await client.getPub(testECP384);
        expect(pub).toBeTruthy();
        expect((pub as any).curveName).toBe("secp384r1");

        try {
          await client.getPub(testNotFoundKey);
          throw new Error("Should not get here");
        } catch (error) {
          expect((error as Error).message).toContain(
            `keyName = ${testNotFoundKey} not found`,
          );
        }
      }
    }
  });

  it("rotateKey for all clients", async () => {
    const digest = Buffer.from("Hello Cactus");
    const hashDigest = createHash("sha256").update(digest).digest();

    for (const [clientName, client] of testClients.entries()) {
      if (clientName === "vault-client") {
        const pubOld256 = await client.getPub(testECP256);
        await client.rotateKey(testECP256);
        const pubNew256 = await client.getPub(testECP256);

        // Public key should be different
        expect(pubNew256.getPublicKeyXYHex()).not.toBe(
          pubOld256.getPublicKeyXYHex(),
        );

        // Signature should be made using the new key
        const { sig } = await client.sign(testECP256, hashDigest);
        const verify = new KJUR.crypto.Signature({ alg: "SHA256withECDSA" });
        verify.init(pubOld256);
        verify.updateHex(digest.toString("hex"));
        expect(verify.verify(sig.toString("hex"))).toBeFalsy();
      }

      if (clientName === "vault-client") {
        const pubOld384 = await client.getPub(testECP384);
        await client.rotateKey(testECP384);
        const pubNew384 = await client.getPub(testECP384);

        // Public key should be different
        expect(pubNew384.getPublicKeyXYHex()).not.toBe(
          pubOld384.getPublicKeyXYHex(),
        );

        // Signature should be made using the new key
        const { sig } = await client.sign(testECP384, hashDigest);
        const verify = new KJUR.crypto.Signature({ alg: "SHA256withECDSA" });
        verify.init(pubOld384);
        verify.updateHex(digest.toString("hex"));
        expect(verify.verify(sig.toString("hex"))).toBeFalsy();
      }
    }
  });
});
