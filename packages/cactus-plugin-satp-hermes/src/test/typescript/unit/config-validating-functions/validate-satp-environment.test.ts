import "jest-extended";
import { validateSatpEnvironment } from "../../../../main/typescript/services/validation/config-validating-functions/validate-satp-environment";

describe("validateSatpEnvironment", () => {
  it("should pass with valid environment 'development'", () => {
    expect(() =>
      validateSatpEnvironment({
        configValue: "development",
      }),
    ).not.toThrow();
  });

  it("should pass with valid environment 'production'", () => {
    expect(() =>
      validateSatpEnvironment({
        configValue: "production",
      }),
    ).not.toThrow();
  });

  it("should throw with invalid string", () => {
    expect(() =>
      validateSatpEnvironment({
        configValue: "staging",
      }),
    ).toThrow();
  });

  it("should throw with empty string", () => {
    const result = validateSatpEnvironment({
      configValue: "",
    });
    expect(result).toBe("development");
  });

  it("should throw with non-string input (number)", () => {
    expect(() =>
      validateSatpEnvironment({
        configValue: 123,
      }),
    ).toThrow();
  });

  it("should throw with non-string input (object)", () => {
    expect(() =>
      validateSatpEnvironment({
        configValue: {},
      }),
    ).toThrow();
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
