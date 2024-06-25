-- Version: 0.3

----------------------------------------------------------------------------------------------------
-- TABLES
----------------------------------------------------------------------------------------------------

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

-- Table: public.block

-- DROP TABLE IF EXISTS public.block;

CREATE TABLE IF NOT EXISTS public.block
(
    "number" numeric NOT NULL,
    created_at timestamp without time zone NOT NULL,
    hash text COLLATE pg_catalog."default" NOT NULL,
    number_of_tx numeric NOT NULL,
    sync_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT block_pkey PRIMARY KEY ("number"),
    CONSTRAINT block_hash_key UNIQUE (hash),
    CONSTRAINT block_number_key UNIQUE ("number")
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.block
    OWNER to postgres;

GRANT ALL ON TABLE public.block TO anon;

GRANT ALL ON TABLE public.block TO authenticated;

GRANT ALL ON TABLE public.block TO postgres;

GRANT ALL ON TABLE public.block TO service_role;

-- Table: public.token_metadata_erc20

-- DROP TABLE IF EXISTS public."token_metadata_erc20";

CREATE TABLE IF NOT EXISTS public."token_metadata_erc20"
(
    address text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text COLLATE pg_catalog."default" NOT NULL,
    symbol text COLLATE pg_catalog."default" NOT NULL,
    total_supply numeric NOT NULL,
    CONSTRAINT "token_erc20_pkey" PRIMARY KEY (address),
    CONSTRAINT token_erc20_address_key UNIQUE (address)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."token_metadata_erc20"
    OWNER to postgres;

GRANT ALL ON TABLE public."token_metadata_erc20" TO anon;

GRANT ALL ON TABLE public."token_metadata_erc20" TO authenticated;

GRANT ALL ON TABLE public."token_metadata_erc20" TO postgres;

GRANT ALL ON TABLE public."token_metadata_erc20" TO service_role;

-- Table: public.token_metadata_erc721

-- DROP TABLE IF EXISTS public."token_metadata_erc721";

CREATE TABLE IF NOT EXISTS public."token_metadata_erc721"
(
    address text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text COLLATE pg_catalog."default" NOT NULL,
    symbol text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT "token_erc721_pkey" PRIMARY KEY (address),
    CONSTRAINT token_erc721_address_key UNIQUE (address)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."token_metadata_erc721"
    OWNER to postgres;

GRANT ALL ON TABLE public."token_metadata_erc721" TO anon;

GRANT ALL ON TABLE public."token_metadata_erc721" TO authenticated;

GRANT ALL ON TABLE public."token_metadata_erc721" TO postgres;

GRANT ALL ON TABLE public."token_metadata_erc721" TO service_role;

-- Table: public.token_erc721

-- DROP TABLE IF EXISTS public.token_erc721;

CREATE TABLE IF NOT EXISTS public.token_erc721
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    account_address text COLLATE pg_catalog."default" NOT NULL,
    token_address text COLLATE pg_catalog."default" NOT NULL,
    uri text COLLATE pg_catalog."default" NOT NULL,
    token_id numeric NOT NULL,
    last_owner_change timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT token_erc721_pkey1 PRIMARY KEY (id),
    CONSTRAINT token_erc721_contract_tokens_unique UNIQUE (token_address, token_id),
    CONSTRAINT token_erc721_token_address_fkey FOREIGN KEY (token_address)
        REFERENCES public.token_metadata_erc721 (address) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.token_erc721
    OWNER to postgres;

GRANT ALL ON TABLE public.token_erc721 TO anon;

GRANT ALL ON TABLE public.token_erc721 TO authenticated;

GRANT ALL ON TABLE public.token_erc721 TO postgres;

GRANT ALL ON TABLE public.token_erc721 TO service_role;

-- Table: public.transaction

-- DROP TABLE IF EXISTS public.transaction;

CREATE TABLE IF NOT EXISTS public.transaction
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    index numeric NOT NULL,
    hash text COLLATE pg_catalog."default" NOT NULL,
    block_number numeric NOT NULL,
    "from" text COLLATE pg_catalog."default" NOT NULL,
    "to" text COLLATE pg_catalog."default" NOT NULL,
    eth_value numeric NOT NULL,
    method_signature text COLLATE pg_catalog."default" NOT NULL,
    method_name text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT transaction_pkey PRIMARY KEY (id),
    CONSTRAINT transaction_hash_key UNIQUE (hash),
    CONSTRAINT transaction_block_number_fkey FOREIGN KEY (block_number)
        REFERENCES public.block ("number") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.transaction
    OWNER to postgres;

GRANT ALL ON TABLE public.transaction TO anon;

GRANT ALL ON TABLE public.transaction TO authenticated;

GRANT ALL ON TABLE public.transaction TO postgres;

GRANT ALL ON TABLE public.transaction TO service_role;

-- Table: public.token_transfer

-- DROP TABLE IF EXISTS public.token_transfer;

CREATE TABLE IF NOT EXISTS public.token_transfer
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    transaction_id uuid NOT NULL,
    sender text COLLATE pg_catalog."default" NOT NULL,
    recipient text COLLATE pg_catalog."default" NOT NULL,
    value numeric NOT NULL,
    CONSTRAINT token_transfer_pkey PRIMARY KEY (id),
    CONSTRAINT token_transfer_transaction_id_fkey FOREIGN KEY (transaction_id)
        REFERENCES public.transaction (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.token_transfer
    OWNER to postgres;

GRANT ALL ON TABLE public.token_transfer TO anon;

GRANT ALL ON TABLE public.token_transfer TO authenticated;

GRANT ALL ON TABLE public.token_transfer TO postgres;

GRANT ALL ON TABLE public.token_transfer TO service_role;

COMMENT ON COLUMN public.token_transfer.value
    IS 'ERC20 - token quantity, ERC721 - token ID';

----------------------------------------------------------------------------------------------------
-- VIEWS
----------------------------------------------------------------------------------------------------

-- View: public.erc20_token_history_view

-- DROP VIEW public.erc20_token_history_view;

CREATE OR REPLACE VIEW public.erc20_token_history_view
 AS
 SELECT
    tx.hash AS transaction_hash,
    tx."to" AS token_address,
    b.created_at,
    tt.sender,
    tt.recipient,
    tt.value
   FROM transaction tx
     JOIN block b ON tx.block_number = b.number
     JOIN token_transfer tt ON tx.id = tt.transaction_id
     JOIN token_metadata_erc20 tkn ON tx.to = tkn.address
  ORDER BY b.created_at, tt.recipient;

ALTER TABLE public.erc20_token_history_view
    OWNER TO postgres;

GRANT ALL ON TABLE public.erc20_token_history_view TO anon;
GRANT ALL ON TABLE public.erc20_token_history_view TO authenticated;
GRANT ALL ON TABLE public.erc20_token_history_view TO postgres;
GRANT ALL ON TABLE public.erc20_token_history_view TO service_role;
-- View: public.erc721_token_history_view

-- DROP VIEW public.erc721_token_history_view;

CREATE OR REPLACE VIEW public.erc721_token_history_view
 AS
 SELECT tx.hash AS transaction_hash,
    tx."to" AS token_address,
    b.created_at,
    tt.sender,
    tt.recipient,
    tt.value AS token_id
   FROM transaction tx
     JOIN block b ON tx.block_number = b.number
     JOIN token_transfer tt ON tx.id = tt.transaction_id
     JOIN token_metadata_erc721 tkn ON tx."to" = tkn.address
  ORDER BY b.created_at, tt.recipient;

ALTER TABLE public.erc721_token_history_view
    OWNER TO postgres;

GRANT ALL ON TABLE public.erc721_token_history_view TO anon;
GRANT ALL ON TABLE public.erc721_token_history_view TO authenticated;
GRANT ALL ON TABLE public.erc721_token_history_view TO postgres;
GRANT ALL ON TABLE public.erc721_token_history_view TO service_role;

-- View: public.erc721_txn_meta_view

-- DROP VIEW public.erc721_txn_meta_view;

CREATE OR REPLACE VIEW public.erc721_txn_meta_view
 AS
 SELECT token_erc721.account_address,
    token_erc721.token_address,
    token_erc721.uri,
    token_metadata_erc721.symbol
   FROM token_erc721
     LEFT JOIN token_metadata_erc721 ON token_erc721.token_address = token_metadata_erc721.address;

ALTER TABLE public.erc721_txn_meta_view
    OWNER TO postgres;

GRANT ALL ON TABLE public.erc721_txn_meta_view TO anon;
GRANT ALL ON TABLE public.erc721_txn_meta_view TO authenticated;
GRANT ALL ON TABLE public.erc721_txn_meta_view TO postgres;
GRANT ALL ON TABLE public.erc721_txn_meta_view TO service_role;

-- View: public.token_erc20

-- DROP MATERIALIZED VIEW IF EXISTS public.token_erc20;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.token_erc20
TABLESPACE pg_default
AS
SELECT
    balances.account_address,
    balances.balance,
    balances.token_address,
    metadata.name,
    metadata.symbol,
    metadata.total_supply
FROM
 (SELECT balances.account_address,
    balances.token_address,
    sum(balances.balance) AS balance
   FROM ( SELECT erc20_token_history_view.recipient AS account_address,
            erc20_token_history_view.token_address,
            sum(erc20_token_history_view.value) AS balance
           FROM erc20_token_history_view
          GROUP BY erc20_token_history_view.token_address, erc20_token_history_view.recipient
        UNION
         SELECT erc20_token_history_view.sender AS account_address,
            erc20_token_history_view.token_address,
            - sum(erc20_token_history_view.value) AS balance
           FROM erc20_token_history_view
          GROUP BY erc20_token_history_view.token_address, erc20_token_history_view.sender) balances
  GROUP BY balances.token_address, balances.account_address
 HAVING sum(balances.balance) >= 0::numeric) AS balances
 JOIN token_metadata_erc20 AS metadata ON balances.token_address = metadata.address
WITH DATA;

-- Refresh public.token_erc20 on new token transfers
CREATE OR REPLACE FUNCTION refresh_token_erc20()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.token_erc20;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_token_erc20_on_token_transfers_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.token_transfer
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_token_erc20();

CREATE INDEX token_erc20_account_address_idx ON public.token_erc20(account_address);

ALTER TABLE IF EXISTS public.token_erc20
    OWNER TO postgres;

GRANT ALL ON TABLE public.token_erc20 TO anon;
GRANT ALL ON TABLE public.token_erc20 TO authenticated;
GRANT ALL ON TABLE public.token_erc20 TO postgres;
GRANT ALL ON TABLE public.token_erc20 TO service_role;

CREATE UNIQUE INDEX token_erc20_uniq_idx
    ON public.token_erc20 USING btree
    (account_address COLLATE pg_catalog."default", token_address COLLATE pg_catalog."default")
    TABLESPACE pg_default;

----------------------------------------------------------------------------------------------------
-- FUNCTIONS AND PROCEDURES
----------------------------------------------------------------------------------------------------

-- PROCEDURE: public.update_issued_erc721_tokens(numeric)

-- DROP PROCEDURE IF EXISTS public.update_issued_erc721_tokens(numeric);

CREATE OR REPLACE PROCEDURE public.update_issued_erc721_tokens(IN from_block_number numeric)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
  current_token_entry token_erc721%ROWTYPE;
  token_transfer record;
  block_created_at timestamp;
BEGIN
  SELECT created_at
  FROM block
  WHERE number = from_block_number
  INTO block_created_at;

   IF NOT found THEN
    raise exception 'invalid block provided: %', from_block_number
      USING hint = 'ensure that given block was synchronized correctly';
   END IF;

  FOR token_transfer IN SELECT
    DISTINCT ON (token_address, token_id) *
      FROM erc721_token_history_view
      WHERE created_at >= block_created_at
      ORDER BY token_address, token_id, created_at DESC
  LOOP
    SELECT * FROM token_erc721
    WHERE token_id = token_transfer.token_id AND token_address = token_transfer.token_address
    INTO current_token_entry;

    IF NOT found THEN
      raise notice 'create entry for new token ID % on contract %', token_transfer.token_id, token_transfer.token_address;
      INSERT INTO
        token_erc721
      VALUES
        (
        uuid_generate_v4(),
        token_transfer.recipient,
        token_transfer.token_address,
        '',
        token_transfer.token_id,
        token_transfer.created_at
        );
    ELSE
      IF current_token_entry.last_owner_change < token_transfer.created_at THEN
        raise notice 'update owner on token ID % on contract %', token_transfer.token_id, token_transfer.token_address;

        UPDATE token_erc721
        SET account_address = token_transfer.recipient,
            last_owner_change = token_transfer.created_at
        WHERE id = current_token_entry.id;
      ELSE
      	raise notice 'current entry is more recent - ignore token ID % on contract %', token_transfer.token_id, token_transfer.token_address;
      END IF;
    END IF;
  END LOOP;
END
$BODY$;

ALTER PROCEDURE public.update_issued_erc721_tokens(numeric)
    OWNER TO postgres;

GRANT EXECUTE ON PROCEDURE public.update_issued_erc721_tokens(numeric) TO public;

GRANT EXECUTE ON PROCEDURE public.update_issued_erc721_tokens(numeric) TO anon;

GRANT EXECUTE ON PROCEDURE public.update_issued_erc721_tokens(numeric) TO authenticated;

GRANT EXECUTE ON PROCEDURE public.update_issued_erc721_tokens(numeric) TO postgres;

GRANT EXECUTE ON PROCEDURE public.update_issued_erc721_tokens(numeric) TO service_role;

GRANT EXECUTE ON PROCEDURE public.update_issued_erc721_tokens(numeric) TO supabase_admin;

-- FUNCTION: public.get_missing_blocks_in_range(integer, integer)

-- DROP FUNCTION IF EXISTS public.get_missing_blocks_in_range(integer, integer);

CREATE OR REPLACE FUNCTION public.get_missing_blocks_in_range(
  start_number integer,
  end_number integer)
RETURNS TABLE(block_number integer)
LANGUAGE 'plpgsql'
COST 100
VOLATILE PARALLEL UNSAFE
ROWS 1000
AS $BODY$
BEGIN
  RETURN query
    SELECT series AS block_number
    FROM generate_series(start_number, end_number, 1) series
    LEFT JOIN public.block ON series = block.number
    WHERE block.number IS NULL;
END;
$BODY$;

ALTER FUNCTION public.get_missing_blocks_in_range(integer, integer)
    OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_missing_blocks_in_range(integer, integer) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_missing_blocks_in_range(integer, integer) TO anon;

GRANT EXECUTE ON FUNCTION public.get_missing_blocks_in_range(integer, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_missing_blocks_in_range(integer, integer) TO postgres;

GRANT EXECUTE ON FUNCTION public.get_missing_blocks_in_range(integer, integer) TO service_role;
