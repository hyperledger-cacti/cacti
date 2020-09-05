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
    subjectOfCheck: string = "variable",
    code: string = "-1"
  ): void {
    if (!checkResult) {
      const message = `"${subjectOfCheck}" is falsy, need a truthy value.`;
      throw new CodedError(message, code);
    }
  }
}
