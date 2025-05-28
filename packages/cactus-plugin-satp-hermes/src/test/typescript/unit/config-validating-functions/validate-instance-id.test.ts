import "jest-extended";
import { validateInstanceId } from "../../../../main/typescript/services/validation/config-validating-functions/validate-instance-id";

describe("Validate Instance Id", () => {
  it("should pass with a valid UUID", () => {
    const instanceId = "123e4567-e89b-12d3-a456-426614174000";
    const result = validateInstanceId({
      configValue: instanceId,
    });
    expect(result).toEqual(instanceId);
  });

  it("should throw for a non-string ID", () => {
    const invalidId = 123;
    expect(() =>
      validateInstanceId({
        configValue: invalidId,
      }),
    ).toThrowError(
      `Invalid config.instanceId: ${invalidId}. Expected a string.`,
    );
  });

  it("should throw for an empty string", () => {
    const result = validateInstanceId({
      configValue: "",
    });
    expect(result).toEqual(undefined);
  });
});
