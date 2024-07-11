import React from "react";
import { RouteObject } from "react-router-dom";
import { GuiAppConfig } from "../supabase-types";

export interface AppListEntry {
  path: string;
  name: string;
}

export interface AppInstanceMenuEntry {
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

export interface AppInstancePersistencePluginOptions {
  supabaseSchema: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export interface AppInstance<T = unknown> {
  id: string;
  appName: string;
  instanceName: string;
  description: string | undefined;
  path: string;
  options: T;
  menuEntries: AppInstanceMenuEntry[];
  routes: RouteObject[];
  useAppStatus: () => GetStatusResponse;
  StatusComponent: React.ReactElement;
}

export type CreateAppInstanceFactoryType = (app: GuiAppConfig) => AppInstance;

export interface AppDefinition {
  appName: string;
  category: string;
  defaultInstanceName: string;
  defaultDescription: string;
  defaultPath: string;
  defaultOptions: unknown;
  createAppInstance: CreateAppInstanceFactoryType;
}

export type UpdateGuiAppConfigType = {
  instance_name: string;
  description: string;
  path: string;
  options: unknown;
};

export type AddGuiAppConfigType = UpdateGuiAppConfigType & { app_id: string };
