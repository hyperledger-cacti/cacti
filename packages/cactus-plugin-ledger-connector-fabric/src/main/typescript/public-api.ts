export * from "./generated/openapi/typescript-axios/index.js";

export {
  FabricApiClient,
  FabricApiClientOptions,
} from "./api-client/fabric-api-client.js";

export {
  PluginLedgerConnectorFabric,
  IPluginLedgerConnectorFabricOptions,
  SignPayloadCallback,
} from "./plugin-ledger-connector-fabric.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}

export {
  IVaultConfig,
  IWebSocketConfig,
} from "./identity/identity-provider.js";
export { IIdentityData } from "./identity/internal/cert-datastore.js";

export { signProposal } from "./common/sign-utils.js";
