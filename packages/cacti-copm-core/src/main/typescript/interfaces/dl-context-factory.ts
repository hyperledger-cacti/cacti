import { DLTransactionContext } from "./dl-transaction-context";
import { DLRemoteTransactionContext } from "./dl-remote-transaction-context";
import { DLAccount } from "../lib/types";

export interface DLTransactionContextFactory {
  getTransactionContext(account: DLAccount): Promise<DLTransactionContext>;
  getRemoteTransactionContext(
    account: DLAccount,
    remoteNetwork: string,
  ): Promise<DLRemoteTransactionContext>;
}
