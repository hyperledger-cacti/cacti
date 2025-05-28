import "jest-extended";
import { validateSatpLogLevel } from "../../../../main/typescript/services/validation/config-validating-functions/validate-satp-log-level";

describe("validateSatpLogLevel", () => {
  it("should pass with 'trace'", () => {
    expect(() =>
      validateSatpLogLevel({
        configValue: "trace",
      }),
    ).not.toThrow();
  });

  it("should pass with 'debug'", () => {
    expect(() =>
      validateSatpLogLevel({
        configValue: "debug",
      }),
    ).not.toThrow();
  });

  it("should pass with 'info'", () => {
    expect(() =>
      validateSatpLogLevel({
        configValue: "info",
      }),
    ).not.toThrow();
  });

  it("should pass with 'warn'", () => {
    expect(() =>
      validateSatpLogLevel({
        configValue: "warn",
      }),
    ).not.toThrow();
  });

  it("should pass with 'error'", () => {
    expect(() =>
      validateSatpLogLevel({
        configValue: "error",
      }),
    ).not.toThrow();
  });

  it("should pass with 'SILENT'", () => {
    expect(() =>
      validateSatpLogLevel({
        configValue: "SILENT",
      }),
    ).not.toThrow();
  });

  it("should pass with a number between 0 and 5", () => {
    expect(() =>
      validateSatpLogLevel({
        configValue: 0,
      }),
    ).not.toThrow();
    expect(() =>
      validateSatpLogLevel({
        configValue: 1,
      }),
    ).not.toThrow();
    expect(() =>
      validateSatpLogLevel({
        configValue: 2,
      }),
    ).not.toThrow();
    expect(() =>
      validateSatpLogLevel({
        configValue: 3,
      }),
    ).not.toThrow();
    expect(() =>
      validateSatpLogLevel({
        configValue: 4,
      }),
    ).not.toThrow();
    expect(() =>
      validateSatpLogLevel({
        configValue: 5,
      }),
    ).not.toThrow();
  });

  it("should throw with invalid level a number not between 0 and 5", () => {
    expect(() =>
      validateSatpLogLevel({
        configValue: 8,
      }),
    ).toThrow();
  });

  it("should throw with a input without a LogLevelDesc", () => {
    expect(() =>
      validateSatpLogLevel({
        configValue: "Without a LogLevelDesc",
      }),
    ).toThrow();
  });

  it("should throw with an empty string", () => {
    const result = validateSatpLogLevel({
      configValue: "",
    });
    expect(result).toBe("INFO");
  });

  it("should throw with null", () => {
    const result = validateSatpLogLevel({
      configValue: null,
    });
    expect(result).toBe("INFO");
  });

  it("should throw with undefined", () => {
    const result = validateSatpLogLevel({
      configValue: undefined,
    });
    expect(result).toBe("INFO");
  });

  it("should throw with an object", () => {
    expect(() =>
      validateSatpLogLevel({
        configValue: { level: "info" },
      }),
    ).toThrow();
  });
});
