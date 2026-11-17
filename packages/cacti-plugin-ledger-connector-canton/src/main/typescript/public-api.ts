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
  ICantonArchivedEvent,
  ICantonCreatedEvent,
  ICantonTransaction,
  ICantonUpdateEntry,
  ICantonUpdatesRequest,
  ICantonWalletSdk,
  ICantonWalletSdkFactory,
  ICantonWalletSdkFactoryCreateOptions,
} from "./canton-wallet-sdk";
export {
  CANTON_LIST_LIMIT_ERROR_CODE,
  CantonLedgerError,
} from "./canton-ledger-error";
export { InvalidDarError } from "./dar/invalid-dar-error";
export { ICantonDarInfo, readCantonDar } from "./dar/read-dar";
export {
  DEFAULT_ACTIVE_CONTRACT_LIMIT,
  DEFAULT_MAX_ACTIVE_CONTRACT_LIMIT,
  DEFAULT_MAX_DAR_BYTES,
  DEFAULT_MAX_IN_FLIGHT_OPERATIONS,
  DEFAULT_OPERATION_TIMEOUT_MS,
  DEFAULT_WATCH_BLOCKS_POLL_INTERVAL_MS,
  ICantonReadUpdatesRequest,
  ICantonReadUpdatesResponse,
  IPluginLedgerConnectorCantonOptions,
  MAX_ACTIVE_CONTRACT_LIMIT,
  MAX_COMMANDS_PER_TRANSACTION,
  MAX_DAR_BYTES,
  MAX_DAR_ENTRY_INFLATION_FACTOR,
  MAX_FILTER_VALUES,
  MAX_IDENTIFIER_LENGTH,
  MAX_IN_FLIGHT_OPERATIONS,
  MAX_OPERATION_TIMEOUT_MS,
  MAX_TRANSACTION_PAYLOAD_BYTES,
  MAX_TRANSACTION_PAYLOAD_DEPTH,
  MAX_WATCH_BLOCKS_POLL_INTERVAL_MS,
  PluginLedgerConnectorCanton,
} from "./plugin-ledger-connector-canton";
export {
  WATCH_BLOCKS_REQUIRED_SCOPES,
  WatchBlocksV1Endpoint,
} from "./web-services/watch-blocks-v1-endpoint";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
