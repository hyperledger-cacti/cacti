/**
 * Unit tests for v13 IANA error codes registry (iana-error-codes.ts).
 *
 * Verifies all 73 error codes from SATP Core v13 Section 14 (Table 1),
 * stage groupings, description lookups, SATPErrorType mapping, and
 * the isV13ErrorCode type guard.
 */
import {
  STAGE_1_ERROR_CODES,
  STAGE_2_ERROR_CODES,
  STAGE_3_ERROR_CODES,
  V13_ERROR_DESCRIPTIONS,
  satpErrorTypeToV13Code,
  v13ErrorDescription,
  isV13ErrorCode,
  ERR_1_1_1,
  ERR_1_1_2,
  ERR_1_2_1,
  ERR_1_2_2,
  ERR_1_2_3,
  ERR_1_2_4,
  ERR_2_2_1,
  ERR_2_2_4,
  ERR_3_3_3,
  ERR_3_5_2,
  ERR_3_7_2,
} from "../../../main/typescript/core/errors/iana-error-codes";
import { SATPErrorType } from "../../../main/typescript/core/errors/satp-error-type";

describe("v13 IANA Error Codes", () => {
  const ALL_V13_ERROR_CODES = [
    ...STAGE_1_ERROR_CODES,
    ...STAGE_2_ERROR_CODES,
    ...STAGE_3_ERROR_CODES,
  ];
  
  describe("ALL_V13_ERROR_CODES", () => {
    it("contains exactly 73 error codes", () => {
      expect(ALL_V13_ERROR_CODES).toHaveLength(73);
    });

    it("contains no duplicates", () => {
      const set = new Set(ALL_V13_ERROR_CODES);
      expect(set.size).toBe(ALL_V13_ERROR_CODES.length);
    });

    it("all codes match err_X.Y.Z format", () => {
      for (const code of ALL_V13_ERROR_CODES) {
        expect(code).toMatch(/^err_\d+\.\d+\.\d+$/);
      }
    });
  });

  describe("Stage groupings", () => {
    it("Stage 1 has 39 error codes", () => {
      expect(STAGE_1_ERROR_CODES).toHaveLength(39);
    });

    it("Stage 2 has 10 error codes", () => {
      expect(STAGE_2_ERROR_CODES).toHaveLength(10);
    });

    it("Stage 3 has 24 error codes (not 4 — includes all sub-stages)", () => {
      expect(STAGE_3_ERROR_CODES).toHaveLength(24);
    });

    it("all stage codes start with the correct prefix", () => {
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

    it("stage groups cover all codes in ALL_V13_ERROR_CODES", () => {
      const combined = [
        ...STAGE_1_ERROR_CODES,
        ...STAGE_2_ERROR_CODES,
        ...STAGE_3_ERROR_CODES,
      ];
      expect(combined.sort()).toEqual([...ALL_V13_ERROR_CODES].sort());
    });
  });

  describe("V13_ERROR_DESCRIPTIONS", () => {
    it("has an entry for every error code", () => {
      for (const code of ALL_V13_ERROR_CODES) {
        expect(V13_ERROR_DESCRIPTIONS[code]).toBeDefined();
        expect(typeof V13_ERROR_DESCRIPTIONS[code]).toBe("string");
        expect(V13_ERROR_DESCRIPTIONS[code].length).toBeGreaterThan(0);
      }
    });

    it("returns correct description for specific codes", () => {
      expect(V13_ERROR_DESCRIPTIONS[ERR_1_1_1]).toContain(
        "Badly formed message",
      );
      expect(V13_ERROR_DESCRIPTIONS[ERR_1_2_2]).toContain(
        "transfer context id mismatch",
      );
      expect(V13_ERROR_DESCRIPTIONS[ERR_2_2_4]).toContain(
        "lock assertion expiration",
      );
      expect(V13_ERROR_DESCRIPTIONS[ERR_3_5_2]).toContain(
        "burn assertion claim",
      );
    });
  });

  describe("v13ErrorDescription()", () => {
    it("returns the same value as direct lookup", () => {
      for (const code of ALL_V13_ERROR_CODES) {
        expect(v13ErrorDescription(code)).toBe(V13_ERROR_DESCRIPTIONS[code]);
      }
    });
  });

  describe("isV13ErrorCode()", () => {
    it("returns true for all valid codes", () => {
      for (const code of ALL_V13_ERROR_CODES) {
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
    it("maps BADLY_FORMATED_MESSAGE to err_1.1.1", () => {
      expect(satpErrorTypeToV13Code(SATPErrorType.BADLY_FORMATED_MESSAGE)).toBe(
        ERR_1_1_1,
      );
    });

    it("maps INCORRECT_PARAMETER to err_1.1.2", () => {
      expect(satpErrorTypeToV13Code(SATPErrorType.INCORRECT_PARAMETER)).toBe(
        ERR_1_1_2,
      );
    });

    it("maps CONTEXT_ID_MISS_MATCH to err_1.2.2", () => {
      expect(satpErrorTypeToV13Code(SATPErrorType.CONTEXT_ID_MISS_MATCH)).toBe(
        ERR_1_2_2,
      );
    });

    it("maps HASH_MISS_MATCH to err_1.2.3", () => {
      expect(satpErrorTypeToV13Code(SATPErrorType.HASH_MISS_MATCH)).toBe(
        ERR_1_2_3,
      );
    });

    it("maps MESSAGE_OUT_OF_SEQUENCE to err_1.2.4", () => {
      expect(
        satpErrorTypeToV13Code(SATPErrorType.MESSAGE_OUT_OF_SEQUENCE),
      ).toBe(ERR_1_2_4);
    });

    it("maps SESSION_NOT_FOUND to err_1.2.1", () => {
      expect(satpErrorTypeToV13Code(SATPErrorType.SESSION_NOT_FOUND)).toBe(
        ERR_1_2_1,
      );
    });

    it("maps LOCK_ASSERTION_BADLY_FORMATED to err_2.2.1", () => {
      expect(
        satpErrorTypeToV13Code(SATPErrorType.LOCK_ASSERTION_BADLY_FORMATED),
      ).toBe(ERR_2_2_1);
    });

    it("maps LOCK_ASSERTION_EXPIRATION_ERROR to err_2.2.4", () => {
      expect(
        satpErrorTypeToV13Code(SATPErrorType.LOCK_ASSERTION_EXPIRATION_ERROR),
      ).toBe(ERR_2_2_4);
    });

    it("maps BURN_ASSERTION_BADLY_FORMATED to err_3.5.2", () => {
      expect(
        satpErrorTypeToV13Code(SATPErrorType.BURN_ASSERTION_BADLY_FORMATED),
      ).toBe(ERR_3_5_2);
    });

    it("maps MINT_ASSERTION_BADLY_FORMATED to err_3.3.3", () => {
      expect(
        satpErrorTypeToV13Code(SATPErrorType.MINT_ASSERTION_BADLY_FORMATED),
      ).toBe(ERR_3_3_3);
    });

    it("maps ASSIGNMENT_ASSERTION_BADLY_FORMATED to err_3.7.2", () => {
      expect(
        satpErrorTypeToV13Code(
          SATPErrorType.ASSIGNMENT_ASSERTION_BADLY_FORMATED,
        ),
      ).toBe(ERR_3_7_2);
    });

    it("falls back to err_1.1.1 for UNSPECIFIED", () => {
      expect(satpErrorTypeToV13Code(SATPErrorType.UNSPECIFIED)).toBe(ERR_1_1_1);
    });

    it("falls back to err_1.1.1 for unmapped types", () => {
      expect(satpErrorTypeToV13Code(SATPErrorType.DLT_NOT_SUPPORTED)).toBe(
        ERR_1_1_1,
      );
      expect(satpErrorTypeToV13Code(SATPErrorType.BRIDGE_PROBLEM)).toBe(
        ERR_1_1_1,
      );
    });
  });
});
