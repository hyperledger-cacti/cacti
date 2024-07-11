/**
 * File containing all react-query functions used by this app.
 * @todo Move to separate directory if this file becomes too complex.
 */

import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { queryOptions } from "@tanstack/react-query";
import {
  FabricBlock,
  FabricCertificate,
  FabricTransaction,
  FabricTransactionAction,
  FabricTransactionActionEndorsement,
} from "./supabase-types";
import { useFabricSupabaseConfig } from "./hooks";

let supabase: SupabaseClient | undefined;

function createQueryKey(
  tableName: string,
  pagination: { page: number; pageSize: number },
) {
  return [tableName, { pagination }];
}

function useSupabaseClient(): [SupabaseClient, string] {
  const supabaseConfig = useFabricSupabaseConfig();

  if (!supabase) {
    supabase = createClient(supabaseConfig.url, supabaseConfig.key, {
      schema: supabaseConfig.schema,
    });
  }

  return [supabase, `supabase:${supabaseConfig.schema}`];
}

/**
 * Get all recorded fabric blocks.
 * Returns `queryOptions` to be used as argument to `useQuery` from `react-query`.
 * Supports paging.
 */
export function fabricAllBlocksQuery(page: number, pageSize: number) {
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

      return data as FabricBlock[];
    },
  });
}

/**
 * Get all recorded fabric transactions.
 * Returns `queryOptions` to be used as argument to `useQuery` from `react-query`.
 * Supports paging.
 */
export function fabricAllTransactionsQuery(page: number, pageSize: number) {
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

      return data as FabricTransaction[];
    },
  });
}

/**
 * Get transaction object form the database using it's hash.
 */
export function fabricTransactionByHash(hash: string) {
  const [supabase, supabaseQueryKey] = useSupabaseClient();
  const tableName = "transaction";

  return queryOptions({
    queryKey: [supabaseQueryKey, tableName, hash],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select()
        .match({ hash });

      if (error) {
        throw new Error(
          `Could not get transaction with hash ${hash}: ${error.message}`,
        );
      }

      if (data.length !== 1) {
        throw new Error(
          `Invalid response when getting transaction with hash ${hash}: ${data}`,
        );
      }

      return data.pop() as FabricTransaction;
    },
  });
}

/**
 * Get transaction actions form the database using parent transaction id.
 */
export function fabricTransactionActions(txId: string) {
  const [supabase, supabaseQueryKey] = useSupabaseClient();
  const tableName = "transaction_action";

  return queryOptions({
    queryKey: [supabaseQueryKey, tableName, txId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select()
        .match({ transaction_id: txId });

      if (error) {
        throw new Error(
          `Could not get actions of transaction with ID ${txId}: ${error.message}`,
        );
      }

      return data as FabricTransactionAction[];
    },
  });
}

/**
 * Get fabric certificate using it's ID.
 */
export function fabricCertificate(id: string) {
  const [supabase, supabaseQueryKey] = useSupabaseClient();
  const tableName = "certificate";

  return queryOptions({
    queryKey: [supabaseQueryKey, tableName, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select()
        .match({ id });

      if (error) {
        throw new Error(
          `Could not get certificate with ID ${id}: ${error.message}`,
        );
      }

      if (data.length !== 1) {
        throw new Error(
          `Invalid response when getting certificate with id ${id}: ${data}`,
        );
      }

      return data.pop() as FabricCertificate;
    },
  });
}

/**
 *  Get transaction action endorsements form the database using parent action id.
 */
export function fabricActionEndorsements(actionId: string) {
  const [supabase, supabaseQueryKey] = useSupabaseClient();
  const tableName = "transaction_action_endorsement";

  return queryOptions({
    queryKey: [supabaseQueryKey, tableName, actionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select()
        .match({ transaction_action_id: actionId });

      if (error) {
        throw new Error(
          `Could not get endorsements of action with ID ${actionId}: ${error.message}`,
        );
      }

      return data as FabricTransactionActionEndorsement[];
    },
  });
}
