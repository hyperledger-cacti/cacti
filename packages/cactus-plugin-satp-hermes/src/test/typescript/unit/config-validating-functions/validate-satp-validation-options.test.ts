import "jest-extended";
import { validateSatpValidationOptions } from "../../../../main/typescript/services/validation/config-validating-functions/validate-satp-validation-options";
import { ValidatorOptions } from "class-validator";

interface ValidationError {
  target?: boolean;
  value?: boolean;
}

describe("validateSatpValidationOptions", () => {
  it("should pass with valid boolean fields", () => {
    const validatorOptions = {
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: true,
      skipMissingProperties: true,
      allowlist: false,
      forbidNonWhitelisted: false,
      groups: ["group1", "group2"],
      always: false,
      strictGroups: true,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: true,
      } as ValidationError,
      forbidUnknownValues: true,
      stopAtFirstError: true,
    } as ValidatorOptions;
    const result = validateSatpValidationOptions({
      configValue: validatorOptions,
    });
    expect(result).toEqual(validatorOptions);
  });

  it("should throw when the 'validationError' options does not match the ValidationError interface", () => {
    const validatorOptions = {
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: true,
      skipMissingProperties: true,
      allowlist: false,
      forbidNonWhitelisted: false,
      groups: ["group1", "group2"],
      always: false,
      strictGroups: true,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: "true",
      },
      forbidUnknownValues: true,
      stopAtFirstError: true,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions}.`);

    const validatorOptions2 = {
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: true,
      skipMissingProperties: true,
      allowlist: false,
      forbidNonWhitelisted: false,
      groups: ["group1", "group2"],
      always: false,
      strictGroups: true,
      dismissDefaultMessages: false,
      validationError: {
        target: "true",
        value: true,
      },
      forbidUnknownValues: true,
      stopAtFirstError: true,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions2,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions2}.`);
  });

  it("should throw when the 'groups' option is not a array", () => {
    const validatorOptions = {
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: true,
      skipMissingProperties: true,
      allowlist: false,
      forbidNonWhitelisted: false,
      groups: "group1",
      always: false,
      strictGroups: true,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: true,
      } as ValidationError,
      forbidUnknownValues: true,
      stopAtFirstError: true,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions}.`);
  });

  it("should throw when the 'enableDebugMessages' option is not a boolean", () => {
    const validatorOptions = {
      enableDebugMessages: "true",
      skipUndefinedProperties: false,
      skipNullProperties: true,
      skipMissingProperties: true,
      allowlist: false,
      forbidNonWhitelisted: false,
      groups: ["group1", "group2"],
      always: false,
      strictGroups: true,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: true,
      } as ValidationError,
      forbidUnknownValues: true,
      stopAtFirstError: true,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions}.`);
  });

  it("should throw when the 'skipUndefinedProperties' option is not a boolean", () => {
    const validatorOptions = {
      enableDebugMessages: true,
      skipUndefinedProperties: "false",
      skipNullProperties: true,
      skipMissingProperties: true,
      allowlist: false,
      forbidNonWhitelisted: false,
      groups: ["group1", "group2"],
      always: false,
      strictGroups: true,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: true,
      } as ValidationError,
      forbidUnknownValues: true,
      stopAtFirstError: true,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions}.`);
  });

  it("should throw when the 'skipNullProperties' option is not a boolean", () => {
    const validatorOptions = {
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: 123,
      skipMissingProperties: true,
      allowlist: false,
      forbidNonWhitelisted: false,
      groups: ["group1", "group2"],
      always: false,
      strictGroups: true,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: true,
      } as ValidationError,
      forbidUnknownValues: true,
      stopAtFirstError: true,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions}.`);
  });

  it("should throw when the 'skipMissingProperties' option is not a boolean", () => {
    const validatorOptions = {
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: false,
      skipMissingProperties: "true",
      allowlist: false,
      forbidNonWhitelisted: false,
      groups: ["group1", "group2"],
      always: false,
      strictGroups: true,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: true,
      } as ValidationError,
      forbidUnknownValues: true,
      stopAtFirstError: true,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions}.`);
  });

  it("should throw when the 'allowlist' option is not a boolean", () => {
    const validatorOptions = {
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: false,
      skipMissingProperties: true,
      allowlist: 123,
      forbidNonWhitelisted: false,
      groups: ["group1", "group2"],
      always: false,
      strictGroups: true,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: true,
      } as ValidationError,
      forbidUnknownValues: true,
      stopAtFirstError: true,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions}.`);
  });

  it("should throw when the 'forbidNonWhitelisted' option is not a boolean", () => {
    const validatorOptions = {
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: true,
      skipMissingProperties: true,
      allowlist: false,
      forbidNonWhitelisted: 123,
      groups: ["group1", "group2"],
      always: false,
      strictGroups: true,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: true,
      } as ValidationError,
      forbidUnknownValues: true,
      stopAtFirstError: true,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions}.`);
  });

  it("should throw when the 'always' option is not a boolean", () => {
    const validatorOptions = {
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: true,
      skipMissingProperties: true,
      allowlist: false,
      forbidNonWhitelisted: true,
      groups: ["group1", "group2"],
      always: "false",
      strictGroups: true,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: true,
      } as ValidationError,
      forbidUnknownValues: true,
      stopAtFirstError: true,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions}.`);
  });

  it("should throw when the 'strictGroups' option is not a boolean", () => {
    const validatorOptions = {
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: true,
      skipMissingProperties: true,
      allowlist: false,
      forbidNonWhitelisted: true,
      groups: ["group1", "group2"],
      always: false,
      strictGroups: 123,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: true,
      } as ValidationError,
      forbidUnknownValues: true,
      stopAtFirstError: true,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions}.`);
  });

  it("should throw when the 'dismissDefaultMessages' option is not a boolean", () => {
    const validatorOptions = {
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: true,
      skipMissingProperties: true,
      allowlist: false,
      forbidNonWhitelisted: true,
      groups: ["group1", "group2"],
      always: false,
      strictGroups: true,
      dismissDefaultMessages: "false",
      validationError: {
        target: true,
        value: true,
      } as ValidationError,
      forbidUnknownValues: true,
      stopAtFirstError: true,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions}.`);
  });

  it("should throw when the 'forbidUnknownValues' option is not a boolean", () => {
    const validatorOptions = {
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: true,
      skipMissingProperties: true,
      allowlist: false,
      forbidNonWhitelisted: true,
      groups: ["group1", "group2"],
      always: false,
      strictGroups: true,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: true,
      } as ValidationError,
      forbidUnknownValues: "true",
      stopAtFirstError: true,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions}.`);
  });

  it("should throw when the 'stopAtFirstError' option is not a boolean", () => {
    const validatorOptions = {
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: true,
      skipMissingProperties: true,
      allowlist: false,
      forbidNonWhitelisted: true,
      groups: ["group1", "group2"],
      always: false,
      strictGroups: true,
      dismissDefaultMessages: false,
      validationError: {
        target: true,
        value: true,
      } as ValidationError,
      forbidUnknownValues: true,
      stopAtFirstError: 123,
    };
    expect(() =>
      validateSatpValidationOptions({
        configValue: validatorOptions,
      }),
    ).toThrowError(`Invalid config.validationOptions: ${validatorOptions}.`);
  });

  it("should throw when options is not an object", () => {
    expect(() =>
      validateSatpValidationOptions({
        configValue: "not-an-object",
      }),
    ).toThrowError(`Invalid config.validationOptions: ${"not-an-object"}.`);
  });

  it("should throw when options is null", () => {
    const result = validateSatpValidationOptions({
      configValue: null,
    });
    expect(result).toEqual({});
  });
});
