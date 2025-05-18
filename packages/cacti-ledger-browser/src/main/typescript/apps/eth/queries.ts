/**
 * File containing all react-query functions used by this app.
 * @todo Move to separate directory if this file becomes too complex.
 */

import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { queryOptions } from "@tanstack/react-query";
import {
  Transaction,
  Block,
  TokenHistoryItem20,
  TokenMetadata721,
  TokenERC20,
} from "./supabase-types";
import { useEthSupabaseConfig } from "./hooks";

let supabase: SupabaseClient | undefined;

function createQueryKey(
  tableName: string,
  pagination: { page: number; pageSize: number },
) {
  return [tableName, { pagination }];
}

function useSupabaseClient(): [SupabaseClient, string] {
  const supabaseConfig = useEthSupabaseConfig();

  if (!supabase) {
    supabase = createClient(supabaseConfig.url, supabaseConfig.key, {
      schema: supabaseConfig.schema,
    });
  }

  return [supabase, `supabase:${supabaseConfig.schema}`];
}

/**
 * Get all recorded ethereum transactions.
 * Returns `queryOptions` to be used as argument to `useQuery` from `react-query`.
 * Supports paging.
 */
export function ethAllTransactionsQuery(page: number, pageSize: number) {
  const [supabase, supabaseQueryKey] = useSupabaseClient();
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

/**
 * Get all recorded ethereum transactions involving account `accountAddress`
 * (either as sender or recipient).
 * Returns `queryOptions` to be used as argument to `useQuery` from `react-query`.
 * Supports paging.
 */
export function ethAccountTransactionsQuery(
  page: number,
  pageSize: number,
  accountAddress: string,
) {
  const [supabase, supabaseQueryKey] = useSupabaseClient();
  const fromIndex = page * pageSize;
  const toIndex = fromIndex + pageSize - 1;
  const tableName = "transaction";

  return queryOptions({
    queryKey: [supabaseQueryKey, createQueryKey(tableName, { page, pageSize })],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select()
        .or(`from.eq.${accountAddress}, to.eq.${accountAddress}`)
        .order("block_number", { ascending: false })
        .range(fromIndex, toIndex);

      if (error) {
        throw new Error(
          `Could not get data from '${tableName}' table for account '${accountAddress}: ${error.message}`,
        );
      }

      return data as Transaction[];
    },
  });
}

/**
 * Get all recorded ethereum blocks.
 * Returns `queryOptions` to be used as argument to `useQuery` from `react-query`.
 * Supports paging.
 */
export function ethAllBlocksQuery(page: number, pageSize: number) {
  const [supabase, supabaseQueryKey] = useSupabaseClient();
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

/**
 * Get history of ERC20 transaction on token `tokenAddress` involving account `accountAddress`
 * (either as sender or recipient).
 * Returns `queryOptions` to be used as argument to `useQuery` from `react-query`.
 */
export function ethERC20TokenHistory(
  tokenAddress: string,
  accountAddress: string,
) {
  const [supabase, supabaseQueryKey] = useSupabaseClient();
  const tableName = "erc20_token_history_view";
  return queryOptions({
    queryKey: [supabaseQueryKey, tableName, tokenAddress, accountAddress],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select()
        .match({ token_address: tokenAddress })
        .or(`sender.eq.${accountAddress}, recipient.eq.${accountAddress}`);
      if (error) {
        throw new Error(
          `Could not get ERC20 [${tokenAddress}] of user ${accountAddress} token history: ${error.message}`,
        );
      }

      return data as TokenHistoryItem20[];
    },
  });
}

export interface EthAllERC721TokensByAccountResponseType {
  token_id: number;
  uri: string;
  account_address: string;
  last_owner_change: string;
  token_metadata_erc721: TokenMetadata721;
}

/**
 * Get list of all ERC721 tokens belonging to `accountAddress`
 * Returns `queryOptions` to be used as argument to `useQuery` from `react-query`.
 */
export function ethAllERC721TokensByAccount(accountAddress: string) {
  const [supabase, supabaseQueryKey] = useSupabaseClient();

  return queryOptions({
    queryKey: [supabaseQueryKey, "ethAllERC721TokensByAccount", accountAddress],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("token_erc721")
        .select(
          "token_id, uri, account_address, last_owner_change, token_metadata_erc721(*)",
        )
        .eq("account_address", accountAddress);

      if (error) {
        throw new Error(
          `Could not ${accountAddress} ERC721 token list: ${error.message}`,
        );
      }

      return data as EthAllERC721TokensByAccountResponseType[];
    },
  });
}

/**
 * Get list of all ERC20 tokens belonging to `accountAddress`
 * Returns `queryOptions` to be used as argument to `useQuery` from `react-query`.
 */
export function ethAllERC20TokensByAccount(accountAddress: string) {
  const [supabase, supabaseQueryKey] = useSupabaseClient();

  return queryOptions({
    queryKey: [supabaseQueryKey, "ethAllERC20TokensByAccount", accountAddress],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("token_erc20")
        .select()
        .eq("account_address", accountAddress);

      if (error) {
        throw new Error(
          `Could not ${accountAddress} ERC20 token list: ${error.message}`,
        );
      }

      return data as TokenERC20[];
    },
  });
}
