import { ABNORMAL_CLOSURE } from "websocket-event-codes";

export const WEB3_CONNECTION_NOT_OPEN_ON_SEND = "connection not open on send()";

/**
 * Checks if an error was thrown due to the web3js websocket provider disconnecting.
 *
 * @param err - The error object to check.
 * @returns `true` if the error is an instance of `Error`, has a `message`
 * property indicating a websocket provider abnormal closure error.
 * Otherwise, returns `false`.
 *
 * **Example:**
 * ```typescript
 * try {
 *   // ... code that might throw an error
 * } catch (err: unknown) {
 *   if (isWeb3WebsocketProviderAbnormalClosureError(err)) {
 *     // Error is specifically due to websocket provider abnormal closure
 *     console.error("Websocket provider abnormal closure error:", err);
 *   } else {
 *     // Handle other types of errors
 *     console.error("Unknown error:", err);
 *   }
 * }
 * ```
 */
export function isWeb3WebsocketProviderAbnormalClosureError(
  err: unknown,
): err is Error & { code: typeof ABNORMAL_CLOSURE } {
  if (!err) {
    return false;
  }
  if (!(err instanceof Error)) {
    return false;
  }
  return err.message.includes(WEB3_CONNECTION_NOT_OPEN_ON_SEND);
}
