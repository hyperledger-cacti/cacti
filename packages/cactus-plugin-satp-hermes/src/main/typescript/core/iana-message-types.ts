/**
 * @fileoverview
 * IANA Message Type URN Mapping — v13 Section 13.3–13.4
 *
 * Maps the internal MessageType protobuf enum values to the IANA-registered
 * URN strings defined in draft-ietf-satp-core-13.
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-13.txt}
 * Sections 13.3–13.4
 */
import { MessageType } from "../generated/proto/cacti/satp/v13/common/message_pb";

const SATP_MSGTYPE_URN_PREFIX = "urn:ietf:params:satp:core:msgtype:";

/**
 * Bidirectional map between MessageType enum values and IANA URN strings.
 *
 * Stage 0 message types (non-standard extension) do not have IANA URNs
 * and are excluded from this map.
 */
const MESSAGE_TYPE_TO_URN: ReadonlyMap<MessageType, string> = new Map([
  [
    MessageType.INIT_PROPOSAL,
    `${SATP_MSGTYPE_URN_PREFIX}transfer-proposal-msg`,
  ],
  [MessageType.INIT_RECEIPT, `${SATP_MSGTYPE_URN_PREFIX}proposal-receipt-msg`],
  [MessageType.INIT_REJECT, `${SATP_MSGTYPE_URN_PREFIX}reject-msg`],
  [
    MessageType.TRANSFER_COMMENCE_REQUEST,
    `${SATP_MSGTYPE_URN_PREFIX}transfer-commence-msg`,
  ],
  [
    MessageType.TRANSFER_COMMENCE_RESPONSE,
    `${SATP_MSGTYPE_URN_PREFIX}ack-commence-msg`,
  ],
  [MessageType.LOCK_ASSERT, `${SATP_MSGTYPE_URN_PREFIX}lock-assert-msg`],
  [
    MessageType.ASSERTION_RECEIPT,
    `${SATP_MSGTYPE_URN_PREFIX}assertion-receipt-msg`,
  ],
  [MessageType.COMMIT_PREPARE, `${SATP_MSGTYPE_URN_PREFIX}commit-prepare-msg`],
  [MessageType.COMMIT_READY, `${SATP_MSGTYPE_URN_PREFIX}commit-ready-msg`],
  [MessageType.COMMIT_FINAL, `${SATP_MSGTYPE_URN_PREFIX}commit-final-msg`],
  [
    MessageType.ACK_COMMIT_FINAL,
    `${SATP_MSGTYPE_URN_PREFIX}ack-commit-final-msg`,
  ],
  [
    MessageType.COMMIT_TRANSFER_COMPLETE,
    `${SATP_MSGTYPE_URN_PREFIX}commit-transfer-complete-msg`,
  ],
  [MessageType.ERROR, `${SATP_MSGTYPE_URN_PREFIX}error-msg`],
  [MessageType.SESSION_ABORT, `${SATP_MSGTYPE_URN_PREFIX}session-abort-msg`],
]);

const URN_TO_MESSAGE_TYPE: ReadonlyMap<string, MessageType> = new Map(
  Array.from(MESSAGE_TYPE_TO_URN.entries()).map(([k, v]) => [v, k]),
);

/**
 * Convert a MessageType enum value to its IANA URN string.
 * Returns `undefined` for non-standard (Stage 0) message types.
 */
export function messageTypeToUrn(messageType: MessageType): string | undefined {
  return MESSAGE_TYPE_TO_URN.get(messageType);
}

/**
 * Convert an IANA URN string to its MessageType enum value.
 * Returns `undefined` for unrecognized URNs.
 */
export function urnToMessageType(urn: string): MessageType | undefined {
  return URN_TO_MESSAGE_TYPE.get(urn);
}

export { SATP_MSGTYPE_URN_PREFIX };
