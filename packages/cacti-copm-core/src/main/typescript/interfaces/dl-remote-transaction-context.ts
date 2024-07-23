import { DLTransactionParams } from "../lib/types";

export interface DLRemoteTransactionContext {
  invokeFlow(
    remoteTransactionParams: DLTransactionParams,
    localTransactionParams: DLTransactionParams,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any>;
  invoke(transactionParams: DLTransactionParams): Promise<string>;
}
