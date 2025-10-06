--- Clean start:
--- DROP SCHEMA fabric CASCADE;

CREATE SCHEMA IF NOT EXISTS fabric;

ALTER SCHEMA fabric OWNER TO postgres;

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

GRANT ALL ON TABLE public.plugin_status TO anon;
GRANT ALL ON TABLE public.plugin_status TO authenticated;
GRANT ALL ON TABLE public.plugin_status TO postgres;
GRANT ALL ON TABLE public.plugin_status TO service_role;

--
-- Name: block; Type: TABLE; Schema: fabric; Owner: postgres
--

CREATE TABLE fabric.block (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number numeric NOT NULL,
    hash text NOT NULL,
    transaction_count numeric DEFAULT '0'::numeric NOT NULL
);

ALTER TABLE fabric.block OWNER TO postgres;

ALTER TABLE fabric.block
ENABLE ROW LEVEL SECURITY;

CREATE POLICY block_select ON fabric.block
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY block_insert ON fabric.block
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY block_update ON fabric.block
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY block_delete ON fabric.block
FOR DELETE TO anon, authenticated, service_role
USING (true);

ALTER TABLE ONLY fabric.block
    ADD CONSTRAINT block_pkey PRIMARY KEY (id);
ALTER TABLE ONLY fabric.block
    ADD CONSTRAINT block_hash_key UNIQUE (hash);
ALTER TABLE ONLY fabric.block
    ADD CONSTRAINT block_number_key UNIQUE (number);

--
-- Name: certificate; Type: TABLE; Schema: fabric; Owner: postgres
--

CREATE TABLE fabric.certificate (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    serial_number text NOT NULL,
    subject_common_name text DEFAULT ''::text,
    subject_org_unit text DEFAULT ''::text,
    subject_org text DEFAULT ''::text,
    subject_locality text DEFAULT ''::text,
    subject_state text DEFAULT ''::text,
    subject_country text DEFAULT ''::text,
    issuer_common_name text DEFAULT ''::text,
    issuer_org_unit text DEFAULT ''::text,
    issuer_org text DEFAULT ''::text,
    issuer_locality text DEFAULT ''::text,
    issuer_state text DEFAULT ''::text,
    issuer_country text DEFAULT ''::text,
    subject_alt_name text NOT NULL,
    valid_from timestamp with time zone NOT NULL,
    valid_to timestamp with time zone NOT NULL,
    pem text NOT NULL
);


ALTER TABLE fabric.certificate OWNER TO postgres;

ALTER TABLE fabric.certificate
ENABLE ROW LEVEL SECURITY;

CREATE POLICY certificate_select ON fabric.certificate
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY certificate_insert ON fabric.certificate
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY certificate_update ON fabric.certificate
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY certificate_delete ON fabric.certificate
FOR DELETE TO anon, authenticated, service_role
USING (true);

ALTER TABLE ONLY fabric.certificate
    ADD CONSTRAINT certifiate_pk PRIMARY KEY (id);
ALTER TABLE ONLY fabric.certificate
    ADD CONSTRAINT certifiate_pem_unique UNIQUE (pem);
ALTER TABLE ONLY fabric.certificate
    ADD CONSTRAINT certifiate_serial_number_unique UNIQUE (serial_number);

--
-- Name: transaction; Type: TABLE; Schema: fabric; Owner: postgres
--

CREATE TABLE fabric.transaction (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hash text NOT NULL,
    channel_id text NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    protocol_version smallint DEFAULT '0'::smallint NOT NULL,
    type text NOT NULL,
    epoch bigint NOT NULL,
    block_id uuid,
    block_number numeric
);


ALTER TABLE fabric.transaction OWNER TO postgres;

ALTER TABLE fabric.transaction
ENABLE ROW LEVEL SECURITY;

CREATE POLICY transaction_select ON fabric.transaction
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY transaction_insert ON fabric.transaction
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY transaction_update ON fabric.transaction
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY transaction_delete ON fabric.transaction
FOR DELETE TO anon, authenticated, service_role
USING (true);

ALTER TABLE ONLY fabric.transaction
    ADD CONSTRAINT transaction_pkey PRIMARY KEY (id);

