import "jest-extended";
import {
  SATPError,
  SATPInternalError,
  SATP_ERROR_URN_PREFIX,
  SATP_MSG_TYPE_URN_PREFIX,
  formatSATPErrorTypeURN,
} from "../../../main/typescript/core/errors/satp-errors";
import { Error as SATPErrorType } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";

describe("SATPError & URN Registration Specification Compliance", () => {
  describe("formatSATPErrorTypeURN", () => {
    it("formats enum SATPErrorType values into IETF compliant URN strings", () => {
      const urn = formatSATPErrorTypeURN(SATPErrorType.BADLY_FORMATED_MESSAGE);
      expect(urn).toBe(`${SATP_ERROR_URN_PREFIX}badly_formated_message`);
    });

    it("formats raw string error codes into IETF compliant URN strings", () => {
      const urn = formatSATPErrorTypeURN("err_0.1.1");
      expect(urn).toBe("urn:ietf:params:satp:error:err_0.1.1");
    });

    it("preserves strings that are already full URNs", () => {
      const existingURN = "urn:ietf:params:satp:error:err_1.1.11";
      expect(formatSATPErrorTypeURN(existingURN)).toBe(existingURN);
    });
  });

  describe("SATPError", () => {
    it("constructs with basic parameters and sets specification defaults", () => {
      const err = new SATPError(
        "Invalid session context",
        400,
        SATPErrorType.SESSION_NOT_FOUND,
        "trace-123-abc",
      );

      expect(err.name).toBe("SATPError");
      expect(err.message).toBe("Invalid session context");
      expect(err.httpCode).toBe(400);
      expect(err.errorType).toBe(SATPErrorType.SESSION_NOT_FOUND);
      expect(err.traceID).toBe("trace-123-abc");
      expect(err.messageType).toBe(`${SATP_MSG_TYPE_URN_PREFIX}reject-msg`);
      expect(err.version).toBe("1.0");
      expect(err.timestamp).toBeDefined();
    });

    it("constructs with full ISATPErrorOptions and exports RFC 9457 toJSON() payload", () => {
      const options = {
        traceID: "trace-999",
        messageType: "urn:ietf:satp:msgtype:error-msg",
        title: "Session ID Not Found",
        detail: "Session with id session-123 does not exist.",
        version: "1.0",
        sessionId: "session-123",
        transferContextId: "context-456",
        instance: "context-456",
        prevMsgType: "urn:ietf:satp:msgtype:transfer-proposal-msg",
        hashPrevMessage: "abc123hash",
        timestamp: "2026-08-03T12:00:00.000Z",
      };

      const err = new SATPError(
        "Session ID Not Found",
        404,
        SATPErrorType.SESSION_ID_NOT_FOUND,
        options,
      );

      const json = err.toJSON();

      expect(json.error).toBe("SATPError");
      expect(json.httpCode).toBe(404);
      expect(json.status).toBe(404);
      expect(json.type).toBe("urn:ietf:params:satp:error:session_id_not_found");
      expect(json.messageType).toBe("urn:ietf:satp:msgtype:error-msg");
      expect(json.title).toBe("Session ID Not Found");
      expect(json.detail).toBe("Session with id session-123 does not exist.");
      expect(json.sessionId).toBe("session-123");
      expect(json.transferContextId).toBe("context-456");
      expect(json.instance).toBe("context-456");
      expect(json.prevMsgType).toBe(
        "urn:ietf:satp:msgtype:transfer-proposal-msg",
      );
      expect(json.hashPrevMessage).toBe("abc123hash");
      expect(json.timestamp).toBe("2026-08-03T12:00:00.000Z");
      expect(json.traceID).toBe("trace-999");
    });

    it("converts from internal SATPInternalError via fromInternalError()", () => {
      const internalErr = new SATPInternalError(
        "Internal database query failed",
        new Error("Connection timeout"),
        500,
        "trace-internal-500",
      );

      const clientErr = SATPError.fromInternalError(internalErr);
      expect(clientErr.httpCode).toBe(500);
      expect(clientErr.traceID).toBe("trace-internal-500");
      expect(clientErr.detail).toBe("Internal database query failed");
      expect(clientErr.title).toBe("SATPInternalError");

      const json = clientErr.toJSON();
      expect(json.status).toBe(500);
      expect(json.type).toBe("urn:ietf:params:satp:error:unspecified");
    });
  });
});
