import type { Server } from "http";
import type { Server as SecureServer } from "https";
import type { Config as SshConfig } from "node-ssh";
import type { Express } from "express";
import urlcat from "urlcat";
import OAS from "../json/openapi.json";
import { BadRequestError, GatewayTimeoutError } from "http-errors-enhanced-cjs";

import {
  ListCpiV1Response,
  StartFlowV1Request,
  GetFlowCidV1Response,
  GetFlowCidV1Request,
  ListCpiV1Request,
} from "./generated/openapi/typescript-axios";

import {
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPluginOptions,
  ConsensusAlgorithmFamily,
} from "@hyperledger/cactus-core-api";
import { consensusHasTransactionFinality } from "@hyperledger/cactus-core";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { DeployContractJarsEndpoint } from "./web-services/deploy-contract-jars-endpoint";

import {
  IGetPrometheusExporterMetricsEndpointV1Options,
  GetPrometheusExporterMetricsEndpointV1,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import {
  IInvokeContractEndpointV1Options,
  InvokeContractEndpointV1,
} from "./web-services/invoke-contract-endpoint-v1";

import {
  IListCPIEndpointV1Options,
  ListCPIEndpointV1,
} from "./web-services/list-cpi-endpoint-v1";
import {
  IFlowStatusEndpointV1Options,
  FlowStatusEndpointV1,
} from "./web-services/list-flow-endpoint-v1";
import {
  IFlowStatusResponseEndpointV1Options,
  FlowStatusResponseEndpointV1,
} from "./web-services/get-flow-endpoint-v1";
import {
  IListFlowsEndpointV1Options,
  ListFlowsEndpointV1,
} from "./web-services/list-flows-endpoint-v1";
import {
  INetworkMapEndpointV1Options,
  NetworkMapEndpointV1,
} from "./web-services/network-map-endpoint-v1";
import {
  IDiagnoseNodeEndpointV1Options,
  DiagnoseNodeEndpointV1,
} from "./web-services/diagnose-node-endpoint-v1";
import {
  IStartFlowEndpointV1Options,
  StartFlowEndpointV1,
} from "./web-services/start-flow-endpoint-v1";
import fs from "fs";
import fetch from "node-fetch";
import https from "https";
export enum CordaVersion {
  CORDA_V4X = "CORDA_V4X",
  CORDA_V5 = "CORDA_V5X",
}
export interface IPluginLedgerConnectorCordaOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  sshConfigAdminShell: SshConfig;
  corDappsDir: string;
  prometheusExporter?: PrometheusExporter;
  cordaStartCmd?: string;
  cordaStopCmd?: string;
  apiUrl?: string;
  cordaVersion?: CordaVersion;
  holdingIDShortHash?: any;
  clientRequestID?: any;
  /**
   * Path to the file where the private key for the ssh configuration is located
   * This property is optional. Its use is not recommended for most cases, it will override the privateKey property of the sshConfigAdminShell.
   * @type {string}
   * @memberof IPluginLedgerConnectorCordaOptions
   */
  sshPrivateKeyPath?: string;
  cordaApiUrl?: string;
}

