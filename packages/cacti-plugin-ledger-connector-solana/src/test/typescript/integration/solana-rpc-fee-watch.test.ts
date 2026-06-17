/**
 * Integration tests for the generic-RPC passthrough, fee estimation, and the
 * socket.io block/slot streaming (watchBlocks). Runs against a throwaway
 * containerized localnet via SolanaTestLedger (Docker), with a socket.io
 * server attached so the ApiClient's watchBlocksV1 Observable can receive
 * slot events.
 */
import * as http from "http";
import express from "express";
import { Server as SocketIoServer } from "socket.io";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Constants } from "@hyperledger/cactus-core-api";
import {
  PluginLedgerConnectorSolana,
  SolanaApiClient,
} from "../../../main/typescript/public-api";
import type {
  WatchBlocksV1Progress,
  WatchLogsV1Progress,
} from "../../../main/typescript/public-api";
import { startTestValidator, stopTestValidator } from "./solana-test-validator";

describe("Solana Connector – invokeRpc / fee / watchBlocks (integration)", () => {
  let connector: PluginLedgerConnectorSolana;
  let server: http.Server;
  let wsApi: SocketIoServer;
  let apiClient: SolanaApiClient;

  beforeAll(async () => {
    const rpcUrl = await startTestValidator();

    connector = new PluginLedgerConnectorSolana({
      instanceId: "rpc-fee-watch-test",
      rpcApiHttpHost: rpcUrl,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      logLevel: "warn",
    });

    const app = express();
    app.use(express.json());
    server = http.createServer(app);
    wsApi = new SocketIoServer(server, {
      path: Constants.SocketIoConnectionPathV1,
    });
    await connector.registerWebServices(app, wsApi);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server.address() as { port: number };
    apiClient = new SolanaApiClient({ basePath: `http://127.0.0.1:${port}` });
  }, 300_000);

  afterAll(async () => {
    await connector.shutdown();
    // socket.io's close() also closes the HTTP server it is attached to, so we
    // must not call server.close() separately (it would throw "not running").
    if (wsApi) {
      await new Promise<void>((resolve) => wsApi.close(() => resolve()));
    }
    await stopTestValidator();
  });

  // --- invokeRpc (generic JSON-RPC passthrough) ---

  test("invokeRpc(getSlot) returns a numeric slot", async () => {
    const { data, status } = await apiClient.invokeRpcV1({ method: "getSlot" });
    expect(status).toBe(200);
    expect(typeof data.result).toBe("number");
    expect(data.result as number).toBeGreaterThanOrEqual(0);
  });

  test("invokeRpc(getVersion) returns the node version object", async () => {
    const { data } = await apiClient.invokeRpcV1({ method: "getVersion" });
    expect(data.result).toBeTruthy();
    expect(
      (data.result as Record<string, unknown>)["solana-core"],
    ).toBeDefined();
  });

  test("invokeRpc forwards params (getBalance of a funded account)", async () => {
    const kp = Keypair.generate();
    await connector.requestAirdrop({
      publicKey: kp.publicKey.toBase58(),
      lamports: 1_000_000_000,
    });
    const { data } = await apiClient.invokeRpcV1({
      method: "getBalance",
      // Forward both a positional pubkey AND an options object (read at the same
      // commitment the airdrop was confirmed at).
      params: [kp.publicKey.toBase58(), { commitment: "confirmed" }],
    });
    // getBalance result is { context, value }
    const value = (data.result as { value: number }).value;
    expect(value).toBe(1_000_000_000);
  });

  test("invokeRpc rejects an unknown RPC method (500)", async () => {
    await expect(
      apiClient.invokeRpcV1({ method: "thisRpcMethodDoesNotExist" }),
    ).rejects.toThrow();
  });

  // --- fee estimation ---

  test("getFeeForTransaction returns a fee for a built transfer", async () => {
    const conn = connector.getConnection();
    const payer = Keypair.generate().publicKey;
    const { blockhash } = await conn.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: payer,
      recentBlockhash: blockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: Keypair.generate().publicKey,
        lamports: 1000,
      }),
    );
    const serialized = tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64");

    const { data, status } = await apiClient.getFeeForTransactionV1({
      serializedTransaction: serialized,
    });
    expect(status).toBe(200);
    expect(typeof data.lamports).toBe("number");
    expect(data.lamports as number).toBeGreaterThan(0);
  });

  test("getFeeForTransaction returns null for an unknown/expired blockhash", async () => {
    const payer = Keypair.generate().publicKey;
    // A well-formed but never-produced blockhash: the node has no record of it,
    // so getFeeForMessage resolves to a null fee.
    const staleBlockhash = Keypair.generate().publicKey.toBase58();
    const tx = new Transaction({
      feePayer: payer,
      recentBlockhash: staleBlockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: Keypair.generate().publicKey,
        lamports: 1000,
      }),
    );
    const serialized = tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64");

    const { data, status } = await apiClient.getFeeForTransactionV1({
      serializedTransaction: serialized,
    });
    expect(status).toBe(200);
    expect(data.lamports).toBeNull();
  });

  // --- watchBlocks (socket.io slot streaming) ---

  test("watchBlocksV1 streams new slots", async () => {
    const received: WatchBlocksV1Progress[] = [];
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("no slot events within 20s")),
        20_000,
      );
      const sub = apiClient.watchBlocksV1().subscribe({
        next: (progress) => {
          received.push(progress);
          if (received.length >= 3) {
            clearTimeout(timer);
            sub.unsubscribe();
            resolve();
          }
        },
        error: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
    });

    expect(received.length).toBeGreaterThanOrEqual(3);
    for (const p of received) {
      expect(typeof p.slot).toBe("number");
    }
    // Slots are monotonically non-decreasing.
    expect(received[received.length - 1].slot).toBeGreaterThanOrEqual(
      received[0].slot,
    );
  }, 30_000);

  // --- watchLogs (socket.io log streaming, onLogs subscription) ---

  test("watchLogsV1 streams logs for a program (System)", async () => {
    const received: WatchLogsV1Progress[] = [];
    let trigger: ReturnType<typeof setInterval>;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        clearInterval(trigger);
        reject(new Error("no log events within 20s"));
      }, 20_000);

      const sub = apiClient
        .watchLogsV1({ programId: SystemProgram.programId.toBase58() })
        .subscribe({
          next: (progress) => {
            received.push(progress);
            clearTimeout(timer);
            clearInterval(trigger);
            sub.unsubscribe();
            resolve();
          },
          error: (err) => {
            clearTimeout(timer);
            clearInterval(trigger);
            reject(err);
          },
        });

      // Generate System-program activity (airdrops are System transfers) until
      // a log event arrives — covers the async subscription-activation window.
      trigger = setInterval(() => {
        void connector
          .getConnection()
          .requestAirdrop(Keypair.generate().publicKey, 1_000_000)
          .catch(() => undefined);
      }, 1000);
    });

    expect(received.length).toBeGreaterThanOrEqual(1);
    expect(typeof received[0].signature).toBe("string");
    expect(Array.isArray(received[0].logs)).toBe(true);
    expect(received[0].logs.length).toBeGreaterThan(0);
  }, 30_000);

  test("watchLogsV1 errors the Observable when the programId is invalid", async () => {
    // An unparseable programId makes the server-side subscribe throw; the
    // connector emits WatchLogsV1.Error, which surfaces as an Observable error.
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("no error within 10s")),
        10_000,
      );
      const sub = apiClient
        .watchLogsV1({ programId: "not-a-valid-base58-key" })
        .subscribe({
          next: () => {
            clearTimeout(timer);
            sub.unsubscribe();
            reject(new Error("expected an error, received a log event"));
          },
          error: () => {
            clearTimeout(timer);
            resolve();
          },
        });
    });
  }, 15_000);
});
