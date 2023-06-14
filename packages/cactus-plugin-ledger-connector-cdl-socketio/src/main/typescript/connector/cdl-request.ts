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
  accessToken: [string, string],
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
      url: `api/v1/${url}`,
      responseType: "json",
      headers: {
        "User-Agent": configRead<string>("userAgent", "CactiCDLConnector"),
        Authorization: `Bearer ${accessToken[0]}`,
        "Trust-Agent-Id": accessToken[1],
        "Content-Type": "application/json;charset=UTF-8",
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
