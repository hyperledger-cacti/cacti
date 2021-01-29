export * from "./generated/openapi/typescript-axios/index";

export { PluginLedgerConnectorFabric } from "./plugin-ledger-connector-fabric";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}

export {
  ChainCodeCompiler,
  IChainCodeCompilerOptions,
  ICompilationOptions,
  ICompilationResult,
} from "./chain-code-compiler";
