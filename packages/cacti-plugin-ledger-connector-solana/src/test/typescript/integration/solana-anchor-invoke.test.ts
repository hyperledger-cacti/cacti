/**
 * Integration tests for the Anchor ABI layer, end-to-end on a real validator,
 * using the connector's OWN self-contained `cacti-test-program` (committed under
 * src/test/resources) — no dependency on any external application program.
 *
 * Covers:
 *   - invokeInstruction        (server-side signing: PRIVATE_KEY_BASE58 + CACTI_KEYCHAIN_REF)
 *   - buildInstruction + sendTransaction(NONE)  (client-side / local signing)
 *   - decodeAccount            (read + decode on-chain state)
 *   - decodeEvents             (decode events from a tx)
 *   - watchLogs + decodeEvents (stream a program's logs, decode the events)
 *
 * Runs on its OWN isolated validator (dedicated RPC/faucet/dynamic ports +
 * ledger dir) with the test program preloaded.
 */
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import express from "express";
import { Server as SocketIoServer } from "socket.io";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Constants } from "@hyperledger/cactus-core-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { SolanaTestLedger } from "@hyperledger/cactus-test-tooling";
import {
  PluginLedgerConnectorSolana,
  SolanaApiClient,
  SolanaAbiKind,
  SolanaSigningCredentialType,
} from "../../../main/typescript/public-api";
import type { WatchLogsV1Progress } from "../../../main/typescript/public-api";

const RESOURCES =
  process.env.CACTI_TEST_PROGRAM_DIR ??
  path.resolve(
    process.cwd(),
    "packages/cacti-plugin-ledger-connector-solana/src/test/resources/cacti-test-program",
  );
const PROGRAM_SO = path.join(RESOURCES, "cacti_test_program.so");
const PROGRAM_KEYPAIR = path.join(RESOURCES, "cacti_test_program-keypair.json");
const IDL_PATH = path.join(RESOURCES, "cacti_test_program.json");

const ARTIFACTS_PRESENT =
  fs.existsSync(PROGRAM_SO) &&
  fs.existsSync(PROGRAM_KEYPAIR) &&
  fs.existsSync(IDL_PATH);

if (!ARTIFACTS_PRESENT) {
  // eslint-disable-next-line no-console
  console.warn(
    `[anchor-invoke] SKIPPING: test program artifacts not found under ${RESOURCES}`,
  );
}

const idl = ARTIFACTS_PRESENT
  ? (JSON.parse(fs.readFileSync(IDL_PATH, "utf8")) as Record<string, unknown>)
  : {};
const PROGRAM_ID = ARTIFACTS_PRESENT
  ? new PublicKey((idl as { address: string }).address)
  : PublicKey.default;
const ANCHOR_ABI = { kind: SolanaAbiKind.Anchor, idl };

const counterPda = (authority: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), authority.toBuffer()],
    PROGRAM_ID,
  )[0];

const describeFn = ARTIFACTS_PRESENT ? describe : describe.skip;

