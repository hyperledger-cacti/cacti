import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { QueryClient, queryOptions } from "@tanstack/react-query";
import { GuiAppConfig, PluginStatus } from "./supabase-types";
import { AddGuiAppConfigType, UpdateGuiAppConfigType } from "./types/app";

let supabase: SupabaseClient | undefined;

/**
 * Get or initialize (if not already done) a supabase client using environment variables.
 */
function getSupabaseClient(): [SupabaseClient, string] {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
  const supabaseSchema = import.meta.env.VITE_SUPABASE_SCHEMA;

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      schema: supabaseSchema,
    });
  }

  return [supabase, `supabase:${supabaseSchema}`];
}

/**
 * Get persistence plugin status from the database using it's name.
 */
export function persistencePluginStatus(name: string) {
  const [supabase, supabaseQueryKey] = getSupabaseClient();
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

/**
 * Get persistence plugin app config from the database.
 */
export function guiAppConfig() {
  const [supabase, supabaseQueryKey] = getSupabaseClient();
  const tableName = "gui_app_config";

  return queryOptions({
    queryKey: [supabaseQueryKey, tableName],
    queryFn: async () => {
      const { data, error } = await supabase.from(tableName).select();

      if (error) {
        throw new Error(
          `Could not get GUI App configuration: ${error.message}`,
        );
      }

      return data as GuiAppConfig[];
    },
  });
}

/**
 * Get single persistence plugin app instance infofrom the database.
 */
export function guiAppConfigById(id: string) {
  const [supabase, supabaseQueryKey] = getSupabaseClient();
  const tableName = "gui_app_config";

  return queryOptions({
    queryKey: [supabaseQueryKey, tableName, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select()
        .eq("id", id);

      if (error) {
        throw new Error(
          `Could not get app instance (id ${id}) configuration: ${error.message}`,
        );
      }

      if (data.length !== 1) {
        throw new Error(
          `Invalid response when getting app instance with id ${id}: ${data}`,
        );
      }

      return data.pop() as GuiAppConfig;
    },
  });
}

/**
 * Invalidate all queries from gui_app_config.
 * Call after each mutation that affects this table.
 */
export function invalidateGuiAppConfig(queryClient: QueryClient) {
  const [, supabaseQueryKey] = getSupabaseClient();
  queryClient.invalidateQueries({
    queryKey: [supabaseQueryKey, "gui_app_config"],
  });
}

/**
 * Add new GUI app configuration to the database.
 */
export async function addGuiAppConfig(appData: AddGuiAppConfigType) {
  const [supabase] = getSupabaseClient();
  const { data, error } = await supabase
    .from("gui_app_config")
    .insert([appData]);

  if (error) {
    throw new Error(`Could not insert GUI App configuration: ${error.message}`);
  }

  return data;
}

/**
 * Update GUI app configuration in the database.
 */
export async function updateGuiAppConfig(
  id: string,
  appData: UpdateGuiAppConfigType,
) {
  const [supabase] = getSupabaseClient();
  const { data, error } = await supabase
    .from("gui_app_config")
    .update([appData])
    .eq("id", id);

  if (error) {
    throw new Error(
      `Could not update GUI App ${id} configuration: ${error.message}`,
    );
  }

  return data;
}

/**
 * Delete GUI app configuration from the database.
 */
export async function deleteGuiAppConfig(id: string) {
  const [supabase] = getSupabaseClient();
  const { data, error } = await supabase
    .from("gui_app_config")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Could not delete GUI App ${id}, error: ${error.message}`);
  }

  return data;
}
