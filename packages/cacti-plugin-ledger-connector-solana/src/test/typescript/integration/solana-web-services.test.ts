/**
 * Integration tests: REST API surface, endpoint registration, error cases
 *
 * Runs against a throwaway containerized localnet via SolanaTestLedger (Docker).
 */
import * as http from "http";
import axios from "axios";
import express from "express";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  PluginLedgerConnectorSolana,
  SolanaSigningCredentialType,
} from "../../../main/typescript/public-api";
import {
  startTestValidator,
  stopTestValidator,
  airdropSol,
} from "./solana-test-validator";

const BASE =
  "/api/v1/plugins/@hyperledger/cacti-plugin-ledger-connector-solana";

describe("Solana Connector – web-service endpoint registration (integration)", () => {
  let connector: PluginLedgerConnectorSolana;
  let server: http.Server;
  let apiBase: string;

  const { publicKey: alicePub, privateKeyBase58: alicePriv } =
    PluginLedgerConnectorSolana.generateKeypairBase58();

  beforeAll(async () => {
    const rpcUrl = await startTestValidator();

    connector = new PluginLedgerConnectorSolana({
      instanceId: "web-services-test",
      rpcApiHttpHost: rpcUrl,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      logLevel: "warn",
    });

    const app = express();
    app.use(express.json());
    server = http.createServer(app);
    await connector.registerWebServices(app);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server.address() as { port: number };
    apiBase = `http://127.0.0.1:${port}`;

    await airdropSol(connector.getConnection(), alicePub, 3);
  }, 300_000);

  afterAll(async () => {
    await connector.shutdown();
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    await stopTestValidator();
  });

  // --- Verify all endpoints are registered ---

  test("POST /get-balance endpoint is reachable", async () => {
    const res = await axios.post(`${apiBase}${BASE}/get-balance`, {
      publicKey: alicePub,
    });
    expect(res.status).toBe(200);
    expect(typeof res.data.lamports).toBe("number");
  });

  test("POST /get-account-info endpoint is reachable", async () => {
    const res = await axios.post(`${apiBase}${BASE}/get-account-info`, {
      publicKey: alicePub,
    });
    expect(res.status).toBe(200);
    expect(res.data.exists).toBe(true);
  });

  test("POST /request-airdrop endpoint is reachable", async () => {
    const { publicKey: newPub } =
      PluginLedgerConnectorSolana.generateKeypairBase58();
    const res = await axios.post(`${apiBase}${BASE}/request-airdrop`, {
      publicKey: newPub,
      lamports: 1_000_000,
    });
    expect(res.status).toBe(200);
    expect(typeof res.data.signature).toBe("string");
  });

  test("POST /transfer-sol endpoint is reachable", async () => {
    const { publicKey: dest } =
      PluginLedgerConnectorSolana.generateKeypairBase58();
    const res = await axios.post(`${apiBase}${BASE}/transfer-sol`, {
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: alicePriv,
      },
      recipientPublicKey: dest,
      // Must be at least the rent-exempt minimum (~890,880 lamports for a
      // 0-data account); a smaller amount to a brand-new account is rejected
      // by the runtime with "insufficient funds for rent".
      lamports: 2_000_000,
    });
    expect(res.status).toBe(200);
    expect(typeof res.data.signature).toBe("string");
  });

  test("GET /get-prometheus-exporter-metrics endpoint is reachable", async () => {
    const res = await axios.get(
      `${apiBase}${BASE}/get-prometheus-exporter-metrics`,
    );
    expect(res.status).toBe(200);
  });

  // --- Error cases ---

  test("POST /get-balance returns 500 for invalid publicKey", async () => {
    let threw = false;
    try {
      await axios.post(`${apiBase}${BASE}/get-balance`, {
        publicKey: "not-a-valid-key",
      });
    } catch (ex: any) {
      threw = true;
      expect(ex.response.status).toBe(500);
      expect(ex.response.data.message).toBe("Internal Server Error");
    }
    expect(threw).toBe(true);
  });

  test("POST /get-account-info returns 500 for invalid publicKey", async () => {
    let threw = false;
    try {
      await axios.post(`${apiBase}${BASE}/get-account-info`, {
        publicKey: "bad-key",
      });
    } catch (ex: any) {
      threw = true;
      expect(ex.response.status).toBe(500);
    }
    expect(threw).toBe(true);
  });

  test("POST /get-transaction returns 500 for unknown signature", async () => {
    const fakeSig =
      "5J2j7NMAQ5XqFnBJVkFMFRUqEzNcFnKgNzqaKqQ2cLsCbzCt5KfQ4YNkS9QBF8P1XjRqUdBZFiFkjNqkHpSzLsN";
    let threw = false;
    try {
      await axios.post(`${apiBase}${BASE}/get-transaction`, {
        signature: fakeSig,
      });
    } catch (ex: any) {
      threw = true;
      expect(ex.response.status).toBe(500);
    }
    expect(threw).toBe(true);
  });

  // Each of these posts a body the connector rejects, exercising the endpoint's
  // catch -> HTTP 500 ({ message: "Internal Server Error" }) mapping.
  async function expectStatus500(
    pathSuffix: string,
    body: unknown,
  ): Promise<void> {
    let threw = false;
    try {
      await axios.post(`${apiBase}${BASE}${pathSuffix}`, body);
    } catch (ex: any) {
      threw = true;
      expect(ex.response.status).toBe(500);
      expect(ex.response.data.message).toBe("Internal Server Error");
    }
    expect(threw).toBe(true);
  }

  test("POST /send-transaction returns 500 for a blank serializedTransaction", async () => {
    await expectStatus500("/send-transaction", {
      serializedTransaction: "",
      signingCredential: { type: SolanaSigningCredentialType.None },
    });
  });

  test("POST /transfer-sol returns 500 for non-positive lamports", async () => {
    await expectStatus500("/transfer-sol", {
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: alicePriv,
      },
      recipientPublicKey: alicePub,
      lamports: 0,
    });
  });

  test("POST /request-airdrop returns 500 for an invalid publicKey", async () => {
    await expectStatus500("/request-airdrop", {
      publicKey: "not-a-valid-key",
      lamports: 1_000_000,
    });
  });

  test("POST /deploy-program returns 500 for an empty program binary", async () => {
    await expectStatus500("/deploy-program", {
      programBinaryBase64: "",
      payerSigningCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: alicePriv,
      },
    });
  });

  test("POST /invoke-instruction returns 500 for a NONE credential", async () => {
    await expectStatus500("/invoke-instruction", {
      abi: { kind: "ANCHOR", idl: {} },
      invocation: { instruction: "increment" },
      signingCredential: { type: SolanaSigningCredentialType.None },
    });
  });

  test("POST /build-instruction returns 500 for a blank feePayer", async () => {
    await expectStatus500("/build-instruction", {
      abi: { kind: "ANCHOR", idl: {} },
      invocation: { instruction: "increment" },
      feePayer: "",
    });
  });

  test("POST /decode-account returns 500 when neither publicKey nor data is supplied", async () => {
    await expectStatus500("/decode-account", {
      abi: { kind: "ANCHOR", idl: {} },
      accountName: "counter",
    });
  });

  test("POST /decode-events returns 500 when neither logs nor signature is supplied", async () => {
    await expectStatus500("/decode-events", {
      abi: { kind: "ANCHOR", idl: {} },
    });
  });

  test("POST /get-fee-for-transaction returns 500 for a blank serializedTransaction", async () => {
    await expectStatus500("/get-fee-for-transaction", {
      serializedTransaction: "",
    });
  });

  // --- Endpoint metadata integrity ---

  test("all registered endpoints have valid path and verb", async () => {
    const endpoints = await connector.getOrCreateWebServices();
    for (const ep of endpoints) {
      const path = ep.getPath();
      const verb = ep.getVerbLowerCase();
      expect(path).toMatch(/^\/api\/v1\/plugins\//);
      expect(["get", "post", "put", "delete"]).toContain(verb);
      expect((ep as any).getOperationId()).toBeTruthy();
    }
  });
});
