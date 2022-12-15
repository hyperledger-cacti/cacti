import type { Observable } from "rxjs";

/**
 * Each plugin-ledger-connector supporting socketio protocol must implement this interface.
 * @todo Generic methods signatures (similar to IPluginLedgerConnector)
 * @todo Maybe more granular interface segregation for better mixins? For instance, Verifier only needs watchBlocksV1.
 * It's possible there's no need for send requests abstractions
 */
export interface ISocketApiClient<BlockType> {
  sendAsyncRequest?(
    contract?: Record<string, unknown>,
    method?: Record<string, unknown>,
    args?: any,
    baseConfig?: any,
  ): void;

  sendSyncRequest?(
    contract?: Record<string, unknown>,
    method?: Record<string, unknown>,
    args?: any,
    baseConfig?: any,
  ): Promise<any>;

  watchBlocksV1?(monitorOptions?: any): Observable<BlockType>;

  watchBlocksAsyncV1?(monitorOptions?: any): Promise<Observable<BlockType>>;
}
