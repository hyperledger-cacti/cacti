import {
  AuthInfoArgsType,
  HTTP_HEADER_SUBSCRIPTION_KEY,
  HTTP_HEADER_TRUST_USER_ID,
  HTTP_HEADER_TRUST_USER_ROLE,
  HTTP_HEADER_TRUST_AGENT_ID,
  HTTP_HEADER_TRUST_AGENT_ROLE,
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

type HTTPAuthHeadersType = Record<string, string | number | boolean>;

function createHttpsGatewayConfig(
  gatewayKey: "cdlApiGateway" | "cdlApiSubscriptionGateway",
) {
  const agentOptions: https.AgentOptions = {};

  const skipCertCheck = configRead<boolean>(
    `${gatewayKey}.skipCertCheck`,
    false,
  );
  if (skipCertCheck) {
    logger.info(
      `Allowing self signed CDL API GW certificates (skipCertCheck=${skipCertCheck})`,
    );
    agentOptions.rejectUnauthorized = !skipCertCheck;
  }

  const caPath = configRead<string>(`${gatewayKey}.caPath`, "");
  if (caPath) {
    logger.info(`Using CDL API GW CA ${caPath}`);
    const gatewayCAString = readFileSync(caPath, "ascii");
    logger.debug("CDL Gateway certificate read:", gatewayCAString);
    agentOptions.ca = gatewayCAString;
  }

  const serverName = configRead<string>(`${gatewayKey}.serverName`, "");
  if (serverName) {
    logger.info(`Overwrite CDL API GW server name with '${serverName}'`);
    agentOptions.servername = serverName;
  }

  return {
    baseURL: configRead<string>(`${gatewayKey}.url`),
    httpsAgent: new https.Agent(agentOptions),
  };
}

const API_GATEWAY_CONFIG = createHttpsGatewayConfig("cdlApiGateway");
const API_SUBSCRIPTION_GATEWAY_CONFIG = createHttpsGatewayConfig(
  "cdlApiSubscriptionGateway",
);

function getHttpsGatewayConfigForHeaders(headers: HTTPAuthHeadersType) {
  if (HTTP_HEADER_SUBSCRIPTION_KEY in headers) {
    logger.debug("Using subscription key gateway for this request");
    return API_SUBSCRIPTION_GATEWAY_CONFIG;
  }

  logger.debug("Using access token gateway for this request");
  return API_GATEWAY_CONFIG;
}

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

  const authHeaders = getAuthorizationHeaders(authInfo);
  const { httpsAgent, baseURL } = getHttpsGatewayConfigForHeaders(authHeaders);

  try {
    const requestResponse = await axios({
      httpsAgent,
      method: httpMethod,
      baseURL,
      url,
      responseType: "json",
      headers: {
        "User-Agent": configRead<string>("userAgent", "CactiCDLConnector"),
        "Content-Type": "application/json;charset=UTF-8",
        ...authHeaders,
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
): HTTPAuthHeadersType {
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
      [HTTP_HEADER_TRUST_AGENT_ID]: authInfo.trustAgentId,
    };
  } else if (isAuthInfoSubscriptionKeyArgsType(authInfo)) {
    return {
      [HTTP_HEADER_SUBSCRIPTION_KEY]: authInfo.subscriptionKey,
      [HTTP_HEADER_TRUST_USER_ID]: authInfo.trustUserId,
      [HTTP_HEADER_TRUST_USER_ROLE]: authInfo.trustUserRole,
      [HTTP_HEADER_TRUST_AGENT_ID]: authInfo.trustAgentId,
      [HTTP_HEADER_TRUST_AGENT_ROLE]: authInfo.trustAgentRole,
    };
  } else {
    throw new Error(
      "Missing authInfo information or information not complete!",
    );
  }
}
