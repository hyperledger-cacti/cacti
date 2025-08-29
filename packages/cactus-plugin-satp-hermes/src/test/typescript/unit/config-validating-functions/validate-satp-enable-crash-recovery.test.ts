import "jest-extended";
import { validateSatpEnableCrashRecovery } from "../../../../main/typescript/services/validation/config-validating-functions/validate-satp-enable-crash-recovery";

describe("validateSatpEnableCrashRecovery", () => {
  it("should pass when flag is true", () => {
    const result = validateSatpEnableCrashRecovery({
      configValue: true,
    });
    expect(result).toEqual(true);
  });

  it("should pass when flag is false", () => {
    const result = validateSatpEnableCrashRecovery({
      configValue: false,
    });
    expect(result).toEqual(false);
  });

  it("should throw when flag is a string", () => {
    expect(() =>
      validateSatpEnableCrashRecovery({
        configValue: "true",
      }),
    ).toThrowError(
      `Invalid config.enableCrashRecovery: ${"true"}. Expected a boolean`,
    );
  });

  it("should throw when flag is a number", () => {
    expect(() =>
      validateSatpEnableCrashRecovery({
        configValue: 1,
      }),
    ).toThrowError(
      `Invalid config.enableCrashRecovery: ${1}. Expected a boolean`,
    );
  });

  it("should throw when flag is null", () => {
    expect(() =>
      validateSatpEnableCrashRecovery({
        configValue: null,
      }),
    ).toThrowError(
      `Invalid config.enableCrashRecovery: ${null}. Expected a boolean`,
    );
  });

  it("should throw when flag is undefined", () => {
    const result = validateSatpEnableCrashRecovery({
      configValue: undefined,
    });
    expect(result).toBeFalsy();
  });

  it("should throw when flag is an object", () => {
    expect(() =>
      validateSatpEnableCrashRecovery({
        configValue: {},
      }),
    ).toThrowError(
      `Invalid config.enableCrashRecovery: [object Object]. Expected a boolean`,
    );
  });
});
