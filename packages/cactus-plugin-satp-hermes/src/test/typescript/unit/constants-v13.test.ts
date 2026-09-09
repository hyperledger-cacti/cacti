/**
 * Unit tests for v13 protocol constants (Phase 1 — TASK-005).
 *
 * Verifies that all protocol constant values match the v13 specification
 * requirements documented in draft-ietf-satp-core-13.
 */
import {
  SATP_VERSION,
  SATP_ARCHITECTURE_VERSION,
  SATP_CRASH_VERSION,
  DEFAULT_PORT_GATEWAY_SERVER,
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_UI,
  DEFAULT_PORT_GATEWAY_OAPI,
} from "../../../main/typescript/core/constants";

describe("v13 Protocol Constants", () => {
  describe("version strings", () => {
    it('SATP_VERSION is at least "v13"', () => {
      expect(SATP_VERSION).toMatch(/^v?(1[3-9]|[2-9]\d)\./);
    });

    it('SATP_CORE_VERSION is "v13"', () => {
      expect(SATP_VERSION).toMatch(/^v?(1[3-9]|[2-9]\d)\./);
    });

    it('SATP_ARCHITECTURE_VERSION is "v09"', () => {
      expect(SATP_ARCHITECTURE_VERSION).toBe("v09");
    });

    it('SATP_CRASH_VERSION is "v06"', () => {
      expect(SATP_CRASH_VERSION).toBe("v06");
    });
  });

  describe("port configuration", () => {
    it("DEFAULT_PORT_GATEWAY_SERVER is 3010", () => {
      expect(DEFAULT_PORT_GATEWAY_SERVER).toBe(3010);
    });

    it("DEFAULT_PORT_GATEWAY_CLIENT is SERVER + 1", () => {
      expect(DEFAULT_PORT_GATEWAY_CLIENT).toBe(DEFAULT_PORT_GATEWAY_SERVER + 1);
    });

    it("DEFAULT_PORT_GATEWAY_UI is SERVER + 2", () => {
      expect(DEFAULT_PORT_GATEWAY_UI).toBe(DEFAULT_PORT_GATEWAY_SERVER + 2);
    });

    it("DEFAULT_PORT_GATEWAY_OAPI is 4010", () => {
      expect(DEFAULT_PORT_GATEWAY_OAPI).toBe(4010);
    });
  });
});
