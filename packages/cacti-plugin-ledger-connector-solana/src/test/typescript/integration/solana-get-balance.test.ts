/**
 * Integration tests: getBalance and getAccountInfo
 *
 * Runs against a throwaway containerized localnet via SolanaTestLedger (Docker).
 */
import * as http from "http";
import express from "express";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  PluginLedgerConnectorSolana,
  SolanaApiClient,
} from "../../../main/typescript/public-api";
import {
  startTestValidator,
  stopTestValidator,
  airdropSol,
} from "./solana-test-validator";

describe("Solana Connector – getBalance / getAccountInfo (integration)", () => {
  let connector: PluginLedgerConnectorSolana;
  let server: http.Server;
  let apiClient: SolanaApiClient;
  const { publicKey: alicePubKey } =
    PluginLedgerConnectorSolana.generateKeypairBase58();

  beforeAll(async () => {
    const rpcUrl = await startTestValidator();

    connector = new PluginLedgerConnectorSolana({
      instanceId: "balance-test",
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

    apiClient = new SolanaApiClient({ basePath: `http://127.0.0.1:${port}` });

    // Fund Alice so she has a non-zero balance.
    await airdropSol(connector.getConnection(), alicePubKey, 2);
  }, 300_000);

  afterAll(async () => {
    await connector.shutdown();
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    await stopTestValidator();
  });

  // --- direct SDK ---

  test("connector.getBalance returns positive lamports after airdrop", async () => {
    const { lamports } = await connector.getBalance({ publicKey: alicePubKey });
    expect(lamports).toBeGreaterThan(0);
    expect(lamports).toBe(2 * PluginLedgerConnectorSolana.LAMPORTS_PER_SOL);
  });

  test("connector.getBalance on unknown account returns 0", async () => {
    const { publicKey: stranger } =
      PluginLedgerConnectorSolana.generateKeypairBase58();
    const { lamports } = await connector.getBalance({ publicKey: stranger });
    expect(lamports).toBe(0);
  });

  test("connector.getAccountInfo returns exists=true for funded account", async () => {
    const info = await connector.getAccountInfo({ publicKey: alicePubKey });
    expect(info.exists).toBe(true);
    expect(info.lamports).toBeGreaterThan(0);
    expect(typeof info.owner).toBe("string");
    expect(typeof info.executable).toBe("boolean");
  });

  test("connector.getAccountInfo returns exists=false for unfunded account", async () => {
    const { publicKey: stranger } =
      PluginLedgerConnectorSolana.generateKeypairBase58();
    const info = await connector.getAccountInfo({ publicKey: stranger });
    expect(info.exists).toBe(false);
  });

  // --- via REST API ---

  test("POST /get-balance via HTTP returns 200 with lamports", async () => {
    const { data, status } = await apiClient.getBalanceV1({
      publicKey: alicePubKey,
    });
    expect(status).toBe(200);
    expect(data.lamports).toBeGreaterThan(0);
  });

  test("POST /get-account-info via HTTP returns 200 with account details", async () => {
    const { data, status } = await apiClient.getAccountInfoV1({
      publicKey: alicePubKey,
    });
    expect(status).toBe(200);
    expect(data.exists).toBe(true);
    expect(data.lamports).toBeGreaterThan(0);
  });

  test("GET /get-prometheus-exporter-metrics returns 200 text/plain", async () => {
    const { data, status } = await apiClient.getPrometheusExporterMetricsV1();
    expect(status).toBe(200);
    expect(typeof data).toBe("string");
  });
});
