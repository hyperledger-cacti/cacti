/**
 * Unit tests for cross-stage protocol message utilities:
 * - createRejectMessage (v13 Section 8.5)
 * - createErrorMessage (v13 Section 10.6)
 * - createSessionAbortMessage (v13 Section 10.7)
 * - checkAbortEffectiveness (v13 Section 11.4)
 */
import { create } from "@bufbuild/protobuf";
import { MessageType } from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import {
  SessionData,
  SessionDataSchema,
  State,
  MessageStagesTimestampsSchema,
  Stage0TimestampsSchema,
  Stage1TimestampsSchema,
  Stage2TimestampsSchema,
  Stage3TimestampsSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/session/session_pb";
import { SATP_CORE_VERSION } from "../../../main/typescript/core/constants";
import {
  createRejectMessage,
  createErrorMessage,
  createSessionAbortMessage,
  checkAbortEffectiveness,
  handleIncomingRejectMessage,
  handleIncomingErrorMessage,
  handleIncomingSessionAbortMessage,
  handleIncomingProtocolRejectMessage,
} from "../../../main/typescript/core/stage-services/protocol-message-service";
import {
  saveTimestamp,
  TimestampType,
} from "../../../main/typescript/core/session-utils";
import { applyCrossStageProtocolMessage } from "../../../main/typescript/core/stage-handlers/handler-utils";
import {
  ReceivedErrorMessageError,
  ReceivedRejectMessageError,
  ReceivedSessionAbortError,
} from "../../../main/typescript/core/errors/satp-errors";

function makeSessionData(): SessionData {
  return create(SessionDataSchema, {
    id: "test-session-id",
    transferContextId: "ctx-123",
    version: SATP_CORE_VERSION,
    lastSequenceNumber: BigInt(5),
    state: State.ONGOING,
    receivedTimestamps: create(MessageStagesTimestampsSchema, {
      stage0: create(Stage0TimestampsSchema),
      stage1: create(Stage1TimestampsSchema),
      stage2: create(Stage2TimestampsSchema),
      stage3: create(Stage3TimestampsSchema),
    }),
    processedTimestamps: create(MessageStagesTimestampsSchema, {
      stage0: create(Stage0TimestampsSchema),
      stage1: create(Stage1TimestampsSchema),
      stage2: create(Stage2TimestampsSchema),
      stage3: create(Stage3TimestampsSchema),
    }),
  });
}

describe("protocol-message-service", () => {
  describe("createRejectMessage", () => {
    it("creates a RejectMessage with correct common fields", () => {
      const sessionData = makeSessionData();
      const msg = createRejectMessage({
        sessionData,
        reasonCode: "err_2.1",
        lastReceivedMessageType: MessageType.INIT_PROPOSAL,
      });

      expect(msg.common).toBeDefined();
      expect(msg.common!.version).toBe(SATP_CORE_VERSION);
      expect(msg.common!.messageType).toBe(MessageType.INIT_REJECT);
      expect(msg.common!.sessionId).toBe("test-session-id");
      expect(msg.common!.transferContextId).toBe("ctx-123");
    });

    it("includes reasonCode and timestamp", () => {
      const sessionData = makeSessionData();
      const msg = createRejectMessage({
        sessionData,
        reasonCode: "err_1.1.1",
        lastReceivedMessageType: MessageType.TRANSFER_COMMENCE_REQUEST,
      });

      expect(msg.reasonCode).toBe("err_1.1.1");
      expect(msg.timestamp).toBeTruthy();
      // timestamp should be ISO 8601
      expect(() => new Date(msg.timestamp)).not.toThrow();
    });

    it("includes hashPrevMessage (may be empty if no prior hash stored)", () => {
      const sessionData = makeSessionData();
      const msg = createRejectMessage({
        sessionData,
        reasonCode: "err_2.1",
        lastReceivedMessageType: MessageType.LOCK_ASSERT,
      });

      expect(msg.hashPrevMessage).toBeDefined();
      // hashPrevMessage is "" when no prior message hash stored
      expect(typeof msg.hashPrevMessage).toBe("string");
    });
  });

  describe("createErrorMessage", () => {
    it("creates an ErrorMessage with correct common fields", () => {
      const sessionData = makeSessionData();
      const msg = createErrorMessage({
        sessionData,
        errorMsgType: "INIT_PROPOSAL",
        errorType: "err_1.1.4",
        errorSeverity: "fatal",
      });

      expect(msg.common).toBeDefined();
      expect(msg.common!.messageType).toBe(MessageType.ERROR);
      expect(msg.common!.sessionId).toBe("test-session-id");
    });

    it("includes all error classification fields", () => {
      const sessionData = makeSessionData();
      const msg = createErrorMessage({
        sessionData,
        errorMsgType: "LOCK_ASSERT",
        errorType: "err_3.2",
        errorSeverity: "high",
      });

      expect(msg.errorMsgType).toBe("LOCK_ASSERT");
      expect(msg.errorType).toBe("err_3.2");
      expect(msg.errorSeverity).toBe("high");
    });
  });

  describe("createSessionAbortMessage", () => {
    it("creates a SessionAbortMessage with SESSION_ABORT type", () => {
      const sessionData = makeSessionData();
      const msg = createSessionAbortMessage({ sessionData });

      expect(msg.common).toBeDefined();
      expect(msg.common!.messageType).toBe(MessageType.SESSION_ABORT);
      expect(msg.common!.sessionId).toBe("test-session-id");
      expect(msg.common!.transferContextId).toBe("ctx-123");
    });
  });

  describe("checkAbortEffectiveness", () => {
    it("returns effective=true for Stage 0 messages", () => {
      const result = checkAbortEffectiveness(MessageType.NEW_SESSION_RESPONSE);
      expect(result.effective).toBe(true);
      expect(result.stage).toBe(0);
    });

    it("returns effective=true for Stage 1 messages", () => {
      const result = checkAbortEffectiveness(MessageType.INIT_PROPOSAL);
      expect(result.effective).toBe(true);
      expect(result.stage).toBe(1);
    });

    it("returns effective=true for Stage 2 messages", () => {
      const result = checkAbortEffectiveness(MessageType.LOCK_ASSERT);
      expect(result.effective).toBe(true);
      expect(result.stage).toBe(2);
    });

    it("returns effective=true for pre-commit-final Stage 3 (COMMIT_PREPARE)", () => {
      const result = checkAbortEffectiveness(MessageType.COMMIT_PREPARE);
      expect(result.effective).toBe(true);
      expect(result.stage).toBe(3);
    });

    it("returns effective=true for pre-commit-final Stage 3 (COMMIT_READY)", () => {
      const result = checkAbortEffectiveness(MessageType.COMMIT_READY);
      expect(result.effective).toBe(true);
      expect(result.stage).toBe(3);
    });

    it("returns effective=false after COMMIT_FINAL", () => {
      const result = checkAbortEffectiveness(MessageType.COMMIT_FINAL);
      expect(result.effective).toBe(false);
      expect(result.stage).toBe(3);
      expect(result.reason).toContain("NOT effective");
    });

    it("returns effective=false after ACK_COMMIT_FINAL", () => {
      const result = checkAbortEffectiveness(MessageType.ACK_COMMIT_FINAL);
      expect(result.effective).toBe(false);
    });

    it("returns effective=false after COMMIT_TRANSFER_COMPLETE", () => {
      const result = checkAbortEffectiveness(
        MessageType.COMMIT_TRANSFER_COMPLETE,
      );
      expect(result.effective).toBe(false);
    });

    it("returns effective=false after COMMIT_TRANSFER_COMPLETE_RESPONSE", () => {
      const result = checkAbortEffectiveness(
        MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
      );
      expect(result.effective).toBe(false);
    });
  });

  describe("inbound protocol message handling", () => {
    it("reject-msg terminates the session and marks it REJECTED", () => {
      const sessionData = makeSessionData();
      saveTimestamp(
        sessionData,
        MessageType.INIT_PROPOSAL,
        TimestampType.RECEIVED,
      );
      const msg = createRejectMessage({
        sessionData,
        reasonCode: "err_2.1",
        lastReceivedMessageType: MessageType.INIT_PROPOSAL,
      });

      const result = handleIncomingRejectMessage(sessionData, msg);

      expect(result.terminate).toBe(true);
      expect(result.accepted).toBe(true);
      expect(sessionData.state).toBe(State.REJECTED);
    });

    it("error-msg with fatal severity terminates the session", () => {
      const sessionData = makeSessionData();
      const msg = createErrorMessage({
        sessionData,
        errorMsgType: "transfer-proposal-msg",
        errorType: "err_1.1.1",
        errorSeverity: "fatal",
      });

      const result = handleIncomingErrorMessage(sessionData, msg);

      expect(result.terminate).toBe(true);
      expect(sessionData.state).toBe(State.REJECTED);
    });

    it("error-msg with non-fatal severity marks ERROR without termination", () => {
      const sessionData = makeSessionData();
      const msg = createErrorMessage({
        sessionData,
        errorMsgType: "transfer-proposal-msg",
        errorType: "err_1.1.1",
        errorSeverity: "low",
      });

      const result = handleIncomingErrorMessage(sessionData, msg);

      expect(result.terminate).toBe(false);
      expect(result.accepted).toBe(true);
      expect(sessionData.state).toBe(State.ERROR);
    });

    it("session-abort-msg before commit-final is effective and terminates", () => {
      const sessionData = makeSessionData();
      saveTimestamp(
        sessionData,
        MessageType.INIT_RECEIPT,
        TimestampType.RECEIVED,
      );
      const msg = createSessionAbortMessage({ sessionData });

      const result = handleIncomingSessionAbortMessage(sessionData, msg);

      expect(result.terminate).toBe(true);
      expect(result.accepted).toBe(true);
      expect(sessionData.state).toBe(State.REJECTED);
    });

    it("session-abort-msg after commit-final is NOT effective and does not terminate", () => {
      const sessionData = makeSessionData();
      saveTimestamp(
        sessionData,
        MessageType.COMMIT_FINAL,
        TimestampType.RECEIVED,
      );
      const msg = createSessionAbortMessage({ sessionData });

      const result = handleIncomingSessionAbortMessage(sessionData, msg);

      expect(result.terminate).toBe(false);
      expect(result.accepted).toBe(false);
      expect(result.reason).toContain("NOT effective");
      expect(sessionData.state).toBe(State.ONGOING);
    });

    it("cross-stage protocol guard applies reject/error/abort state transitions", () => {
      const sessionData = makeSessionData();
      saveTimestamp(
        sessionData,
        MessageType.INIT_RECEIPT,
        TimestampType.RECEIVED,
      );
      const msg = createSessionAbortMessage({ sessionData });

      expect(() => applyCrossStageProtocolMessage(sessionData, msg)).toThrow(
        ReceivedSessionAbortError,
      );

      expect(sessionData.state).toBe(State.REJECTED);
    });

    it("cross-stage protocol guard throws SATP-specific errors for reject and fatal error messages", () => {
      const rejectSession = makeSessionData();
      saveTimestamp(
        rejectSession,
        MessageType.INIT_PROPOSAL,
        TimestampType.RECEIVED,
      );
      const reject = createRejectMessage({
        sessionData: rejectSession,
        reasonCode: "err_2.1",
        lastReceivedMessageType: MessageType.INIT_PROPOSAL,
      });

      expect(() =>
        applyCrossStageProtocolMessage(rejectSession, reject),
      ).toThrow(ReceivedRejectMessageError);

      const errorSession = makeSessionData();
      const error = createErrorMessage({
        sessionData: errorSession,
        errorMsgType: "transfer-proposal-msg",
        errorType: "err_1.1.1",
        errorSeverity: "fatal",
      });

      expect(() => applyCrossStageProtocolMessage(errorSession, error)).toThrow(
        ReceivedErrorMessageError,
      );
    });

    it("dispatcher routes each message by its common.messageType", () => {
      const sessionData = makeSessionData();
      const reject = createRejectMessage({
        sessionData,
        reasonCode: "err_2.1",
        lastReceivedMessageType: MessageType.INIT_PROPOSAL,
      });
      expect(
        handleIncomingProtocolRejectMessage(sessionData, reject)!.terminate,
      ).toBe(true);

      const sessionData2 = makeSessionData();
      const abort = createSessionAbortMessage({ sessionData: sessionData2 });
      expect(
        handleIncomingProtocolRejectMessage(sessionData2, abort)!.accepted,
      ).toBe(true);

      const sessionData3 = makeSessionData();
      const error = createErrorMessage({
        sessionData: sessionData3,
        errorMsgType: "transfer-proposal-msg",
        errorType: "err_1.1.1",
        errorSeverity: "fatal",
      });
      expect(
        handleIncomingProtocolRejectMessage(sessionData3, error)!.terminate,
      ).toBe(true);
    });

    it("dispatcher rejects messages whose common.sessionId does not match the session", () => {
      const sessionData = makeSessionData();
      const msg = createSessionAbortMessage({ sessionData });
      msg.common!.sessionId = "some-other-session";

      const result = handleIncomingProtocolRejectMessage(sessionData, msg)!;

      expect(result.accepted).toBe(false);
      expect(sessionData.state).toBe(State.ONGOING);
    });
  });
});
