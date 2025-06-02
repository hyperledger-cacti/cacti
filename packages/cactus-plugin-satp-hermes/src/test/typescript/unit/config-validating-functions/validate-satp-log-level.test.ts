import "jest-extended";
import { validateSatpLogLevel } from "../../../../main/typescript/services/validation/config-validating-functions/validate-satp-log-level";

describe("validateSatpLogLevel", () => {
  it("should pass with 'trace'", () => {
    const result = validateSatpLogLevel({
      configValue: "trace",
    });
    expect(result).toEqual("trace");
  });

  it("should pass with 'debug'", () => {
    const result = validateSatpLogLevel({
      configValue: "debug",
    });
    expect(result).toEqual("debug");
  });

  it("should pass with 'info'", () => {
    const result = validateSatpLogLevel({
      configValue: "info",
    });
    expect(result).toEqual("info");
  });

  it("should pass with 'warn'", () => {
    const result = validateSatpLogLevel({
      configValue: "warn",
    });
    expect(result).toEqual("warn");
  });

  it("should pass with 'error'", () => {
    const result = validateSatpLogLevel({
      configValue: "error",
    });
    expect(result).toEqual("error");
  });

  it("should pass with 'SILENT'", () => {
    const result = validateSatpLogLevel({
      configValue: "SILENT",
    });
    expect(result).toEqual("SILENT");
  });

  it("should pass with a number between 0 and 5", () => {
    let result = validateSatpLogLevel({
      configValue: 0,
    });
    expect(result).toEqual("INFO");
    result = validateSatpLogLevel({
      configValue: 1,
    });
    expect(result).toEqual(1);
    result = validateSatpLogLevel({
      configValue: 2,
    });
    expect(result).toEqual(2);
    result = validateSatpLogLevel({
      configValue: 3,
    });
    expect(result).toEqual(3);
    result = validateSatpLogLevel({
      configValue: 4,
    });
    expect(result).toEqual(4);
    result = validateSatpLogLevel({
      configValue: 5,
    });
    expect(result).toEqual(5);
  });

  it("should throw with invalid level a number not between 0 and 5", () => {
    expect(() =>
      validateSatpLogLevel({
        configValue: 8,
      }),
    ).toThrowError(
      `Invalid config.logLevel: ${JSON.stringify(8)}. Valid levels are: TRACE, DEBUG, INFO, WARN, ERROR, SILENT`,
    );
  });

  it("should throw with a input without a LogLevelDesc", () => {
    expect(() =>
      validateSatpLogLevel({
        configValue: "Without a LogLevelDesc",
      }),
    ).toThrowError(
      `Invalid config.logLevel: ${JSON.stringify("Without a LogLevelDesc")}. Valid levels are: TRACE, DEBUG, INFO, WARN, ERROR, SILENT`,
    );
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
    ).toThrowError(
      `Invalid config.logLevel: ${JSON.stringify({ level: "info" })}. Valid levels are: TRACE, DEBUG, INFO, WARN, ERROR, SILENT`,
    );
  });
});
