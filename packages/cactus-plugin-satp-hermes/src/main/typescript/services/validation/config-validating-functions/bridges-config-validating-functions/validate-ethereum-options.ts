import { Logger } from "@hyperledger-cacti/cactus-common";
import { IPluginLedgerConnectorEthereumOptions } from "@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum";

export interface EthereumOptionsJSON {
  instanceId: string;
  rpcApiHttpHost: string;
  rpcApiWsHost: string;
}

export function isEthereumOptionsJSON(
  obj: unknown,
  log: Logger,
): obj is EthereumOptionsJSON {
  if (typeof obj !== "object" || obj === null) {
    log.error("isEthereumOptionsJSON: obj is not an object or is null");
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    (!("rpcApiHttpHost" in obj) ||
      typeof objRecord.rpcApiHttpHost === "string") &&
    (!("rpcApiWsHost" in obj) || typeof objRecord.rpcApiWsHost === "string")
  );
}

// Function to create IPluginLedgerConnectorEthereumOptions from EthereumOptionsJSON
export function createEthereumOptions(
  options: EthereumOptionsJSON,
): Partial<IPluginLedgerConnectorEthereumOptions> {
  if (!options) {
    throw new TypeError(
      "Invalid options in EthereumConfig: " + JSON.stringify(options),
    );
  }

  const ethereumOptions: Partial<IPluginLedgerConnectorEthereumOptions> = {
    instanceId: options.instanceId,
    rpcApiHttpHost: options.rpcApiHttpHost,
    rpcApiWsHost: options.rpcApiWsHost,
  };

  return ethereumOptions;
}
