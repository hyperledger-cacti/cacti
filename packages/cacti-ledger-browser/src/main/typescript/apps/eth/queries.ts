import { queryOptions } from "@tanstack/react-query";
import {
  supabase,
  supabaseQueryKey,
  supabaseQueryTable,
  supabaseQuerySingleMatchingEntry,
  supabaseQueryAllMatchingEntries,
} from "../../common/supabase-client";
import {
  Transaction,
  Block,
  TokenTransfer,
  ERC20Txn,
  TokenHistoryItem20,
  ERC721Txn,
  TokenMetadata721,
  TokenMetadata20,
} from "../../common/supabase-types";

function createQueryKey(
  tableName: string,
  pagination: { page: number; pageSize: number },
) {
  return [tableName, { pagination }];
}

export function ethereumAllTransactionsQuery(page: number, pageSize: number) {
  const fromIndex = page * pageSize;
  const toIndex = fromIndex + pageSize - 1;
  const tableName = "transaction";
  return queryOptions({
    queryKey: [supabaseQueryKey, createQueryKey(tableName, { page, pageSize })],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select()
        .order("block_number", { ascending: false })
        .range(fromIndex, toIndex);

      if (error) {
        throw new Error(
          `Could not get data from '${tableName}' table: ${error.message}`,
        );
      }

      return data as Transaction[];
    },
  });
}

// todo - refactor to single get-all query with paging
export function ethereumAllBlocksQuery(page: number, pageSize: number) {
  const fromIndex = page * pageSize;
  const toIndex = fromIndex + pageSize - 1;
  const tableName = "block";
  return queryOptions({
    queryKey: [supabaseQueryKey, createQueryKey(tableName, { page, pageSize })],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select()
        .order("number", { ascending: false })
        .range(fromIndex, toIndex);

      if (error) {
        throw new Error(
          `Could not get data from '${tableName}' table: ${error.message}`,
        );
      }

      return data as Block[];
    },
  });
}

export function ethereumBlockByNumber(blockNumber: number | string) {
  return supabaseQuerySingleMatchingEntry<Block>("block", {
    number: blockNumber,
  });
}

export function ethereumTxById(txId: number | string) {
  return supabaseQuerySingleMatchingEntry<Transaction>("transaction", {
    id: txId,
  });
}

export function ethereumTokenTransfersByTxId(txId: number | string) {
  return supabaseQueryAllMatchingEntries<TokenTransfer[]>("token_transfer", {
    transaction_id: txId,
  });
}

export function ethGetTokenOwners(tokenStandard: string) {
  if (!["erc20", "erc721"].includes(tokenStandard)) {
    throw new Error(`Unknown token standard requested! ${tokenStandard}`);
  }
  const tableName = `token_${tokenStandard}`;
  return queryOptions({
    queryKey: [supabaseQueryKey, tableName, "account_address"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select("account_address");
      if (error) {
        throw new Error(
          `Could not get token owners from '${tableName}' table: ${error.message}`,
        );
      }

      // TODO - use stored procedure to return unique account list
      return [...new Set(data.map((el) => el.account_address))].map((el) => ({
        address: el,
      }));
    },
  });
}

export function ethERC20TokensByOwner(accountAddress: number | string) {
  return supabaseQueryAllMatchingEntries<ERC20Txn[]>("token_erc20", {
    account_address: accountAddress,
  });
}

export function ethERC20TokensHistory(
  tokenAddress: string,
  tokenOwnerAddress: string,
) {
  const tableName = "erc20_token_history_view";
  return queryOptions({
    queryKey: [supabaseQueryKey, tableName, tokenAddress, tokenOwnerAddress],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select()
        .match({ token_address: tokenAddress })
        .or(
          `sender.eq.${tokenOwnerAddress}, recipient.eq.${tokenOwnerAddress}`,
        );
      if (error) {
        throw new Error(
          `Could not get ERC20 [${tokenAddress}] of user ${tokenOwnerAddress} token history: ${error.message}`,
        );
      }

      return data as TokenHistoryItem20[];
    },
  });
}

export function ethERC721TokensByTxId(accountAddress: string) {
  return supabaseQueryAllMatchingEntries<ERC721Txn[]>("erc721_txn_meta_view", {
    account_address: accountAddress,
  });
}

export function ethAllERC721History() {
  return supabaseQueryTable<TokenMetadata721>("erc721_token_history_view");
}

export function ethTokenDetails(tokenStandard: string, tokenAddress: string) {
  if (!["erc20", "erc721"].includes(tokenStandard)) {
    throw new Error(`Unknown token standard requested! ${tokenStandard}`);
  }

  const tableName = `token_metadata_${tokenStandard}`;

  return supabaseQuerySingleMatchingEntry<TokenMetadata20 | TokenMetadata721>(
    tableName,
    {
      address: tokenAddress,
    },
  );
}
