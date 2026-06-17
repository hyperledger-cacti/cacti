/**
 * Anchor ABI implementation of {@link ISolanaAbi}.
 *
 * Uses `@coral-xyz/anchor`'s coder + method builder to:
 *  - encode an instruction from an IDL method name + args + accounts, and
 *  - decode account data from the IDL account schema.
 *
 * No network I/O happens here: a `Program` is constructed with a no-op wallet
 * purely so its coder / instruction builder are available. The connector signs
 * and submits separately. Anchor normalizes IDL names to camelCase, so callers
 * use camelCase instruction names (e.g. "initialize") and account keys
 * (e.g. "systemProgram").
 */
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  AnchorProvider,
  BN,
  EventParser,
  Program,
  type Idl,
} from "@coral-xyz/anchor";
import { ISolanaAbi } from "./solana-abi";
import {
  SolanaAbiKind,
  SolanaInstructionInvocation,
} from "../generated/openapi/typescript-axios";

/** AnchorProvider requires a wallet; we never sign through it, so this is inert. */
const NOOP_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async <T>(tx: T): Promise<T> => tx,
  signAllTransactions: async <T>(txs: T[]): Promise<T[]> => txs,
};

export class AnchorAbi implements ISolanaAbi {
  public readonly kind = SolanaAbiKind.Anchor;
  private readonly program: Program;

  constructor(idl: Record<string, unknown>, connection: Connection) {
    const provider = new AnchorProvider(connection, NOOP_WALLET as never, {
      commitment: connection.commitment ?? "confirmed",
    });
    this.program = new Program(idl as Idl, provider);
  }

  public async buildInstructions(
    invocation: SolanaInstructionInvocation,
  ): Promise<TransactionInstruction[]> {
    const { instruction, args = [], accounts = {} } = invocation;

    const idlIx = (this.program.idl.instructions ?? []).find(
      (i) => i.name === instruction,
    );
    if (!idlIx) {
      const known = (this.program.idl.instructions ?? [])
        .map((i) => i.name)
        .join(", ");
      throw new Error(
        `AnchorAbi: unknown instruction "${instruction}". Known: [${known}]`,
      );
    }

    const coercedArgs = (idlIx.args ?? []).map((argDef, i) =>
      this.coerceArg(args[i], argDef.type),
    );
    const coercedAccounts: Record<string, PublicKey> = {};
    for (const [name, value] of Object.entries(accounts)) {
      coercedAccounts[name] = new PublicKey(value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const ix: TransactionInstruction = await methods[instruction](
      ...coercedArgs,
    )
      .accountsPartial(coercedAccounts)
      .instruction();
    return [ix];
  }

  public decodeAccount(accountName: string, data: Buffer): unknown {
    return this.program.coder.accounts.decode(accountName, data);
  }

  public decodeEvents(
    logs: string[],
  ): Array<{ name: string; data: Record<string, unknown> }> {
    const parser = new EventParser(this.program.programId, this.program.coder);
    const out: Array<{ name: string; data: Record<string, unknown> }> = [];
    for (const event of parser.parseLogs(logs)) {
      out.push({
        name: event.name,
        data: event.data as Record<string, unknown>,
      });
    }
    return out;
  }

  /** Convert a JSON arg into the type Anchor expects, guided by the IDL arg type. */
  private coerceArg(value: unknown, type: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof type === "string") {
      if (type === "pubkey" || type === "publicKey") {
        return new PublicKey(value as string);
      }
      if (/^(u|i)(64|128|256)$/.test(type)) {
        return new BN(value as string | number);
      }
      if (/^(u|i)(8|16|32)$/.test(type)) {
        return Number(value);
      }
      // bool, string, bytes, f32/f64 — pass through.
      return value;
    }
    if (type && typeof type === "object") {
      const t = type as Record<string, unknown>;
      if ("vec" in t) {
        return (value as unknown[]).map((v) => this.coerceArg(v, t.vec));
      }
      if ("option" in t) {
        return this.coerceArg(value, t.option);
      }
      if ("array" in t && Array.isArray(t.array)) {
        const [elemType] = t.array as [unknown, number];
        return (value as unknown[]).map((v) => this.coerceArg(v, elemType));
      }
    }
    // defined types (structs / enums) — pass the client's value through as-is.
    return value;
  }
}
