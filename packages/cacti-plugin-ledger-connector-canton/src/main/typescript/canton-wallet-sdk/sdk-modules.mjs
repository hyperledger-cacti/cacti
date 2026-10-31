// Node 20.20 supports require(ESM). Keep SDK imports static in this ESM bridge:
// core-ledger-client's CommonJS build incorrectly wraps openapi-fetch's default
// export, while its ESM build uses the callable export correctly.
import { SDK, CustomLogAdapter } from "@canton-network/wallet-sdk";
import { LedgerClient } from "@canton-network/core-ledger-client";
import { AuthTokenProvider } from "@canton-network/core-wallet-auth";

export { SDK, CustomLogAdapter, LedgerClient, AuthTokenProvider };
