--
-- PostgreSQL database dump
--

-- Dumped from database version 10.4
-- Dumped by pg_dump version 10.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: fabricexplorer; Type: DATABASE; Schema: -; Owner: hppoc
--




--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--




SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: blocks; Type: TABLE; Schema: public; Owner: hppoc
--



CREATE TABLE IF NOT EXISTS public.fabric_blocks_entry
(
  id text DEFAULT NULL,
  block_num integer DEFAULT NULL,
  block_data text DEFAULT NULL,
    CONSTRAINT fabric_block_pkey PRIMARY KEY (id),
    CONSTRAINT fabric_block_name_key UNIQUE (id)
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.fabric_blocks_entry OWNER to postgres;

GRANT ALL ON TABLE public.fabric_blocks_entry  TO anon;

GRANT ALL ON TABLE public.fabric_blocks_entry  TO authenticated;

GRANT ALL ON TABLE public.fabric_blocks_entry  TO postgres;

GRANT ALL ON TABLE public.fabric_blocks_entry  TO service_role;



CREATE TABLE IF NOT EXISTS public.fabric_transactions_entry 
( 
   id text DEFAULT NULL,
  block_id text DEFAULT NULL,
  transaction_data text DEFAULT NULL,
    CONSTRAINT fabric_transaction_pkey PRIMARY KEY (id),
    CONSTRAINT fabric_transaction_name_key UNIQUE (id)
);


ALTER TABLE IF EXISTS public.fabric_blocks_entry OWNER to postgres;

GRANT ALL ON TABLE public.fabric_blocks_entry  TO anon;

GRANT ALL ON TABLE public.fabric_blocks_entry  TO authenticated;

GRANT ALL ON TABLE public.fabric_blocks_entry  TO postgres;

GRANT ALL ON TABLE public.fabric_blocks_entry  TO service_role;



CREATE TABLE IF NOT EXISTS public.fabric_blocks
(
    id text NOT NULL,
    block_number text,
    data_hash text DEFAULT NULL::character varying,
    tx_count integer,
    created_at timestamp without time zone,
    prev_blockhash text DEFAULT NULL::character varying,
    channel_id text DEFAULT NULL::character varying,
    CONSTRAINT blocks_details_pkey PRIMARY KEY (id),
    CONSTRAINT blocks_details_name_key UNIQUE (id)
);


ALTER TABLE IF EXISTS public.fabric_blocks OWNER to postgres;

GRANT ALL ON TABLE public.fabric_blocks  TO anon;

GRANT ALL ON TABLE public.fabric_blocks  TO authenticated;

GRANT ALL ON TABLE public.fabric_blocks TO postgres;

GRANT ALL ON TABLE public.fabric_blocks  TO service_role;

CREATE TABLE IF NOT EXISTS public.fabric_transactions 
(
    id BIGSERIAL,
    block_number text,
    block_id text,
    transaction_id text DEFAULT NULL::character varying,
    created_at timestamp without time zone,
    chaincode_name character varying(255) DEFAULT NULL::character varying,
    status integer,
    creator_msp_id text DEFAULT NULL::character varying,
    endorser_msp_id character varying(800) DEFAULT NULL::character varying,
    chaincode_id text DEFAULT NULL::character varying,
    type text DEFAULT NULL::character varying,
    read_set text DEFAULT NULL,
    write_set text DEFAULT NULL,
    channel_id text DEFAULT NULL::character varying,
    payload_extension character varying,
    creator_id_bytes character varying,
    creator_nonce character varying,
    chaincode_proposal_input character varying,
    tx_response character varying,
    payload_proposal_hash character varying,
    endorser_id_bytes character varying,
    endorser_signature character varying,
    CONSTRAINT transaction_details_pkey PRIMARY KEY (transaction_id),
    CONSTRAINT transaction_details_name_key UNIQUE (transaction_id)
);


ALTER TABLE IF EXISTS public.fabric_transactions OWNER to postgres;

GRANT ALL ON TABLE public.fabric_transactions  TO anon;

GRANT ALL ON TABLE public.fabric_transactions TO authenticated;

GRANT ALL ON TABLE public.fabric_transactions TO postgres;

GRANT ALL ON TABLE public.fabric_transactions  TO service_role;




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
);

ALTER TABLE IF EXISTS public.plugin_status OWNER to postgres;

GRANT ALL ON TABLE public.plugin_status TO anon;

GRANT ALL ON TABLE public.plugin_status TO authenticated;

GRANT ALL ON TABLE public.plugin_status TO postgres;

GRANT ALL ON TABLE public.plugin_status TO service_role;
