import { FunctionArgsType } from "./type-defs";
import { read as configRead } from "../common/core/config";
import { cdlRequest } from "./cdl-request";
import sanitizeHtml from "sanitize-html";
import safeStringify from "fast-safe-stringify";

// Log settings
import { getLogger } from "log4js";
const logger = getLogger("ServerPlugin[" + process.pid + "]");
logger.level = configRead("logLevel", "info");

/*
 * ServerPlugin
 * Class definition for server plugins
 */
export class ServerPlugin {
  /**
   * Dispatch function that runs method with name from `args.method.type` with `args` arguments.
   */
  async executeFunction(args: FunctionArgsType): Promise<any> {
    switch (args.method.type) {
      case "registerHistoryData":
        return this.registerHistoryData(args);
      case "getLineage":
        return this.getLineage(args);
      case "searchByHeader":
        return this.searchByHeader(args);
      case "searchByGlobalData":
        return this.searchByGlobalData(args);
      case "status":
        return this.status(args);
      default:
        const _unknownMethod: never = args.method.type;
        throw new Error(`Unknown CDL ServerPlugin method: ${_unknownMethod}`);
    }
  }

  /**
   * Throws if any property in an object starts with `cdl:` (not allowed by the API)
   * @param properties object with string fields.
   */
  private checkPropertyNames(properties?: Record<string, string>) {
    const invalidProps = Object.keys(properties ?? {}).filter((k) =>
      k.startsWith("cdl:"),
    );
    if (invalidProps.length > 0) {
      throw new Error(
        `Properties can't start with 'cdl:'. Invalid properties provided: ${invalidProps}`,
      );
    }
  }

  /**
   * Send request to `trail_registration` CDL endpoint.
   */
  async registerHistoryData(args: FunctionArgsType): Promise<any> {
    logger.debug(
      "ServerPlugin:registerHistoryData() args:",
      JSON.stringify(args),
    );

    // Check args
    const typedArgs = args.args as {
      eventId?: string;
      lineageId?: string;
      tags?: Record<string, string>;
      properties?: Record<string, string>;
    };
    this.checkPropertyNames(typedArgs.tags);
    this.checkPropertyNames(typedArgs.properties);

    const responseData = await cdlRequest(
      `trail_registration`,
      args.method.authInfo,
      {},
      {
        "cdl:EventId": typedArgs.eventId ?? "",
        "cdl:LineageId": typedArgs.lineageId ?? "",
        "cdl:Tags": typedArgs.tags,
        ...typedArgs.properties,
      },
    );

    if (responseData.result !== "OK") {
      throw new Error(sanitizeHtml(safeStringify(responseData)));
    }

    logger.debug("registerHistoryData results:", responseData);
    return responseData;
  }

  /**
   * Get data from `trail_acquisition` CDL endpoint.
   */
  async getLineage(args: FunctionArgsType): Promise<any> {
    logger.debug("ServerPlugin:getLineage() args:", JSON.stringify(args));

    // Check args
    const typedArgs = args.args as {
      eventId: string;
      direction?: "backward" | "forward" | "both";
      depth?: string;
    };

    if (!typedArgs.eventId) {
      throw new Error("Missing eventId in getLineage args!");
    }
    const direction = (typedArgs.direction ?? "backward").toUpperCase();
    let depth = parseInt(typedArgs.depth ?? "-1", 10);
    if (isNaN(depth)) {
      logger.warn(
        "Could not parse depth from the argument, using default (-1). Wrong input:",
        typedArgs.depth,
      );
      depth = -1;
    }

    const responseData = await cdlRequest(
      `trail_acquisition/${sanitizeHtml(typedArgs.eventId)}`,
      args.method.authInfo,
      {
        direction,
        depth,
      },
    );

    if (responseData.result !== "OK") {
      throw new Error(sanitizeHtml(safeStringify(responseData)));
    }
    logger.debug("getLineage results:", responseData);

    return responseData;
  }

  /**
   * Search data using `trail_search_headers` CDL endpoint.
   */
  async searchByHeader(args: FunctionArgsType): Promise<any> {
    logger.debug("ServerPlugin:searchByHeader() args:", JSON.stringify(args));
    return await searchRequest("trail_search_headers", args);
  }

  /**
   * Search data using `trail_search_globaldata` CDL endpoint.
   */
  async searchByGlobalData(args: FunctionArgsType): Promise<any> {
    logger.debug(
      "ServerPlugin:searchByGlobalData() args:",
      JSON.stringify(args),
    );
    return await searchRequest("trail_search_globaldata", args);
  }

  /**
   * Simple method to get current status of the connector plugin.
   */
  async status(args: FunctionArgsType): Promise<any> {
    logger.debug("ServerPlugin:status() args:", JSON.stringify(args));
    return {
      status: "OK.",
    };
  }
}

/**
 * Common logic for sending trail search requests
 */
async function searchRequest(
  searchType: "trail_search_headers" | "trail_search_globaldata",
  args: FunctionArgsType,
) {
  // Check args
  const typedArgs = args.args as {
    searchType: "exactmatch" | "partialmatch" | "regexpmatch";
    fields: Record<string, string>;
  };

  if (!typedArgs.searchType || !typedArgs.fields) {
    throw new Error("Missing required searchByHeader args!");
  }

  const responseData = await cdlRequest(
    searchType,
    args.method.authInfo,
    {},
    {
      searchType: typedArgs.searchType,
      body: typedArgs.fields,
    },
  );

  if (responseData.result !== "OK") {
    throw new Error(sanitizeHtml(safeStringify(responseData)));
  }

  return responseData;
}
