import { useOutletContext } from "react-router-dom";
import { AppInstancePersistencePluginOptions } from "../../common/types/app";

export function useFabricAppConfig() {
  return useOutletContext<AppInstancePersistencePluginOptions>();
}

export function useFabricSupabaseConfig() {
  const appConfig = useFabricAppConfig();

  return {
    schema: appConfig.supabaseSchema,
    url: appConfig.supabaseUrl,
    key: appConfig.supabaseKey,
  };
}
