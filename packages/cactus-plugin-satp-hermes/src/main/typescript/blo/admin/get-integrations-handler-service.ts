import { SATPError } from "../../core/errors/satp-errors";
import {
  Integration,
  IntegrationsResponse,
} from "../../generated/gateway-client/typescript-axios/api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPManager } from "../../gol/satp-manager";
import { NetworkId } from "../../network-identification/chainid-list";
import { LedgerType } from "@hyperledger/cactus-core-api";

export async function executeGetIntegrations(
  logLevel: LogLevelDesc,
  manager: SATPManager,
): Promise<IntegrationsResponse> {
  const fnTag = `executeGetIntegrations()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  logger.info(`${fnTag}, Obtaining integrations...`);

  try {
    const result = await getIntegrationsService(logLevel, manager);

    return {
      integrations: result,
    };
  } catch (error) {
    if (error instanceof SATPError) {
      logger.error(`${fnTag}, Error getting status: ${error.message}`);
      throw error;
    } else {
      logger.error(`${fnTag}, Unexpected error: ${error.message}`);
      throw new Error("An unexpected error occurred while obtaining status.");
    }
  }
}

export async function getIntegrationsService(
  logLevel: LogLevelDesc,
  manager: SATPManager,
): Promise<Integration[]> {
  const fnTag = `getIntegrationsService()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  logger.info(`${fnTag}, getting integrations service...`);

  const supportedSystems = manager.connectedDLTs;

  return supportedSystems.map((supportedSystem) =>
    convertconnectedDLTsIntoIntegrations(supportedSystem),
  );
}

function convertconnectedDLTsIntoIntegrations(
  networkId: NetworkId,
): Integration {
  switch (networkId.ledgerType) {
    case LedgerType.Fabric2:
      return {
        id: networkId.id,
        name: "Hyperledger Fabric",
        type: LedgerType.Fabric2,
        environment: "testnet",
      } as Integration;
    case LedgerType.Besu1X:
      return {
        id: networkId.id,
        name: "Hyperledger Besu",
        type: LedgerType.Besu1X,
        environment: "testnet",
      } as Integration;
    case LedgerType.Besu2X:
      return {
        id: networkId.id,
        name: "Hyperledger Besu",
        type: LedgerType.Besu2X,
        environment: "testnet",
      } as Integration;
    case LedgerType.Ethereum:
      return {
        id: networkId.id,
        name: "Ethereum",
        type: LedgerType.Ethereum,
        environment: "testnet",
      } as Integration;
    default:
      throw new Error(`Unsupported chain: ${networkId.ledgerType}`);
  }
}
