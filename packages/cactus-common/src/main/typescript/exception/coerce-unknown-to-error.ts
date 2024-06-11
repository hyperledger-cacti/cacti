import stringify from "fast-safe-stringify";
import sanitizeHtml from "sanitize-html";
import { ErrorFromUnknownThrowable } from "./error-from-unknown-throwable";
import { ErrorFromSymbol } from "./error-from-symbol";

/**
 * Safely converts `unknown` to an `Error` with doing a best effort to ensure
 * that root cause analysis information is not lost. The idea here is to help
 * people who are reading logs of errors while trying to figure out what went
 * wrong after a crash.
 *
 * Often in Javascript this is much harder than it could be due to lack of
 * runtime checks by the Javascript Virtual Machine on the values/objects
 * that are being thrown.
 *
 * @param x The value/object whose type information is completely unknown at
 * compile time, such as the input parameter of a catch block (which could
 * be anything because the JS runtime has no enforcement on it at all, e.g.
 * you can throw null, undefined, empty strings of whatever else you'd like.)
 * @returns An `Error` object that is the original `x` if it was an `Error`
 * instance to begin with or a stringified JSON representation of `x` otherwise.
 */
export function coerceUnknownToError(x: unknown): Error {
  if (typeof x === "symbol") {
    const symbolAsStr = x.toString();
    return new ErrorFromSymbol(symbolAsStr);
  } else if (x instanceof Error) {
    return x;
  } else {
    const xAsJsonUnsafe = stringify(x, (_, value) =>
      typeof value === "bigint" ? value.toString() + "n" : value,
    );
    const xAsJsonSanitized = sanitizeHtml(xAsJsonUnsafe);
    return new ErrorFromUnknownThrowable(xAsJsonSanitized);
  }
}

/**
 * This is an alias to `coerceUnknownToError(x: unknown)`.
 *
 * The shorter name allows for different style choices to be made by the person
 * writing the error handling code.
 *
 * @see #coerceUnknownToError
 */
export function asError(x: unknown): Error {
  return coerceUnknownToError(x);
}
