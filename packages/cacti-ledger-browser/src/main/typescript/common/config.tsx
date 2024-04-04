import cactiGuiConfig from "../apps/cacti/index";
import ethereumGuiConfig from "../apps/eth";
import fabricAppConfig from "../apps/fabric";

export type AppConfig = {
  name: string;
  url: string;
  pluginName?: string;
  menuEntries: {
    title: string;
    url: string;
  }[];
  routes: any;
};

export const appConfig: AppConfig[] = [
  cactiGuiConfig,
  ethereumGuiConfig,
  fabricAppConfig,
];
