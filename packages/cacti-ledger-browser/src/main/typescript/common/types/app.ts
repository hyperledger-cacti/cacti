import { RouteObject } from "react-router-dom";

export interface AppListEntry {
  path: string;
  name: string;
}

export interface AppConfigMenuEntry {
  title: string;
  url: string;
}

export interface AppConfig {
  name: string;
  path: string;
  menuEntries: AppConfigMenuEntry[];
  routes: RouteObject[];
}
