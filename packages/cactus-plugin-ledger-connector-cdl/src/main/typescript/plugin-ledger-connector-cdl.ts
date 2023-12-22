import type { Express } from "express";
import sanitizeHtml from "sanitize-html";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { consensusHasTransactionFinality } from "@hyperledger/cactus-core";
import {
  ConsensusAlgorithmFamily,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import { RegisterHistoryDataEndpoint } from "./web-services/register-history-data-v1-endpoint";
import { GetLineageDataEndpoint } from "./web-services/get-lineage-v1-endpoint";
import { SearchLineageByHeaderEndpoint } from "./web-services/search-lineage-by-header-v1-endpoint";
import { SearchLineageByGlobalDataEndpoint } from "./web-services/search-lineage-by-globaldata-v1-endpoint";

import OAS from "../json/openapi.json";
import {
  RegisterHistoryDataRequestV1,
  GatewayConfigurationV1,
  AuthInfoV1,
  GetLineageRequestV1,
  GetLineageOptionDirectionV1,
  GetLineageResponseV1,
  SearchLineageRequestV1,
  SearchLineageResponseV1,
  RegisterHistoryDataV1Response,
} from "./generated/openapi/typescript-axios";
import {
  HTTP_HEADER_SUBSCRIPTION_KEY,
  getAuthorizationHeaders,
} from "./type-defs";
import { CDLGateway } from "./cdl-gateway";

export interface IPluginLedgerConnectorCDLOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  cdlApiGateway?: GatewayConfigurationV1;
  cdlApiSubscriptionGateway?: GatewayConfigurationV1;
}

/**
 * Connector plugin for interacting with Fujitsu CDL service.
 */
