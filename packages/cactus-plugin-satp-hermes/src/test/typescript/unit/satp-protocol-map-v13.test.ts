/**
 * Unit tests for the v13 SATP Protocol Map (Phase 2 — TASK-009).
 *
 * Verifies that SATP_PROTOCOL_MAP correctly defines all 4 stages
 * with v13-compliant message type assignments, step ordering,
 * and helper functions.
 */
import { MessageType } from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import {
  SATP_PROTOCOL_MAP,
  getStepTagsForStage,
  getStepByTag,
  isValidStage,
  isValidStepForStage,
  assertValidStepForStage,
  validateStepTagForStage,
  stageEnumToNumber,
  stageNumberToEnum,
  type SatpStage,
} from "../../../main/typescript/core/satp-protocol-map";
import { SatpStageKey } from "../../../main/typescript/generated/gateway-client/typescript-axios";

describe("SATP Protocol Map — v13 Stage Definitions", () => {
  it("defines exactly 4 stages (0, 1, 2, 3)", () => {
    const stageKeys = Object.keys(SATP_PROTOCOL_MAP).map(Number);
    expect(stageKeys).toEqual([0, 1, 2, 3]);
  });

  describe("Stage 0 — Transfer Initiation and Negotiation", () => {
    const stage0 = SATP_PROTOCOL_MAP[0];

    it("has correct name", () => {
      expect(stage0.name).toBe("Transfer Initiation and Negotiation");
    });

    it("has 8 steps for the complete Stage 0 flow", () => {
      expect(stage0.steps).toHaveLength(8);
    });

    it("uses non-standard Stage 0 message types (not IANA-registered)", () => {
      const msgTypes = stage0.steps
        .map((s) => s.messageType)
        .filter((t) => t !== undefined);
      const stage0Types = [
        MessageType.NEW_SESSION_REQUEST,
        MessageType.NEW_SESSION_RESPONSE,
        MessageType.PRE_SATP_TRANSFER_REQUEST,
        MessageType.PRE_SATP_TRANSFER_RESPONSE,
      ];
      for (const mt of msgTypes) {
        expect(stage0Types).toContain(mt);
      }
    });

    it("follows client→server→client alternating pattern", () => {
      const roles = stage0.steps.map((s) => s.role);
      expect(roles).toEqual([
        "client",
        "server",
        "server",
        "client",
        "client",
        "server",
        "server",
        "client",
      ]);
    });
  });

  describe("Stage 1 — Transfer Initiation and Commencement Flows", () => {
    const stage1 = SATP_PROTOCOL_MAP[1];

    it("maps to v13 Sections 8.3-8.7", () => {
      expect(stage1.name).toContain("Transfer Initiation and Commencement");
    });

    it("has 8 steps covering proposal and commence flows", () => {
      expect(stage1.steps).toHaveLength(8);
    });

    it("maps INIT_PROPOSAL to transferProposalRequest", () => {
      const step = stage1.steps.find(
        (s) => s.tag === "transferProposalRequest",
      );
      expect(step?.messageType).toBe(MessageType.INIT_PROPOSAL);
    });

    it("maps INIT_RECEIPT to transferProposalResponse", () => {
      const step = stage1.steps.find(
        (s) => s.tag === "transferProposalResponse",
      );
      expect(step?.messageType).toBe(MessageType.INIT_RECEIPT);
    });

    it("maps TRANSFER_COMMENCE_REQUEST and TRANSFER_COMMENCE_RESPONSE", () => {
      const commenceReq = stage1.steps.find(
        (s) => s.tag === "transferCommenceRequest",
      );
      const commenceResp = stage1.steps.find(
        (s) => s.tag === "transferCommenceResponse",
      );
      expect(commenceReq?.messageType).toBe(
        MessageType.TRANSFER_COMMENCE_REQUEST,
      );
      expect(commenceResp?.messageType).toBe(
        MessageType.TRANSFER_COMMENCE_RESPONSE,
      );
    });

    it("steps have monotonically increasing sequence numbers", () => {
      const sequences = stage1.steps.map((s) => s.sequence);
      for (let i = 1; i < sequences.length; i++) {
        expect(sequences[i]).toBeGreaterThan(sequences[i - 1]);
      }
    });
  });

  describe("Stage 2 — Asset Locking and Escrow", () => {
    const stage2 = SATP_PROTOCOL_MAP[2];

    it("has 5 steps per v13 Section 9", () => {
      expect(stage2.steps).toHaveLength(5);
    });

    it("maps LOCK_ASSERT to lockAssertionRequest", () => {
      const step = stage2.steps.find((s) => s.tag === "lockAssertionRequest");
      expect(step?.messageType).toBe(MessageType.LOCK_ASSERT);
    });

    it("maps ASSERTION_RECEIPT to lockAssertionResponse", () => {
      const step = stage2.steps.find((s) => s.tag === "lockAssertionResponse");
      expect(step?.messageType).toBe(MessageType.ASSERTION_RECEIPT);
    });

    it("lockAsset step has no messageType (internal blockchain op)", () => {
      const step = stage2.steps.find((s) => s.tag === "lockAsset");
      expect(step?.messageType).toBeUndefined();
    });
  });

  describe("Stage 3 — Commitment and Finalization", () => {
    const stage3 = SATP_PROTOCOL_MAP[3];

    it("has 15 steps per v13 Sections 10.1–10.5", () => {
      expect(stage3.steps).toHaveLength(15);
    });

    it("maps all v13 Stage 3 message types correctly", () => {
      const expected: Record<string, MessageType> = {
        commitPreparation: MessageType.COMMIT_PREPARE,
        checkCommitPreparationRequest: MessageType.COMMIT_PREPARE,
        commitReadyResponse: MessageType.COMMIT_READY,
        checkCommitPreparationResponse: MessageType.COMMIT_READY,
        commitFinalAssertion: MessageType.COMMIT_FINAL,
        checkCommitFinalAssertionRequest: MessageType.COMMIT_FINAL,
        commitFinalAcknowledgementReceiptResponse: MessageType.ACK_COMMIT_FINAL,
        checkCommitFinalAssertionResponse: MessageType.ACK_COMMIT_FINAL,
        transferComplete: MessageType.COMMIT_TRANSFER_COMPLETE,
        checkTransferCompleteRequest: MessageType.COMMIT_TRANSFER_COMPLETE,
        transferCompleteResponse: MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
        checkTransferCompleteResponse:
          MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
      };

      for (const [tag, expectedMt] of Object.entries(expected)) {
        const step = stage3.steps.find((s) => s.tag === tag);
        expect(step?.messageType).toBe(expectedMt);
      }
    });

    it("internal asset operations have no messageType", () => {
      const internalOps = ["mintAsset", "burnAsset", "assignAsset"];
      for (const tag of internalOps) {
        const step = stage3.steps.find((s) => s.tag === tag);
        expect(step).toBeDefined();
        expect(step?.messageType).toBeUndefined();
      }
    });

    it("steps have monotonically increasing sequence numbers", () => {
      const sequences = stage3.steps.map((s) => s.sequence);
      for (let i = 1; i < sequences.length; i++) {
        expect(sequences[i]).toBeGreaterThan(sequences[i - 1]);
      }
    });
  });
});

