export * from "./generated/openapi/typescript-axios/index";

export {
  PluginLedgerConnectorFabric,
  IPluginLedgerConnectorFabricOptions,
} from "./plugin-ledger-connector-fabric";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}

export { IVaultConfig, IWebSocketConfig } from "./identity/identity-provider";
export { IIdentityData } from "./identity/internal/cert-datastore";
