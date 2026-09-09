/**
 * ΔID: Δ01
 * SPEC: draft-ietf-satp-core-16 §5.3.2 ("Message Type"), §10.6, §10.7
 *
 * v16 §5.3.2 defines two NEW message types not present in v13:
 *   - error-msg  (urn:ietf:params:satp:core:msgtype:error-msg)
 *   - session-abort-msg (urn:ietf:params:satp:core:msgtype:session-abort-msg)
 *
 * The MessageType enum in the v13 generated proto already carries
 * MESSAGE_TYPE_ERROR = 23 and MESSAGE_TYPE_SESSION_ABORT = 24 after the
 * proto regeneration performed during the v13 rebase, so those membership
 * checks PASS.  The FAILING assertions document the remaining gap: the
 * SATPError.messageType default string still uses the old (wrong) prefix
 * "urn:ietf:satp:core:msgtype:" and the value "reject-msg" instead of the
 * v16-mandated "urn:ietf:params:satp:core:msgtype:error-msg".
 */

import {
  SATPError,
  SATP_MSG_TYPE_URN_PREFIX,
} from "../../../main/typescript/core/errors/satp-errors";
import { SATPErrorType } from "../../../main/typescript/core/errors/satp-error-type";
import { MessageType } from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";

const ALL_MESSAGE_TYPE_KEYS = Object.keys(MessageType).filter((k) =>
  isNaN(Number(k)),
);

describe("Δ01 — draft-ietf-satp-core-16 §5.3.2 MessageType compliance", () => {
  describe("proto enum membership (PASS — already regenerated for v13)", () => {
    it("MessageType enum contains a key with 'ERROR' and no 'REJECT' in that key", () => {
      const errorKey = ALL_MESSAGE_TYPE_KEYS.find(
        (k) => k.includes("ERROR") && !k.includes("REJECT"),
      );
      // SPEC REF: draft-ietf-satp-core-16 §5.3.2 (error-msg)
      expect(errorKey).toBeDefined();
    });

    it("MessageType enum contains a key with 'ABORT'", () => {
      const abortKey = ALL_MESSAGE_TYPE_KEYS.find((k) => k.includes("ABORT"));
      // SPEC REF: draft-ietf-satp-core-16 §5.3.2 (session-abort-msg) / §10.7
      expect(abortKey).toBeDefined();
    });
  });

  describe("SATPError.messageType URN prefix", () => {
    const err = new SATPError("test", 400, SATPErrorType.UNSPECIFIED);

    it("messageType MUST match the v16 IANA namespace prefix", () => {
      // SPEC REF: draft-ietf-satp-core-16 §5.3.2, §13.1
      // v16 mandates urn:ietf:params:satp:core:msgtype:
      // Current code produces: urn:ietf:satp:core:msgtype: (missing 'params:core:')
      expect(err.messageType).toMatch(/^urn:ietf:params:satp:core:msgtype:/);
    });

    it("messageType for an error MUST contain 'error-msg', not 'reject-msg'", () => {
      // SPEC REF: draft-ietf-satp-core-16 §5.3.2, §11.3
      expect(err.messageType).toContain("error-msg"); // fails today: contains reject-msg
    });

    it("messageType MUST NOT contain 'reject-msg' as the default for error instances", () => {
      // SPEC REF: draft-ietf-satp-core-16 §8.5 reject is a distinct message type
      expect(err.messageType).not.toContain("reject-msg");
    });
  });

  describe("SATP_MSG_TYPE_URN_PREFIX constant", () => {
    it("SATP_MSG_TYPE_URN_PREFIX must use urn:ietf:params:satp:core:msgtype: namespace", () => {
      // SPEC REF: draft-ietf-satp-core-16 §13.1
      expect(SATP_MSG_TYPE_URN_PREFIX).toBe(
        "urn:ietf:params:satp:core:msgtype:",
      );
    });
  });
});