export class PluginLedgerConnectorCorda
  implements
    IPluginLedgerConnector<
      GetFlowCidV1Response,
      StartFlowV1Request,
      ListCpiV1Response,
      any
    >,
    IPluginWebService
{
  public static readonly CLASS_NAME = "DeployContractJarsEndpoint";

  private readonly instanceId: string;
  private readonly log: Logger;
  public prometheusExporter: PrometheusExporter;
  private endpoints: IWebServiceEndpoint[] | undefined;
  public readonly cordaApiUrl: string;
  public get className(): string {
    return DeployContractJarsEndpoint.CLASS_NAME;
  }

  private httpServer: Server | SecureServer | null = null;

  constructor(public readonly options: IPluginLedgerConnectorCordaOptions) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} options`);
    Checks.truthy(options.sshConfigAdminShell, `${fnTag} sshConfigAdminShell`);
    Checks.truthy(options.instanceId, `${fnTag} instanceId`);

    const level = options.logLevel || "INFO";
    const label = "plugin-ledger-connector-corda";
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = this.options.instanceId;
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

    this.cordaApiUrl = options.cordaApiUrl || "https://127.0.0.1:8888";

    this.prometheusExporter.startMetricsCollection();
    // if privateKeyPath exists, overwrite privateKey in sshConfigAdminShell
    this.readSshPrivateKeyFromFile();
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    return ConsensusAlgorithmFamily.Authority;
  }
  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily =
      await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return "@hyperledger/cactus-plugin-ledger-connector-corda";
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public deployContract(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public async transact(): Promise<any> {
    this.prometheusExporter.addCurrentTransaction();
    return null as any;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    // await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  private readSshPrivateKeyFromFile(): void {
    const { sshPrivateKeyPath } = this.options;
    if (sshPrivateKeyPath) {
      const fileContent = fs
        .readFileSync(sshPrivateKeyPath, "utf-8")
        .toString();
      this.options.sshConfigAdminShell.privateKey = fileContent;
    }
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const pkgName = this.getPackageName();
    this.log.info(`Instantiating web services for ${pkgName}...`);
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new DeployContractJarsEndpoint({
        sshConfigAdminShell: this.options.sshConfigAdminShell,
        logLevel: this.options.logLevel,
        corDappsDir: this.options.corDappsDir,
        cordaStartCmd: this.options.cordaStartCmd,
        cordaStopCmd: this.options.cordaStopCmd,
        apiUrl: this.options.apiUrl,
      });

      endpoints.push(endpoint);
    }

    {
      const opts: IInvokeContractEndpointV1Options = {
        apiUrl: this.options.apiUrl,
        logLevel: this.options.logLevel,
      };
      const endpoint = new InvokeContractEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(endpoint);
    }
    {
      const opts: IListFlowsEndpointV1Options = {
        apiUrl: this.options.apiUrl,
        logLevel: this.options.logLevel,
      };
      const endpoint = new ListFlowsEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: INetworkMapEndpointV1Options = {
        apiUrl: this.options.apiUrl,
        logLevel: this.options.logLevel,
      };
      const endpoint = new NetworkMapEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IDiagnoseNodeEndpointV1Options = {
        apiUrl: this.options.apiUrl,
        logLevel: this.options.logLevel,
      };
      const endpoint = new DiagnoseNodeEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IListCPIEndpointV1Options = {
        apiUrl: this.options.apiUrl as string,
        logLevel: this.options.logLevel,
        connector: this,
      };
      const endpoint = new ListCPIEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IFlowStatusEndpointV1Options = {
        apiUrl: this.options.apiUrl as string,
        logLevel: this.options.logLevel,
        holdingIDShortHash: this.options.holdingIDShortHash,
        connector: this,
      };
      const endpoint = new FlowStatusEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IFlowStatusResponseEndpointV1Options = {
        apiUrl: this.options.apiUrl as string,
        logLevel: this.options.logLevel,
        holdingIDShortHash: this.options.holdingIDShortHash,
        clientRequestID: this.options.clientRequestID,
        connector: this,
      };
      const endpoint = new FlowStatusResponseEndpointV1(opts);
      endpoints.push(endpoint);
    }
    {
      const opts: IStartFlowEndpointV1Options = {
        apiUrl: this.options.apiUrl as string,
        logLevel: this.options.logLevel,
        connector: this,
      };
      const endpoint = new StartFlowEndpointV1(opts);
      endpoints.push(endpoint);
    }
    this.log.info(`Instantiated endpoints of ${pkgName}`);
    return endpoints;
  }

  public async shutdown(): Promise<void> {
    return;
  }

  public async getFlowList(): Promise<string[]> {
    return ["getFlowList()_NOT_IMPLEMENTED"];
  }

  private async setupRequest(
    username: string,
    password: string,
    rejectUnauthorized: boolean,
  ): Promise<{ headers: any; agent: any }> {
    const authString = Buffer.from(`${username}:${password}`).toString(
      "base64",
    );
    const headers = { Authorization: `Basic ${authString}` };
    const httpsAgent = new https.Agent({
      rejectUnauthorized,
    });
    return { headers, agent: httpsAgent };
  }

  private validateHoldingIDShortHash(inputString: string): boolean {
    /* only hexadecimal characters and exactly 12 characters long as per the corda docs
       https://docs.r3.com/en/platform/corda/5.2/developing-applications/cordapp-template/utxo-ledger-example-cordapp/running-the-chat-cordapp.html#using-swagger
    */
    const pattern = /^[0-9A-Fa-f]{12}$/;
    return pattern.test(inputString);
  }

  public async startFlow(req: StartFlowV1Request): Promise<any> {
    try {
      const { headers, agent } = await this.setupRequest(
        req.username,
        req.password,
        req.rejectUnauthorized,
      );
      const holdingIDShortHash = req.holdingIDShortHash;
      if (typeof holdingIDShortHash === "undefined") {
        throw new BadRequestError("holdingIDShortHash is undefined");
      }
      if (!this.validateHoldingIDShortHash(holdingIDShortHash)) {
        throw new BadRequestError(
          `Invalid holdingIDShortHash: ${holdingIDShortHash}`,
        );
      }
      const cordaReq = {
        clientRequestId: req.clientRequestId,
        flowClassName: req.flowClassName,
        requestBody: req.requestBody,
      };
      const cordaReqBuff = Buffer.from(JSON.stringify(cordaReq));
      const startFlowUrl = urlcat(
        this.cordaApiUrl,
        "/api/v1/flow/:holdingIDShortHash",
        {
          holdingIDShortHash,
        },
      );
      const response = await fetch(startFlowUrl, {
        method: `POST`,
        headers,
        body: cordaReqBuff,
        agent,
      });
      await new Promise((resolve) => setTimeout(resolve, 5000));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseData = await this.pollEndpointUntilCompleted(
        req.holdingIDShortHash!,
        req.clientRequestId,
      );
      return responseData;
    } catch (error) {
      console.error("Error starting flow:", error);
      throw error;
    }
  }

  public async listCPI(req: ListCpiV1Request): Promise<any> {
    try {
      const { headers, agent } = await this.setupRequest(
        req.username,
        req.password,
        req.rejectUnauthorized,
      );
      const cpiUrl = urlcat(this.cordaApiUrl, "/api/v1/cpi");
      const response = await fetch(cpiUrl, {
        method: `GET`,
        headers: headers,
        agent,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  public async getFlow(req: GetFlowCidV1Request): Promise<any> {
    try {
      const { headers, agent } = await this.setupRequest(
        req.username,
        req.password,
        req.rejectUnauthorized,
      );
      if (typeof req.holdingIDShortHash === "undefined") {
        throw new BadRequestError("holdingIDShortHash is undefined");
      }
      if (!this.validateHoldingIDShortHash(req.holdingIDShortHash)) {
        throw new BadRequestError(
          `Invalid holdingIDShortHash: ${req.holdingIDShortHash}`,
        );
      }
      const getFlowUrl = urlcat(
        this.cordaApiUrl,
        "/api/v1/flow/:holdingIDShortHash/:clientRequestId",
        {
          holdingIDShortHash: req.holdingIDShortHash,
          clientRequestId: req.clientRequestId,
        },
      );
      const response = await fetch(getFlowUrl, {
        method: `GET`,
        headers: headers,
        agent,
      });
      if (!response.ok) {
        throw new BadRequestError(`HTTP error! status: ${response.status}`);
      }
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  public async listFlows(req: GetFlowCidV1Request): Promise<any> {
    try {
      const { headers, agent } = await this.setupRequest(
        req.username,
        req.password,
        req.rejectUnauthorized,
      );
      if (typeof req.holdingIDShortHash === "undefined") {
        throw new BadRequestError("holdingIDShortHash is undefined");
      }
      if (!this.validateHoldingIDShortHash(req.holdingIDShortHash)) {
        throw new BadRequestError(
          `Invalid holdingIDShortHash: ${req.holdingIDShortHash}`,
        );
      }
      const listFlowsUrl = urlcat(
        this.cordaApiUrl,
        "/api/v1/flow/:holdingIDShortHash",
        {
          holdingIDShortHash: req.holdingIDShortHash,
        },
      );
      const response = await fetch(listFlowsUrl, {
        method: `GET`,
        headers: headers,
        agent,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  public async pollEndpointUntilCompleted(
    shortHash: string,
    clientRequestId: string,
    interval = 5000,
    maxAttempts = 10,
  ): Promise<GetFlowCidV1Response> {
    return new Promise<GetFlowCidV1Response>(async (resolve, reject) => {
      let attempts = 0;

      const poll = async () => {
        attempts++;
        const queryVar: GetFlowCidV1Request = {
          username: "admin",
          password: "admin",
          rejectUnauthorized: false,
          holdingIDShortHash: shortHash,
          clientRequestId,
        };
        try {
          const response = await this.getFlow(queryVar);
          if (response.flowStatus === "COMPLETED") {
            resolve(response);
          } else {
            if (attempts < maxAttempts) {
              setTimeout(poll, interval);
            } else {
              reject(
                new Error(
                  `Max attempts (${maxAttempts}) reached. Flow status not completed.`,
                ),
              );
            }
          }
        } catch (error) {
          if (attempts < maxAttempts) {
            setTimeout(poll, interval);
          } else {
            reject(
              new GatewayTimeoutError(
                `Max attempts (${maxAttempts}) reached. Unable to get flow status.`,
              ),
            );
          }
        }
      };

      poll();
    });
  }
}
