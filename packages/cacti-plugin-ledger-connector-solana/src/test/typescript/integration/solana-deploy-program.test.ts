/**
 * Integration test for program deployment via the **upgradeable BPF loader**.
 *
 * Unlike the other integration suites, this validator does NOT preload the test
 * program — the whole point is to deploy it at runtime through the connector and
 * then prove the freshly deployed program is actually invocable.
 *
 * Covers:
 *   - deployProgram        (buffer → chunked writes → deployWithMaxDataLen)
 *   - the deployed account is executable + owned by the upgradeable loader
 *   - invokeInstruction against the just-deployed program (end-to-end proof)
 *   - input validation     (NONE credential, empty binary)
 *
 * The program is deployed under its committed keypair so the on-chain program id
 * matches the IDL `declare_id!` — required for Anchor's self-id check to pass.
 *
 * Runs on its own throwaway `solana-test-validator` container (SolanaTestLedger).
 * Skips gracefully if the committed program artifacts are missing.
 */
import * as fs from "fs";
import * as path from "path";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { SolanaTestLedger } from "@hyperledger/cactus-test-tooling";
import {
  PluginLedgerConnectorSolana,
  SolanaAbiKind,
  SolanaSigningCredentialType,
} from "../../../main/typescript/public-api";

const UPGRADEABLE_LOADER = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111",
);

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
    `[deploy-program] SKIPPING: test program artifacts not found under ${RESOURCES}`,
  );
}

const idl = ARTIFACTS_PRESENT
  ? (JSON.parse(fs.readFileSync(IDL_PATH, "utf8")) as Record<string, unknown>)
  : {};
const PROGRAM_ID = ARTIFACTS_PRESENT
  ? new PublicKey((idl as { address: string }).address)
  : PublicKey.default;
const ANCHOR_ABI = { kind: SolanaAbiKind.Anchor, idl };

// The program's own keypair (fixes the deployed program id to the IDL address).
const programKeypairBase58 = ARTIFACTS_PRESENT
  ? bs58.encode(
      Uint8Array.from(
        JSON.parse(fs.readFileSync(PROGRAM_KEYPAIR, "utf8")) as number[],
      ),
    )
  : "";
const programBinaryBase64 = ARTIFACTS_PRESENT
  ? fs.readFileSync(PROGRAM_SO).toString("base64")
  : "";

const counterPda = (authority: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), authority.toBuffer()],
    PROGRAM_ID,
  )[0];

const describeFn = ARTIFACTS_PRESENT ? describe : describe.skip;

describeFn("Solana Connector – deployProgram (integration)", () => {
  let ledger: SolanaTestLedger;
  let connector: PluginLedgerConnectorSolana;

  // The payer funds every account and is the program's upgrade authority; it is
  // also the authority that initializes the counter after deploy.
  const admin = Keypair.generate();
  const adminPriv = bs58.encode(admin.secretKey);
  const adminCredential = {
    type: SolanaSigningCredentialType.PrivateKeyBase58,
    privateKeyBase58: adminPriv,
  };
  const counter = () => counterPda(admin.publicKey);

  beforeAll(async () => {
    // A bare validator container (no --bpf-program); the suite deploys the
    // program at runtime, which is the whole point of these tests.
    ledger = new SolanaTestLedger({
      logLevel: "warn",
      emitContainerLogs: false,
    });
    await ledger.start();
    const rpcUrl = await ledger.getRpcApiHttpHost();

    connector = new PluginLedgerConnectorSolana({
      instanceId: "deploy-program-test",
      rpcApiHttpHost: rpcUrl,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      logLevel: "warn",
    });

    // Deploying ~144 KB of program data + creating the programdata account needs
    // a couple of SOL of rent; airdrop generously.
    await connector.requestAirdrop({
      publicKey: admin.publicKey.toBase58(),
      lamports: 10 * LAMPORTS_PER_SOL,
    });
  }, 300_000);

  afterAll(async () => {
    if (connector) await connector.shutdown();
    if (ledger) {
      await ledger.stop();
      await ledger.destroy();
    }
  });

  test("deployProgram uploads the program and returns its program id", async () => {
    const { programId, deploySignatures } = await connector.deployProgram({
      programBinaryBase64,
      programKeypairBase58,
      payerSigningCredential: adminCredential,
    });

    // Deployed under the committed keypair => id matches the IDL's declare_id!.
    expect(programId).toBe(PROGRAM_ID.toBase58());
    // At least the buffer-init and the final deploy transaction signatures.
    expect(deploySignatures.length).toBeGreaterThanOrEqual(2);
    deploySignatures.forEach((s) => expect(typeof s).toBe("string"));
  }, 120_000);

  test("the deployed account is executable and owned by the upgradeable loader", async () => {
    const info = await connector.getConnection().getAccountInfo(PROGRAM_ID);
    expect(info).not.toBeNull();
    expect(info!.executable).toBe(true);
    expect(info!.owner.equals(UPGRADEABLE_LOADER)).toBe(true);
  });

  test("the freshly deployed program is invocable (initialize + decode)", async () => {
    const { signature } = await connector.invokeInstruction({
      abi: ANCHOR_ABI,
      invocation: {
        instruction: "initialize",
        args: ["77", admin.publicKey.toBase58()],
        accounts: {
          authority: admin.publicKey.toBase58(),
          counter: counter().toBase58(),
          systemProgram: SystemProgram.programId.toBase58(),
        },
      },
      signingCredential: adminCredential,
    });
    expect(typeof signature).toBe("string");

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
    expect(c.value.toString()).toBe("77");
  }, 60_000);

  test("deployProgram generates a fresh program id when no keypair is supplied", async () => {
    // Top up: this deploys a second copy of the binary under a random id.
    await connector.requestAirdrop({
      publicKey: admin.publicKey.toBase58(),
      lamports: 10 * LAMPORTS_PER_SOL,
    });

    const { programId, deploySignatures } = await connector.deployProgram({
      programBinaryBase64,
      // No programKeypairBase58 -> the connector generates a random program id.
      payerSigningCredential: adminCredential,
    });

    expect(() => new PublicKey(programId)).not.toThrow();
    expect(programId).not.toBe(PROGRAM_ID.toBase58());
    expect(deploySignatures.length).toBeGreaterThanOrEqual(2);

    const info = await connector
      .getConnection()
      .getAccountInfo(new PublicKey(programId));
    expect(info).not.toBeNull();
    expect(info!.executable).toBe(true);
    expect(info!.owner.equals(UPGRADEABLE_LOADER)).toBe(true);
  }, 120_000);

  test("deployProgram rejects a NONE signing credential", async () => {
    await expect(
      connector.deployProgram({
        programBinaryBase64,
        payerSigningCredential: { type: SolanaSigningCredentialType.None },
      }),
    ).rejects.toThrow();
  });

  test("deployProgram rejects an empty program binary", async () => {
    await expect(
      connector.deployProgram({
        programBinaryBase64: "",
        payerSigningCredential: adminCredential,
      }),
    ).rejects.toThrow();
  });
});
