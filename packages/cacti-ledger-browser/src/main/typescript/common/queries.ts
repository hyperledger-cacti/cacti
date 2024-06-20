import { createClient } from "@supabase/supabase-js";
import { queryOptions } from "@tanstack/react-query";
import { PluginStatus } from "./supabase-types";

const supabaseQueryKey = "supabase";
const supabaseUrl = "__SUPABASE_URL__";
const supabaseKey = "__SUPABASE_KEY__";

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get persistence plugin status from the database using it's name.
 */
export function persistencePluginStatus(name: string) {
  const tableName = "plugin_status";

  return queryOptions({
    queryKey: [supabaseQueryKey, tableName, name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select()
        .match({ name });

      if (error) {
        throw new Error(
          `Could not get persistence plugin status with name ${name}: ${error.message}`,
        );
      }

      if (data.length !== 1) {
        throw new Error(
          `Invalid response when persistence plugin status with name ${name}: ${data}`,
        );
      }

      return data.pop() as PluginStatus;
    },
  });
}
