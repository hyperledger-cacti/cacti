/**
 * A collection of all the HTTP verb method names that Express.js supports.
 * Directly taken from the Express.js type definitions file of the @types/express
 * package.
 */
export const ALL_EXPRESS_HTTP_VERB_METHOD_NAMES = [
  "all",
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
] as const;

/**
 * A type that represents all the HTTP verb method names that Express.js supports.
 */
export type ExpressHttpVerbMethodName =
  (typeof ALL_EXPRESS_HTTP_VERB_METHOD_NAMES)[number];

/**
 * Custom (user-defined) typescript type-guard that checks whether the given
 * value is an Express.js HTTP verb method name or not.
 * Useful for verifying at runtime if we can safely call a method on the Express.js
 * application object where the method's name is the value of the given variable.
 *
 * Example:
 *
 * ```typescript
 * import express from "express";
 * import { isExpressHttpVerbMethodName } from "@hyperledger/cactus-core-api-server";
 * const app = express();
 * const methodName = "get";
 * if (isExpressHttpVerbMethodName(methodName)) {
 *  app[methodName]("/foo", (req, res) => {
 *   res.send("Hello World!");
 * });
 * ```
 *
 * @param x Any value that may or may not be an Express.js HTTP verb method name.
 * @returns Whether the given value is an Express.js HTTP verb method name.
 */
export function isExpressHttpVerbMethodName(
  x: unknown,
): x is ExpressHttpVerbMethodName {
  return (
    typeof x === "string" &&
    ALL_EXPRESS_HTTP_VERB_METHOD_NAMES.includes(x as never)
  );
}
