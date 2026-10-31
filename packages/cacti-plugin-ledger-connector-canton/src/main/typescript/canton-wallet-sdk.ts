/** Compatibility entry point for the modular Wallet SDK adapter. */
export * from "./canton-wallet-sdk/types";
export * from "./canton-wallet-sdk/factory";
export * from "./canton-wallet-sdk/ledger-provider";
export {
  DEFAULT_OAUTH_REQUEST_TIMEOUT_MS,
  MAX_OAUTH_RESPONSE_BYTES,
} from "./canton-wallet-sdk/oauth";
