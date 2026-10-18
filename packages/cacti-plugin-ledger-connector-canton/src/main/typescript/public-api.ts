import { IPluginFactoryOptions } from "@hyperledger-cacti/cactus-core-api";

import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export * from "./generated/openapi/typescript-axios";
export {
  CantonApiClient,
  CantonApiClientOptions,
} from "./api-client/canton-api-client";
export type {
  CantonAuthConfig,
  ICantonActiveContractEntry,
  ICantonClientCredentials,
  ICantonCreatedEvent,
  ICantonWalletSdk,
  ICantonWalletSdkFactory,
  ICantonWalletSdkFactoryCreateOptions,
} from "./canton-wallet-sdk";
export {
  CANTON_LIST_LIMIT_ERROR_CODE,
  CantonLedgerError,
} from "./canton-ledger-error";
export {
  DEFAULT_ACTIVE_CONTRACT_LIMIT,
  DEFAULT_MAX_ACTIVE_CONTRACT_LIMIT,
  DEFAULT_MAX_IN_FLIGHT_OPERATIONS,
  DEFAULT_OPERATION_TIMEOUT_MS,
  IPluginLedgerConnectorCantonOptions,
  MAX_ACTIVE_CONTRACT_LIMIT,
  MAX_COMMANDS_PER_TRANSACTION,
  MAX_FILTER_VALUES,
  MAX_IDENTIFIER_LENGTH,
  MAX_IN_FLIGHT_OPERATIONS,
  MAX_OPERATION_TIMEOUT_MS,
  MAX_TRANSACTION_PAYLOAD_BYTES,
  MAX_TRANSACTION_PAYLOAD_DEPTH,
  PluginLedgerConnectorCanton,
} from "./plugin-ledger-connector-canton";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
