/**
 * Integration tests: Cacti keychain reference signing
 *
 * Verifies that the connector can resolve a private key stored in the
 * PluginKeychainMemory and sign / send a transaction using it.
 *
 * Runs against a throwaway containerized localnet via SolanaTestLedger (Docker).
 */
import * as http from "http";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  PluginLedgerConnectorSolana,
  SolanaSigningCredentialType,
} from "../../../main/typescript/public-api";
import {
  startTestValidator,
  stopTestValidator,
  airdropSol,
} from "./solana-test-validator";

describe("Solana Connector – CactiKeychainRef signing (integration)", () => {
  let connector: PluginLedgerConnectorSolana;
  let server: http.Server;

  const keychainId = uuidv4();
  const keychainEntryKey = "alice-solana-privkey";
  const { publicKey: alicePub, privateKeyBase58: alicePriv } =
    PluginLedgerConnectorSolana.generateKeypairBase58();
  const { publicKey: bobPub } =
    PluginLedgerConnectorSolana.generateKeypairBase58();

  beforeAll(async () => {
    const rpcUrl = await startTestValidator();

    const keychain = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId,
      backend: new Map([[keychainEntryKey, alicePriv]]),
      logLevel: "silent",
    });

    connector = new PluginLedgerConnectorSolana({
      instanceId: "keychain-test",
      rpcApiHttpHost: rpcUrl,
      pluginRegistry: new PluginRegistry({ plugins: [keychain] }),
      logLevel: "warn",
    });

    const app = express();
    app.use(express.json());
    server = http.createServer(app);
    await connector.registerWebServices(app);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );

    await airdropSol(connector.getConnection(), alicePub, 2);
  }, 300_000);

  afterAll(async () => {
    await connector.shutdown();
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    await stopTestValidator();
  });

  test("resolveKeypair uses keychain to resolve a private key", async () => {
    const kp = await connector.resolveKeypair({
      type: SolanaSigningCredentialType.CactiKeychainRef,
      keychainId,
      keychainEntryKey,
    });
    expect(kp.publicKey.toBase58()).toBe(alicePub);
  });

  test("transferSol with CACTI_KEYCHAIN_REF credential succeeds", async () => {
    const aliceBefore = await connector.getBalance({ publicKey: alicePub });

    const { signature } = await connector.transferSol({
      signingCredential: {
        type: SolanaSigningCredentialType.CactiKeychainRef,
        keychainId,
        keychainEntryKey,
      },
      recipientPublicKey: bobPub,
      // Must be at least the rent-exempt minimum (~890,880 lamports for a
      // 0-data account); a smaller amount to a brand-new account is rejected
      // by the runtime with "insufficient funds for rent".
      lamports: 2_000_000,
    });

    expect(typeof signature).toBe("string");

    const aliceAfter = await connector.getBalance({ publicKey: alicePub });
    expect(aliceBefore.lamports - aliceAfter.lamports).toBeGreaterThanOrEqual(
      2_000_000,
    );
  });

  test("resolveKeypair with unknown keychain entry throws", async () => {
    await expect(
      connector.resolveKeypair({
        type: SolanaSigningCredentialType.CactiKeychainRef,
        keychainId,
        keychainEntryKey: "non-existent-key",
      }),
    ).rejects.toThrow();
  });

  test("resolveKeypair with unknown keychainId throws", async () => {
    await expect(
      connector.resolveKeypair({
        type: SolanaSigningCredentialType.CactiKeychainRef,
        keychainId: uuidv4(),
        keychainEntryKey,
      }),
    ).rejects.toThrow();
  });

  test("resolveKeypair with NONE credential type throws", async () => {
    await expect(
      connector.resolveKeypair({
        type: SolanaSigningCredentialType.None,
      }),
    ).rejects.toThrow();
  });
});
