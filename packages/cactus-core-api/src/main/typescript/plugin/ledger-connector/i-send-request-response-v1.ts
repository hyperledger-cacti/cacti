/**
 * An interface representing the response object of the send sync and send async
 * request methods on the connection-chain verifier API.
 *
 * Also great when trying to help bridge the gap between the API returning
 * results as `unknown` and the tests needing auto-completion for the properties
 * to assert for type of data at runtime.
 *
 * @see {ISocketApiClient<BlockType>}
 * @see {Verifier<LedgerApiType extends ISocketApiClient<unknown>>}
 * @see {IVerifier}
 */
export interface ISendRequestResultV1<T> {
  readonly data: T;
  readonly errorDetail?: string;
  readonly status: number;
}
