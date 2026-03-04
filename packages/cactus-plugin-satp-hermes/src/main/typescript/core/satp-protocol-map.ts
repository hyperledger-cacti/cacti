/**
 * @fileoverview SATP Protocol Stage and Step Mapping
 *
 * @description
 * Defines the complete execution order of the SATP protocol by mapping stages to
 * steps and steps to specific step tags. This provides a canonical reference for
 * the protocol flow and enables type-safe adapter configuration.
 *
 * The SATP protocol follows a strict order:
 * - Stage 0: Transfer initiation and session negotiation
 * 	Note that stage 0 does not follow the core draft version 2. As this stage is not standardized yet,
 * consider the implementation for stage 0 experimental and subject to change.
 * - Stage 1: Asset proposal and transfer commencement
 * - Stage 2: Asset locking and escrow
 * - Stage 3: Commitment, finalization, and completion
 *
 * Each stage contains multiple steps executed by both client and server gateways.
 * Step tags identify specific protocol messages and operations.
 * @url https://www.ietf.org/archive/id/draft-ietf-satp-core-12.txt
 * @module satp-protocol-map
 * @since 0.0.3-beta
 */

import { SatpStageKey } from "../generated/gateway-client/typescript-axios";
import { MessageType } from "../generated/proto/cacti/satp/v02/common/message_pb";

/**
 * SATP stage type - numeric representation (0-3)
 */
export type SatpStage = 0 | 1 | 2 | 3;

/**
 * Step tags for Stage 0 - Transfer Initiation
 * Ordered according to protocol flow:
 * 1. Client sends newSessionRequest
 * 2. Server validates (checkNewSessionRequest) and sends newSessionResponse
 * 3. Client validates (checkNewSessionResponse)
 * 4. Client sends preSATPTransferRequest
 * 5. Server validates (checkPreSATPTransferRequest) and sends preSATPTransferResponse
 * 6. Client validates (checkPreSATPTransferResponse)
 */
export type Stage0StepTag =
  | "newSessionRequest" // Client
  | "checkNewSessionRequest" // Server
  | "newSessionResponse" // Server
  | "checkNewSessionResponse" // Client
  | "preSATPTransferRequest" // Client
  | "checkPreSATPTransferRequest" // Server
  | "preSATPTransferResponse" // Server
  | "checkPreSATPTransferResponse"; // Client

/**
 * Step tags for Stage 1 - Transfer Initiation and Commencement Flows
 * @see https://datatracker.ietf.org/doc/html/draft-ietf-satp-core-02#section-7
 *
 * Ordered according to protocol flow per IETF SATP Core spec section 7:
 *
 * 1. Transfer Proposal (sections 7.3-7.5):
 *    - Note: steps 7.1 and 7.2 are encompassed on stage 0
 *    - 7.3: Transfer Proposal Request (INIT_PROPOSAL)
 *    - 7.4: Transfer Proposal Receipt Message
 *    - 7.5: Transfer Proposal Reject and Conditional Reject Message
 *
 * 2. Transfer Commence (sections 7.6-7.7):
 *    - 7.6: Transfer Commence Message
 *    - 7.7: Commence Response Message (ACK-Commence)
 *
 * **Implementation Note:**
 * `checkTransferCommenceResponse` validates a Stage 1 message but is implemented
 * in Stage2ClientService because it's called at the start of the Stage 2 client
 * workflow (bridges Stage 1 completion to Stage 2 initiation).
 */
export type Stage1StepTag =
  // === Transfer Proposal Flow (sections 7.3-7.5) ===
  | "transferProposalRequest" // Client: sends INIT_PROPOSAL (7.3)
  | "checkTransferProposalRequestMessage" // Server: validates proposal request
  | "transferProposalResponse" // Server: sends INIT_RECEIPT or INIT_REJECT (7.4/7.5)
  | "checkTransferProposalResponse" // Client: validates proposal response
  // === Transfer Commence Flow (sections 7.6-7.7) ===
  | "transferCommenceRequest" // Client: sends TRANSFER_COMMENCE_REQUEST (7.6)
  | "checkTransferCommenceRequestMessage" // Server: validates commence request
  | "transferCommenceResponse" // Server: sends ACK-Commence response (7.7)
  | "checkTransferCommenceResponse"; // Client: validates ACK-Commence (impl in Stage2ClientService)

