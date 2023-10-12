import {
  AuthInfoArgsType,
  isAuthInfoAccessTokenArgsType,
  isAuthInfoSubscriptionKeyArgsType,
} from "./type-defs";
import { read as configRead } from "../common/core/config";
import axios from "axios";
import https from "https";

// Log settings
import { getLogger } from "log4js";
import { readFileSync } from "fs";
const logger = getLogger("cdl-request[" + process.pid + "]");
logger.level = configRead("logLevel", "info");

function getHttpsAgent() {
  const agentOptions: https.AgentOptions = {};

  const skipCertCheck = configRead<boolean>(
    "cdlApiGateway.skipCertCheck",
    false,
  );
  if (skipCertCheck) {
    logger.info(
      `Allowing self signed CDL API GW certificates (skipCertCheck=${skipCertCheck})`,
    );
    agentOptions.rejectUnauthorized = !skipCertCheck;
  }

  const caPath = configRead<string>("cdlApiGateway.caPath", "");
  if (caPath) {
    logger.info(`Using CDL API GW CA ${caPath}`);
    const gatewayCAString = readFileSync(caPath, "ascii");
    logger.debug("CDL Gateway certificate read:", gatewayCAString);
    agentOptions.ca = gatewayCAString;
  }

  const serverName = configRead<string>("cdlApiGateway.serverName", "");
  if (serverName) {
    logger.info(`Overwrite CDL API GW server name with '${serverName}'`);
    agentOptions.servername = serverName;
  }

  return new https.Agent(agentOptions);
}

const COMMON_HTTPS_AGENT = getHttpsAgent();

export async function cdlRequest(
  url: string,
  authInfo: AuthInfoArgsType,
  queryParams?: any,
  dataPayload?: any,
) {
  let httpMethod = "get";
  if (dataPayload) {
    httpMethod = "post";
  }

  logger.debug(`cdlRequest ${httpMethod} ${url} executed`);

  try {
    const requestResponse = await axios({
      httpsAgent: COMMON_HTTPS_AGENT,
      method: httpMethod,
      baseURL: configRead<string>("cdlApiGateway.url"),
      url,
      responseType: "json",
      headers: {
        "User-Agent": configRead<string>("userAgent", "CactiCDLConnector"),
        "Content-Type": "application/json;charset=UTF-8",
        ...getAuthorizationHeaders(authInfo),
      },
      params: queryParams,
      data: dataPayload,
    });

    return requestResponse.data;
  } catch (error: any) {
    if ("toJSON" in error) {
      logger.error("CDL API request failed:", error.toJSON());
    }

    throw error;
  }
}

function getAuthorizationHeaders(
  authInfo: AuthInfoArgsType,
): Record<string, string | number | boolean> {
  if (
    isAuthInfoAccessTokenArgsType(authInfo) &&
    isAuthInfoSubscriptionKeyArgsType(authInfo)
  ) {
    throw new Error(
      "Mixed authInfo configuration detected - use either accessToken or subscriptionKey!",
    );
  }

  if (isAuthInfoAccessTokenArgsType(authInfo)) {
    return {
      Authorization: `Bearer ${authInfo.accessToken}`,
      "Trust-Agent-Id": authInfo.trustAgentId,
    };
  } else if (isAuthInfoSubscriptionKeyArgsType(authInfo)) {
    return {
      "Ocp-Apim-Subscription-Key": authInfo.subscriptionKey,
      "Trust-User-Id": authInfo.trustUserId,
      "Trust-User-Role": authInfo.trustUserRole,
      "Trust-Agent-Id": authInfo.trustAgentId,
      "Trust-Agent-Role": authInfo.trustAgentRole,
    };
  } else {
    throw new Error(
      "Missing authInfo information or information not complete!",
    );
  }
}
