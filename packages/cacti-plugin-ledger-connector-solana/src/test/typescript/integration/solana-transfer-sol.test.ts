/**
 * Integration tests: transferSol and requestAirdrop
 *
 * Runs against a throwaway containerized localnet via SolanaTestLedger (Docker).
 */
import * as http from "http";
import express from "express";
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

const LAMPORTS_PER_SOL = PluginLedgerConnectorSolana.LAMPORTS_PER_SOL;

describe("Solana Connector – transferSol / requestAirdrop (integration)", () => {
  let connector: PluginLedgerConnectorSolana;
  let server: http.Server;
  let apiClient: SolanaApiClient;

  const { publicKey: alicePub, privateKeyBase58: alicePriv } =
    PluginLedgerConnectorSolana.generateKeypairBase58();
  const { publicKey: bobPub } =
    PluginLedgerConnectorSolana.generateKeypairBase58();

  beforeAll(async () => {
    const rpcUrl = await startTestValidator();

    connector = new PluginLedgerConnectorSolana({
      instanceId: "transfer-test",
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

    // Fund Alice with 5 SOL.
    await airdropSol(connector.getConnection(), alicePub, 5);
  }, 300_000);

  afterAll(async () => {
    await connector.shutdown();
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    await stopTestValidator();
  });

  // --- requestAirdrop ---

  test("connector.requestAirdrop funds a fresh account", async () => {
    const { publicKey: carol } =
      PluginLedgerConnectorSolana.generateKeypairBase58();
    const { signature } = await connector.requestAirdrop({
      publicKey: carol,
      lamports: LAMPORTS_PER_SOL,
    });
    expect(typeof signature).toBe("string");
    expect(signature.length).toBeGreaterThan(0);

    const { lamports } = await connector.getBalance({ publicKey: carol });
    expect(lamports).toBe(LAMPORTS_PER_SOL);
  });

  test("requestAirdrop via REST returns 200 and a signature", async () => {
    const { publicKey: dan } =
      PluginLedgerConnectorSolana.generateKeypairBase58();
    const { data, status } = await apiClient.requestAirdropV1({
      publicKey: dan,
      lamports: LAMPORTS_PER_SOL,
    });
    expect(status).toBe(200);
    expect(typeof data.signature).toBe("string");
  });

  // --- transferSol ---

  test("connector.transferSol moves lamports from Alice to Bob", async () => {
    const transferAmount = 0.5 * LAMPORTS_PER_SOL;
    const bobBefore = await connector.getBalance({ publicKey: bobPub });

    const { signature } = await connector.transferSol({
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: alicePriv,
      },
      recipientPublicKey: bobPub,
      lamports: transferAmount,
    });

    expect(typeof signature).toBe("string");
    expect(signature.length).toBeGreaterThan(0);

    const bobAfter = await connector.getBalance({ publicKey: bobPub });
    expect(bobAfter.lamports - bobBefore.lamports).toBe(transferAmount);
  });

  test("Alice's balance decreases by at least the transfer amount", async () => {
    const aliceBefore = await connector.getBalance({ publicKey: alicePub });
    const transferAmount = 0.1 * LAMPORTS_PER_SOL;

    await connector.transferSol({
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: alicePriv,
      },
      recipientPublicKey: bobPub,
      lamports: transferAmount,
    });

    const aliceAfter = await connector.getBalance({ publicKey: alicePub });
    // Alice pays transfer amount + fee.
    expect(aliceBefore.lamports - aliceAfter.lamports).toBeGreaterThanOrEqual(
      transferAmount,
    );
  });

  test("transferSol via REST returns 200 and a signature", async () => {
    const { publicKey: eve } =
      PluginLedgerConnectorSolana.generateKeypairBase58();
    await airdropSol(connector.getConnection(), eve, 1);

    const { publicKey: evePub, privateKeyBase58: evePriv } =
      PluginLedgerConnectorSolana.generateKeypairBase58();
    await airdropSol(connector.getConnection(), evePub, 1);

    const { data, status } = await apiClient.transferSolV1({
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: evePriv,
      },
      recipientPublicKey: bobPub,
      lamports: 1000,
    });
    expect(status).toBe(200);
    expect(typeof data.signature).toBe("string");
  });

  test("transferSol with zero lamports rejects", async () => {
    await expect(
      connector.transferSol({
        signingCredential: {
          type: SolanaSigningCredentialType.PrivateKeyBase58,
          privateKeyBase58: alicePriv,
        },
        recipientPublicKey: bobPub,
        lamports: 0,
      }),
    ).rejects.toThrow();
  });

  test("transferSol with invalid recipient key rejects", async () => {
    await expect(
      connector.transferSol({
        signingCredential: {
          type: SolanaSigningCredentialType.PrivateKeyBase58,
          privateKeyBase58: alicePriv,
        },
        recipientPublicKey: "not-a-valid-key",
        lamports: 1000,
      }),
    ).rejects.toThrow();
  });
});