/**
 * Step tags for Stage 2 - Asset Locking
 *
 * Per IETF SATP Core spec section 8, Stage 2 includes:
 * - 8.1: Lock Assertion Message
 * - 8.2: Lock Assertion Receipt Message
 *
 * **Implementation Note:**
 * `checkLockAssertionResponse` validates a Stage 2 message but is implemented
 * in Stage3ClientService because it's called at the start of the Stage 3 client
 * workflow (bridges Stage 2 completion to Stage 3 initiation).
 */
export type Stage2StepTag =
  | "lockAsset" // Client
  | "lockAssertionRequest" // Client
  | "checkLockAssertionRequest" // Server
  | "lockAssertionResponse" // Server
  | "checkLockAssertionResponse"; // Client: validates ASSERTION_RECEIPT (impl in Stage3ClientService)

/**
 * Step tags for Stage 3 - Commitment and Finalization
 */
export type Stage3StepTag =
  | "commitPreparation" // Client
  | "checkCommitPreparationRequest" // Server
  | "mintAsset" // Server
  | "commitReadyResponse" // Server
  | "checkCommitPreparationResponse" // Client
  | "burnAsset" // Client
  | "commitFinalAssertion" // Client
  | "checkCommitFinalAssertionRequest" // Server
  | "assignAsset" // Server
  | "commitFinalAcknowledgementReceiptResponse" // Server
  | "checkCommitFinalAssertionResponse" // Client
  | "transferComplete" // Client
  | "checkTransferCompleteRequest" // Server
  | "transferCompleteResponse" // Server
  | "checkTransferCompleteResponse"; // Client

/**
 * Union type of all SATP step tags across all stages
 */
export type SatpStepTag =
  | Stage0StepTag
  | Stage1StepTag
  | Stage2StepTag
  | Stage3StepTag;

/**
 * Step execution order within a stage (before/during/after/rollback)
 */
export type StepOrder = "before" | "during" | "after" | "rollback";

/**
 * Protocol step definition with metadata
 */
export interface SatpProtocolStep {
  /** Step tag identifier */
  tag: SatpStepTag;
  /** Human-readable description */
  description: string;
  /** Gateway role (client/server/both) */
  role: "client" | "server" | "both";
  /** Sequence number within the stage */
  sequence: number;
  /**
   * Protocol message type from MessageType enum.
   * Maps to MessageType values in message_pb.ts.
   * Undefined for internal operations (validation, asset operations).
   */
  messageType?: MessageType;
}

/**
 * Stage definition with ordered steps
 */
export interface SatpStageDefinition {
  /** Stage number */
  stage: SatpStage;
  /** Stage name */
  name: string;
  /** Ordered list of protocol steps */
  steps: SatpProtocolStep[];
}

/**
 * Result type for step tag validation with detailed information
 */
export interface StepTagValidationResult {
  /** Whether the step tag is valid for the stage */
  valid: boolean;
  /** The stage number that was checked */
  stage: number;
  /** The step tag that was validated */
  stepTag: string;
  /** Error message if validation failed, undefined if valid */
  errorMessage?: string;
  /** List of valid step tags for the stage (included on failure) */
  validStepTags?: SatpStepTag[];
}

/**
 * Complete SATP Protocol Map
 *
 * Defines the total order of protocol execution across all stages.
 * Each stage contains an ordered sequence of steps executed by client/server gateways.
 * Sequence numbers are monotonically increasing per stage, independent of role.
 */
