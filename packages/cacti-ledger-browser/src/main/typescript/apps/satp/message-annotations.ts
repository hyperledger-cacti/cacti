/**
 * Plain-language annotations of the session snapshot fields recorded with
 * each SATP message (`SessionData`, see `session/session.proto` in the
 * plugin). Used by the message inspector: every field gets a short note and
 * a kind, so hashes, signatures and claims (the evidence a reviewer checks)
 * can be highlighted.
 */
import type { SatpSessionSnapshot } from "./transform";

export type SatpFieldKind =
  | "hash"
  | "signature"
  | "claim"
  | "identity"
  | "asset"
  | "state"
  | "other";

export interface SatpAnnotatedField {
  field: string;
  /** Display value (objects are JSON-serialized). */
  value: string;
  kind: SatpFieldKind;
  note?: string;
}

const NOTES: Record<string, { kind: SatpFieldKind; note: string }> = {
  id: { kind: "identity", note: "SATP session ID." },
  transferContextId: {
    kind: "identity",
    note: "Ties every message of one transfer together across both gateways.",
  },
  state: { kind: "state", note: "Session state at the time of this message." },
  phaseError: {
    kind: "state",
    note: "Message type whose processing failed, if any.",
  },
  lastMessageHash: {
    kind: "hash",
    note: "Hash of the previous SATP message: each message commits to its predecessor (hash chain).",
  },
  lastSequenceNumber: {
    kind: "state",
    note: "Sequence number of the last message processed.",
  },
  hashes: {
    kind: "hash",
    note: "Hashes of the messages exchanged per stage.",
  },
  signatures: {
    kind: "signature",
    note: "Gateway signatures over the exchanged messages.",
  },
  serverGatewayPubkey: {
    kind: "signature",
    note: "Public key the counterparty gateway signs with.",
  },
  clientGatewayPubkey: {
    kind: "signature",
    note: "Public key the initiating gateway signs with.",
  },
  originatorPubkey: { kind: "signature", note: "Originator's public key." },
  beneficiaryPubkey: { kind: "signature", note: "Beneficiary's public key." },
  senderGatewayNetworkId: {
    kind: "identity",
    note: "Network of the sending gateway.",
  },
  recipientGatewayNetworkId: {
    kind: "identity",
    note: "Network of the receiving gateway.",
  },
  senderGatewayOwnerId: {
    kind: "identity",
    note: "Owner of the sending gateway.",
  },
  receiverGatewayOwnerId: {
    kind: "identity",
    note: "Owner of the receiving gateway.",
  },
  verifiedOriginatorEntityId: {
    kind: "identity",
    note: "Verified identity of the party sending the asset.",
  },
  verifiedBeneficiaryEntityId: {
    kind: "identity",
    note: "Verified identity of the party receiving the asset.",
  },
  digitalAssetId: { kind: "asset", note: "The asset being transferred." },
  assetProfileId: { kind: "asset", note: "Profile describing the asset type." },
  senderAsset: { kind: "asset", note: "Asset on the source ledger." },
  receiverAsset: { kind: "asset", note: "Asset on the destination ledger." },
  sourceLedgerAssetId: {
    kind: "asset",
    note: "Asset ID on the source ledger.",
  },
  recipientLedgerAssetId: {
    kind: "asset",
    note: "Asset ID on the destination ledger.",
  },
  transferInitClaims: {
    kind: "claim",
    note: "Stage 1 claims both gateways agree on before the transfer starts.",
  },
  lockAssertionClaim: {
    kind: "claim",
    note: "Stage 2 proof that the asset is locked on the source ledger.",
  },
  burnAssertionClaim: {
    kind: "claim",
    note: "Stage 3 proof that the asset was burned on the source ledger.",
  },
  mintAssertionClaim: {
    kind: "claim",
    note: "Stage 3 proof that the asset was minted on the destination ledger.",
  },
  assignmentAssertionClaim: {
    kind: "claim",
    note: "Stage 3 proof that the minted asset was assigned to the beneficiary.",
  },
  senderWrapAssertionClaim: {
    kind: "claim",
    note: "Proof that the source asset was wrapped for the bridge.",
  },
  receiverWrapAssertionClaim: {
    kind: "claim",
    note: "Proof that the destination asset was wrapped for the bridge.",
  },
};

/** Kind of a field without a dedicated note, guessed from its name. */
function guessKind(field: string): SatpFieldKind {
  const f = field.toLowerCase();
  if (f.includes("hash")) {
    return "hash";
  }
  if (
    f.includes("signature") ||
    f.includes("pubkey") ||
    f.includes("publickey")
  ) {
    return "signature";
  }
  if (f.includes("claim")) {
    return "claim";
  }
  return "other";
}

function display(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2) ?? String(value);
}

const KIND_ORDER: SatpFieldKind[] = [
  "identity",
  "state",
  "hash",
  "signature",
  "claim",
  "asset",
  "other",
];

/**
 * Annotated, non-empty fields of a snapshot, grouped by kind (identity,
 * state, evidence, asset, rest) and alphabetical within a kind.
 */
export function annotateSnapshot(
  snapshot?: SatpSessionSnapshot,
): SatpAnnotatedField[] {
  if (!snapshot) {
    return [];
  }
  return Object.entries(snapshot)
    .filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !(
          typeof value === "object" && Object.keys(value as object).length === 0
        ),
    )
    .map(([field, value]) => {
      const known = NOTES[field];
      return {
        field,
        value: display(value),
        kind: known?.kind ?? guessKind(field),
        ...(known ? { note: known.note } : {}),
      };
    })
    .sort(
      (a, b) =>
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        a.field.localeCompare(b.field),
    );
}

/** True for the fields a reviewer checks to verify the transfer. */
export function isEvidenceKind(kind: SatpFieldKind): boolean {
  return kind === "hash" || kind === "signature" || kind === "claim";
}