CREATE INDEX transaction_hash_idx ON fabric.transaction (hash);
--
-- Name: transaction_action; Type: TABLE; Schema: fabric; Owner: postgres
--

CREATE TABLE fabric.transaction_action (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    function_name text DEFAULT ''::text,
    function_args text DEFAULT ''::text,
    chaincode_id text NOT NULL,
    creator_msp_id text NOT NULL,
    creator_certificate_id uuid,
    transaction_id uuid
);


ALTER TABLE fabric.transaction_action OWNER TO postgres;

ALTER TABLE fabric.transaction_action
ENABLE ROW LEVEL SECURITY;

CREATE POLICY transaction_action_select ON fabric.transaction_action
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY transaction_action_insert ON fabric.transaction_action
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY transaction_action_update ON fabric.transaction_action
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY transaction_action_delete ON fabric.transaction_action
FOR DELETE TO anon, authenticated, service_role
USING (true);

ALTER TABLE ONLY fabric.transaction_action
    ADD CONSTRAINT transaction_action_pkey PRIMARY KEY (id);

--
-- Name: transaction_action_endorsement; Type: TABLE; Schema: fabric; Owner: postgres
--

CREATE TABLE fabric.transaction_action_endorsement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mspid text NOT NULL,
    signature text NOT NULL,
    certificate_id uuid NOT NULL,
    transaction_action_id uuid
);


ALTER TABLE fabric.transaction_action_endorsement OWNER TO postgres;

ALTER TABLE fabric.transaction_action_endorsement
ENABLE ROW LEVEL SECURITY;

CREATE POLICY transaction_action_endorsement_select ON fabric.transaction_action_endorsement
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY transaction_action_endorsement_insert ON fabric.transaction_action_endorsement
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY transaction_action_endorsement_update ON fabric.transaction_action_endorsement
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY transaction_action_endorsement_delete ON fabric.transaction_action_endorsement
FOR DELETE TO anon, authenticated, service_role
USING (true);

ALTER TABLE ONLY fabric.transaction_action_endorsement
    ADD CONSTRAINT transaction_action_endorsements_pkey PRIMARY KEY (id);

-- Table: fabric.discovery_msp

-- DROP TABLE IF EXISTS fabric.discovery_msp;

CREATE TABLE IF NOT EXISTS fabric.discovery_msp
(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mspid text COLLATE pg_catalog."default" NOT NULL,
    name text COLLATE pg_catalog."default" NOT NULL,
    organizational_unit_identifiers text COLLATE pg_catalog."default" NOT NULL,
    admins text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT discovery_msp_pkey PRIMARY KEY (id)
);

ALTER TABLE IF EXISTS fabric.discovery_msp
    OWNER to postgres;

GRANT ALL ON TABLE fabric.discovery_msp TO anon;
GRANT ALL ON TABLE fabric.discovery_msp TO authenticated;
GRANT ALL ON TABLE fabric.discovery_msp TO postgres;
GRANT ALL ON TABLE fabric.discovery_msp TO service_role;

-- Table: fabric.discovery_orderers

-- DROP TABLE IF EXISTS fabric.discovery_orderers;

CREATE TABLE IF NOT EXISTS fabric.discovery_orderers
(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text COLLATE pg_catalog."default" NOT NULL,
    host text COLLATE pg_catalog."default" NOT NULL,
    port integer NOT NULL,
    discovery_msp_id uuid NOT NULL,
    CONSTRAINT discovery_orderers_pkey PRIMARY KEY (id),
    CONSTRAINT discovery_orderers_discovery_msp_id_fkey FOREIGN KEY (discovery_msp_id) REFERENCES fabric.discovery_msp(id)
);

ALTER TABLE IF EXISTS fabric.discovery_orderers
    OWNER to postgres;

GRANT ALL ON TABLE fabric.discovery_orderers TO anon;
GRANT ALL ON TABLE fabric.discovery_orderers TO authenticated;
GRANT ALL ON TABLE fabric.discovery_orderers TO postgres;
GRANT ALL ON TABLE fabric.discovery_orderers TO service_role;

-- Table: fabric.discovery_peers

