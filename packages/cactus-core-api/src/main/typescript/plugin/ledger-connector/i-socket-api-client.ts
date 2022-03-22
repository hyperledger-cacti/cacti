import type { Observable } from "rxjs";

/**
 * Each plugin-ledger-connector supporting socketio protocol must implement this interface.
 * @todo Generic methods signatures (similar to IPluginLedgerConnector)
 * @todo Maybe more granular interface segregation for better mixins? For instance, Verifier only needs watchBlocksV1.
 * It's possible there's no need for send requests abstractions
 */
export interface ISocketApiClient<BlockType> {
  sendAsyncRequest?(
    args: any,
    method?: Record<string, unknown>,
    methodName?: string,
    baseConfig?: any,
    contract?: Record<string, unknown>,
  ): void;

  sendSyncRequest?(
    args: any,
    method?: Record<string, unknown>,
    methodName?: string,
    baseConfig?: any,
    contract?: Record<string, unknown>,
  ): Promise<any>;

  watchBlocksV1?(
    monitorOptions?: Record<string, unknown>,
  ): Observable<BlockType>;
}