describeFn("Solana Connector – Anchor ABI invoke (integration)", () => {
  let ledger: SolanaTestLedger;
  let connector: PluginLedgerConnectorSolana;
  let server: http.Server;
  let wsApi: SocketIoServer;
  let apiClient: SolanaApiClient;

  const admin = Keypair.generate();
  const adminPriv = bs58.encode(admin.secretKey);
  const counter = () => counterPda(admin.publicKey);

  // server-side keychain holding the admin key (for the CACTI_KEYCHAIN_REF path)
  const keychainId = uuidv4();
  const keychainEntryKey = "admin-solana-key";

  const readValue = async (): Promise<bigint> => {
    const { account } = await connector.decodeAccount({
      abi: ANCHOR_ABI,
      accountName: "counter",
      publicKey: counter().toBase58(),
    });
    // value is a u64 -> BN; over a direct (in-process) call it's a BN.
    return BigInt(
      (account as { value: { toString(): string } }).value.toString(),
    );
  };

  beforeAll(async () => {
    ledger = new SolanaTestLedger({
      logLevel: "warn",
      emitContainerLogs: false,
    });
    await ledger.start();
    const rpcUrl = await ledger.getRpcApiHttpHost();

    const keychain = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId,
      backend: new Map([[keychainEntryKey, adminPriv]]),
      logLevel: "warn",
    });
    connector = new PluginLedgerConnectorSolana({
      instanceId: "anchor-invoke-test",
      rpcApiHttpHost: rpcUrl,
      pluginRegistry: new PluginRegistry({ plugins: [keychain] }),
      logLevel: "warn",
    });

    const app = express();
    // Program binaries are large (base64); raise the body limit above Express's
    // 100kb default so deploy-program over HTTP isn't rejected with 413.
    app.use(express.json({ limit: "10mb" }));
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

    await connector.requestAirdrop({
      publicKey: admin.publicKey.toBase58(),
      lamports: 10 * LAMPORTS_PER_SOL,
    });

    // The container runs a bare validator (no --bpf-program preload), so deploy
    // the test program at runtime under its own keypair — fixing the program id
    // to the IDL's declare_id! so Anchor's self-id check passes.
    const programKeypairBase58 = bs58.encode(
      Uint8Array.from(JSON.parse(fs.readFileSync(PROGRAM_KEYPAIR, "utf8"))),
    );
    await connector.deployProgram({
      programBinaryBase64: fs.readFileSync(PROGRAM_SO).toString("base64"),
      programKeypairBase58,
      payerSigningCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: adminPriv,
      },
    });
  }, 300_000);

  afterAll(async () => {
    if (connector) await connector.shutdown();
    if (wsApi)
      await new Promise<void>((resolve) => wsApi.close(() => resolve()));
    if (ledger) {
      await ledger.stop();
      await ledger.destroy();
    }
  });

  test("invokeInstruction(initialize) signs server-side and submits", async () => {
    const { signature } = await connector.invokeInstruction({
      abi: ANCHOR_ABI,
      invocation: {
        instruction: "initialize",
        args: ["10", admin.publicKey.toBase58()], // value=10, label=admin
        accounts: {
          authority: admin.publicKey.toBase58(),
          counter: counter().toBase58(),
          systemProgram: SystemProgram.programId.toBase58(),
        },
      },
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: adminPriv,
      },
    });
    expect(typeof signature).toBe("string");
  });

  test("decodeAccount reads + decodes the on-chain Counter", async () => {
    const { exists, account } = await connector.decodeAccount({
      abi: ANCHOR_ABI,
      accountName: "counter",
      publicKey: counter().toBase58(),
    });
    expect(exists).toBe(true);
    const c = account as {
      authority: PublicKey;
      value: { toString(): string };
    };
    expect(new PublicKey(c.authority).equals(admin.publicKey)).toBe(true);
    expect(c.value.toString()).toBe("10");
  });

  test("decodeAccount decodes raw base64 account data (data path)", async () => {
    // Read the raw account, then decode it via the `data` input (no publicKey).
    const info = await connector.getAccountInfo({
      publicKey: counter().toBase58(),
    });
    expect(info.exists).toBe(true);
    const { exists, account } = await connector.decodeAccount({
      abi: ANCHOR_ABI,
      accountName: "counter",
      data: info.data,
    });
    expect(exists).toBe(true);
    const c = account as { authority: PublicKey };
    expect(new PublicKey(c.authority).equals(admin.publicKey)).toBe(true);
  });

  test("buildInstruction + local sign + sendTransaction(NONE) increments", async () => {
    const before = await readValue();
    const { serializedTransaction } = await connector.buildInstruction({
      abi: ANCHOR_ABI,
      feePayer: admin.publicKey.toBase58(),
      invocation: {
        instruction: "increment",
        args: ["5"],
        accounts: {
          authority: admin.publicKey.toBase58(),
          counter: counter().toBase58(),
        },
      },
    });
    const tx = Transaction.from(Buffer.from(serializedTransaction, "base64"));
    tx.sign(admin);
    const { signature } = await connector.sendTransaction({
      serializedTransaction: tx.serialize().toString("base64"),
      signingCredential: { type: SolanaSigningCredentialType.None },
    });
    expect(typeof signature).toBe("string");
    expect(await readValue()).toBe(before + 5n);
  });

  test("invokeInstruction(increment) signs via CACTI_KEYCHAIN_REF (server-side keychain)", async () => {
    const before = await readValue();
    const { signature } = await connector.invokeInstruction({
      abi: ANCHOR_ABI,
      invocation: {
        instruction: "increment",
        args: ["7"],
        accounts: {
          authority: admin.publicKey.toBase58(),
          counter: counter().toBase58(),
        },
      },
      signingCredential: {
        type: SolanaSigningCredentialType.CactiKeychainRef,
        keychainId,
        keychainEntryKey,
      },
    });
    expect(typeof signature).toBe("string");
    expect(await readValue()).toBe(before + 7n);
  });

  test("decodeAccount returns exists=false for an unknown account", async () => {
    const { exists } = await connector.decodeAccount({
      abi: ANCHOR_ABI,
      accountName: "counter",
      publicKey: Keypair.generate().publicKey.toBase58(),
    });
    expect(exists).toBe(false);
  });

  test("decodeEvents decodes the Incremented event from a tx signature", async () => {
    const { signature } = await connector.invokeInstruction({
      abi: ANCHOR_ABI,
      invocation: {
        instruction: "increment",
        args: ["3"],
        accounts: {
          authority: admin.publicKey.toBase58(),
          counter: counter().toBase58(),
        },
      },
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: adminPriv,
      },
    });

    const { events } = await connector.decodeEvents({
      abi: ANCHOR_ABI,
      signature,
    });
    expect(events.length).toBeGreaterThanOrEqual(1);
    const incremented = events.find((e) => /incremented/i.test(e.name));
    expect(incremented).toBeTruthy();
    expect(
      (
        incremented!.data as { amount: { toString(): string } }
      ).amount.toString(),
    ).toBe("3");
  });

  test("invokeInstruction rejects a NONE signing credential", async () => {
    await expect(
      connector.invokeInstruction({
        abi: ANCHOR_ABI,
        invocation: { instruction: "increment", args: ["1"], accounts: {} },
        signingCredential: { type: SolanaSigningCredentialType.None },
      }),
    ).rejects.toThrow();
  });

  test("invokeInstruction throws when a landed instruction confirms with an error", async () => {
    // Re-initializing admin's already-existing counter fails on-chain; with
    // skipPreflight the tx still lands, so confirmation carries the error and
    // the connector surfaces it (covers the confirm-with-error branch).
    await expect(
      connector.invokeInstruction({
        abi: ANCHOR_ABI,
        invocation: {
          instruction: "initialize",
          args: ["1", admin.publicKey.toBase58()],
          accounts: {
            authority: admin.publicKey.toBase58(),
            counter: counter().toBase58(),
            systemProgram: SystemProgram.programId.toBase58(),
          },
        },
        signingCredential: {
          type: SolanaSigningCredentialType.PrivateKeyBase58,
          privateKeyBase58: adminPriv,
        },
        skipPreflight: true,
      }),
    ).rejects.toThrow(/confirmed with error/);
  });

  test("watchLogs(program) streams logs that decodeEvents turns into an Incremented event", async () => {
    let trigger: ReturnType<typeof setInterval>;
    const progress = await new Promise<WatchLogsV1Progress>(
      (resolve, reject) => {
        const timer = setTimeout(() => {
          clearInterval(trigger);
          reject(new Error("no program log event within 25s"));
        }, 25_000);

        const sub = apiClient
          .watchLogsV1({ programId: PROGRAM_ID.toBase58() })
          .subscribe({
            next: (p) => {
              clearTimeout(timer);
              clearInterval(trigger);
              sub.unsubscribe();
              resolve(p);
            },
            error: (err) => {
              clearTimeout(timer);
              clearInterval(trigger);
              reject(err);
            },
          });

        // Drive increments until a matching log event arrives.
        trigger = setInterval(() => {
          void connector
            .invokeInstruction({
              abi: ANCHOR_ABI,
              invocation: {
                instruction: "increment",
                args: ["1"],
                accounts: {
                  authority: admin.publicKey.toBase58(),
                  counter: counter().toBase58(),
                },
              },
              signingCredential: {
                type: SolanaSigningCredentialType.PrivateKeyBase58,
                privateKeyBase58: adminPriv,
              },
            })
            .catch(() => undefined);
        }, 1500);
      },
    );

    expect(typeof progress.signature).toBe("string");
    expect(progress.logs.length).toBeGreaterThan(0);

    // The streamed logs decode into our program's event.
    const { events } = await connector.decodeEvents({
      abi: ANCHOR_ABI,
      logs: progress.logs,
    });
    expect(events.some((e) => /incremented/i.test(e.name))).toBe(true);
  }, 35_000);

  // --- SolanaApiClient.sendSyncRequest (the generic Verifier dispatch path) ---
  // Driving each command through sendSyncRequest exercises the dispatch switch
  // AND every underlying V1 HTTP method body in the api-client source.

  const sync = (command: string, body: unknown): Promise<unknown> =>
    apiClient.sendSyncRequest(
      {},
      { type: "solanaApi", command } as never,
      { args: body } as never,
    );

  test("sendSyncRequest dispatches the read commands", async () => {
    const bal = (await sync("getBalance", {
      publicKey: admin.publicKey.toBase58(),
    })) as { status: number; data: { lamports: number } };
    expect(bal.status).toBe(200);
    expect(typeof bal.data.lamports).toBe("number");

    const info = (await sync("getAccountInfo", {
      publicKey: admin.publicKey.toBase58(),
    })) as { data: { exists: boolean } };
    expect(typeof info.data.exists).toBe("boolean");

    const metrics = (await sync("getPrometheusMetrics", {})) as {
      status: number;
    };
    expect(metrics.status).toBe(200);

    const slot = (await sync("invokeRpc", { method: "getSlot" })) as {
      data: { result: number };
    };
    expect(typeof slot.data.result).toBe("number");
  });

  test("sendSyncRequest dispatches requestAirdrop and transferSol", async () => {
    const dest = Keypair.generate();
    const air = (await sync("requestAirdrop", {
      publicKey: admin.publicKey.toBase58(),
      lamports: LAMPORTS_PER_SOL,
    })) as { data: { signature: string } };
    expect(typeof air.data.signature).toBe("string");

    const transferRes = (await sync("transferSol", {
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: adminPriv,
      },
      recipientPublicKey: dest.publicKey.toBase58(),
      lamports: 2_000_000,
    })) as { data: { signature: string } };
    expect(typeof transferRes.data.signature).toBe("string");
  });

  test("sendSyncRequest dispatches the ABI + transaction commands", async () => {
    const invocation = {
      instruction: "increment",
      args: ["1"],
      accounts: {
        authority: admin.publicKey.toBase58(),
        counter: counter().toBase58(),
      },
    };

    const built = (await sync("buildInstruction", {
      abi: ANCHOR_ABI,
      feePayer: admin.publicKey.toBase58(),
      invocation,
    })) as { data: { serializedTransaction: string } };
    expect(typeof built.data.serializedTransaction).toBe("string");

    const fee = (await sync("getFeeForTransaction", {
      serializedTransaction: built.data.serializedTransaction,
    })) as { status: number };
    expect(fee.status).toBe(200);

    const tx = Transaction.from(
      Buffer.from(built.data.serializedTransaction, "base64"),
    );
    tx.sign(admin);
    const sent = (await sync("sendTransaction", {
      serializedTransaction: tx.serialize().toString("base64"),
      signingCredential: { type: SolanaSigningCredentialType.None },
    })) as { data: { signature: string } };
    expect(typeof sent.data.signature).toBe("string");

    const got = (await sync("getTransaction", {
      signature: sent.data.signature,
    })) as { data: { signature: string } };
    expect(got.data.signature).toBe(sent.data.signature);

    const ev = (await sync("decodeEvents", {
      abi: ANCHOR_ABI,
      signature: sent.data.signature,
    })) as { data: { events: unknown[] } };
    expect(Array.isArray(ev.data.events)).toBe(true);

    const acct = (await sync("decodeAccount", {
      abi: ANCHOR_ABI,
      accountName: "counter",
      publicKey: counter().toBase58(),
    })) as { data: { exists: boolean } };
    expect(acct.data.exists).toBe(true);

    const inv = (await sync("invokeInstruction", {
      abi: ANCHOR_ABI,
      invocation,
      signingCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: adminPriv,
      },
    })) as { data: { signature: string } };
    expect(typeof inv.data.signature).toBe("string");
  });

  test("sendSyncRequest dispatches deployProgram", async () => {
    await connector.requestAirdrop({
      publicKey: admin.publicKey.toBase58(),
      lamports: 10 * LAMPORTS_PER_SOL,
    });
    const programBinaryBase64 = fs.readFileSync(PROGRAM_SO).toString("base64");
    const res = (await sync("deployProgram", {
      programBinaryBase64,
      payerSigningCredential: {
        type: SolanaSigningCredentialType.PrivateKeyBase58,
        privateKeyBase58: adminPriv,
      },
    })) as { data: { programId: string } };
    expect(() => new PublicKey(res.data.programId)).not.toThrow();
  }, 120_000);

  test("sendSyncRequest throws on an unsupported command", async () => {
    await expect(sync("notARealCommand", {})).rejects.toThrow(
      /Unsupported Solana command/,
    );
  });

  test("sendAsyncRequest resolves and logs (fire-and-forget, both paths)", async () => {
    // resolve path
    apiClient.sendAsyncRequest(
      {},
      { type: "solanaApi", command: "getBalance" } as never,
      { args: { publicKey: admin.publicKey.toBase58() } } as never,
    );
    // reject path: an invalid publicKey makes the V1 call 500, hitting .catch
    apiClient.sendAsyncRequest(
      {},
      { type: "solanaApi", command: "getBalance" } as never,
      { args: { publicKey: "not-a-valid-key" } } as never,
    );
    // let the fire-and-forget promises settle
    await new Promise((r) => setTimeout(r, 1500));
  });
});
