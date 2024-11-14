import { SATPError } from "../../core/errors/satp-errors";
import {
  Integration,
  IntegrationsResponse,
} from "../../generated/gateway-client/typescript-axios/api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPManager } from "../../gol/satp-manager";
import { SupportedChain } from "../../core/types";

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

  const supportedSystems = manager.supportedDLTs;

  return supportedSystems.map((supportedSystem) =>
    convertSupportedChainsIntoIntegrations(supportedSystem),
  );
}

function convertSupportedChainsIntoIntegrations(
  supportedChain: SupportedChain,
): Integration {
  switch (supportedChain) {
    case SupportedChain.FABRIC:
      return {
        id: "dummyId",
        name: "Hyperledger Fabric",
        type: "fabric",
        environment: "testnet",
      } as Integration;
    case SupportedChain.BESU:
      return {
        id: "dummyId",
        name: "Hyperledger Besu",
        type: "besu",
        environment: "testnet",
      } as Integration;
    default:
      throw new Error(`Unsupported chain: ${supportedChain}`);
  }
}
