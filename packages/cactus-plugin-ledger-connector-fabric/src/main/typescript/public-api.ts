export { PluginLedgerConnectorFabric } from "./plugin-ledger-connector-fabric";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export async function createPluginFactory(
  options?: any
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector();
}

export {
  ChainCodeCompiler,
  IChainCodeCompilerOptions,
  ICompilationOptions,
  ICompilationResult,
} from "./chain-code-compiler";
