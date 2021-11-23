import "jest-extended";
import { v4 as uuidv4 } from "uuid";

import { Checks, CodedError } from "../../../main/typescript";

describe("Checks", () => {
  test("Checks#nonBlankString()", () => {
    const subject = uuidv4();
    const pattern = new RegExp(`${subject}`);

    expect(() => Checks.nonBlankString("", subject)).toThrowWithMessage(
      CodedError,
      pattern,
    );
    expect(() => Checks.nonBlankString(" ", subject)).toThrowWithMessage(
      CodedError,
      pattern,
    );
    expect(() => Checks.nonBlankString("\n", subject)).toThrowWithMessage(
      CodedError,
      pattern,
    );
    expect(() => Checks.nonBlankString("\t", subject)).toThrowWithMessage(
      CodedError,
      pattern,
    );
    expect(() => Checks.nonBlankString("\t\n", subject)).toThrowWithMessage(
      CodedError,
      pattern,
    );
    expect(() => Checks.nonBlankString("\n\r", subject)).toThrowWithMessage(
      CodedError,
      pattern,
    );

    expect(() => Checks.nonBlankString("-")).not.toThrow();
    expect(() => Checks.nonBlankString(" a ")).not.toThrow();
    expect(() => Checks.nonBlankString("\na\t")).not.toThrow();
  });

  test("#truthy()", () => {
    expect(() => Checks.truthy(false)).toThrow();
    expect(() => Checks.truthy(NaN)).toThrow();
    expect(() => Checks.truthy(null)).toThrow();
    expect(() => Checks.truthy(undefined)).toThrow();
    expect(() => Checks.truthy(0)).toThrow();
    expect(() => Checks.truthy("")).toThrow();

    expect(() => Checks.truthy({})).not.toThrow();
    expect(() => Checks.truthy([])).not.toThrow();
    expect(() => Checks.truthy("OK")).not.toThrow();
  });
});
