import type { Express } from "express";
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { v4 as uuidV4 } from "uuid";
import type { AxiosResponse } from "axios";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";

import type { Response } from "node-fetch";
import OAS from "../json/openapi.json";

import { NETWORK_TYPE, PROTOCOL_TYPE } from "./helpers/api-parameters";
import {
  ConsensusAlgorithmFamily,
  ICactusPlugin,
  IPluginLedgerConnector,
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { GetTransactionsByAddressEndpoint } from "./endpoints/transaction/get-transactions-endpoint";
import {
  UbiquityClient,
  TxPage,
  Balance,
  Tx,
} from "@ubiquity/ubiquity-ts-client-modified";

export interface IPluginLedgerConnectorUbiquity {
  logLevel?: LogLevelDesc;
  authToken: string;
  instanceId?: string;
  basePath?: string;
  prometheusExporter?: PrometheusExporter;
}

/**
 * Note: The plugin connector interface methods are not provided by the initial
 * implementation, and because of that the generic type parameters are set to
 * `never`
 */

export class PluginLedgerConnectorUbiquity
  implements
    IPluginLedgerConnector<never, never, never, never>,
    ICactusPlugin,
    IPluginWebService {
  public static readonly CLASS_NAME = "PluginLedgerConnectorUbiquity";
  private readonly instanceId: string;
  private readonly log: Logger;
  private client: UbiquityClient;
  private authToken: string;
  public prometheusExporter: PrometheusExporter;
  private endpoints: IWebServiceEndpoint[] | undefined;

  public get className(): string {
    return PluginLedgerConnectorUbiquity.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginLedgerConnectorUbiquity) {
    const fnTag = `${this.className}#constructor()`;
    const envPath = path.join(__dirname, "../.env");
    dotenv.config({ path: envPath });
    expect(process.env.UBIQUITY_AUTH_TOKEN).toBeTruthy();
    const authToken = process.env.UBIQUITY_AUTH_TOKEN;
    if (!authToken) {
      throw new Error("Auth token not defined");
    }
    this.authToken = authToken;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.authToken, `${fnTag} options.authToken`);
    Checks.truthy(opts.logLevel, `${fnTag} options.logLevel`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    this.log = LoggerProvider.getOrCreate({
      label: this.className,
      level: opts.logLevel,
    });

    this.instanceId = opts.instanceId || uuidV4();
    this.log.debug("Initialized");
    this.client = new UbiquityClient(
      opts.authToken,
      opts.basePath || "https://ubiquity.api.blockdaemon.com/v1",
    );
    this.prometheusExporter =
      opts.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });

    this.prometheusExporter.startMetricsCollection();
  }
  deployContract(options?: string): Promise<never> {
    throw new Error(`Method not implemented. ${options}`);
  }
  transact(options?: string): Promise<never> {
    throw new Error(`Method not implemented. ${options}`);
  }
  getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    throw new Error("Method not implemented.");
  }

  async hasTransactionFinality(): Promise<boolean> {
    return false;
  }

  // Documentation: https://ubiquity.docs.blockdaemon.com/swagger-ui/#/Accounts/GetTxsByAddress
  public async getTxsByAddress(
    protocol: PROTOCOL_TYPE,
    network: NETWORK_TYPE,
    address: string,
    continuation?: string,
    limit?: number,
  ): Promise<TxPage> {
    const fnTag = `${this.className}:GetTxsByAddress`;
    this.log.debug("enter ", fnTag);
    const response = await this.client.accountsApi.getTxsByAddress(
      protocol,
      network,
      address,
      "asc",
      continuation,
      limit,
    );
    this.prometheusExporter.addMethodCall();
    return response.data;
  }

  // Documentation: https://ubiquity.docs.blockdaemon.com/swagger-ui/#/Accounts/GetBalancesByAddresses
  public getBalancesByAddresses(
    protocol: PROTOCOL_TYPE,
    network: NETWORK_TYPE,
    address: string,
  ): Promise<AxiosResponse<Balance[]>> {
    const fnTag = `${this.className}:GetBalancesByAddresses`;
    this.log.debug("enter ", fnTag);
    const accounts = this.client.accountsApi.getListOfBalancesByAddress(
      protocol,
      network,
      address,
    );
    this.prometheusExporter.addMethodCall();
    return accounts;
  }

  // Documentation: https://ubiquity.docs.blockdaemon.com/swagger-ui/#/Transactions/V2GetTx
  public getTx(
    protocol: PROTOCOL_TYPE,
    network: NETWORK_TYPE,
    id: string,
  ): Promise<AxiosResponse<Tx>> {
    const fnTag = `${this.className}:GetTx`;
    this.log.debug("enter ", fnTag);

    const transactions = this.client.transactionsApi.getTx(
      protocol,
      network,
      id,
    );
    this.prometheusExporter.addMethodCall();
    return transactions;
  }

  // Documentation: https://ethereum.org/en/developers/docs/apis/json-rpc/
  public async nativeGetTx(
    protocol: PROTOCOL_TYPE,
    network: NETWORK_TYPE,
  ): Promise<Response> {
    const fnTag = `${this.className}:NativeGetTx`;
    this.log.debug("enter ", fnTag);
    const ethereumUrl = `https://svc.blockdaemon.com/${protocol}/${network}/native`;

    const body = "";
    const resp = fetch(ethereumUrl, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        Authorization: this.authToken,
        "Content-Type": "application/json",
      },
    });

    const data = await (await resp).text();
    this.log.debug(data);
    this.prometheusExporter.addMethodCall();
    return resp;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-ubiquity`;
  }

  public async shutdown(): Promise<void> {
    return;
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
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

    // Server endpoints
    const getTransactionsByAddressEndpoint = new GetTransactionsByAddressEndpoint(
      {
        logLevel: "DEBUG",
        ubiquity: this,
      },
    );

    this.endpoints = [getTransactionsByAddressEndpoint];
    return this.endpoints;
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }
}
