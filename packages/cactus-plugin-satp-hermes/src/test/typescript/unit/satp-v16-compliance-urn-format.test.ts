/**
 * ΔID: Δ05
 * SPEC: draft-ietf-satp-core-16 §5.3.2 ("Message Type"), §13.1 ("URN Registration")
 *
 * v16 §13.1 mandates two distinct IANA sub-namespaces:
 *   Message types:  urn:ietf:params:satp:core:msgtype
 *   Error codes:    urn:ietf:params:satp:core:error
 *
 * v16 §5.3.2 lists human-readable slug names for every message type, e.g.:
 *   transfer-proposal-msg, lock-assert-msg, commit-transfer-complete-msg
 *
 * Current code status:
 *   SATP_ERROR_URN_PREFIX  = "urn:ietf:params:satp:error:"  → CORRECT per v13
 *   SATP_MSG_TYPE_URN_PREFIX = "urn:ietf:satp:core:msgtype:"     → WRONG (missing params:core:)
 *   getMessageTypeName() returns the raw proto enum key      → WRONG format for v16 URN slugs
 *
 * Tests marked PASS: error prefix and formatSATPErrorTypeURN are already compliant.
 * Tests marked FAIL: msgtype prefix and getMessageTypeName() format are non-compliant.
 */

import {
	SATP_ERROR_URN_PREFIX,
	SATP_MSG_TYPE_URN_PREFIX,
	formatSATPErrorTypeURN,
} from "../../../main/typescript/core/errors/satp-errors";
import { SATPErrorType } from "../../../main/typescript/core/errors/satp-error-type";
import { getMessageTypeName } from "../../../main/typescript/core/satp-utils";
import { messageTypeToUrn } from "../../../main/typescript/core/iana-message-types";
import { MessageType } from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";

describe("Δ05 — draft-ietf-satp-core-16 §5.3.2 / §13.1 URN format compliance", () => {
	describe("error URN namespace — compliant baselines (PASS)", () => {
		it("SATP_ERROR_URN_PREFIX is the correct v16 error namespace", () => {
			// SPEC REF: draft-ietf-satp-core-16 §13.1
			expect(SATP_ERROR_URN_PREFIX).toBe("urn:ietf:params:satp:error:");
		});

		it("formatSATPErrorTypeURN(MISSING_PARAMETER) matches the error URN prefix", () => {
			// SPEC REF: draft-ietf-satp-core-16 §11.3, §13.1
			const urn = formatSATPErrorTypeURN(SATPErrorType.MISSING_PARAMETER);
			expect(urn).toMatch(new RegExp(`^${SATP_ERROR_URN_PREFIX}`));
		});

		it("formatSATPErrorTypeURN produces lowercase slug", () => {
			// SPEC REF: draft-ietf-satp-core-16 §11.3 — error URN codes are lowercase
			const urn = formatSATPErrorTypeURN(SATPErrorType.BADLY_FORMATED_MESSAGE);
			expect(urn).toBe(`${SATP_ERROR_URN_PREFIX}badly_formated_message`);
		});
	});

	describe("message type URN namespace — non-compliant (FAIL)", () => {
		it("SATP_MSG_TYPE_URN_PREFIX MUST be urn:ietf:params:satp:core:msgtype:", () => {
			// SPEC REF: draft-ietf-satp-core-16 §13.1
			// Current value: "urn:ietf:satp:core:msgtype:" (missing 'params:' and 'core:')
			expect(SATP_MSG_TYPE_URN_PREFIX).toBe(
				"urn:ietf:params:satp:core:msgtype:",
			);
		});

		it("canonical messageTypeToUrn() MUST use the v16 namespace", () => {
			// SPEC REF: draft-ietf-satp-core-16 §5.3.2, §13.1
			expect(messageTypeToUrn(MessageType.INIT_PROPOSAL)).toBe(
				"urn:ietf:params:satp:core:msgtype:transfer-proposal-msg",
			);
		});
	});

	describe("getMessageTypeName() slug format — non-compliant (FAIL)", () => {
		it("getMessageTypeName(INIT_PROPOSAL) MUST NOT return the raw TS enum key string", () => {
			// SPEC REF: draft-ietf-satp-core-16 §5.3.2 — slug should be 'transfer-proposal-msg'
			// Current behaviour: getMessageTypeName returns "INIT_PROPOSAL" (bare TS enum key).
			// v16 requires a kebab-case msgtype slug, not the enum identifier.
			// This assertion fails today: the value IS "INIT_PROPOSAL".
			expect(getMessageTypeName(MessageType.INIT_PROPOSAL)).not.toBe(
				"INIT_PROPOSAL",
			);
		});

		it("getMessageTypeName(INIT_PROPOSAL) MUST contain the v16 slug 'transfer-proposal'", () => {
			// SPEC REF: draft-ietf-satp-core-16 §5.3.2 (transfer-proposal-msg)
			// Current return value: "MESSAGE_TYPE_INIT_PROPOSAL" — does not contain 'transfer-proposal'
			expect(getMessageTypeName(MessageType.INIT_PROPOSAL)).toContain(
				"transfer-proposal",
			);
		});

		it("getMessageTypeName(LOCK_ASSERT) MUST contain the v16 slug 'lock-assert'", () => {
			// SPEC REF: draft-ietf-satp-core-16 §5.3.2 (lock-assert-msg)
			// Current return value: "MESSAGE_TYPE_LOCK_ASSERT" — does not contain 'lock-assert'
			// as a standalone kebab word (it would need to be "lock-assert", not "LOCK_ASSERT")
			expect(getMessageTypeName(MessageType.LOCK_ASSERT)).toContain(
				"lock-assert",
			);
		});

		it("getMessageTypeName(COMMIT_TRANSFER_COMPLETE) MUST contain 'commit-transfer-complete'", () => {
			// SPEC REF: draft-ietf-satp-core-16 §5.3.2 (commit-transfer-complete-msg)
			expect(
				getMessageTypeName(MessageType.COMMIT_TRANSFER_COMPLETE),
			).toContain("commit-transfer-complete");
		});
	});
});
