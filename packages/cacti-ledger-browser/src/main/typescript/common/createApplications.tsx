import config from "./config";
import { GuiAppConfig } from "./supabase-types";
import { AppInstance } from "./types/app";

export default function createApplications(appsFromDb?: GuiAppConfig[]) {
  const appConfig = [] as AppInstance[];

  if (!appsFromDb) {
    return appConfig;
  }

  for (const app of appsFromDb) {
    try {
      const appDefinition = config.get(app.app_id);

      if (!appDefinition) {
        throw new Error(
          `Unknown app ID found in the database - ${app.app_id}, ensure you're using latest GUI version!`,
        );
      }

      appConfig.push(appDefinition.createAppInstance(app));
    } catch (error) {
      console.error(`Could not add app ${app.app_id}: ${error}`);
    }
  }

  return appConfig;
}
