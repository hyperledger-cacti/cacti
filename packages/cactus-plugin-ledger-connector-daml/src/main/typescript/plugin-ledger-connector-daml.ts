import type { Express } from "express";
import OAS from "../json/openapi.json";

import {
  GetPartiesInvolvedEndpointRequest,
  QueryIOUEndpointRequest,
  QueryRawIOUEndpointRequest,
  CreateIOUEndpointRequest,
  CreateIOUEndpointResponse,
  ExerciseIOUEndpointRequest,
  ExerciseIOUEndpointResponse,
} from "./generated/openapi/typescript-axios";

import {
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPluginOptions,
  ConsensusAlgorithmFamily,
  ICactusPlugin,
} from "@hyperledger/cactus-core-api";
import { consensusHasTransactionFinality } from "@hyperledger/cactus-core";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import {
  ICreateIOUEndpointOptions,
  CreateIOUEndpoint,
} from "./web-services/create-iou-endpoint";

import {
  IExerciseIOUEndpointOptions,
  ExerciseIOUEndpoint,
} from "./web-services/exercise-iou-endpoint";

import {
  IQueryIOUEndpointOptions,
  QueryIOUEndpoint,
} from "./web-services/query-iou-endpoint";

import {
  IQueryRawIOUEndpointOptions,
  QueryRawIOUEndpoint,
} from "./web-services/query-raw-iou-endpoint";

import {
  IGetPartiesInvolvedEndpointOptions,
  GetPartiesInvolvedEndpoint,
} from "./web-services/get-parties-involved-endpoint";

import fetch from "node-fetch";

export interface IPluginLedgerConnectorDAMLOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  apiUrl: string;
  damlApiUrl?: string;
}

export class PluginLedgerConnectorDAML
  implements
    IPluginLedgerConnector<
      CreateIOUEndpointResponse,
      CreateIOUEndpointRequest,
      ExerciseIOUEndpointRequest,
      ExerciseIOUEndpointResponse
    >,
    ICactusPlugin,
    IPluginWebService
{
  private readonly instanceId: string;
  private readonly log: Logger;
  private endpoints: IWebServiceEndpoint[] | undefined;
  public readonly damlApiUrl: string;

  constructor(public readonly options: IPluginLedgerConnectorDAMLOptions) {
    this.damlApiUrl = options.apiUrl || "https://127.0.0.1:8888";
    const level = options.logLevel || "INFO";
    const label = "plugin-ledger-connector-daml";
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = this.options.instanceId;
  }

  public getPackageName(): string {
    return "@hyperledger/cactus-plugin-ledger-connector-daml";
  }

  public async transact(): Promise<any> {
    return null as any;
  }

  public async registerWebServices(
    app: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public deployContract(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily =
      await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const pkgName = this.getPackageName();
    this.log.info(`Instantiating web services for ${pkgName}...`);
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const opts: ICreateIOUEndpointOptions = {
        apiUrl: this.options.apiUrl as string,
        logLevel: this.options.logLevel,
        connector: this,
      };
      const endpoint = new CreateIOUEndpoint(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IQueryIOUEndpointOptions = {
        apiUrl: this.options.apiUrl as string,
        logLevel: this.options.logLevel,
        connector: this,
      };
      const endpoint = new QueryIOUEndpoint(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IQueryRawIOUEndpointOptions = {
        apiUrl: this.options.apiUrl as string,
        logLevel: this.options.logLevel,
        connector: this,
      };
      const endpoint = new QueryRawIOUEndpoint(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IExerciseIOUEndpointOptions = {
        apiUrl: this.options.apiUrl as string,
        logLevel: this.options.logLevel,
        connector: this,
      };
      const endpoint = new ExerciseIOUEndpoint(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IGetPartiesInvolvedEndpointOptions = {
        apiUrl: this.options.apiUrl as string,
        logLevel: this.options.logLevel,
        connector: this,
      };
      const endpoint = new GetPartiesInvolvedEndpoint(opts);
      endpoints.push(endpoint);
    }

    this.log.info(`Instantiated endpoints of ${pkgName}`);
    return endpoints;
  }

  public async shutdown(): Promise<void> {
    return;
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily> {
    return ConsensusAlgorithmFamily.Authority;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public async createContract(req: CreateIOUEndpointRequest): Promise<any> {
    const createIouUrl = `${this.damlApiUrl}/create`;
    const participantToken = req.participantToken;

    const responseForIOU = await fetch(createIouUrl, {
      method: "POST",
      body: JSON.stringify(req),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${participantToken}`,
      },
    });
    const responseForIOUResult = await responseForIOU.json();

    return responseForIOUResult;
  }

  public async exerciseContract(req: ExerciseIOUEndpointRequest): Promise<any> {
    const exerciseIouUrl = `${this.damlApiUrl}/exercise`;
    const getRequestPayload = JSON.stringify(req);
    const parsePayload = JSON.parse(getRequestPayload);
    const participantHash = parsePayload.participantToken;
    const requestBody = {
      templateId: parsePayload.templateId,
      contractId: parsePayload.contractId,
      choice: parsePayload.choice,
      argument: parsePayload.argument,
    };

    const responseForIOU = await fetch(exerciseIouUrl, {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${participantHash}`,
      },
    });
    const responseForIOUResult = await responseForIOU.json();
    return responseForIOUResult;
  }

  public async queryContract(req: QueryIOUEndpointRequest): Promise<any> {
    const queryIOUUrl = `${this.damlApiUrl}/query`;

    const getRequestPayload = JSON.stringify(req);
    const parsePayload = JSON.parse(getRequestPayload);
    const participantToken = parsePayload.participantToken;
    const requestBody = {
      templateIds: parsePayload.templateIds,
      query: parsePayload.query,
      readers: parsePayload.readers,
    };

    const responseForIOU = await fetch(queryIOUUrl, {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${participantToken}`,
      },
    });

    const responseForIOUResult = await responseForIOU.json();
    return responseForIOUResult;
  }

  public async queryRawContract(req: QueryRawIOUEndpointRequest): Promise<any> {
    const queryIOUUrl = `${this.damlApiUrl}/query`;

    const getRequestPayload = JSON.stringify(req);
    const parsePayload = JSON.parse(getRequestPayload);
    const participantToken = parsePayload.participantToken;

    const responseForIOU = await fetch(queryIOUUrl, {
      method: "get",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${participantToken}`,
      },
    });

    const responseForIOUResult = await responseForIOU.json();
    return responseForIOUResult;
  }

  public async getPartiesInvolved(
    req: GetPartiesInvolvedEndpointRequest,
  ): Promise<any> {
    // Generate the sample token for 1 participant
    const getRequestPayload = JSON.stringify(req);
    const parsePayload = JSON.parse(getRequestPayload);
    const participantToken = parsePayload.participantToken;

    const url = `${this.damlApiUrl}/parties`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${participantToken}`,
      },
    });
    const responseBody = await response.json();
    console.log(responseBody);
    return JSON.stringify(responseBody.result);
  }
}
