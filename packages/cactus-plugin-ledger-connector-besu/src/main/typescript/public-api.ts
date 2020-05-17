export { PluginLedgerConnectorBesu } from "./plugin-ledger-connector-besu";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export async function createPluginFactory(
  options?: any
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector();
}
