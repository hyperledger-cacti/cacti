/**
 * Unit tests for the SATP error codes registry (iana-error-codes.ts).
 *
 * Verifies the registry transcription against draft-ietf-satp-core-16
 * Section 11.4 (Table 2, 62 codes), stage groupings, description and
 * HTTP-status lookups, SATPErrorType mapping, and the isV13ErrorCode
 * type guard.
 */
import {
  GENERAL_ERROR_CODES,
  STAGE_1_ERROR_CODES,
  STAGE_2_ERROR_CODES,
  STAGE_3_ERROR_CODES,
  V13_ERROR_DESCRIPTIONS,
  V13_ERROR_HTTP_STATUS,
  satpErrorTypeToV13Code,
  v13ErrorDescription,
  isV13ErrorCode,
  ERR_0_1_1,
  ERR_0_1_2,
  ERR_0_1_3,
  ERR_1_1_1,
  ERR_1_1_2,
  ERR_1_2_1,
  ERR_1_2_3,
  ERR_2_2_4,
  ERR_2_2_8,
  ERR_3_3_4,
  ERR_3_5_4,
  ERR_3_7_4,
} from "../../../main/typescript/core/errors/iana-error-codes";
import { SATPErrorType } from "../../../main/typescript/core/errors/satp-error-type";

