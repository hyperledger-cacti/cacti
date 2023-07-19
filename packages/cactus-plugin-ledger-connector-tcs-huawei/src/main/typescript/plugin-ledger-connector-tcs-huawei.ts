import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import https from "https";
import fs from "fs";
import { RuntimeError } from "run-time-error";
import { Express } from "express";
import {
  RunTransactionRequest,
  RunTransactionResponse,
} from "./generated/openapi/typescript-axios/index";
//"../typescript/generated/openapi/api";
import OAS from "../json/openapi.json";
import * as config from "./config";
import {
  RunTransactionEndpointV1,
  IRunTransactionEndpointV1Options,
} from "./web-services/run-transaction-endpoint-v1";

export interface IPluginLedgerConnectorTcsHuaweiOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  apiUrl?: string;
  /**
   * Path to the file where the private key for the ssh configuration is located
   * This property is optional. Its use is not recommended for most cases, it will override the privateKey property of the sshConfigAdminShell.
   * @type {string}
   * @memberof IPluginLedgerConnectorTcsHuaweiOptions
   */
  sshPrivateKeyPath?: string;
}

export class PluginLedgerConnectorTcsHuawei
  implements
    ICactusPlugin,
    IPluginLedgerConnector<
      never,
      never,
      RunTransactionRequest,
      RunTransactionResponse
    >,
    IPluginWebService {
  private endpoints: IWebServiceEndpoint[] | undefined;
  private readonly instanceId: string;
  private readonly log: Logger;
  public static readonly CLASS_NAME = "PluginLedgerConnectorTcsHuawei";

  constructor(public readonly options: IPluginLedgerConnectorTcsHuaweiOptions) {
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const opts: IRunTransactionEndpointV1Options = {
        connector: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new RunTransactionEndpointV1(opts);
      endpoints.push(endpoint);
    }

    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-tcs-huawei`;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public async shutdown(): Promise<void> {
    return;
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  deployContract(): Promise<never> {
    throw new RuntimeError("Method not implemented.");
  }

  getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    throw new Error("Method not implemented.");
  }

  public async hasTransactionFinality(): Promise<boolean> {
    return false;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    return webServices;
  }

  public get className(): string {
    return PluginLedgerConnectorTcsHuawei.CLASS_NAME;
  }

  public async transact(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    console.log(111111111);
    const crossChain = false;
    const request_block_body = JSON.stringify({
      to_chaincode_id: req.chainCodeName,
      to_query_func_name: req.functionName,
      args: req.functionArgs,
      crossChain: crossChain,
    });
    const method: string = config.read("sendTransaction.requestOptions.method");
    const port: string = config.read("sendTransaction.requestOptions.port");
    const path: string = config.read("sendTransaction.requestOptions.path");
    const host: string = config.read("sendTransaction.requestOptions.host");
    console.log(method);
    console.log(port);
    console.log(path);
    console.log(host);
    const options: https.RequestOptions = {
      hostname: "",
      port: 8080,
      path: "/v1/cross/transaction/query",
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(request_block_body),
      },
      cert: fs.readFileSync(config.read("sslParam.clientCert")),
      key: fs.readFileSync(config.read("sslParam.clientKey")),
    };
    let resData;
    const res = https.request(options, (res) => {
      res.on("data", (d) => {
        resData = JSON.parse(d);
        if (resData.error_message == "block not found") {
          console.log("block not found, continue to poll");
          return;
        }
        const res: RunTransactionResponse = {
          functionOutput: resData,
          success: true,
          transactionId: "1",
        };
        console.log(res);
      });
    });
    res.write(request_block_body);
    console.log(resData);
    if (resData == undefined) {
      throw new Error(`s`);
    }
    const response: RunTransactionResponse = {
      functionOutput: resData,
      success: true,
      transactionId: "1",
    };
    return response;
  }
}
