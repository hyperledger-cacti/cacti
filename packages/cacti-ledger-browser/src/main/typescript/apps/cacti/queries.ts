import { supabaseQueryTable } from "../../common/supabase-client";

export function persistencePluginStatusQuery() {
  return supabaseQueryTable("plugin_status");
}