describe("SATP Error Codes Registry (draft-16 Section 11.4)", () => {
  const ALL_ERROR_CODES = [
    ...GENERAL_ERROR_CODES,
    ...STAGE_1_ERROR_CODES,
    ...STAGE_2_ERROR_CODES,
    ...STAGE_3_ERROR_CODES,
  ];

  describe("ALL_ERROR_CODES", () => {
    it("contains exactly 62 error codes (registry Table 2)", () => {
      expect(ALL_ERROR_CODES).toHaveLength(62);
    });

    it("contains no duplicates", () => {
      const set = new Set(ALL_ERROR_CODES);
      expect(set.size).toBe(ALL_ERROR_CODES.length);
    });

    it("all codes match err_X.Y.Z format", () => {
      for (const code of ALL_ERROR_CODES) {
        expect(code).toMatch(/^err_\d+\.\d+\.\d+$/);
      }
    });

    it("does not contain codes removed from the draft-16 registry", () => {
      // draft-16 replaced the per-message "bad signature" codes with the
      // general err_0.1.3 and dropped err_1.1.4.
      expect(isV13ErrorCode("err_1.1.4")).toBe(false);
      expect(isV13ErrorCode("err_1.2.4")).toBe(false);
      expect(isV13ErrorCode("err_2.2.6")).toBe(false);
      expect(isV13ErrorCode("err_3.9.5")).toBe(false);
    });
  });

  describe("Stage groupings", () => {
    it("General has 3 error codes", () => {
      expect(GENERAL_ERROR_CODES).toHaveLength(3);
    });

    it("Stage 1 has 29 error codes", () => {
      expect(STAGE_1_ERROR_CODES).toHaveLength(29);
    });

    it("Stage 2 has 11 error codes (includes semantic lock errors)", () => {
      expect(STAGE_2_ERROR_CODES).toHaveLength(11);
    });

    it("Stage 3 has 19 error codes", () => {
      expect(STAGE_3_ERROR_CODES).toHaveLength(19);
    });

    it("all stage codes start with the correct prefix", () => {
      for (const code of GENERAL_ERROR_CODES) {
        expect(code).toMatch(/^err_0\./);
      }
      for (const code of STAGE_1_ERROR_CODES) {
        expect(code).toMatch(/^err_1\./);
      }
      for (const code of STAGE_2_ERROR_CODES) {
        expect(code).toMatch(/^err_2\./);
      }
      for (const code of STAGE_3_ERROR_CODES) {
        expect(code).toMatch(/^err_3\./);
      }
    });

    it("stage groups cover all codes in ALL_ERROR_CODES", () => {
      const combined = [
        ...GENERAL_ERROR_CODES,
        ...STAGE_1_ERROR_CODES,
        ...STAGE_2_ERROR_CODES,
        ...STAGE_3_ERROR_CODES,
      ];
      expect(combined.sort()).toEqual([...ALL_ERROR_CODES].sort());
    });
  });

  describe("V13_ERROR_DESCRIPTIONS", () => {
    it("has an entry for every error code", () => {
      for (const code of ALL_ERROR_CODES) {
        expect(V13_ERROR_DESCRIPTIONS[code]).toBeDefined();
        expect(typeof V13_ERROR_DESCRIPTIONS[code]).toBe("string");
        expect(V13_ERROR_DESCRIPTIONS[code].length).toBeGreaterThan(0);
      }
    });

    it("descriptions match the registry Description column", () => {
      expect(V13_ERROR_DESCRIPTIONS[ERR_0_1_1]).toBe("invalid message type");
      expect(V13_ERROR_DESCRIPTIONS[ERR_0_1_3]).toBe("bad signature");
      expect(V13_ERROR_DESCRIPTIONS[ERR_1_1_1]).toBe(
        "invalid transferContextId",
      );
      expect(V13_ERROR_DESCRIPTIONS[ERR_1_1_2]).toBe("invalid sessionId");
      expect(V13_ERROR_DESCRIPTIONS[ERR_1_2_1]).toBe(
        "mismatch transferContextId",
      );
      expect(V13_ERROR_DESCRIPTIONS[ERR_1_2_3]).toBe(
        "mismatch hashTransferInitClaim",
      );
      expect(V13_ERROR_DESCRIPTIONS[ERR_2_2_4]).toBe(
        "unsupported lockAssertionExpiration",
      );
      expect(V13_ERROR_DESCRIPTIONS[ERR_2_2_8]).toBe("asset already locked");
      expect(V13_ERROR_DESCRIPTIONS[ERR_3_3_4]).toBe(
        "unsupported mintAssertionFormat",
      );
      expect(V13_ERROR_DESCRIPTIONS[ERR_3_5_4]).toBe(
        "unsupported burnAssertionClaimFormat",
      );
      expect(V13_ERROR_DESCRIPTIONS[ERR_3_7_4]).toBe(
        "unsupported assignmentAssertionClaimFormat",
      );
    });
  });

  describe("V13_ERROR_HTTP_STATUS", () => {
    it("has an entry for every error code", () => {
      for (const code of ALL_ERROR_CODES) {
        expect(V13_ERROR_HTTP_STATUS[code]).toBeDefined();
      }
    });

    it("matches the registry HTTP Status column", () => {
      expect(V13_ERROR_HTTP_STATUS[ERR_0_1_1]).toBe(400);
      expect(V13_ERROR_HTTP_STATUS[ERR_0_1_2]).toBe(403);
      expect(V13_ERROR_HTTP_STATUS[ERR_0_1_3]).toBe(422);
      // "badly formed message" codes
      expect(V13_ERROR_HTTP_STATUS[ERR_1_1_1]).toBe(422);
      // "unsupported parameter" codes
      expect(V13_ERROR_HTTP_STATUS[ERR_2_2_4]).toBe(415);
      // "mismatch" codes
      expect(V13_ERROR_HTTP_STATUS[ERR_1_2_1]).toBe(404);
      // semantic lock errors
      expect(V13_ERROR_HTTP_STATUS[ERR_2_2_8]).toBe(409);
    });
  });

  describe("v13ErrorDescription()", () => {
    it("returns the same value as direct lookup", () => {
      for (const code of ALL_ERROR_CODES) {
        expect(v13ErrorDescription(code)).toBe(V13_ERROR_DESCRIPTIONS[code]);
      }
    });
  });

  describe("isV13ErrorCode()", () => {
    it("returns true for all valid codes", () => {
      for (const code of ALL_ERROR_CODES) {
        expect(isV13ErrorCode(code)).toBe(true);
      }
    });

    it("returns false for invalid codes", () => {
      expect(isV13ErrorCode("err_0.0.0")).toBe(false);
      expect(isV13ErrorCode("")).toBe(false);
      expect(isV13ErrorCode("ERR_1_1_1")).toBe(false);
      expect(isV13ErrorCode("err_4.1.1")).toBe(false);
      expect(isV13ErrorCode("random_string")).toBe(false);
    });
  });

  describe("satpErrorTypeToV13Code()", () => {
    it("maps BADLY_FORMATED_MESSAGE to err_0.1.1 (general badly formed)", () => {
      expect(satpErrorTypeToV13Code(SATPErrorType.BADLY_FORMATED_MESSAGE)).toBe(
        ERR_0_1_1,
      );
    });

    it("maps signature failures to err_0.1.3 (bad signature)", () => {
      expect(
        satpErrorTypeToV13Code(SATPErrorType.SIGNATURE_VERIFICATION_FAILED),
      ).toBe(ERR_0_1_3);
      expect(
        satpErrorTypeToV13Code(
          SATPErrorType.BADLY_FORMATED_MESSAGE_BAD_SIGNATURE,
        ),
      ).toBe(ERR_0_1_3);
    });

    it("maps SESSION_NOT_FOUND to err_1.1.2 (invalid sessionId)", () => {
      expect(satpErrorTypeToV13Code(SATPErrorType.SESSION_NOT_FOUND)).toBe(
        ERR_1_1_2,
      );
    });

    it("maps CONTEXT_ID_MISS_MATCH to err_1.2.1 (mismatch transferContextId)", () => {
      expect(satpErrorTypeToV13Code(SATPErrorType.CONTEXT_ID_MISS_MATCH)).toBe(
        ERR_1_2_1,
      );
    });

    it("maps HASH_MISS_MATCH to err_1.2.3 (mismatch hashTransferInitClaim)", () => {
      expect(satpErrorTypeToV13Code(SATPErrorType.HASH_MISS_MATCH)).toBe(
        ERR_1_2_3,
      );
    });

    it("maps MESSAGE_OUT_OF_SEQUENCE to err_0.1.1", () => {
      expect(
        satpErrorTypeToV13Code(SATPErrorType.MESSAGE_OUT_OF_SEQUENCE),
      ).toBe(ERR_0_1_1);
    });

    it("maps LOCK_ASSERTION_EXPIRATION_ERROR to err_2.2.4", () => {
      expect(
        satpErrorTypeToV13Code(SATPErrorType.LOCK_ASSERTION_EXPIRATION_ERROR),
      ).toBe(ERR_2_2_4);
    });

    it("maps assertion claim failures to their stage format codes", () => {
      expect(
        satpErrorTypeToV13Code(SATPErrorType.MINT_ASSERTION_BADLY_FORMATED),
      ).toBe(ERR_3_3_4);
      expect(
        satpErrorTypeToV13Code(SATPErrorType.BURN_ASSERTION_BADLY_FORMATED),
      ).toBe(ERR_3_5_4);
      expect(
        satpErrorTypeToV13Code(
          SATPErrorType.ASSIGNMENT_ASSERTION_BADLY_FORMATED,
        ),
      ).toBe(ERR_3_7_4);
    });

    it("never returns a code whose registry meaning contradicts the error", () => {
      // SIGNATURE_VERIFICATION_FAILED must not map to an identifier code
      // such as err_1.1.1 (invalid transferContextId).
      expect(
        satpErrorTypeToV13Code(SATPErrorType.SIGNATURE_VERIFICATION_FAILED),
      ).not.toBe(ERR_1_1_1);
      // SESSION_NOT_FOUND must not map to err_1.2.1 (mismatch
      // transferContextId).
      expect(satpErrorTypeToV13Code(SATPErrorType.SESSION_NOT_FOUND)).not.toBe(
        ERR_1_2_1,
      );
    });

    it("falls back to err_0.1.1 for unmapped types", () => {
      expect(satpErrorTypeToV13Code(SATPErrorType.UNSPECIFIED)).toBe(ERR_0_1_1);
      expect(satpErrorTypeToV13Code(SATPErrorType.DLT_NOT_SUPPORTED)).toBe(
        ERR_0_1_1,
      );
      expect(satpErrorTypeToV13Code(SATPErrorType.BRIDGE_PROBLEM)).toBe(
        ERR_0_1_1,
      );
    });
  });
});
