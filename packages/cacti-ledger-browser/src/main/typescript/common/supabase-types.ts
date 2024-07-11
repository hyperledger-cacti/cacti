export interface PluginStatus {
  name: string;
  last_instance_id: string;
  is_schema_initialized: boolean;
  created_at: string;
  last_connected_at: string;
}

export interface GuiAppConfig {
  id: string;
  app_id: string;
  instance_name: string;
  description: string;
  path: string;
  options: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