export class PluginLedgerConnectorCDL
  implements ICactusPlugin, IPluginWebService
{
  private readonly instanceId: string;
  private readonly log: Logger;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private cdlApiGateway: CDLGateway | undefined;
  private cdlApiSubscriptionGateway: CDLGateway | undefined;

  public get className(): string {
    return "PluginLedgerConnectorCDL";
  }

  constructor(public readonly options: IPluginLedgerConnectorCDLOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(
      options.cdlApiGateway || options.cdlApiSubscriptionGateway,
      `${fnTag} options.cdlApiGateway or options.cdlApiSubscriptionGateway must be defined`,
    );

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;

    if (options.cdlApiGateway) {
      this.log.info("cdlApiGateway created");
      this.cdlApiGateway = new CDLGateway(options.cdlApiGateway, level);
    }

    if (options.cdlApiSubscriptionGateway) {
      this.log.info("cdlApiSubscriptionGateway created");
      this.cdlApiSubscriptionGateway = new CDLGateway(
        options.cdlApiSubscriptionGateway,
        level,
      );
    }
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const endpoints: IWebServiceEndpoint[] = [];

    {
      const endpoint = new RegisterHistoryDataEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetLineageDataEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new SearchLineageByHeaderEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new SearchLineageByGlobalDataEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }

    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-cdl`;
  }

  public async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    return ConsensusAlgorithmFamily.Authority;
  }

  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily =
      await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
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
   * Get correct gateway based on authInfo.
   * Can return either gateway for regular users (i.e. access token one) or for apps (subscriptionId one).
   * Will throw an error if valid gateway could not be found / wrong configuration provided.
   *
   * @param authInfo authentication info
   * @returns `CDLGateway`
   */
  private getGatewayByAuthInfo(authInfo: AuthInfoV1): CDLGateway {
    const headers = getAuthorizationHeaders(authInfo);

    if (HTTP_HEADER_SUBSCRIPTION_KEY in headers) {
      if (this.cdlApiSubscriptionGateway) {
        this.log.debug("Using subscription key gateway for this request");
        return this.cdlApiSubscriptionGateway;
      } else {
        throw new Error(
          `cdlApiSubscriptionGateway not configured but found ${HTTP_HEADER_SUBSCRIPTION_KEY} in request header!`,
        );
      }
    }

    if (this.cdlApiGateway) {
      this.log.debug("Using access token gateway for this request");
      return this.cdlApiGateway;
    } else {
      throw new Error(
        `cdlApiGateway not configured, provide ${HTTP_HEADER_SUBSCRIPTION_KEY} to use subscription gateway!`,
      );
    }
  }

  /**
   * Common logic for sending trail search requests
   */
  private async searchRequest(
    searchEndpoint: string,
    args: SearchLineageRequestV1,
  ): Promise<SearchLineageResponseV1> {
    Checks.truthy(searchEndpoint, "searchRequest() searchEndpoint");
    Checks.truthy(args.searchType, "searchRequest() args.searchType");
    Checks.truthy(args.fields, "searchRequest() args.fields");

    const gateway = this.getGatewayByAuthInfo(args.authInfo);
    const responseData = await gateway.request(
      searchEndpoint,
      args.authInfo,
      {},
      {
        searchType: args.searchType,
        body: args.fields,
      },
    );

    if (responseData.result !== "OK") {
      throw new Error(JSON.stringify(responseData));
    }

    this.log.debug(`searchRequest ${searchEndpoint} results:`, responseData);

    return responseData as SearchLineageResponseV1;
  }

  /**
   * Send request to `trail_registration` CDL endpoint.
   */
  async registerHistoryData(
    args: RegisterHistoryDataRequestV1,
  ): Promise<RegisterHistoryDataV1Response> {
    this.log.debug("registerHistoryData() args:", JSON.stringify(args));

    // Check args
    this.checkPropertyNames(args.tags);
    this.checkPropertyNames(args.properties);

    const gateway = this.getGatewayByAuthInfo(args.authInfo);
    const responseData = await gateway.request(
      `trail_registration`,
      args.authInfo,
      {},
      {
        "cdl:EventId": args.eventId ?? "",
        "cdl:LineageId": args.lineageId ?? "",
        "cdl:Tags": args.tags,
        ...args.properties,
      },
    );

    if (responseData.result !== "OK") {
      throw new Error(JSON.stringify(responseData));
    }

    this.log.debug("registerHistoryData results:", responseData);
    return responseData as RegisterHistoryDataV1Response;
  }

  /**
   * Get data from `trail_acquisition` CDL endpoint.
   */
  async getLineage(args: GetLineageRequestV1): Promise<GetLineageResponseV1> {
    this.log.debug("getLineage() args:", JSON.stringify(args));
    Checks.truthy(args.eventId, "getLineage() args.eventId");

    const direction = (
      args.direction ?? GetLineageOptionDirectionV1.Backward
    ).toUpperCase();
    let depth = parseInt(args.depth ?? "-1", 10);
    if (isNaN(depth)) {
      this.log.warn(
        "Could not parse depth from the argument, using default (-1). Wrong input:",
        args.depth,
      );
      depth = -1;
    }

    const gateway = this.getGatewayByAuthInfo(args.authInfo);
    const responseData = await gateway.request(
      `trail_acquisition/${sanitizeHtml(args.eventId)}`,
      args.authInfo,
      {
        direction,
        depth,
      },
    );

    if (responseData.result !== "OK") {
      throw new Error(JSON.stringify(responseData));
    }

    this.log.debug("getLineage results:", responseData);

    return responseData as GetLineageResponseV1;
  }

  /**
   * Search data using `trail_search_headers` CDL endpoint.
   */
  async searchLineageByHeader(
    args: SearchLineageRequestV1,
  ): Promise<SearchLineageResponseV1> {
    this.log.debug("searchByHeader() args:", JSON.stringify(args));
    return this.searchRequest("trail_search_headers", args);
  }

  /**
   * Search data using `trail_search_globaldata` CDL endpoint.
   */
  async searchLineageByGlobalData(
    args: SearchLineageRequestV1,
  ): Promise<SearchLineageResponseV1> {
    this.log.debug("searchByGlobalData() args:", JSON.stringify(args));
    return this.searchRequest("trail_search_globaldata", args);
  }
}