-- DROP TABLE IF EXISTS fabric.discovery_peers;

CREATE TABLE IF NOT EXISTS fabric.discovery_peers
(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text COLLATE pg_catalog."default" NOT NULL,
    endpoint text COLLATE pg_catalog."default" NOT NULL,
    ledger_height BIGINT NOT NULL,
    chaincodes text COLLATE pg_catalog."default" NOT NULL,
    discovery_msp_id uuid NOT NULL,
    CONSTRAINT discovery_peers_pkey PRIMARY KEY (id),
    CONSTRAINT discovery_peers_discovery_msp_id_fkey FOREIGN KEY (discovery_msp_id) REFERENCES fabric.discovery_msp(id)
);

ALTER TABLE IF EXISTS fabric.discovery_peers
    OWNER to postgres;

GRANT ALL ON TABLE fabric.discovery_peers TO anon;
GRANT ALL ON TABLE fabric.discovery_peers TO authenticated;
GRANT ALL ON TABLE fabric.discovery_peers TO postgres;
GRANT ALL ON TABLE fabric.discovery_peers TO service_role;

-- FUNCTION: fabric.get_missing_blocks_in_range(integer, integer)

-- DROP FUNCTION IF EXISTS fabric.get_missing_blocks_in_range(integer, integer);

CREATE OR REPLACE FUNCTION fabric.get_missing_blocks_in_range(
  start_number integer,
  end_number integer)
RETURNS TABLE(block_number integer)
LANGUAGE 'plpgsql'
SET search_path = fabric
COST 100
VOLATILE PARALLEL UNSAFE
ROWS 1000
AS $BODY$
BEGIN
  RETURN query
    SELECT series AS block_number
    FROM generate_series(start_number, end_number, 1) series
    LEFT JOIN fabric.block ON series = block.number
    WHERE block.number IS NULL;
END;
$BODY$;

ALTER FUNCTION fabric.get_missing_blocks_in_range(integer, integer)
    OWNER TO postgres;

--
-- Name: transaction_action transaction_action_creator_certificate_id_fkey; Type: FK CONSTRAINT; Schema: fabric; Owner: postgres
--

ALTER TABLE ONLY fabric.transaction_action
    ADD CONSTRAINT transaction_action_creator_certificate_id_fkey FOREIGN KEY (creator_certificate_id) REFERENCES fabric.certificate(id);


--
-- Name: transaction_action_endorsement transaction_action_endorsement_transaction_action_id_fkey; Type: FK CONSTRAINT; Schema: fabric; Owner: postgres
--

ALTER TABLE ONLY fabric.transaction_action_endorsement
    ADD CONSTRAINT transaction_action_endorsement_transaction_action_id_fkey FOREIGN KEY (transaction_action_id) REFERENCES fabric.transaction_action(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: transaction_action_endorsement transaction_action_endorsements_certificate_id_fkey; Type: FK CONSTRAINT; Schema: fabric; Owner: postgres
--

ALTER TABLE ONLY fabric.transaction_action_endorsement
    ADD CONSTRAINT transaction_action_endorsements_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES fabric.certificate(id);


--
-- Name: transaction_action transaction_action_transaction_id_fkey; Type: FK CONSTRAINT; Schema: fabric; Owner: postgres
--

ALTER TABLE ONLY fabric.transaction_action
    ADD CONSTRAINT transaction_action_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES fabric.transaction(id);


--
-- Name: transaction transaction_block_id_fkey; Type: FK CONSTRAINT; Schema: fabric; Owner: postgres
--

ALTER TABLE ONLY fabric.transaction
    ADD CONSTRAINT transaction_block_id_fkey FOREIGN KEY (block_id) REFERENCES fabric.block(id);


--
-- Name: transaction transaction_block_number_fkey; Type: FK CONSTRAINT; Schema: fabric; Owner: postgres
--

ALTER TABLE ONLY fabric.transaction
    ADD CONSTRAINT transaction_block_number_fkey FOREIGN KEY (block_number) REFERENCES fabric.block(number);

GRANT USAGE ON SCHEMA fabric TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA fabric TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA fabric TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA fabric TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fabric GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fabric GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fabric GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;