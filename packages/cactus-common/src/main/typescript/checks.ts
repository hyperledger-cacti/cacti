import { CodedError } from "./coded-error";

export class Checks {
  /**
   * Verifies that a boolean condition is met or throws an Error if it is not.
   *
   * @param checkResult Determines the outcome of the check via it's truthyness.
   * @param subjectOfCheck The error message if `checkResult` is falsy.
   * @param code The code of the error if `checkResult is falsy.
   */
  public static truthy(
    checkResult: any,
    subjectOfCheck = "variable",
    code = "-1",
  ): void {
    if (!checkResult) {
      const message = `"${subjectOfCheck}" is falsy, need a truthy value.`;
      throw new CodedError(message, code);
    }
  }

  /**
   * Verifies that a string is indeed not a blank string.
   * Blank string can be one that only has whitespace characters for example.
   *
   * @param value The value that will be asserted for being a non-blank string.
   * @param subject The error message if `value` is a blank string.
   * @param code The code of the error if `checkResult is falsy.
   */
  public static nonBlankString(
    value: any,
    subject = "variable",
    code = "-1",
  ): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      const message = `"${subject}" is a blank string. Need non-blank.`;
      throw new CodedError(message, code);
    }
  }
}
