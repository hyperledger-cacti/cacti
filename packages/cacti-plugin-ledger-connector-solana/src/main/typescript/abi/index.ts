import { Connection } from "@solana/web3.js";
import { ISolanaAbi, SolanaAbiKind } from "./solana-abi";
import { SolanaAbiSpec } from "../generated/openapi/typescript-axios";
import { AnchorAbi } from "./anchor-abi";

export * from "./solana-abi";
export { AnchorAbi } from "./anchor-abi";

/**
 * Build the right {@link ISolanaAbi} for a request's ABI spec. This is the one
 * place that maps an `abi.kind` to a concrete encoder — add new cases here as
 * more ABI variants are implemented.
 */
export function createSolanaAbi(
  spec: SolanaAbiSpec,
  connection: Connection,
): ISolanaAbi {
  switch (spec.kind) {
    case SolanaAbiKind.Anchor:
      return new AnchorAbi(spec.idl, connection);
    default: {
      // Exhaustiveness: every SolanaAbiKind must be handled above.
      const unknownKind: never = spec.kind;
      throw new Error(`Unsupported Solana ABI kind: ${String(unknownKind)}`);
    }
  }
}
