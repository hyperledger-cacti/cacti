import "jest-extended";
import { isGrpcStatusObjectWithCode } from "../../../../main/typescript";

describe("isGrpcStatusObjectWithCode()", () => {
  test("returns true for POJO with correct shape and valid data", () => {
    expect(isGrpcStatusObjectWithCode({ code: 1 })).toBeTrue();
    expect(isGrpcStatusObjectWithCode({ code: 0 })).toBeTrue();
    expect(isGrpcStatusObjectWithCode({ code: -1 })).toBeTrue();
  });

  test("returns false for POJO with correct shape and invalid data", () => {
    expect(isGrpcStatusObjectWithCode({ code: NaN })).toBeFalse();
    expect(isGrpcStatusObjectWithCode({ code: "" })).toBeFalse();
    expect(isGrpcStatusObjectWithCode({ code: "Hello" })).toBeFalse();
    expect(isGrpcStatusObjectWithCode({ code: true })).toBeFalse();
    expect(isGrpcStatusObjectWithCode({ code: [] })).toBeFalse();

    expect(isGrpcStatusObjectWithCode({ codeX: NaN })).toBeFalse();
    expect(isGrpcStatusObjectWithCode({ codeY: "" })).toBeFalse();
    expect(isGrpcStatusObjectWithCode({ codeZ: "Hello" })).toBeFalse();
    expect(isGrpcStatusObjectWithCode({ codeK: 1 })).toBeFalse();
  });

  test("returns false for non-POJO input", () => {
    expect(isGrpcStatusObjectWithCode(NaN)).toBeFalse();
    expect(isGrpcStatusObjectWithCode(null)).toBeFalse();
    expect(isGrpcStatusObjectWithCode(undefined)).toBeFalse();
    expect(isGrpcStatusObjectWithCode([])).toBeFalse();
    expect(isGrpcStatusObjectWithCode(Symbol)).toBeFalse();
  });
});
