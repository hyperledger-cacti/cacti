/**
 * ABI abstraction for the Solana connector.
 *
 * A `ISolanaAbi` knows how to turn a high-level, ABI-agnostic instruction
 * invocation into raw Solana `TransactionInstruction`s, and how to decode raw
 * account data — for one particular on-chain ABI encoding. The connector picks
 * an implementation at runtime from the request's `abi.kind` discriminator.
 *
 * Today only Anchor is implemented ({@link AnchorAbi}). To add another encoding
 * later (e.g. Shank, or a bespoke Borsh layout): add a variant to
 * `SolanaAbiKind` + `SolanaAbiSpec`, implement `ISolanaAbi`, and register it in
 * {@link createSolanaAbi}. Clients select it by setting `abi.kind`.
 *
 * Implementations are stateless with respect to the ledger: they only encode /
 * decode. All chain I/O (submitting, reading accounts) is done by the connector.
 */
import { TransactionInstruction } from "@solana/web3.js";
import {
  SolanaAbiKind,
  SolanaInstructionInvocation,
} from "../generated/openapi/typescript-axios";

export { SolanaAbiKind } from "../generated/openapi/typescript-axios";
export type {
  SolanaAbiSpec,
  SolanaAnchorAbiSpec,
  SolanaInstructionInvocation,
} from "../generated/openapi/typescript-axios";

export interface ISolanaAbi {
  /** Which ABI encoding this implementation handles. */
  readonly kind: SolanaAbiKind;

  /** Build the raw instruction(s) for a high-level invocation. */
  buildInstructions(
    invocation: SolanaInstructionInvocation,
  ): Promise<TransactionInstruction[]>;

  /** Decode raw account data into a plain object using the ABI's account schema. */
  decodeAccount(accountName: string, data: Buffer): unknown;

  /** Decode program events from transaction log lines. */
  decodeEvents(
    logs: string[],
  ): Array<{ name: string; data: Record<string, unknown> }>;
}
