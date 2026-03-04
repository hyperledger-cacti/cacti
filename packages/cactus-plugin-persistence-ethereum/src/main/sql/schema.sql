--- Clean start:
--- DROP SCHEMA ethereum CASCADE;

CREATE SCHEMA IF NOT EXISTS ethereum;

ALTER SCHEMA ethereum OWNER TO postgres;

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

-- Table: ethereum.block

-- DROP TABLE IF EXISTS ethereum.block;

CREATE TABLE IF NOT EXISTS ethereum.block
(
    "number" numeric NOT NULL,
    created_at timestamptz NOT NULL,
    hash text COLLATE pg_catalog."default" NOT NULL,
    number_of_tx numeric NOT NULL,
    sync_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT block_pkey PRIMARY KEY ("number"),
    CONSTRAINT block_hash_key UNIQUE (hash),
    CONSTRAINT block_number_key UNIQUE ("number")
);

ALTER TABLE IF EXISTS ethereum.block
    OWNER to postgres;

ALTER TABLE ethereum.block
ENABLE ROW LEVEL SECURITY;

CREATE POLICY block_select ON ethereum.block
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY block_insert ON ethereum.block
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY block_update ON ethereum.block
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY block_delete ON ethereum.block
FOR DELETE TO anon, authenticated, service_role
USING (true);

-- Table: ethereum.token_metadata_erc20

-- DROP TABLE IF EXISTS ethereum."token_metadata_erc20";

CREATE TABLE IF NOT EXISTS ethereum."token_metadata_erc20"
(
    address text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text COLLATE pg_catalog."default" NOT NULL,
    symbol text COLLATE pg_catalog."default" NOT NULL,
    total_supply numeric NOT NULL,
    CONSTRAINT "token_erc20_pkey" PRIMARY KEY (address),
    CONSTRAINT token_erc20_address_key UNIQUE (address)
);

ALTER TABLE IF EXISTS ethereum."token_metadata_erc20"
    OWNER to postgres;

ALTER TABLE ethereum."token_metadata_erc20"
ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_metadata_erc20_select ON ethereum."token_metadata_erc20"
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY token_metadata_erc20_insert ON ethereum."token_metadata_erc20"
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY token_metadata_erc20_update ON ethereum."token_metadata_erc20"
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY token_metadata_erc20_delete ON ethereum."token_metadata_erc20"
FOR DELETE TO anon, authenticated, service_role
USING (true);

-- Table: ethereum.token_metadata_erc721

-- DROP TABLE IF EXISTS ethereum."token_metadata_erc721";

CREATE TABLE IF NOT EXISTS ethereum."token_metadata_erc721"
(
    address text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text COLLATE pg_catalog."default" NOT NULL,
    symbol text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT "token_erc721_pkey" PRIMARY KEY (address),
    CONSTRAINT token_erc721_address_key UNIQUE (address)
);

ALTER TABLE IF EXISTS ethereum."token_metadata_erc721"
    OWNER to postgres;

ALTER TABLE ethereum."token_metadata_erc721"
ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_metadata_erc721_select ON ethereum."token_metadata_erc721"
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY token_metadata_erc721_insert ON ethereum."token_metadata_erc721"
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY token_metadata_erc721_update ON ethereum."token_metadata_erc721"
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY token_metadata_erc721_delete ON ethereum."token_metadata_erc721"
FOR DELETE TO anon, authenticated, service_role
USING (true);

-- Table: ethereum.token_metadata_erc1155

-- DROP TABLE IF EXISTS ethereum.token_metadata_erc1155;

CREATE TABLE IF NOT EXISTS ethereum.token_metadata_erc1155
(
    address text COLLATE pg_catalog."default" NOT NULL,
    name text COLLATE pg_catalog."default",
    symbol text COLLATE pg_catalog."default",
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT token_metadata_erc1155_pkey PRIMARY KEY (address),
    CONSTRAINT token_metadata_erc1155_address_key UNIQUE (address)
);

ALTER TABLE IF EXISTS ethereum.token_metadata_erc1155
    OWNER to postgres;

