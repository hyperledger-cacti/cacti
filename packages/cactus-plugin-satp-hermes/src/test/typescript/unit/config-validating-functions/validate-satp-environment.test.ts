import "jest-extended";
import { validateSatpEnvironment } from "../../../../main/typescript/services/validation/config-validating-functions/validate-satp-environment";

describe("validateSatpEnvironment", () => {
  it("should pass with valid environment 'development'", () => {
    const result = validateSatpEnvironment({
      configValue: "development",
    });
    expect(result).toEqual("development");
  });

  it("should pass with valid environment 'production'", () => {
    const result = validateSatpEnvironment({
      configValue: "production",
    });
    expect(result).toEqual("production");
  });

  it("should throw with invalid string", () => {
    expect(() =>
      validateSatpEnvironment({
        configValue: "staging",
      }),
    ).toThrowError(
      `Invalid config.environment: ${"staging"}. Expected "development" or "production"`,
    );
  });

  it("should throw with empty string", () => {
    const result = validateSatpEnvironment({
      configValue: "",
    });
    expect(result).toEqual("development");
  });

  it("should throw with non-string input (number)", () => {
    expect(() =>
      validateSatpEnvironment({
        configValue: 123,
      }),
    ).toThrowError(
      `Invalid config.environment: ${123}. Expected "development" or "production"`,
    );
  });

  it("should throw with non-string input (object)", () => {
    expect(() =>
      validateSatpEnvironment({
        configValue: {},
      }),
    ).toThrowError(
      `Invalid config.environment: [object Object]. Expected "development" or "production"`,
    );
  });

  it("should throw with null", () => {
    const result = validateSatpEnvironment({
      configValue: null,
    });
    expect(result).toBe("development");
  });

  it("should throw with undefined", () => {
    const result = validateSatpEnvironment({
      configValue: undefined,
    });
    expect(result).toBe("development");
  });
});