export const SATP_PROTOCOL_MAP: Record<SatpStage, SatpStageDefinition> = {
  0: {
    stage: 0,
    name: "Transfer Initiation and Negotiation",
    steps: [
      {
        tag: "newSessionRequest",
        description: "Client initiates new session request",
        role: "client",
        sequence: 1,
        messageType: MessageType.NEW_SESSION_REQUEST, // 18
      },
      {
        tag: "checkNewSessionRequest",
        description: "Server validates new session request from client",
        role: "server",
        sequence: 2,
        messageType: MessageType.NEW_SESSION_REQUEST, // 18 (validation of)
      },
      {
        tag: "newSessionResponse",
        description: "Server sends new session response",
        role: "server",
        sequence: 3,
        messageType: MessageType.NEW_SESSION_RESPONSE, // 19
      },
      {
        tag: "checkNewSessionResponse",
        description: "Client validates new session response from server",
        role: "client",
        sequence: 4,
        messageType: MessageType.NEW_SESSION_RESPONSE, // 19 (validation of)
      },
      {
        tag: "preSATPTransferRequest",
        description: "Client sends pre-SATP transfer request",
        role: "client",
        sequence: 5,
        messageType: MessageType.PRE_SATP_TRANSFER_REQUEST, // 20
      },
      {
        tag: "checkPreSATPTransferRequest",
        description: "Server validates pre-SATP transfer request",
        role: "server",
        sequence: 6,
        messageType: MessageType.PRE_SATP_TRANSFER_REQUEST, // 20 (validation of)
      },
      {
        tag: "preSATPTransferResponse",
        description: "Server sends pre-SATP transfer response",
        role: "server",
        sequence: 7,
        messageType: MessageType.PRE_SATP_TRANSFER_RESPONSE, // 21
      },
      {
        tag: "checkPreSATPTransferResponse",
        description: "Client validates pre-SATP transfer response",
        role: "client",
        sequence: 8,
        messageType: MessageType.PRE_SATP_TRANSFER_RESPONSE, // 21 (validation of)
      },
    ],
  },
  1: {
    stage: 1,
    name: "Transfer Initiation and Commencement Flows",
    steps: [
      // Transfer Proposal Flow (sections 7.3-7.5)
      {
        tag: "transferProposalRequest",
        description:
          "Client sends transfer proposal request (INIT_PROPOSAL) [7.3]",
        role: "client",
        sequence: 1,
        messageType: MessageType.INIT_PROPOSAL, // 6
      },
      {
        tag: "checkTransferProposalRequestMessage",
        description: "Server validates transfer proposal from client",
        role: "server",
        sequence: 2,
        messageType: MessageType.INIT_PROPOSAL, // 6 (validation of)
      },
      {
        tag: "transferProposalResponse",
        description:
          "Server sends transfer proposal response (INIT_RECEIPT/INIT_REJECT) [7.4/7.5]",
        role: "server",
        sequence: 3,
        messageType: MessageType.INIT_RECEIPT, // 7 (or INIT_REJECT=8)
      },
      {
        tag: "checkTransferProposalResponse",
        description: "Client validates transfer proposal response",
        role: "client",
        sequence: 4,
        messageType: MessageType.INIT_RECEIPT, // 7 (validation of)
      },
      // Transfer Commence Flow (sections 7.6-7.7)
      {
        tag: "transferCommenceRequest",
        description: "Client sends transfer commence request [7.6]",
        role: "client",
        sequence: 5,
        messageType: MessageType.TRANSFER_COMMENCE_REQUEST, // 9
      },
      {
        tag: "checkTransferCommenceRequestMessage",
        description: "Server validates transfer commence request",
        role: "server",
        sequence: 6,
        messageType: MessageType.TRANSFER_COMMENCE_REQUEST, // 9 (validation of)
      },
      {
        tag: "transferCommenceResponse",
        description: "Server sends ACK-Commence response [7.7]",
        role: "server",
        sequence: 7,
        messageType: MessageType.TRANSFER_COMMENCE_RESPONSE, // 10
      },
      {
        tag: "checkTransferCommenceResponse",
        description: "Client validates ACK-Commence response",
        role: "client",
        sequence: 8,
        messageType: MessageType.TRANSFER_COMMENCE_RESPONSE, // 10 (validation of)
      },
    ],
  },
  2: {
    stage: 2,
    name: "Asset Locking and Escrow",
    steps: [
      {
        tag: "lockAsset",
        description: "Client locks asset in source network",
        role: "client",
        sequence: 1,
        // No messageType - internal blockchain operation
      },
      {
        tag: "lockAssertionRequest",
        description: "Client sends lock assertion request",
        role: "client",
        sequence: 2,
        messageType: MessageType.LOCK_ASSERT, // 11
      },
      {
        tag: "checkLockAssertionRequest",
        description: "Server validates lock assertion from client",
        role: "server",
        sequence: 3,
        messageType: MessageType.LOCK_ASSERT, // 11 (validation of)
      },
      {
        tag: "lockAssertionResponse",
        description: "Server sends lock assertion response (receipt)",
        role: "server",
        sequence: 4,
        messageType: MessageType.ASSERTION_RECEIPT, // 12
      },
      {
        tag: "checkLockAssertionResponse",
        description: "Client validates lock assertion response",
        role: "client",
        sequence: 5,
        messageType: MessageType.ASSERTION_RECEIPT, // 12 (validation of)
      },
    ],
  },
  3: {
    stage: 3,
    name: "Commitment and Finalization",
    steps: [
      {
        tag: "commitPreparation",
        description: "Client prepares for commitment phase",
        role: "client",
        sequence: 1,
        messageType: MessageType.COMMIT_PREPARE, // 13
      },
      {
        tag: "checkCommitPreparationRequest",
        description: "Server validates commit preparation from client",
        role: "server",
        sequence: 2,
        messageType: MessageType.COMMIT_PREPARE, // 13 (validation of)
      },
      {
        tag: "mintAsset",
        description: "Server mints asset in destination network",
        role: "server",
        sequence: 3,
        // No messageType - internal blockchain operation
      },
      {
        tag: "commitReadyResponse",
        description: "Server sends commit ready response",
        role: "server",
        sequence: 4,
        messageType: MessageType.COMMIT_READY, // 14
      },
      {
        tag: "checkCommitPreparationResponse",
        description: "Client validates commit ready response",
        role: "client",
        sequence: 5,
        messageType: MessageType.COMMIT_READY, // 14 (validation of)
      },
      {
        tag: "burnAsset",
        description: "Client burns locked asset in source network",
        role: "client",
        sequence: 6,
        // No messageType - internal blockchain operation
      },
      {
        tag: "commitFinalAssertion",
        description: "Client sends commit final assertion",
        role: "client",
        sequence: 7,
        messageType: MessageType.COMMIT_FINAL, // 15
      },
      {
        tag: "checkCommitFinalAssertionRequest",
        description: "Server validates commit final assertion",
        role: "server",
        sequence: 8,
        messageType: MessageType.COMMIT_FINAL, // 15 (validation of)
      },
      {
        tag: "assignAsset",
        description: "Server assigns asset to recipient",
        role: "server",
        sequence: 9,
        // No messageType - internal blockchain operation
      },
      {
        tag: "commitFinalAcknowledgementReceiptResponse",
        description: "Server sends commit final acknowledgement",
        role: "server",
        sequence: 10,
        messageType: MessageType.ACK_COMMIT_FINAL, // 16
      },
      {
        tag: "checkCommitFinalAssertionResponse",
        description: "Client validates commit final assertion response",
        role: "client",
        sequence: 11,
        messageType: MessageType.ACK_COMMIT_FINAL, // 16 (validation of)
      },
      {
        tag: "transferComplete",
        description: "Client sends transfer complete request",
        role: "client",
        sequence: 12,
        messageType: MessageType.COMMIT_TRANSFER_COMPLETE, // 17
      },
      {
        tag: "checkTransferCompleteRequest",
        description: "Server validates transfer complete request",
        role: "server",
        sequence: 13,
        messageType: MessageType.COMMIT_TRANSFER_COMPLETE, // 17 (validation of)
      },
      {
        tag: "transferCompleteResponse",
        description: "Server sends transfer complete response",
        role: "server",
        sequence: 14,
        messageType: MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE, // 22
      },
      {
        tag: "checkTransferCompleteResponse",
        description: "Client validates transfer complete response",
        role: "client",
        sequence: 15,
        messageType: MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE, // 22 (validation of)
      },
    ],
  },
};

