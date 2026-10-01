/**
 * Unit tests for DEV_MODE resolution (config field + DEV_MODE env var).
 *
 * DEV_MODE relaxes only the TLS certificate-material requirement so test
 * deployments can serve plain HTTP with a warning; an explicit config
 * value always wins over the environment variable.
 */
import { resolveDevMode } from "../../../main/typescript/plugin-satp-hermes-gateway-cli";

describe("resolveDevMode", () => {
  it("is inactive when neither config nor env are set", () => {
    expect(resolveDevMode(undefined, undefined)).toBe(false);
    expect(resolveDevMode(undefined, "")).toBe(false);
  });

  it("activates from a truthy config field", () => {
    expect(resolveDevMode(true, undefined)).toBe(true);
    expect(resolveDevMode(false, undefined)).toBe(false);
  });

  it("activates from truthy DEV_MODE env values (case-insensitive)", () => {
    expect(resolveDevMode(undefined, "1")).toBe(true);
    expect(resolveDevMode(undefined, "true")).toBe(true);
    expect(resolveDevMode(undefined, "TRUE")).toBe(true);
    expect(resolveDevMode(undefined, "Yes")).toBe(true);
    expect(resolveDevMode(undefined, "on")).toBe(true);
    expect(resolveDevMode(undefined, " 1 ")).toBe(true);
  });

  it("ignores falsy DEV_MODE env values", () => {
    expect(resolveDevMode(undefined, "0")).toBe(false);
    expect(resolveDevMode(undefined, "false")).toBe(false);
    expect(resolveDevMode(undefined, "no")).toBe(false);
    expect(resolveDevMode(undefined, "off")).toBe(false);
    expect(resolveDevMode(undefined, "garbage")).toBe(false);
  });

  it("explicit config value wins over the environment variable", () => {
    expect(resolveDevMode(false, "1")).toBe(false);
    expect(resolveDevMode(true, "0")).toBe(true);
  });
});
