/**
 * A custom `Error` class designed to encode information about the origin of
 * the information contained inside.
 *
 * Specifically this class is to be used when a catch block has encountered a
 * throwable [1] that was not an instance of `Error`.
 *
 * This should help people understand the contents a little more while searching
 * for the root cause of a crash (by letting them know that we had encountered
 * a non-Error catch block parameter and we wrapped it in this `Error` sub-class
 * purposefully to make it easier to deal with it)
 *
 * [1]: A throwable is a value or object that is possible to be thrown in the
 * place of an `Error` object. This - as per the rules of Javascript - can be
 * literally anything, NaN, undefined, null, etc.
 */
export class ErrorFromUnknownThrowable extends Error {}