/**
 * Helper function to get all step tags for a given stage
 */
export function getStepTagsForStage(stage: SatpStage): SatpStepTag[] {
  return SATP_PROTOCOL_MAP[stage].steps.map((step) => step.tag);
}

/**
 * Get the protocol sequence number for a step tag within a stage.
 * The sequence number defines the execution order of steps within a stage
 * as defined in the SATP protocol specification.
 *
 * @param stage - The SATP stage number (0-3)
 * @param stepTag - The step tag to get the sequence for
 * @returns The sequence number (1-based), or undefined if the step tag is not found
 *
 * @example
 * ```typescript
 * // Returns 1 (first step in stage 0)
 * getStepSequenceNumber(0, "newSessionRequest");
 *
 * // Returns 3 (third step in stage 0)
 * getStepSequenceNumber(0, "newSessionResponse");
 * ```
 */
export function getStepSequenceNumber(
  stage: number,
  stepTag: string,
): number | undefined {
  if (!isValidStage(stage)) {
    return undefined;
  }
  const step = SATP_PROTOCOL_MAP[stage].steps.find((s) => s.tag === stepTag);
  return step?.sequence;
}

/**
 * Helper function to get step details by tag
 */
export function getStepByTag(
  stage: SatpStage,
  tag: SatpStepTag,
): SatpProtocolStep | undefined {
  return SATP_PROTOCOL_MAP[stage].steps.find((step) => step.tag === tag);
}

/**
 * Helper function to convert Stage enum to SatpStage number
 */
export function stageEnumToNumber(stage: SatpStageKey): SatpStage {
  switch (stage) {
    case SatpStageKey.Stage0:
      return 0;
    case SatpStageKey.Stage1:
      return 1;
    case SatpStageKey.Stage2:
      return 2;
    case SatpStageKey.Stage3:
      return 3;
    default:
      return 0;
  }
}