describe("SATP Protocol Map — Helper Functions", () => {
  describe("getStepTagsForStage", () => {
    it("returns correct step tags for each stage", () => {
      const stage0Tags = getStepTagsForStage(0);
      expect(stage0Tags).toContain("newSessionRequest");
      expect(stage0Tags).toContain("preSATPTransferResponse");

      const stage1Tags = getStepTagsForStage(1);
      expect(stage1Tags).toContain("transferProposalRequest");
      expect(stage1Tags).toContain("transferCommenceResponse");

      const stage2Tags = getStepTagsForStage(2);
      expect(stage2Tags).toContain("lockAsset");
      expect(stage2Tags).toContain("lockAssertionResponse");

      const stage3Tags = getStepTagsForStage(3);
      expect(stage3Tags).toContain("commitPreparation");
      expect(stage3Tags).toContain("transferCompleteResponse");
    });
  });

  describe("getStepByTag", () => {
    it("returns step details for valid tag", () => {
      const step = getStepByTag(1, "transferProposalRequest");
      expect(step).toBeDefined();
      expect(step?.messageType).toBe(MessageType.INIT_PROPOSAL);
      expect(step?.role).toBe("client");
      expect(step?.sequence).toBe(1);
    });

    it("returns undefined for invalid tag", () => {
      const step = getStepByTag(0, "nonExistentStep" as never);
      expect(step).toBeUndefined();
    });
  });

  describe("isValidStage", () => {
    it("returns true for stages 0-3", () => {
      expect(isValidStage(0)).toBe(true);
      expect(isValidStage(1)).toBe(true);
      expect(isValidStage(2)).toBe(true);
      expect(isValidStage(3)).toBe(true);
    });

    it("returns false for invalid stage numbers", () => {
      expect(isValidStage(-1)).toBe(false);
      expect(isValidStage(4)).toBe(false);
      expect(isValidStage(99)).toBe(false);
    });
  });

  describe("isValidStepForStage", () => {
    it("returns true for valid step-stage combinations", () => {
      expect(isValidStepForStage(0, "newSessionRequest")).toBe(true);
      expect(isValidStepForStage(1, "transferProposalRequest")).toBe(true);
      expect(isValidStepForStage(2, "lockAssertionRequest")).toBe(true);
      expect(isValidStepForStage(3, "commitPreparation")).toBe(true);
    });

    it("returns false for step tags from wrong stage", () => {
      expect(isValidStepForStage(0, "transferProposalRequest")).toBe(false);
      expect(isValidStepForStage(1, "lockAsset")).toBe(false);
      expect(isValidStepForStage(2, "commitPreparation")).toBe(false);
    });

    it("throws for invalid stage number", () => {
      expect(() => isValidStepForStage(5, "anything")).toThrow(
        /Invalid SATP stage/,
      );
    });
  });

  describe("assertValidStepForStage", () => {
    it("does not throw for valid step-stage", () => {
      expect(() =>
        assertValidStepForStage(1, "transferProposalRequest"),
      ).not.toThrow();
    });

    it("throws descriptive error for invalid step", () => {
      expect(() => assertValidStepForStage(1, "commitPreparation")).toThrow(
        /not a valid SATP protocol step for stage 1/,
      );
    });
  });

  describe("validateStepTagForStage", () => {
    it("returns valid=true for valid combinations", () => {
      const result = validateStepTagForStage(2, "lockAssertionRequest");
      expect(result.valid).toBe(true);
      expect(result.stage).toBe(2);
    });

    it("returns valid=false with error details for invalid combinations", () => {
      const result = validateStepTagForStage(0, "commitPreparation");
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.validStepTags).toBeDefined();
      expect(result.validStepTags).toContain("newSessionRequest");
    });

    it("returns valid=false for invalid stage", () => {
      const result = validateStepTagForStage(99, "anything");
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain("Invalid SATP stage");
    });
  });

  describe("stageEnumToNumber / stageNumberToEnum", () => {
    it("round-trips all stage enum values", () => {
      const stages: SatpStage[] = [0, 1, 2, 3];
      for (const stage of stages) {
        const enumVal = stageNumberToEnum(stage);
        const backToNumber = stageEnumToNumber(enumVal);
        expect(backToNumber).toBe(stage);
      }
    });

    it("maps SatpStageKey.Stage0 to 0 and vice versa", () => {
      expect(stageEnumToNumber(SatpStageKey.Stage0)).toBe(0);
      expect(stageNumberToEnum(0)).toBe(SatpStageKey.Stage0);
    });

    it("maps SatpStageKey.Stage3 to 3 and vice versa", () => {
      expect(stageEnumToNumber(SatpStageKey.Stage3)).toBe(3);
      expect(stageNumberToEnum(3)).toBe(SatpStageKey.Stage3);
    });
  });
});
