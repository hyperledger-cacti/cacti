/**
 * Unit tests for the Anchor ABI layer — no validator / network required.
 * Encoding instructions and decoding accounts are pure (offline) operations.
 *
 * Uses the connector's own self-contained `cacti-test-program` IDL (committed
 * under src/test/resources) — no dependency on any external application program.
 */
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";

import {
  createSolanaAbi,
  AnchorAbi,
  SolanaAbiKind,
} from "../../../main/typescript/public-api";

import testProgramIdl from "../../resources/cacti-test-program/cacti_test_program.json";

const PROGRAM_ID = new PublicKey(
  "4JfcF73r9QQ8pmL64UuzCTUt3cSACN2435BQJzWBSL5X",
);
// Offline connection: AnchorAbi never makes RPC calls for encode/decode.
const OFFLINE = new Connection("http://127.0.0.1:8899", "confirmed");

const NOOP_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async <T>(t: T) => t,
  signAllTransactions: async <T>(t: T[]) => t,
};

const counterPda = (authority: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), authority.toBuffer()],
    PROGRAM_ID,
  )[0];

describe("AnchorAbi (unit)", () => {
  const abi = createSolanaAbi(
    {
      kind: SolanaAbiKind.Anchor,
      idl: testProgramIdl as Record<string, unknown>,
    },
    OFFLINE,
  );

  test("createSolanaAbi returns an AnchorAbi for kind ANCHOR", () => {
    expect(abi).toBeInstanceOf(AnchorAbi);
    expect(abi.kind).toBe(SolanaAbiKind.Anchor);
  });

  test("createSolanaAbi throws for an unsupported ABI kind", () => {
    expect(() =>
      createSolanaAbi({ kind: "NOT_A_REAL_ABI" as never, idl: {} }, OFFLINE),
    ).toThrow(/Unsupported Solana ABI kind/);
  });

  test("buildInstructions encodes initialize with correct program, accounts and data", async () => {
    const authority = Keypair.generate().publicKey;
    const label = Keypair.generate().publicKey;

    const ixs = await abi.buildInstructions({
      instruction: "initialize",
      args: ["42", label.toBase58()], // value: u64 (numeric string), label: pubkey
      accounts: {
        authority: authority.toBase58(),
        counter: counterPda(authority).toBase58(),
        systemProgram: "11111111111111111111111111111111",
      },
    });

    expect(ixs).toHaveLength(1);
    const ix = ixs[0];
    expect(ix.programId.equals(PROGRAM_ID)).toBe(true);

    // discriminator(8) + value u64(8) + label pubkey(32) = 48 bytes.
    expect(ix.data.length).toBe(8 + 8 + 32);

    // IDL account order: authority, counter, systemProgram.
    expect(ix.keys).toHaveLength(3);
    expect(ix.keys[0].pubkey.equals(authority)).toBe(true);
    expect(ix.keys[0].isSigner).toBe(true);
    expect(ix.keys[0].isWritable).toBe(true);
    expect(ix.keys[1].pubkey.equals(counterPda(authority))).toBe(true);
    expect(ix.keys[1].isWritable).toBe(true);

    // The encoded label pubkey arg (after disc + u64) must match what we passed.
    const encodedLabel = ix.data.subarray(16, 48);
    expect(new PublicKey(encodedLabel).equals(label)).toBe(true);
  });

  test("buildInstructions coerces a u64 arg for increment", async () => {
    const authority = Keypair.generate().publicKey;
    const ixs = await abi.buildInstructions({
      instruction: "increment",
      args: ["1000000"],
      accounts: {
        authority: authority.toBase58(),
        counter: counterPda(authority).toBase58(),
      },
    });
    expect(ixs).toHaveLength(1);
    // discriminator(8) + amount u64(8) = 16 bytes.
    expect(ixs[0].data.length).toBe(8 + 8);
  });

  test("buildInstructions rejects an unknown instruction", async () => {
    await expect(
      abi.buildInstructions({ instruction: "noSuchInstruction" }),
    ).rejects.toThrow(/unknown instruction/);
  });

  test("decodeAccount round-trips a Counter account", async () => {
    const program = new Program(
      testProgramIdl as Idl,
      new AnchorProvider(OFFLINE, NOOP_WALLET as never, {}),
    );
    const sample = {
      authority: Keypair.generate().publicKey,
      value: new BN(123),
      label: Keypair.generate().publicKey,
      bump: 251,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buf = await (program.coder.accounts as any).encode("counter", sample);

    const decoded = abi.decodeAccount("counter", buf) as typeof sample;
    expect((decoded.authority as PublicKey).equals(sample.authority)).toBe(
      true,
    );
    expect((decoded.value as BN).toString()).toBe("123");
    expect((decoded.label as PublicKey).equals(sample.label)).toBe(true);
    expect(decoded.bump).toBe(251);
  });

  test("decodeEvents returns [] when logs contain no program events", () => {
    expect(abi.decodeEvents([])).toEqual([]);
    expect(
      abi.decodeEvents([
        "Program log: hello",
        "Program 11111111111111111111111111111111 invoke [1]",
        "Program 11111111111111111111111111111111 success",
      ]),
    ).toEqual([]);
  });
});

/**
 * Exercises every `coerceArg` type branch via a synthetic, account-less IDL so
 * the encoder runs offline without account resolution. Covers the integer
 * (u8/i32), bool/string passthrough, vec, option (value + null) and array
 * branches the real test-program IDL (u64 + pubkey only) doesn't reach.
 */
describe("AnchorAbi coerceArg type branches (unit)", () => {
  const COERCE_PROGRAM_ID = "4JfcF73r9QQ8pmL64UuzCTUt3cSACN2435BQJzWBSL5X";
  const coerceIdl = {
    address: COERCE_PROGRAM_ID,
    metadata: { name: "coerce_test", version: "0.1.0", spec: "0.1.0" },
    instructions: [
      {
        name: "scalars",
        discriminator: [1, 2, 3, 4, 5, 6, 7, 8],
        accounts: [],
        args: [
          { name: "a", type: "u8" },
          { name: "b", type: "i32" },
          { name: "c", type: "bool" },
          { name: "d", type: "string" },
        ],
      },
      {
        name: "compound",
        discriminator: [8, 7, 6, 5, 4, 3, 2, 1],
        accounts: [],
        args: [
          { name: "v", type: { vec: "u64" } },
          { name: "o", type: { option: "pubkey" } },
          { name: "arr", type: { array: ["u8", 3] } },
        ],
      },
    ],
    accounts: [],
    events: [],
    types: [],
  };

  const abi = createSolanaAbi(
    { kind: SolanaAbiKind.Anchor, idl: coerceIdl as Record<string, unknown> },
    OFFLINE,
  );

  test("coerces u8/i32 (Number) and passes bool/string through", async () => {
    const [ix] = await abi.buildInstructions({
      instruction: "scalars",
      args: [200, -5, true, "hello"],
    });
    expect(ix.keys).toHaveLength(0);
    // disc(8) + u8(1) + i32(4) + bool(1) + string(4 len + 5 bytes) = 23.
    expect(ix.data.length).toBe(23);
  });

  test("coerces vec, option(value) and array branches", async () => {
    const pk = new PublicKey(COERCE_PROGRAM_ID);
    const [ix] = await abi.buildInstructions({
      instruction: "compound",
      args: [["1", "2"], pk.toBase58(), [1, 2, 3]],
    });
    // disc(8) + vec(4 + 2*8) + option(1 tag + 32) + array(3) = 64.
    expect(ix.data.length).toBe(64);
  });

  test("coerces option(null) and an empty vec", async () => {
    const [ix] = await abi.buildInstructions({
      instruction: "compound",
      args: [[], null, [0, 0, 0]],
    });
    // disc(8) + vec(4 + 0) + option(1 tag) + array(3) = 16.
    expect(ix.data.length).toBe(16);
  });
});
