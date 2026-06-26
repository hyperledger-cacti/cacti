import "jest-extended";
import { describe, it, expect } from "@jest/globals";
import {
  getFreePort,
  getFreePorts,
  isPortBindable,
  isSafePort,
  SAFE_PORT_MAX,
  SAFE_PORT_MIN,
} from "../test-utils";

describe("getFreePort / getFreePorts", () => {
  describe("isSafePort", () => {
    it("accepts ports inside the safe range", () => {
      expect(isSafePort(SAFE_PORT_MIN)).toBe(true);
      expect(isSafePort(SAFE_PORT_MAX)).toBe(true);
      expect(isSafePort(3010)).toBe(true);
    });

    it("rejects privileged, out-of-range, and non-integer ports", () => {
      expect(isSafePort(0)).toBe(false);
      expect(isSafePort(80)).toBe(false);
      expect(isSafePort(SAFE_PORT_MIN - 1)).toBe(false);
      expect(isSafePort(SAFE_PORT_MAX + 1)).toBe(false);
      expect(isSafePort(-1)).toBe(false);
      expect(isSafePort(1024.5)).toBe(false);
      expect(isSafePort(NaN)).toBe(false);
    });
  });

  describe("getFreePort", () => {
    it("returns a TCP port inside the safe range", async () => {
      const port = await getFreePort();
      expect(typeof port).toBe("number");
      expect(isSafePort(port)).toBe(true);
      expect(port).toBeGreaterThanOrEqual(SAFE_PORT_MIN);
      expect(port).toBeLessThanOrEqual(SAFE_PORT_MAX);
    });

    it("returns a port that is bindable after release", async () => {
      const port = await getFreePort();
      const bindable = await isPortBindable(port);
      expect(bindable).toBe(true);
    });

    it("returns distinct safe ports across sequential calls", async () => {
      const calls = await Promise.all(
        Array.from({ length: 5 }, () => getFreePort()),
      );
      // The OS may occasionally reuse a recently-closed port, but across
      // 5 quick calls we expect at least 2 distinct values in practice.
      const unique = new Set(calls);
      expect(unique.size).toBeGreaterThanOrEqual(2);
      for (const p of calls) {
        expect(isSafePort(p)).toBe(true);
      }
    });
  });

  describe("getFreePorts", () => {
    it("returns the requested number of ports, all in the safe range", async () => {
      const ports = await getFreePorts(3);
      expect(ports).toHaveLength(3);
      for (const p of ports) {
        expect(typeof p).toBe("number");
        expect(isSafePort(p)).toBe(true);
      }
    });

    it("returns all distinct ports within a single call", async () => {
      const ports = await getFreePorts(8);
      const unique = new Set(ports);
      expect(unique.size).toBe(ports.length);
      for (const p of ports) {
        expect(isSafePort(p)).toBe(true);
      }
    });

    it("returns ports that are bindable after release", async () => {
      const ports = await getFreePorts(3);
      for (const p of ports) {
        const bindable = await isPortBindable(p);
        expect(bindable).toBe(true);
      }
    });

    it("returns an empty array when count is 0", async () => {
      const ports = await getFreePorts(0);
      expect(ports).toEqual([]);
    });

    it("returns a single safe port when count is 1", async () => {
      const ports = await getFreePorts(1);
      expect(ports).toHaveLength(1);
      expect(isSafePort(ports[0])).toBe(true);
    });
  });
});
