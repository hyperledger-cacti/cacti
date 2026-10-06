import { MessageType } from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import {
  messageTypeToUrn,
  urnToMessageType,
  SATP_MSGTYPE_URN_PREFIX,
} from "../../../main/typescript/core/iana-message-types";

describe("IANA Message Type URN Mapping (v16)", () => {
  const STANDARD_TYPES: [MessageType, string][] = [
    [
      MessageType.INIT_PROPOSAL,
      "urn:ietf:params:satp:core:msgtype:transfer-proposal-msg",
    ],
    [
      MessageType.INIT_RECEIPT,
      "urn:ietf:params:satp:core:msgtype:proposal-receipt-msg",
    ],
    [MessageType.INIT_REJECT, "urn:ietf:params:satp:core:msgtype:reject-msg"],
    [
      MessageType.TRANSFER_COMMENCE_REQUEST,
      "urn:ietf:params:satp:core:msgtype:transfer-commence-msg",
    ],
    [
      MessageType.TRANSFER_COMMENCE_RESPONSE,
      "urn:ietf:params:satp:core:msgtype:ack-commence-msg",
    ],
    [
      MessageType.LOCK_ASSERT,
      "urn:ietf:params:satp:core:msgtype:lock-assert-msg",
    ],
    [
      MessageType.ASSERTION_RECEIPT,
      "urn:ietf:params:satp:core:msgtype:assertion-receipt-msg",
    ],
    [
      MessageType.COMMIT_PREPARE,
      "urn:ietf:params:satp:core:msgtype:commit-prepare-msg",
    ],
    [
      MessageType.COMMIT_READY,
      "urn:ietf:params:satp:core:msgtype:commit-ready-msg",
    ],
    [
      MessageType.COMMIT_FINAL,
      "urn:ietf:params:satp:core:msgtype:commit-final-msg",
    ],
    [
      MessageType.ACK_COMMIT_FINAL,
      "urn:ietf:params:satp:core:msgtype:ack-commit-final-msg",
    ],
    [
      MessageType.COMMIT_TRANSFER_COMPLETE,
      "urn:ietf:params:satp:core:msgtype:commit-transfer-complete-msg",
    ],
    [MessageType.ERROR, "urn:ietf:params:satp:core:msgtype:error-msg"],
    [
      MessageType.SESSION_ABORT,
      "urn:ietf:params:satp:core:msgtype:session-abort-msg",
    ],
  ];

  it("maps all 14 standard message types to v16 IANA URNs", () => {
    expect(STANDARD_TYPES).toHaveLength(14);
    for (const [msgType, expectedUrn] of STANDARD_TYPES) {
      expect(messageTypeToUrn(msgType)).toBe(expectedUrn);
    }
  });

  it("reverse-maps all 14 IANA URNs to MessageType enum values", () => {
    for (const [expectedType, urn] of STANDARD_TYPES) {
      expect(urnToMessageType(urn)).toBe(expectedType);
    }
  });

  it("all URNs use the correct IANA prefix", () => {
    expect(SATP_MSGTYPE_URN_PREFIX).toBe("urn:ietf:params:satp:core:msgtype:");
    for (const [, urn] of STANDARD_TYPES) {
      expect(urn.startsWith(SATP_MSGTYPE_URN_PREFIX)).toBe(true);
    }
  });

  it("returns undefined for Stage 0 (non-standard) message types", () => {
    const stage0Types = [
      MessageType.PRE_INIT_PROPOSAL,
      MessageType.PRE_INIT_RECEIPT,
      MessageType.PRE_INIT_REJECT,
      MessageType.PRE_TRANSFER_COMMENCE_REQUEST,
      MessageType.PRE_TRANSFER_COMMENCE_RESPONSE,
      MessageType.NEW_SESSION_REQUEST,
      MessageType.NEW_SESSION_RESPONSE,
      MessageType.PRE_SATP_TRANSFER_REQUEST,
      MessageType.PRE_SATP_TRANSFER_RESPONSE,
    ];
    for (const msgType of stage0Types) {
      expect(messageTypeToUrn(msgType)).toBeUndefined();
    }
  });

  it("returns undefined for unrecognized URNs", () => {
    expect(
      urnToMessageType("urn:ietf:params:satp:core:msgtype:fake-msg"),
    ).toBeUndefined();
    expect(urnToMessageType("not-a-urn")).toBeUndefined();
  });
});
