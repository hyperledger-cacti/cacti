import { DLTransactionParams } from "../lib/types";
export interface DLTransactionContext {
  invoke(transactionParams: DLTransactionParams): Promise<string>;
}
