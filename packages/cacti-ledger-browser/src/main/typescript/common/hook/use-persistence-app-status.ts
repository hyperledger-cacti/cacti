import React from "react";
import { useQuery } from "@tanstack/react-query";
import { GetStatusResponse } from "../types/app";
import { useNotification } from "../context/NotificationContext";
import { persistencePluginStatus } from "../queries";

/**
 * Return status of given persistence plugin from the database.
 *
 * @param pluginName name of the plugin (as set by the persistence plugin itself)
 */
export function usePersistenceAppStatus(pluginName: string): GetStatusResponse {
  const { isError, isPending, data, error } = useQuery(
    persistencePluginStatus(pluginName),
  );
  const { showNotification } = useNotification();

  React.useEffect(() => {
    isError &&
      showNotification(`Could get ${pluginName} status: ${error}`, "error");
  }, [isError]);

  return {
    isPending,
    isInitialized: data?.is_schema_initialized ?? false,
    status: {
      severity: "info",
      message: "Unknown",
    },
  };
}
