/**
 * Integration tests: sendTransaction and getTransaction
 *
 * Runs against a throwaway containerized localnet via SolanaTestLedger (Docker).
 * Demonstrates building a raw legacy Transaction (SOL transfer), serialising
 * it as base64, and submitting it through the connector's sendTransaction endpoint.
 */
import * as http from "http";
import express from "express";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  PluginLedgerConnectorSolana,
  SolanaSigningCredentialType,
} from "../../../main/typescript/public-api";
import { SolanaApiClient } from "../../../main/typescript/api-client/solana-api-client";
import {
  startTestValidator,
  stopTestValidator,
  airdropSol,
} from "./solana-test-validator";

describe("Solana Connector – sendTransaction / getTransaction (integration)", () => {
  let connector: PluginLedgerConnectorSolana;
  let conn: Connection;
  let server: http.Server;
  let apiClient: SolanaApiClient;

  const senderKp = Keypair.generate();
  const recipientKp = Keypair.generate();
  const senderPrivBase58 = bs58.encode(senderKp.secretKey);

  beforeAll(async () => {
    const rpcUrl = await startTestValidator();

    connector = new PluginLedgerConnectorSolana({
      instanceId: "send-tx-test",
      rpcApiHttpHost: rpcUrl,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      logLevel: "warn",
    });
    conn = connector.getConnection();

    const app = express();
    app.use(express.json());
    server = http.createServer(app);
    await connector.registerWebServices(app);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server.address() as { port: number };
    apiClient = new SolanaApiClient({ basePath: `http://127.0.0.1:${port}` });

    await airdropSol(conn, senderKp.publicKey.toBase58(), 5);
  }, 300_000);

  afterAll(async () => {
    await connector.shutdown();
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    await stopTestValidator();
  });

  async function buildUnsignedTransfer(
    from: PublicKey,
    to: PublicKey,
    lamports: number,
  ): Promise<string> {
    const { blockhash } = await conn.getLatestBlockhash();
    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: from,
    }).add(
      SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports }),
    );
    return tx.serialize({ requireAllSignatures: false }).toString("base64");
  }

  // --- sendTransaction via connector SDK ---

  test("sendTransaction signs and confirms a legacy SOL transfer", async () => {
    const recipientBefore = await connector.getBalance({
      publicKey: recipientKp.publicKey.toBase58(),
    });
    const transferLamports = 0.25 * LAMPORTS_PER_SOL;

    const serialized = await buildUnsignedTransfer(
      senderKp.publicKey,
      recipientKp.publicKey,
      transferLamports,
    );

    const { signature } = await connector.sendTransaction({
      serializedTransaction: serialized,
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: senderPrivBase58,
      },
    });

    expect(typeof signature).toBe("string");
    expect(signature.length).toBeGreaterThan(0);

    const recipientAfter = await connector.getBalance({
      publicKey: recipientKp.publicKey.toBase58(),
    });
    expect(recipientAfter.lamports - recipientBefore.lamports).toBe(
      transferLamports,
    );
  });

  test("sendTransaction with NONE credential accepts a pre-signed transaction", async () => {
    const { blockhash } = await conn.getLatestBlockhash();
    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderKp.publicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: senderKp.publicKey,
        toPubkey: recipientKp.publicKey,
        lamports: 1000,
      }),
    );
    tx.sign(senderKp);

    const serialized = tx.serialize().toString("base64");
    const { signature } = await connector.sendTransaction({
      serializedTransaction: serialized,
      signingCredential: { type: SolanaSigningCredentialType.None },
    });
    expect(typeof signature).toBe("string");
  });

  test("sendTransaction signs and confirms a versioned (v0) transfer with skipPreflight", async () => {
    const recipientBefore = await connector.getBalance({
      publicKey: recipientKp.publicKey.toBase58(),
    });
    const transferLamports = 7000;

    const { blockhash } = await conn.getLatestBlockhash();
    const message = new TransactionMessage({
      payerKey: senderKp.publicKey,
      recentBlockhash: blockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: senderKp.publicKey,
          toPubkey: recipientKp.publicKey,
          lamports: transferLamports,
        }),
      ],
    }).compileToV0Message();
    // Unsigned versioned tx: the connector signs it server-side (PRIVATE_KEY_BASE58).
    const vtx = new VersionedTransaction(message);
    const serialized = Buffer.from(vtx.serialize()).toString("base64");

    const { signature } = await connector.sendTransaction({
      serializedTransaction: serialized,
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: senderPrivBase58,
      },
      skipPreflight: true,
    });
    expect(typeof signature).toBe("string");
    expect(signature.length).toBeGreaterThan(0);

    const recipientAfter = await connector.getBalance({
      publicKey: recipientKp.publicKey.toBase58(),
    });
    expect(recipientAfter.lamports - recipientBefore.lamports).toBe(
      transferLamports,
    );
  });

  test("sendTransaction throws when a landed transaction confirms with an error", async () => {
    // Transfer far more than the balance: with skipPreflight the tx still lands,
    // then fails at execution, so confirmation carries an error.
    const { blockhash } = await conn.getLatestBlockhash();
    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderKp.publicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: senderKp.publicKey,
        toPubkey: recipientKp.publicKey,
        lamports: 1_000_000 * LAMPORTS_PER_SOL,
      }),
    );
    tx.sign(senderKp);
    const serialized = tx.serialize().toString("base64");

    await expect(
      connector.sendTransaction({
        serializedTransaction: serialized,
        signingCredential: { type: SolanaSigningCredentialType.None },
        skipPreflight: true,
      }),
    ).rejects.toThrow(/confirmed with error/);
  });

  // --- getTransaction ---

  test("getTransaction returns metadata for a confirmed tx", async () => {
    // First send a transaction to get a known signature.
    const serialized = await buildUnsignedTransfer(
      senderKp.publicKey,
      recipientKp.publicKey,
      5000,
    );
    const { signature } = await connector.sendTransaction({
      serializedTransaction: serialized,
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: senderPrivBase58,
      },
    });

    const txInfo = await connector.getTransaction({ signature });
    expect(txInfo.signature).toBe(signature);
    expect(typeof txInfo.slot).toBe("number");
    expect(txInfo.err).toBeNull();
    expect(Array.isArray(txInfo.preBalances)).toBe(true);
    expect(Array.isArray(txInfo.postBalances)).toBe(true);
  });

  test("getTransaction rejects for an unknown signature", async () => {
    const fakeSignature =
      "5J2j7NMAQ5XqFnBJVkFMFRUqEzNcFnKgNzqaKqQ2cLsCbzCt5KfQ4YNkS9QBF8P1XjRqUdBZFiFkjNqkHpSzLsN";
    await expect(
      connector.getTransaction({ signature: fakeSignature }),
    ).rejects.toThrow();
  });

  // --- via REST ---

  test("POST /send-transaction via HTTP returns 200", async () => {
    const serialized = await buildUnsignedTransfer(
      senderKp.publicKey,
      recipientKp.publicKey,
      2000,
    );
    const { data, status } = await apiClient.sendTransactionV1({
      serializedTransaction: serialized,
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: senderPrivBase58,
      },
    });
    expect(status).toBe(200);
    expect(typeof data.signature).toBe("string");
  });

  test("POST /get-transaction via HTTP returns 200 with metadata", async () => {
    const serialized = await buildUnsignedTransfer(
      senderKp.publicKey,
      recipientKp.publicKey,
      3000,
    );
    const sendRes = await apiClient.sendTransactionV1({
      serializedTransaction: serialized,
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: senderPrivBase58,
      },
    });

    const { data, status } = await apiClient.getTransactionV1({
      signature: sendRes.data.signature,
    });
    expect(status).toBe(200);
    expect(data.signature).toBe(sendRes.data.signature);
    expect(typeof data.slot).toBe("number");
  });

  // --- Prometheus ---

  test("transaction count increments in Prometheus metrics", async () => {
    const before = connector.getPrometheusExporter().txCount;
    const serialized = await buildUnsignedTransfer(
      senderKp.publicKey,
      recipientKp.publicKey,
      1000,
    );
    await connector.sendTransaction({
      serializedTransaction: serialized,
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: senderPrivBase58,
      },
    });
    const after = connector.getPrometheusExporter().txCount;
    expect(after).toBe(before + 1);
  });
});