ALTER TABLE ethereum.token_metadata_erc1155
ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_metadata_erc1155_select ON ethereum.token_metadata_erc1155
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY token_metadata_erc1155_insert ON ethereum.token_metadata_erc1155
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY token_metadata_erc1155_update ON ethereum.token_metadata_erc1155
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY token_metadata_erc1155_delete ON ethereum.token_metadata_erc1155
FOR DELETE TO anon, authenticated, service_role
USING (true);

-- Table: ethereum.token_erc1155

-- DROP TABLE IF EXISTS ethereum.token_erc1155;

CREATE TABLE IF NOT EXISTS ethereum.token_erc1155
(
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    account_address text COLLATE pg_catalog."default" NOT NULL,
    token_address text COLLATE pg_catalog."default" NOT NULL,
    token_id numeric NOT NULL,
    balance numeric NOT NULL DEFAULT 0,
    uri text COLLATE pg_catalog."default",
    last_balance_change timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT token_erc1155_pkey PRIMARY KEY (id),
    CONSTRAINT token_erc1155_contract_token_account_unique UNIQUE (token_address, token_id, account_address),
    CONSTRAINT token_erc1155_token_address_fkey FOREIGN KEY (token_address)
        REFERENCES ethereum.token_metadata_erc1155 (address) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

ALTER TABLE IF EXISTS ethereum.token_erc1155
    OWNER to postgres;

ALTER TABLE ethereum.token_erc1155
ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_erc1155_select ON ethereum.token_erc1155
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY token_erc1155_insert ON ethereum.token_erc1155
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY token_erc1155_update ON ethereum.token_erc1155
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY token_erc1155_delete ON ethereum.token_erc1155
FOR DELETE TO anon, authenticated, service_role
USING (true);

-- Table: ethereum.token_erc721

-- DROP TABLE IF EXISTS ethereum.token_erc721;

CREATE TABLE IF NOT EXISTS ethereum.token_erc721
(
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    account_address text COLLATE pg_catalog."default" NOT NULL,
    token_address text COLLATE pg_catalog."default" NOT NULL,
    uri text COLLATE pg_catalog."default" NOT NULL,
    token_id numeric NOT NULL,
    nft_name text COLLATE pg_catalog."default" NOT NULL,
    nft_description text COLLATE pg_catalog."default" NOT NULL,
    nft_image text COLLATE pg_catalog."default" NOT NULL,
    last_owner_change timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT token_erc721_pkey1 PRIMARY KEY (id),
    CONSTRAINT token_erc721_contract_tokens_unique UNIQUE (token_address, token_id),
    CONSTRAINT token_erc721_token_address_fkey FOREIGN KEY (token_address)
        REFERENCES ethereum.token_metadata_erc721 (address) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

ALTER TABLE IF EXISTS ethereum.token_erc721
    OWNER to postgres;

ALTER TABLE ethereum.token_erc721
ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_erc721_select ON ethereum.token_erc721
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY token_erc721_insert ON ethereum.token_erc721
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY token_erc721_update ON ethereum.token_erc721
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY token_erc721_delete ON ethereum.token_erc721
FOR DELETE TO anon, authenticated, service_role
USING (true);

-- Table: ethereum.transaction

-- DROP TABLE IF EXISTS ethereum.transaction;

CREATE TABLE IF NOT EXISTS ethereum.transaction
(
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
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
        REFERENCES ethereum.block ("number") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

ALTER TABLE IF EXISTS ethereum.transaction
    OWNER to postgres;

ALTER TABLE ethereum.transaction
ENABLE ROW LEVEL SECURITY;

CREATE POLICY transaction_select ON ethereum.transaction
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY transaction_insert ON ethereum.transaction
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY transaction_update ON ethereum.transaction
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY transaction_delete ON ethereum.transaction
FOR DELETE TO anon, authenticated, service_role
USING (true);

-- Table: ethereum.token_transfer

-- DROP TABLE IF EXISTS ethereum.token_transfer;

CREATE TABLE IF NOT EXISTS ethereum.token_transfer
(
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    transaction_id uuid NOT NULL,
    sender text COLLATE pg_catalog."default" NOT NULL,
    recipient text COLLATE pg_catalog."default" NOT NULL,
    value numeric NOT NULL,
    CONSTRAINT token_transfer_pkey PRIMARY KEY (id),
    CONSTRAINT token_transfer_transaction_id_fkey FOREIGN KEY (transaction_id)
        REFERENCES ethereum.transaction (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

ALTER TABLE IF EXISTS ethereum.token_transfer
    OWNER to postgres;

ALTER TABLE ethereum.token_transfer
ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_transfer_select ON ethereum.token_transfer
FOR SELECT TO anon, authenticated, service_role
USING (true);

CREATE POLICY token_transfer_insert ON ethereum.token_transfer
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY token_transfer_update ON ethereum.token_transfer
FOR UPDATE TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY token_transfer_delete ON ethereum.token_transfer
FOR DELETE TO anon, authenticated, service_role
USING (true);

-- Adding token_id column to token_transfer for ERC-1155 support
ALTER TABLE ethereum.token_transfer
ADD COLUMN IF NOT EXISTS token_id numeric;

COMMENT ON COLUMN ethereum.token_transfer.value
    IS 'ERC20 - token quantity, ERC721 - not used (see token_id), ERC1155 - token quantity';

COMMENT ON COLUMN ethereum.token_transfer.token_id
    IS 'ERC721 - token ID, ERC1155 - token ID, ERC20 - not used';

----------------------------------------------------------------------------------------------------
-- VIEWS
----------------------------------------------------------------------------------------------------

-- View: ethereum.erc20_token_history_view

-- DROP VIEW ethereum.erc20_token_history_view;

CREATE OR REPLACE VIEW ethereum.erc20_token_history_view
WITH (security_invoker = on)
 AS
 SELECT
    tx.hash AS transaction_hash,
    tx."to" AS token_address,
    b.created_at,
    tt.sender,
    tt.recipient,
    tt.value
   FROM ethereum.transaction tx
     JOIN ethereum.block b ON tx.block_number = b.number
     JOIN ethereum.token_transfer tt ON tx.id = tt.transaction_id
     JOIN ethereum.token_metadata_erc20 tkn ON tx.to = tkn.address
  ORDER BY b.created_at, tt.recipient;

ALTER TABLE ethereum.erc20_token_history_view
    OWNER TO postgres;

-- View: ethereum.erc721_token_history_view

-- DROP VIEW ethereum.erc721_token_history_view;

CREATE OR REPLACE VIEW ethereum.erc721_token_history_view
WITH (security_invoker = on)
 AS
 SELECT tx.hash AS transaction_hash,
    tx."to" AS token_address,
    b.created_at,
    tt.sender,
    tt.recipient,
    tt.value AS token_id
   FROM ethereum.transaction tx
     JOIN ethereum.block b ON tx.block_number = b.number
     JOIN ethereum.token_transfer tt ON tx.id = tt.transaction_id
     JOIN ethereum.token_metadata_erc721 tkn ON tx."to" = tkn.address
  ORDER BY b.created_at, tt.recipient;

ALTER TABLE ethereum.erc721_token_history_view
    OWNER TO postgres;

-- View: ethereum.erc1155_token_history_view

-- DROP VIEW IF EXISTS ethereum.erc1155_token_history_view;

CREATE OR REPLACE VIEW ethereum.erc1155_token_history_view
WITH (security_invoker = on)
AS
SELECT 
    tx.hash AS transaction_hash,
    tx."to" AS token_address,
    b.created_at,
    tt.sender,
    tt.recipient,
    tt.token_id,
    tt.value AS quantity
FROM ethereum.transaction tx
JOIN ethereum.block b ON tx.block_number = b.number
JOIN ethereum.token_transfer tt ON tx.id = tt.transaction_id
JOIN ethereum.token_metadata_erc1155 tkn ON tx."to" = tkn.address
WHERE tt.token_id IS NOT NULL -- Ensure token_id is present (ERC-1155 or ERC-721)
ORDER BY b.created_at, tt.recipient;

ALTER TABLE ethereum.erc1155_token_history_view
    OWNER TO postgres;

-- View: ethereum.token_erc20

-- DROP MATERIALIZED VIEW IF EXISTS ethereum.token_erc20;

CREATE MATERIALIZED VIEW IF NOT EXISTS ethereum.token_erc20
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
           FROM ethereum.erc20_token_history_view
          GROUP BY erc20_token_history_view.token_address, erc20_token_history_view.recipient
        UNION
         SELECT erc20_token_history_view.sender AS account_address,
            erc20_token_history_view.token_address,
            - sum(erc20_token_history_view.value) AS balance
           FROM ethereum.erc20_token_history_view
          GROUP BY erc20_token_history_view.token_address, erc20_token_history_view.sender) balances
  GROUP BY balances.token_address, balances.account_address
 HAVING sum(balances.balance) >= 0::numeric) AS balances
 JOIN ethereum.token_metadata_erc20 AS metadata ON balances.token_address = metadata.address
WITH DATA;

ALTER TABLE IF EXISTS ethereum.token_erc20
    OWNER TO postgres;

CREATE INDEX token_erc20_account_address_idx ON ethereum.token_erc20(account_address);

CREATE UNIQUE INDEX token_erc20_uniq_idx
    ON ethereum.token_erc20 USING btree
    (account_address COLLATE pg_catalog."default", token_address COLLATE pg_catalog."default")
    TABLESPACE pg_default;

----------------------------------------------------------------------------------------------------
-- FUNCTIONS AND PROCEDURES
----------------------------------------------------------------------------------------------------

-- Refresh ethereum.token_erc20 on new token transfers
CREATE OR REPLACE FUNCTION refresh_token_erc20()
RETURNS TRIGGER
SET search_path = ethereum
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW ethereum.token_erc20;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_token_erc20_on_token_transfers_trigger
AFTER INSERT OR UPDATE OR DELETE ON ethereum.token_transfer
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_token_erc20();

-- PROCEDURE: ethereum.update_issued_erc721_tokens(numeric)

-- DROP PROCEDURE IF EXISTS ethereum.update_issued_erc721_tokens(numeric);

CREATE OR REPLACE PROCEDURE ethereum.update_issued_erc721_tokens(IN from_block_number numeric)
LANGUAGE 'plpgsql'
SET search_path = ethereum, public
AS $BODY$
DECLARE
  current_token_entry ethereum.token_erc721%ROWTYPE;
  token_transfer record;
  block_created_at timestamp;
BEGIN
  SELECT created_at
  FROM ethereum.block
  WHERE number = from_block_number
  INTO block_created_at;

   IF NOT found THEN
    raise exception 'invalid block provided: %', from_block_number
      USING hint = 'ensure that given block was synchronized correctly';
   END IF;

  FOR token_transfer IN SELECT
    DISTINCT ON (token_address, token_id) *
      FROM ethereum.erc721_token_history_view
      WHERE created_at >= block_created_at
      ORDER BY token_address, token_id, created_at DESC
  LOOP
    SELECT * FROM ethereum.token_erc721
    WHERE token_id = token_transfer.token_id AND token_address = token_transfer.token_address
    INTO current_token_entry;

    IF NOT found THEN
      raise notice 'create entry for new token ID % on contract %', token_transfer.token_id, token_transfer.token_address;
      INSERT INTO
        ethereum.token_erc721
      VALUES
        (
        uuid_generate_v4(),
        token_transfer.recipient,
        token_transfer.token_address,
        '',
        token_transfer.token_id,
        '',
        '',
        '',
        token_transfer.created_at
        );
    ELSE
      IF current_token_entry.last_owner_change < token_transfer.created_at THEN
        raise notice 'update owner on token ID % on contract %', token_transfer.token_id, token_transfer.token_address;

        UPDATE ethereum.token_erc721
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

ALTER PROCEDURE ethereum.update_issued_erc721_tokens(numeric)
    OWNER TO postgres;

GRANT EXECUTE ON PROCEDURE ethereum.update_issued_erc721_tokens(numeric) TO public;

-- PROCEDURE: ethereum.update_issued_erc1155_tokens(numeric)

-- DROP PROCEDURE IF EXISTS ethereum.update_issued_erc1155_tokens(numeric);

CREATE OR REPLACE PROCEDURE ethereum.update_issued_erc1155_tokens(IN from_block_number numeric)
LANGUAGE 'plpgsql'
SET search_path = ethereum, public
AS $BODY$
DECLARE
  current_token_entry ethereum.token_erc1155%ROWTYPE;
  token_transfer record;
  block_created_at timestamp;
BEGIN
  -- Get the block's creation time
  SELECT created_at
  FROM ethereum.block
  WHERE number = from_block_number
  INTO block_created_at;

  IF NOT found THEN
    raise exception 'invalid block provided: %', from_block_number
      USING hint = 'ensure that given block was synchronized correctly';
  END IF;

  -- Process each transfer (distinct by token_address, token_id, recipient to handle batch transfers)
  FOR token_transfer IN SELECT
    *
    FROM ethereum.erc1155_token_history_view
    WHERE created_at >= block_created_at
    ORDER BY token_address, token_id, sender, recipient, created_at DESC
  LOOP
    -- Process sender (decrease balance)
    IF token_transfer.sender != '0x0000000000000000000000000000000000000000' THEN -- Not a mint
      SELECT * FROM ethereum.token_erc1155
      WHERE token_id = token_transfer.token_id 
        AND token_address = token_transfer.token_address 
        AND account_address = token_transfer.sender
      INTO current_token_entry;

      IF found THEN
        -- Decrease sender's balance
        UPDATE ethereum.token_erc1155
        SET balance = GREATEST(0, balance - token_transfer.quantity),
            last_balance_change = token_transfer.created_at
        WHERE id = current_token_entry.id;

        -- Remove entry if balance reaches 0
        DELETE FROM ethereum.token_erc1155
        WHERE id = current_token_entry.id AND balance = 0;
      END IF;
    END IF;

    -- Process recipient (increase balance)
    IF token_transfer.recipient != '0x0000000000000000000000000000000000000000' THEN -- Not a burn
      SELECT * FROM ethereum.token_erc1155
      WHERE token_id = token_transfer.token_id 
        AND token_address = token_transfer.token_address 
        AND account_address = token_transfer.recipient
      INTO current_token_entry;

      IF NOT found THEN
        -- Create new entry for recipient
        raise notice 'create entry for token ID % on contract % for account %', 
          token_transfer.token_id, token_transfer.token_address, token_transfer.recipient;
        INSERT INTO ethereum.token_erc1155
        VALUES (
          uuid_generate_v4(),
          token_transfer.recipient,
          token_transfer.token_address,
          token_transfer.token_id,
          token_transfer.quantity,
          NULL, -- uri (can be fetched later)
          token_transfer.created_at
        );
      ELSE
        -- Increase recipient's balance
        IF current_token_entry.last_balance_change < token_transfer.created_at THEN
          raise notice 'update balance for token ID % on contract % for account %', 
            token_transfer.token_id, token_transfer.token_address, token_transfer.recipient;
          UPDATE ethereum.token_erc1155
          SET balance = balance + token_transfer.quantity,
              last_balance_change = token_transfer.created_at
          WHERE id = current_token_entry.id;
        ELSE
          raise notice 'current entry is more recent - ignore token ID % on contract % for account %', 
            token_transfer.token_id, token_transfer.token_address, token_transfer.recipient;
        END IF;
      END IF;
    END IF;
  END LOOP;
END
$BODY$;

ALTER PROCEDURE ethereum.update_issued_erc1155_tokens(numeric)
    OWNER TO postgres;

GRANT EXECUTE ON PROCEDURE ethereum.update_issued_erc1155_tokens(numeric) TO public;

-- FUNCTION: ethereum.get_missing_blocks_in_range(integer, integer)

-- DROP FUNCTION IF EXISTS ethereum.get_missing_blocks_in_range(integer, integer);

CREATE OR REPLACE FUNCTION ethereum.get_missing_blocks_in_range(
  start_number integer,
  end_number integer)
RETURNS TABLE(block_number integer)
LANGUAGE 'plpgsql'
SET search_path = ethereum
COST 100
VOLATILE PARALLEL UNSAFE
ROWS 1000
AS $BODY$
BEGIN
  RETURN query
    SELECT series AS block_number
    FROM generate_series(start_number, end_number, 1) series
    LEFT JOIN ethereum.block ON series = block.number
    WHERE block.number IS NULL;
END;
$BODY$;

ALTER FUNCTION ethereum.get_missing_blocks_in_range(integer, integer)
    OWNER TO postgres;

GRANT EXECUTE ON PROCEDURE ethereum.update_issued_erc721_tokens(numeric) TO public;

GRANT USAGE ON SCHEMA ethereum TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA ethereum TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA ethereum TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA ethereum TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ethereum GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ethereum GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ethereum GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

REVOKE ALL ON ethereum.token_erc20 FROM anon, authenticated;
GRANT SELECT ON ethereum.token_erc20 TO service_role;