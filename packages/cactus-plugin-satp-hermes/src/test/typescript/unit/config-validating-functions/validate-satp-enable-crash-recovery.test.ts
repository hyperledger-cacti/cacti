import "jest-extended";
import { validateSatpEnableCrashRecovery } from "../../../../main/typescript/services/validation/config-validating-functions/validate-satp-enable-crash-recovery";

describe("validateSatpEnableCrashRecovery", () => {
  it("should pass when flag is true", () => {
    expect(() =>
      validateSatpEnableCrashRecovery({
        configValue: true,
      }),
    ).not.toThrow();
  });

  it("should pass when flag is false", () => {
    expect(() =>
      validateSatpEnableCrashRecovery({
        configValue: false,
      }),
    ).not.toThrow();
  });

  it("should throw when flag is a string", () => {
    expect(() =>
      validateSatpEnableCrashRecovery({
        configValue: "true",
      }),
    ).toThrow();
  });

  it("should throw when flag is a number", () => {
    expect(() =>
      validateSatpEnableCrashRecovery({
        configValue: 1,
      }),
    ).toThrow();
  });

  it("should throw when flag is null", () => {
    expect(() =>
      validateSatpEnableCrashRecovery({
        configValue: null,
      }),
    ).toThrow();
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
    ).toThrow();
  });
});
