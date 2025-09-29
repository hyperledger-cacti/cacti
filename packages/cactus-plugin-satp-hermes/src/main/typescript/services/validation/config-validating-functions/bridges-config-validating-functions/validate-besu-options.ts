import { Logger } from "@hyperledger/cactus-common/";
import { IPluginLedgerConnectorBesuOptions } from "@hyperledger/cactus-plugin-ledger-connector-besu";

export interface BesuOptionsJSON {
  instanceId: string;
  rpcApiHttpHost: string;
  rpcApiWsHost: string;
}

// Type guard for BesuOptionsJSON
export function isBesuOptionsJSON(
  obj: unknown,
  log: Logger,
): obj is BesuOptionsJSON {
  if (typeof obj !== "object" || obj === null) {
    log.error("isBesuOptionsJSON: obj is not an object or is null");
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "rpcApiHttpHost" in obj &&
    typeof objRecord.rpcApiHttpHost === "string" &&
    "rpcApiWsHost" in obj &&
    typeof objRecord.rpcApiWsHost === "string"
  );
}

// Function to create IPluginLedgerConnectorBesuOptions from BesuOptionsJSON
export function createBesuOptions(
  options: BesuOptionsJSON,
): Partial<IPluginLedgerConnectorBesuOptions> {
  if (!options) {
    throw new TypeError(
      "Invalid options in BesuConfig: " + JSON.stringify(options),
    );
  }

  const besuOptions: Partial<IPluginLedgerConnectorBesuOptions> = {
    instanceId: options.instanceId,
    rpcApiHttpHost: options.rpcApiHttpHost,
    rpcApiWsHost: options.rpcApiWsHost,
  };

  return besuOptions;
}
