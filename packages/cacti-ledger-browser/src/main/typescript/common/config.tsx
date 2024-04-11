import cactiGuiConfig from "../apps/cacti/index";
import ethereumGuiConfig from "../apps/eth";
import fabricAppConfig from "../apps/fabric";
import { AppConfig } from "./types/app";

export const appConfig: AppConfig[] = [
  cactiGuiConfig,
  ethereumGuiConfig,
  fabricAppConfig,
];
