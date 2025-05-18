ALTER SCHEMA extensions OWNER TO postgres;
ALTER SCHEMA public OWNER TO postgres;

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

GRANT ALL ON TABLE public.gui_app_config TO anon;
GRANT ALL ON TABLE public.gui_app_config TO authenticated;
GRANT ALL ON TABLE public.gui_app_config TO postgres;
GRANT ALL ON TABLE public.gui_app_config TO service_role;
