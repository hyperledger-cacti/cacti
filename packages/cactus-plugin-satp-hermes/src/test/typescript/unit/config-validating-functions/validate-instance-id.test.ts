import "jest-extended";
import { validateInstanceId } from "../../../../main/typescript/services/validation/config-validating-functions/validate-instance-id";

describe("Validate Instance Id", () => {
  it("should pass with a valid UUID", () => {
    const instanceId = "123e4567-e89b-12d3-a456-426614174000";
    expect(() =>
      validateInstanceId({
        configValue: instanceId,
      }),
    ).not.toThrow();
  });

  it("should throw for a non-string ID", () => {
    const invalidId = 123;
    expect(() =>
      validateInstanceId({
        configValue: invalidId,
      }),
    ).toThrow();
  });

  /*it("should throw for an empty string", () => {
        const invalidId = "";
        expect(() => validateInstanceId({
            configValue: invalidId,
        })).toThrow();
    });*/
});
