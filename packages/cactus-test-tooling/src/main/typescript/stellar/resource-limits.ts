//
// Define the resource limits set to Soroban transactions
// when pulling up a local network. This defines how smart contract
// transactions are limited in terms of resources during execution.
//
// Transactions that exceed these limits will be rejected.
//
export enum ResourceLimits {
  TESTNET = "testnet", // (Default) sets the limits to match those used on testnet.
  DEFAULT = "default", // leaves resource limits set extremely low as per Stellar's core default configuration
  UNLIMITED = "unlimited", // set limits to maximum resources that can be configured
}
