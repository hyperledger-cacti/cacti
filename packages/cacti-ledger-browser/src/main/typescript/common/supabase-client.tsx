import { createClient } from "@supabase/supabase-js";
import { queryOptions } from "@tanstack/react-query";

export const supabaseQueryKey = "supabase";
const supabaseUrl = "__SUPABASE_URL__";
const supabaseKey = "__SUPABASE_KEY__";

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * React Query config to fetch entire table from supabase.
 */
export function supabaseQueryTable<T = unknown[]>(tableName: string) {
  return queryOptions({
    queryKey: [supabaseQueryKey, tableName],
    queryFn: async () => {
      const { data, error } = await supabase.from(tableName).select();
      if (error) {
        throw new Error(
          `Could not get data from '${tableName}' table: ${error.message}`,
        );
      }

      return data as T;
    },
  });
}

async function getMatchingTableEntries(
  tableName: string,
  query: Record<string, unknown>,
) {
  const { data, error } = await supabase.from(tableName).select().match(query);
  if (error) {
    throw new Error(
      `Could not get data from '${tableName}' table using query '${query}': ${error.message}`,
    );
  }

  return data;
}

export function supabaseQueryAllMatchingEntries<T = unknown[]>(
  tableName: string,
  query: Record<string, unknown>,
) {
  return queryOptions({
    queryKey: [supabaseQueryKey, tableName, query],
    queryFn: () => {
      return getMatchingTableEntries(tableName, query) as T;
    },
  });
}

export function supabaseQuerySingleMatchingEntry<T = unknown>(
  tableName: string,
  query: Record<string, unknown>,
) {
  return queryOptions({
    queryKey: [supabaseQueryKey, tableName, query],
    queryFn: async () => {
      const data = await getMatchingTableEntries(tableName, query);
      if (data.length > 1) {
        console.warn(`${tableName} query ${query} returned more than 1 entry!`);
      }
      return data[0] as T;
    },
  });
}
