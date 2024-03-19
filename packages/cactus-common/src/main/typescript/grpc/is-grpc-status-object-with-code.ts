import type { StatusObject } from "@grpc/grpc-js";

/**
 * User-defined Typescript type-guard function that asserts whether a value or
 * object is a `@grpc/grpc-js` {Partial<StatusObject>} or not.
 *
 * The reason why it checks for {Partial} is because all of the properties of
 * the {StatusObject} are defined as optional for some reason, hence we cannot
 * assume anything about those being present or not by default.
 * Therefore this method will just check if the `code` property is set or not
 * and return `true` or `false` based on that.
 *
 * The above is also the reason why the name of the function is slightly more
 * verbose than your average user-defined type-guard that could be named just
 * "isGrpcStatusObject()" but we wanted to make sure that more specific type-guards
 * can be added later that check for other optional properities or for the
 * presence of all of them together.
 *
 * @param x Literally any value or object that will be checked at runtime to have
 * the `code` property defined as a number.
 * @returns `true` if `x` qualifies, `false` otherwise.
 *
 * @see {StatusObject} of the @grpc/grpc-js library.
 */
export function isGrpcStatusObjectWithCode(
  x: unknown,
): x is Partial<StatusObject> {
  return (
    !!x &&
    typeof (x as StatusObject).code === "number" &&
    isFinite((x as StatusObject).code)
  );
}
