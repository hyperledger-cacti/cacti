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
  /**
   * Unique database ID of this app instance.
   */
  id: string;

  /**
   * Name of the application (can be same as appName in app definition)
   */
  appName: string;

  /**
   * Instance name (set by the user)
   */
  instanceName: string;

  /**
   * Instance description (set by the user)
   */
  description: string | undefined;

  /**
   * Path under which app routes will be mounted (must be path with `/`, like `/eth`)
   */
  path: string;

  /**
   * Custom, app-specific options in JSON format. This will change between applications.
   */
  options: T;

  /**
   * List on titles and URL of menu entries to be added to the top bar (used to navigate within an app)
   */
  menuEntries: AppInstanceMenuEntry[];

  /**
   * `react-router-dom` compatible list of this application routes.
   */
  routes: RouteObject[];

  /**
   * Method for retriving application status details.
   */
  useAppStatus: () => GetStatusResponse;

  /**
   * Status component showed when user opens a app status pop up window.
   */
  StatusComponent: React.ReactElement;

  /**
   * Full URL to a setup guide, it will be displayed to the user on app configuration page.
   */
  appSetupGuideURL?: string;

  /**
   * Full URL to app documentation page
   */
  appDocumentationURL?: string;
}

export type CreateAppInstanceFactoryType = (app: GuiAppConfig) => AppInstance;

export interface AppDefinition {
  /**
   * Application name as shown to the user
   */
  appName: string;

  /**
   * Application category, the user can filter using it.
   * If there's no matching category for your app consider adding a new one!
   */
  category: string;

  /**
   * Full URL to a setup guide, it will be displayed to the user on app configuration page.
   */
  appSetupGuideURL?: string;

  /**
   * Full URL to app documentation page
   */
  appDocumentationURL?: string;

  /**
   * Default value for instance name that user can set to uniquely identify this ap instance.
   */
  defaultInstanceName: string;

  /**
   * Default value for app description.
   */
  defaultDescription: string;

  /**
   * Default path under which app routes will be mounted (must be path with `/`, like `/eth`)
   */
  defaultPath: string;

  /**
   * Default custom, app-specific options in JSON format. This will change between applications.
   */
  defaultOptions: unknown;

  /**
   * Factory method for creating application instance object from configuration stored in a database.
   */
  createAppInstance: CreateAppInstanceFactoryType;
}

export type UpdateGuiAppConfigType = {
  instance_name: string;
  description: string;
  path: string;
  options: unknown;
};

export type AddGuiAppConfigType = UpdateGuiAppConfigType & { app_id: string };
