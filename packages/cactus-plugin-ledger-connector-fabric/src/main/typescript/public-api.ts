export * from "./generated/openapi/typescript-axios/index";

export {
  FabricApiClient,
  FabricApiClientOptions,
} from "./api-client/fabric-api-client";

export {
  PluginLedgerConnectorFabric,
  IPluginLedgerConnectorFabricOptions,
  SignPayloadCallback,
  RunTxReqWithTxId,
} from "./plugin-ledger-connector-fabric";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}

export { IVaultConfig, IWebSocketConfig } from "./identity/identity-provider";
export { IIdentityData } from "./identity/internal/cert-datastore";

export { signProposal } from "./common/sign-utils";
