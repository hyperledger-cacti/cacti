export { mainFabricValidator } from "./ledger-plugin/fabric/validator/src/core/bin/www";
export * from "./ledger-plugin/fabric/validator/src/core/app";
export { TransactionManagement } from "./routing-interface/TransactionManagement";
export { RIFError } from "./routing-interface/RIFError";
export { ConfigUtil } from "./routing-interface/util/ConfigUtil";
export { BusinessLogicPlugin } from "./business-logic-plugin/BusinessLogicPlugin";
export { BusinessLogicBase } from "./business-logic-plugin/BusinessLogicBase";
export { VerifierBase } from "./ledger-plugin/VerifierBase";
export { LPInfoHolder } from "./routing-interface/util/LPInfoHolder";
export { ContractInfoHolder } from "./routing-interface/util/ContractInfoHolder";
export { LedgerEvent } from "./ledger-plugin/LedgerPlugin";
export { transactionManagement } from "./routing-interface/routes/index";
export { verifierFactory } from "./routing-interface/routes/index";
export { RequestInfo } from "./routing-interface/RequestInfo";
export { TradeInfo } from "./routing-interface/TradeInfo";
export { TransactionSigner } from "./ledger-plugin/util/TransactionSigner";

export {
  E_KEYCHAIN_NOT_FOUND,
  IPluginVerifierCcOptions as IPluginLedgerConnectorBesuOptions,
  PluginVerifierCc as PluginLedgerConnectorBesu,
} from "./plugin-ledger-verifier-cc";
export { PluginFactoryVerifier as PluginFactoryLedgerConnector } from "./plugin-factory-verifier";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryVerifier } from "./plugin-factory-verifier";

export {
  VerifierCcApiClient as BesuApiClient,
  VerifierCcApiClientOptions as BesuApiClientOptions,
} from "./api-client/verifier-cc-api-client";

export * from "./generated/openapi/typescript-axios/api";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryVerifier> {
  return new PluginFactoryVerifier(pluginFactoryOptions);
}
