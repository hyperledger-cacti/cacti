import { IPluginFactoryOptions } from "@hyperledger-cacti/cactus-core-api";

import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export * from "./generated/openapi/typescript-axios";
export {
  CantonApiClient,
  CantonApiClientOptions,
} from "./api-client/canton-api-client";
export type {
  ICantonWalletSdk,
  ICantonWalletSdkFactory,
  ICantonWalletSdkFactoryCreateOptions,
} from "./canton-wallet-sdk";
export {
  DEFAULT_OPERATION_TIMEOUT_MS,
  IPluginLedgerConnectorCantonOptions,
  MAX_COMMANDS_PER_TRANSACTION,
  MAX_FILTER_VALUES,
  MAX_IDENTIFIER_LENGTH,
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
