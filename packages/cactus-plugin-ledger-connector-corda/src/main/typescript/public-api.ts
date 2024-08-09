export {
  PluginLedgerConnectorCorda,
  IPluginLedgerConnectorCordaOptions,
  CordaVersion,
} from "./plugin-ledger-connector-corda";

export * from "./generated/openapi/typescript-axios/index";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export {
  DeployContractJarsEndpoint,
  IDeployContractEndpointOptions,
} from "./web-services/deploy-contract-jars-endpoint";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}

export {
  CordaApiClient,
  CordaApiClientOptions,
  watchBlocksV1Options,
} from "./api-client/corda-api-client";

export { createJvmBoolean } from "./jvm/serde/factory/create-jvm-boolean";

export {
  ICreateJvmCactiPublicImplKeyOptions,
  createJvmCactiPublicKeyImpl,
} from "./jvm/serde/factory/create-jvm-cacti-public-key-impl";

export {
  ICreateJvmCordaIdentityPartyOptions,
  createJvmCordaIdentityParty,
} from "./jvm/serde/factory/create-jvm-corda-identity-party";

export {
  ICreateJvmCordaX500NameOptions,
  createJvmCordaX500Name,
} from "./jvm/serde/factory/create-jvm-corda-x500-name";

export { createJvmInt } from "./jvm/serde/factory/create-jvm-int";
export { createJvmLong } from "./jvm/serde/factory/create-jvm-long";
export { createJvmCurrency } from "./jvm/serde/factory/create-jvm-currency";

export {
  ICreateJvmCordaAmountOptions,
  createJvmCordaAmount,
} from "./jvm/serde/factory/create-jvm-corda-amount";

export {
  ICreateJvmCordaUniqueIdentifierOptions,
  createJvmCordaUniqueIdentifier,
} from "./jvm/serde/factory/create-jvm-corda-unique-identifier";
