import { GetStatusError } from "../../core/errors/satp-errors";
import { SessionData } from "../../generated/proto/cacti/satp/v02/session/session_pb";
import {
  AuditRequest,
  AuditResponse,
} from "../../generated/gateway-client/typescript-axios/api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPManager } from "../../services/gateway/satp-manager";
import { SATPSession } from "../../core/satp-session";

export async function executeAudit(
  logLevel: LogLevelDesc,
  req: AuditRequest,
  manager: SATPManager,
): Promise<AuditResponse> {
  const fnTag = `executeAudit()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  logger.info(`${fnTag}, Performing audit...`);

  try {
    const processedRequest = req;
    const result = await getAuditData(logLevel, processedRequest, manager);
    return result;
  } catch (error) {
    if (error instanceof GetStatusError) {
      logger.error(`${fnTag}, Error getting status: ${error.message}`);
      throw error;
    } else {
      logger.error(`${fnTag}, Unexpected error: ${error.message}`);
      throw new Error("An unexpected error occurred while obtaining status.");
    }
  }
}

export async function getAuditData(
  logLevel: LogLevelDesc,
  req: AuditRequest,
  manager: SATPManager,
): Promise<AuditResponse> {
  const fnTag = `getStatusService()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  const sessions = manager.getSessions().values();

  const sessionsData: SATPSession[] = [];

  let sessionData: SessionData | undefined;
  for (const session of sessions) {
    if (session.hasClientSessionData()) {
      sessionData = session.getClientSessionData();
    } else if (session.hasServerSessionData()) {
      sessionData = session.getServerSessionData();
    } else {
      logger.warn(
        `${fnTag}, Session ${session.getSessionId()} does not have session data.`,
      );
      continue;
    }

    if (Number(sessionData.lastMessageReceivedTimestamp) > req.endTimestamp) {
      logger.info(
        `${fnTag}, Session ${session.getSessionId()} is not within the requested time range.`,
      );
      logger.debug(
        `${fnTag}, Session ${session.getSessionId()} last message received timestamp: ${sessionData.lastMessageReceivedTimestamp}, requested end timestamp: ${req.endTimestamp}`,
      );
      continue;
    }

    if (
      !sessionData.receivedTimestamps?.stage0
        ?.newSessionRequestMessageTimestamp ||
      Number(
        sessionData.receivedTimestamps?.stage0
          ?.newSessionRequestMessageTimestamp,
      ) < req.startTimestamp
    ) {
      logger.warn(
        `${fnTag}, Session ${session.getSessionId()} does not have complete timestamps.`,
      );
      continue;
    }

    logger.info(
      `${fnTag}, Adding session ${session.getSessionId()} to audit data.`,
    );
    sessionsData.push(session);
  }

  return {
    sessions: sessionsData.map((session) => session.toString()),
    startTimestamp: req.startTimestamp,
    endTimestamp: req.endTimestamp,
  };
}
