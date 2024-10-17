import { RuntimeError } from "run-time-error-cjs";
import { coerceUnknownToError } from "./coerce-unknown-to-error";

/**
 * ## DEPRECATED
 *
 * Instead of relying on this function, in the future, use the new `cause`
 * property of the built-in `Error` type in combination
 * with the `asError(unknown)` utility function:
 * ```typescript
 * import { asError } from "@hyperledger/cactus-common";
 *
 * try {
 *   await performSomeImportantOperation();
 * } catch (ex: unknown) {
 *  const cause = asError(ex);
 *   throw new Error("Something went wrong while doing something.", { cause });
 * }
 * ```
 * More information about the EcmaScript proposal that made this possible:
 * https://github.com/tc39/proposal-error-cause
 *
 * ## The Old Documentation Prior to the Deprecation:
 * ### STANDARD EXCEPTION HANDLING - EXAMPLE WITH RE-THROW:
 *
 * Use the this utility function and pass in any throwable of whatever type and format
 * The underlying implementation will take care of determining if it's a valid
 * `Error` instance or not and act accordingly with avoding information loss
 * being the number one priority.
 *
 * You can perform a fast-fail re-throw with additional context like the snippet
 * below.
 * Notice that we log on the debug level inside the catch block to make sure that
 * if somebody higher up in the callstack ends up handling this exception then
 * it will never get logged on the error level which is good because if it did
 * that would be a false-positive, annoying system administrators who have to
 * figure out which errors in their production logs need to be ignored and which
 * ones are legitimate.
 * The trade-off with the above is trust: Specifically, we are trusting the
 * person above us in the callstack to either correctly handle the exception
 * or make sure that it does get logged on the error level. If they fail to do
 * either one of those, then we'll have silent failures on our hand that will
 * be hard to debug.
 * Lack of the above kind of trust is usually what pushes people to just go for
 * it and log their caught exceptions on the error level but this most likely
 * a mistake in library code where there just isn't enough context to know if
 * an error is legitimate or not most of the time. If you are writing application
 * logic then it's usually a simpler decision with more information at your
 * disposal.
 *
 * The underlying concept is that if you log something on an error level, you
 * indicate that another human should fix a bug that is in the code. E.g.,
 * when they see the error logs, they should go and fix something.
 *
 * ```typescript
 * public doSomething(): void {
 *   try {
 *     someSubTaskToExecute();
 *   } catch (ex) {
 *     const eMsg = "Failed to run **someSubTask** while doing **something**:"
 *     this.log.debug(eMsg, ex);
 *     throw createRuntimeErrorWithCause(eMsg, ex);
 * }
 * ```
 *
 * ### EXCEPTION HANDLING WITH CONDITIONAL HANDLING AND RE-THROW - EXAMPLE:
 *
 * In case you need to do a conditional exception-handling:
 *  - Use the RuntimeError to re-throw and
 * provide the previous exception as cause in the new RuntimeError to retain
 * the information and distinguish between an exception you can handle and
 * recover from and one you can't
 *
 * ```typescript
 * public async doSomething(): Promise<number> {
 *    try {
 *      await doSubTaskThatsAPartOfDoingSomething();
 *    } catch (ex) {
 *      if (ex instanceof MyErrorThatICanHandleAndRecoverFrom) {
 *        // An exception with a fixable scenario we can recover from thru an additional handling
 *        // do something here to handle and fix the issue
 *        // where "fixing" means that the we end up recovering
 *        // OK instead of having to crash. Recovery means that
 *        // we are confident that the second sub-task is safe to proceed with
 *        // despite of the error that was caught here
 *        this.log.debug("We've got an failure in 'doSubTaskThatsAPartOfDoingSomething()' but we could fix it and recover to continue".);
 *      } else {
 *        // An "unexpected exception" where we want to fail immediately
 *        // to avoid follow-up problems
 *        const context = "We got an severe failure in 'doSubTaskThatsAPartOfDoingSomething()' and need to stop directly here to avoid follow-up problems";
 *        this.log.error(context, ex);
 *        throw newRex(context, ex);
 *      }
 *    }
 *    const result = await doSecondAndFinalSubTask();
 *    return result; // 42
 *  }
 * ```
 * @deprecated
 *
 * @param message The contextual information that will be passed into the
 * constructor of the returned {@link RuntimeError} instance.
 * @param cause The caught throwable which we do not know the exact type of but
 * need to make sure that whatever information is in t here is not lost.
 * @returns The instance that has the combined information of the input parameters.
 */
export function createRuntimeErrorWithCause(
  message: string,
  cause: unknown,
): RuntimeError {
  const innerEx = coerceUnknownToError(cause);
  return new RuntimeError(message, innerEx);
}

/**
 * ## DEPRECATED
 *
 * Instead of relying on this function, in the future, use the new `cause`
 * property of the built-in `Error` type in combination
 * with the `asError(unknown)` utility function:
 * ```typescript
 * import { asError } from "@hyperledger/cactus-common";
 *
 * try {
 *   await performSomeImportantOperation();
 * } catch (ex: unknown) {
 *  const cause = asError(ex);
 *   throw new Error("Something went wrong while doing something.", { cause });
 * }
 * ```
 * More information about the EcmaScript proposal that made this possible:
 * https://github.com/tc39/proposal-error-cause
 *
 * An alias to the `createRuntimeErrorWithCause` function for those prefering
 * a shorter utility for their personal style.
 *
 * @deprecated
 * @see {@link createRuntimeErrorWithCause}
 * @returns `RuntimeError`
 */
export function newRex(message: string, cause: unknown): RuntimeError {
  return createRuntimeErrorWithCause(message, cause);
}
