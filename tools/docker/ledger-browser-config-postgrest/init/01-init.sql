-- Slim schema for the ledger browser config store (Postgres + PostgREST
-- profile). Mirrors packages/cacti-ledger-browser/src/main/sql/schema.sql
-- minus the Supabase-specific roles/RLS: this profile has no auth service,
-- every request runs as `ledger_browser` (see docker-compose.yml), so RLS
-- against supabase roles would be dead weight. Single-operator, localhost
-- deployments only - see the Supabase guides for multi-user deployments.

CREATE SCHEMA IF NOT EXISTS public;

-- Roles for PostgREST (connecting role switches to the anonymous role).
CREATE ROLE authenticator LOGIN PASSWORD 'authenticator';
CREATE ROLE ledger_browser NOLOGIN;
GRANT ledger_browser TO authenticator;

GRANT USAGE ON SCHEMA public TO ledger_browser;

CREATE TABLE IF NOT EXISTS public.plugin_status (
    name text NOT NULL,
    last_instance_id text NOT NULL,
    is_schema_initialized boolean NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    last_connected_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT plugin_status_pkey PRIMARY KEY (name),
    CONSTRAINT plugin_status_name_key UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS public.gui_app_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    app_id text NOT NULL,
    instance_name text NOT NULL,
    description text NOT NULL,
    path text NOT NULL,
    options json,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gui_app_config_pkey PRIMARY KEY (id),
    CONSTRAINT gui_app_config_path_key UNIQUE (path)
);

GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.plugin_status, public.gui_app_config
    TO ledger_browser;

-- Preloaded example so the UI works out of the box: a SATP Inspector
-- instance pointed at the bundled example gateway (canned sessions served
-- on http://localhost:3013). Delete the row (or edit its options) from the
-- UI to switch to a real SATP Hermes gateway.
INSERT INTO public.gui_app_config
    (app_id, instance_name, description, path, options)
VALUES
    (
        'satpInspector',
        'SATP Inspector (example data)',
        'Preloaded example: canned sessions served by the bundled example '
        'gateway on http://localhost:3013. Edit the app configuration to '
        'point gatewayUrl at a real SATP Hermes gateway (for example '
        'http://localhost:3012 for the plugin docker compose).',
        '/satp',
        '{"gatewayUrl": "http://localhost:3013"}'
    )
ON CONFLICT (path) DO NOTHING;
