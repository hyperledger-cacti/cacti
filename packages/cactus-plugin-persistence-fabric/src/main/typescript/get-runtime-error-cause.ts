import safeStableStringify from "safe-stable-stringify";

export const K_NO_DATA_EXCEPTION_WAS_JUST_A_FALSY_VALUE =
  "K_NO_DATA_EXCEPTION_WAS_JUST_A_FALSY_VALUE";

export class ErrorWithJSONMessage extends Error {}

/**
 * Get error cause for RuntimeError (instance of `Error`)
 *
 * TODO: Pull this out to the common package and update the corresponding PR
 * with it: https://github.com/hyperledger/cacti/pull/1707
 *
 * @param err unknown error type.
 * @returns valid `RuntimeError` cause
 */
export function getRuntimeErrorCause(err: unknown): Error {
  if (err instanceof Error) {
    return err;
  } else if (typeof err === "string") {
    return new Error(err);
  } else {
    const errAsJson = safeStableStringify(err);
    if (errAsJson) {
      return new ErrorWithJSONMessage(errAsJson);
    } else {
      return new Error(K_NO_DATA_EXCEPTION_WAS_JUST_A_FALSY_VALUE);
    }
  }
}
