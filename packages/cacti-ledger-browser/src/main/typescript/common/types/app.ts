import React from "react";
import { RouteObject } from "react-router-dom";

export interface AppListEntry {
  path: string;
  name: string;
}

export interface AppConfigMenuEntry {
  title: string;
  url: string;
}

export interface AppStatus {
  severity: "success" | "info" | "warning" | "error";
  message: string;
}

export interface GetStatusResponse {
  isPending: boolean;
  isInitialized: boolean;
  status: AppStatus;
}

export interface AppConfigOptions {
  instanceName: string;
  description: string | undefined;
  path: string;
}

export interface AppConfig {
  appName: string;
  options: AppConfigOptions;
  menuEntries: AppConfigMenuEntry[];
  routes: RouteObject[];
  useAppStatus: () => GetStatusResponse;
  StatusComponent: React.ReactElement;
}
