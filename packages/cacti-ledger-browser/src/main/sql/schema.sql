CREATE SCHEMA IF NOT EXISTS public;

ALTER SCHEMA extensions OWNER TO postgres;
ALTER SCHEMA public OWNER TO postgres;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Table: public.plugin_status
-- DROP TABLE IF EXISTS public.plugin_status;

CREATE TABLE IF NOT EXISTS public.plugin_status
(
    name text COLLATE pg_catalog."default" NOT NULL,
    last_instance_id text COLLATE pg_catalog."default" NOT NULL,
    is_schema_initialized boolean NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    last_connected_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT plugin_status_pkey PRIMARY KEY (name),
    CONSTRAINT plugin_status_name_key UNIQUE (name)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.plugin_status
    OWNER to postgres;
    
ALTER TABLE public.plugin_status
ENABLE ROW LEVEL SECURITY;

CREATE POLICY plugin_status_select ON public.plugin_status
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY plugin_status_insert ON public.plugin_status
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY plugin_status_update ON public.plugin_status
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY plugin_status_delete ON public.plugin_status
FOR DELETE TO anon, authenticated, service_role
USING (true);

GRANT ALL ON TABLE public.plugin_status TO anon;
GRANT ALL ON TABLE public.plugin_status TO authenticated;
GRANT ALL ON TABLE public.plugin_status TO postgres;
GRANT ALL ON TABLE public.plugin_status TO service_role;


-- Table: public.gui_app_config
-- DROP TABLE IF EXISTS public.gui_app_config;

CREATE TABLE public.gui_app_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    app_id text NOT NULL,
    instance_name text NOT NULL,
    description text NOT NULL,
    path text NOT NULL,
    options json,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gui_app_config_pkey PRIMARY KEY (id),
    CONSTRAINT gui_app_config_path_key UNIQUE (path)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.gui_app_config
    OWNER to postgres;

ALTER TABLE public.gui_app_config
ENABLE ROW LEVEL SECURITY;

CREATE POLICY gui_app_config_select ON public.gui_app_config
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY gui_app_config_insert ON public.gui_app_config
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY gui_app_config_update ON public.gui_app_config
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY gui_app_config_delete ON public.gui_app_config
FOR DELETE TO anon, authenticated, service_role
USING (true);

GRANT ALL ON TABLE public.gui_app_config TO anon;
GRANT ALL ON TABLE public.gui_app_config TO authenticated;
GRANT ALL ON TABLE public.gui_app_config TO postgres;
GRANT ALL ON TABLE public.gui_app_config TO service_role;