/**
 * Helper function to convert SatpStage number to Stage enum
 */
export function stageNumberToEnum(stage: SatpStage): SatpStageKey {
  switch (stage) {
    case 0:
      return SatpStageKey.Stage0;
    case 1:
      return SatpStageKey.Stage1;
    case 2:
      return SatpStageKey.Stage2;
    case 3:
      return SatpStageKey.Stage3;
  }
}

/**
 * Valid SATP stage numbers
 */
const VALID_STAGES: readonly SatpStage[] = [0, 1, 2, 3] as const;

/**
 * Checks if a number is a valid SATP stage (0-3).
 *
 * @param stage - The stage number to validate
 * @returns `true` if stage is 0, 1, 2, or 3
 */
export function isValidStage(stage: number): stage is SatpStage {
  return VALID_STAGES.includes(stage as SatpStage);
}

/**
 * Validates if a step tag belongs to a specific stage.
 * This function serves as a type guard, narrowing the stepTag type to SatpStepTag
 * when validation succeeds.
 *
 * @param stage - The SATP stage number (0-3)
 * @param stepTag - The step tag string to validate
 * @returns `true` if the stepTag is valid for the given stage, `false` otherwise
 * @throws Error if stage is not a valid SATP stage (0-3)
 *
 * @example
 * ```typescript
 * if (isValidStepForStage(1, "transferProposalRequest")) {
 *   // stepTag is now typed as SatpStepTag
 * }
 * ```
 */
export function isValidStepForStage(
  stage: number,
  stepTag: string,
): stepTag is SatpStepTag {
  if (!isValidStage(stage)) {
    throw new Error(
      `Invalid SATP stage: ${stage}. Valid stages are: ${VALID_STAGES.join(", ")}`,
    );
  }
  return SATP_PROTOCOL_MAP[stage].steps.some((step) => step.tag === stepTag);
}

/**
 * Validates a step tag for a given stage and throws a descriptive error if invalid.
 * Use this function when you need to enforce validation with detailed error messages.
 *
 * @param stage - The SATP stage number (0-3)
 * @param stepTag - The step tag string to validate
 * @throws Error if stage is invalid or stepTag is not valid for the stage
 *
 * @example
 * ```typescript
 * // Will throw if stepTag is not valid for stage 1
 * assertValidStepForStage(1, stepTag);
 * // After this point, stepTag is guaranteed to be valid
 * ```
 */
export function assertValidStepForStage(
  stage: number,
  stepTag: string,
): asserts stepTag is SatpStepTag {
  if (!isValidStage(stage)) {
    throw new Error(
      `Invalid SATP stage: ${stage}. Valid stages are: ${VALID_STAGES.join(", ")}`,
    );
  }
  if (!isValidStepForStage(stage, stepTag)) {
    const validTags = getStepTagsForStage(stage);
    throw new Error(
      `Step "${stepTag}" is not a valid SATP protocol step for stage ${stage}. ` +
        `Valid steps for stage ${stage} (${SATP_PROTOCOL_MAP[stage].name}): ${validTags.join(", ")}`,
    );
  }
}

/**
 * Validates a step tag for a given stage and returns detailed validation result.
 * Use this function when you need validation information without throwing errors.
 *
 * @param stage - The SATP stage number (0-3)
 * @param stepTag - The step tag string to validate
 * @returns A {@link StepTagValidationResult} with validation details
 *
 * @example
 * ```typescript
 * const result = validateStepTagForStage(1, "invalidStep");
 * if (!result.valid) {
 *   console.log(result.errorMessage);
 *   console.log("Valid options:", result.validStepTags);
 * }
 * ```
 */
export function validateStepTagForStage(
  stage: number,
  stepTag: string,
): StepTagValidationResult {
  // Validate stage first
  if (!isValidStage(stage)) {
    return {
      valid: false,
      stage,
      stepTag,
      errorMessage: `Invalid SATP stage: ${stage}. Valid stages are: ${VALID_STAGES.join(", ")}`,
    };
  }

  if (isValidStepForStage(stage, stepTag)) {
    return {
      valid: true,
      stage,
      stepTag,
    };
  }

  const validTags = getStepTagsForStage(stage);
  return {
    valid: false,
    stage,
    stepTag,
    errorMessage:
      `Step "${stepTag}" is not a valid SATP protocol step for stage ${stage}. ` +
      `Valid steps for stage ${stage} (${SATP_PROTOCOL_MAP[stage].name}): ${validTags.join(", ")}`,
    validStepTags: validTags,
  };
}
