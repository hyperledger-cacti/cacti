import { useOutletContext } from "react-router-dom";
import { AppInstancePersistencePluginOptions } from "../../common/types/app";

export function useEthAppConfig() {
  return useOutletContext<AppInstancePersistencePluginOptions>();
}

export function useEthSupabaseConfig() {
  const appConfig = useEthAppConfig();

  return {
    schema: appConfig.supabaseSchema,
    url: appConfig.supabaseUrl,
    key: appConfig.supabaseKey,
  };
}
