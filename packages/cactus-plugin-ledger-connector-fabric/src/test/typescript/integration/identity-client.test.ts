import axios from "axios";
import { v4 as internalIpV4 } from "internal-ip";
import {
  Containers,
  VaultTestServer,
  K_DEFAULT_VAULT_HTTP_PORT,
  WsTestServer,
  WS_IDENTITY_HTTP_PORT,
} from "@hyperledger/cactus-test-tooling";
import test, { Test } from "tape-promise/tape";
import { InternalIdentityClient } from "../../../main/typescript/identity/internal/client";
import { VaultTransitClient } from "../../../main/typescript/identity/vault-client";
import { WebSocketClient } from "../../../main/typescript/identity/web-socket-client";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { createHash } from "crypto";
import { ECCurveType } from "../../../main/typescript/identity/internal/crypto-util";
import { KJUR } from "jsrsasign";
import { WsWallet, ECCurveType as ECCurveTypeW } from "ws-wallet";
import { WsIdentityClient } from "ws-identity-client";

const logLevel: LogLevelDesc = "ERROR";
// a generic test suite for testing all the identity clients
// supported by this package
test("identity-clients", async (t: Test) => {
  const testClients: Map<string, InternalIdentityClient> = new Map();
  const testECP256 = "test-ec-p256";
  const testECP384 = "test-ec-p384";
  const testNotFoundKey = "keyNotFound";
  {
    const IpAdd = await internalIpV4();
    //
    // setup web-socket client
    const wsTestContainer = new WsTestServer({
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
    const vaultTestContainer = new VaultTestServer({});
    await vaultTestContainer.start();
    ci = await Containers.getById(vaultTestContainer.containerId);
    const hostPort = await Containers.getPublicPort(
      K_DEFAULT_VAULT_HTTP_PORT,
      ci,
    );

    const vaultHost = `http://${IpAdd}:${hostPort}`;
    const wsUrl = `http://${IpAdd}:${wsHostPort}`;

    // External client with private key
    const wsWallet256 = new WsWallet({
      keyName: "256",
      logLevel,
      strictSSL: false,
    });

    // establish session Id to be used by external client with p384 key
    const wsWallet384 = new WsWallet({
      keyName: "384",
      curve: "p384" as ECCurveTypeW,
      logLevel,
      strictSSL: false,
    });

    test.onFinish(async () => {
      await wsTestContainer.stop();
      await wsTestContainer.destroy();
      await vaultTestContainer.stop();
      await vaultTestContainer.destroy();
      await wsWallet384.close();
      await wsWallet256.close();
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
  }

  //
  for (const [clientName, client] of testClients) {
    const digest = Buffer.from("Hello Cactus");
    const hashDigest = createHash("sha256").update(digest).digest();
    t.test(`${clientName}::sign`, async (t: Test) => {
      if (
        clientName == "web-socket-client-256" ||
        clientName == "vault-client"
      ) {
        const { sig, crv } = await client.sign(testECP256, hashDigest);
        t.equal(crv, ECCurveType.P256);
        t.ok(sig);
        {
          // asn1 encoding check
          const pSig = (KJUR.crypto.ECDSA as any).parseSigHexInHexRS(
            sig.toString("hex"),
          ) as { r: string; s: string };
          const re = /[0-9A-Fa-f]{6}/g;
          t.true(re.test(pSig.r));
          t.true(re.test(pSig.s));
        }

        {
          // signature verification
          const pub = await client.getPub(testECP256);
          const verify = new KJUR.crypto.Signature({ alg: "SHA256withECDSA" });
          verify.init(pub);
          verify.updateHex(digest.toString("hex"));
          t.true(verify.verify(sig.toString("hex")));
        }
      }
      if (
        clientName == "web-socket-client-384" ||
        clientName == "vault-client"
      ) {
        const { sig, crv } = await client.sign(testECP384, hashDigest);
        t.equal(crv, ECCurveType.P384);
        t.ok(sig);
        {
          // asn1 encoding check
          const pSig = (KJUR.crypto.ECDSA as any).parseSigHexInHexRS(
            sig.toString("hex"),
          ) as { r: string; s: string };
          const re = /[0-9A-Fa-f]{6}/g;
          t.true(re.test(pSig.r));
          t.true(re.test(pSig.s));
        }

        {
          // signature verification
          const pub = await client.getPub(testECP384);
          const verify = new KJUR.crypto.Signature({ alg: "SHA256withECDSA" });
          verify.init(pub);
          verify.updateHex(digest.toString("hex"));
          t.true(verify.verify(sig.toString("hex")));
        }
      }
      t.end();
    });
    t.test(`${clientName}::getPub`, async (t: Test) => {
      if (
        clientName == "web-socket-client-256" ||
        clientName == "vault-client"
      ) {
        const pub = await client.getPub(testECP256);
        t.ok(pub);
        t.equal((pub as any).curveName, "secp256r1");
      }
      if (
        //clientName == "web-socket-client-384" ||
        clientName == "vault-client"
      ) {
        const pub = await client.getPub(testECP384);
        t.ok(pub);
        t.equal((pub as any).curveName, "secp384r1");
      }
      if (clientName == "vault-client") {
        try {
          await client.getPub(testNotFoundKey);
          t.fail("Should not get here");
        } catch (error) {
          t.true(
            (error as Error).message.includes(
              `keyName = ${testNotFoundKey} not found`,
            ),
          );
        }
      }
      t.end();
    });
    t.test(`${clientName}::rotateKey`, async (t: Test) => {
      if (clientName == "vault-client") {
        const pubOld = await client.getPub(testECP256);
        await client.rotateKey(testECP256);
        const pubNew = await client.getPub(testECP256);
        {
          // public key should be different
          t.notEqual(pubNew.getPublicKeyXYHex(), pubOld.getPublicKeyXYHex());
        }
        {
          // signature should be made using new key
          const { sig } = await client.sign(testECP256, hashDigest);
          const verify = new KJUR.crypto.Signature({ alg: "SHA256withECDSA" });
          verify.init(pubOld);
          verify.updateHex(digest.toString("hex"));
          t.false(verify.verify(sig.toString("hex")));
        }
      }
      if (clientName == "vault-client") {
        const pubOld = await client.getPub(testECP384);
        await client.rotateKey(testECP384);
        const pubNew = await client.getPub(testECP384);
        {
          // public key should be different
          t.notEqual(pubNew.getPublicKeyXYHex(), pubOld.getPublicKeyXYHex());
        }
        {
          // signature should be made using new key
          const { sig } = await client.sign(testECP384, hashDigest);
          const verify = new KJUR.crypto.Signature({ alg: "SHA256withECDSA" });
          verify.init(pubOld);
          verify.updateHex(digest.toString("hex"));
          t.false(verify.verify(sig.toString("hex")));
        }
      }
      t.end();
    });
  }
  t.end();
});
