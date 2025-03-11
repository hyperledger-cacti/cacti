import type { Express, Response } from "express";
import OAS from "../json/openapi.json";

import {
  GetPartiesInvolvedEndpointRequest,
  QueryIOUEndpointRequest,
  QueryIOUEndpointResponse,
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
import { consensusHasTransactionFinality, handleRestEndpointException } from "@hyperledger/cactus-core";
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

import { InternalServerError } from "http-errors-enhanced-cjs";
import axios from "axios";

export interface IPluginLedgerConnectorDAMLOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  apiUrl: string;
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
  public readonly apiUrl: string;

  constructor(public readonly options: IPluginLedgerConnectorDAMLOptions) {
    this.apiUrl = options.apiUrl
    const level = options.logLevel || "INFO";
    const label = "plugin-ledger-connector-daml";
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = this.options.instanceId;
  }

  public getPackageName(): string {
    return "@hyperledger/cactus-plugin-ledger-connector-daml";
  }

  public async transact(): Promise<any> {
    const log = this.log
    const ex = `501`
    const errorMsg = `Method Not Implemented`;

    const res = {
      status: function (statusCode: number) {
        console.log(`Setting status code to: ${statusCode}`);
        return this; // For method chaining
      },
      json: function (payload: any) {
        console.log(`Sending JSON response: ${JSON.stringify(payload, null, 2)}`);
        return this; // For method chaining
      },
    } as unknown as Response;
    // const res 
    await handleRestEndpointException({ errorMsg, log, error: ex, res });
  }

  public async registerWebServices(
    app: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public deployContract(): Promise<any> {
    const log = this.log
    const ex = `501`
    const errorMsg = `Method Not Implemented`;

    const res = {
      status: function (statusCode: number) {
        console.log(`Setting status code to: ${statusCode}`);
        return this; // For method chaining
      },
      json: function (payload: any) {
        console.log(`Sending JSON response: ${JSON.stringify(payload, null, 2)}`);
        return this; // For method chaining
      },
    } as unknown as Response;
    // const res 
    return handleRestEndpointException({ errorMsg, log, error: ex, res });
  }

  public async hasTransactionFinality(): Promise<boolean> {
    throw new InternalServerError("Method not implemented.");
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
        apiUrl: this.apiUrl,
        logLevel: this.options.logLevel,
        connector: this,
      };
      const endpoint = new CreateIOUEndpoint(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IQueryIOUEndpointOptions = {
        apiUrl: this.apiUrl,
        logLevel: this.options.logLevel,
        connector: this,
      };
      const endpoint = new QueryIOUEndpoint(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IQueryRawIOUEndpointOptions = {
        apiUrl: this.apiUrl,
        logLevel: this.options.logLevel,
        connector: this,
      };
      const endpoint = new QueryRawIOUEndpoint(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IExerciseIOUEndpointOptions = {
        apiUrl: this.apiUrl,
        logLevel: this.options.logLevel,
        connector: this,
      };
      const endpoint = new ExerciseIOUEndpoint(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IGetPartiesInvolvedEndpointOptions = {
        apiUrl: this.apiUrl,
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

  public async createContract(req: CreateIOUEndpointRequest): Promise<CreateIOUEndpointResponse> {
    const createIouUrl = `${this.apiUrl}/create`;
    const participantToken = req.participantToken;

    const maxretries = 10
    let attempts = 0
    const interval = 2000

    while (attempts < maxretries) {
      try {
        console.log(`Attempt ${attempts + 1}: Fetching data...`);
        const response = await axios.post(createIouUrl, req, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${participantToken}`,
          },
        });
  
        const responseBody = response.data;

        if((typeof responseBody.result == "object") && responseBody.result != null){
          console.log("Data fetched successfully:", responseBody.result);
          return responseBody; // Return the result if data is present
        }
        
        console.log("Result is empty, retrying...");
      } catch (error: any) {
        console.error("Error fetching data:", error.message);
      }
  
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval)); // Wait before retrying
    }
  
    throw new Error(`Failed to fetch data after ${maxretries} attempts.`);
  }

  public async exerciseContract(req: ExerciseIOUEndpointRequest): Promise<ExerciseIOUEndpointResponse> {
    const exerciseIouUrl = `${this.apiUrl}/exercise`;
    const getRequestPayload = JSON.stringify(req);
    const parsePayload = JSON.parse(getRequestPayload);
    const participantHash = parsePayload.participantToken;
    const requestBody = {
      templateId: parsePayload.templateId,
      contractId: parsePayload.contractId,
      choice: parsePayload.choice,
      argument: parsePayload.argument,
    };

    const responseForIOU = await axios.post(exerciseIouUrl, requestBody, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${participantHash}`,
      },
    });
    const responseForIOUResult = await responseForIOU.data;
    return responseForIOUResult;
  }

  public async queryContract(req: QueryIOUEndpointRequest): Promise<QueryIOUEndpointResponse> {
    const queryIOUUrl = `${this.apiUrl}/query`;

    const getRequestPayload = JSON.stringify(req);
    const parsePayload = JSON.parse(getRequestPayload);
    const participantToken = parsePayload.participantToken;
    const requestBody = {
      templateIds: parsePayload.templateIds,
      query: parsePayload.query,
      readers: parsePayload.readers,
    };

    const responseForIOU = await axios.post(queryIOUUrl, requestBody, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${participantToken}`,
      },
    });
    const responseForIOUResult = await responseForIOU.data;
    return responseForIOUResult;
  }

  public async queryRawContract(req: QueryRawIOUEndpointRequest): Promise<QueryIOUEndpointResponse> {
    const queryIOUUrl = `${this.apiUrl}/query`;

    const getRequestPayload = JSON.stringify(req);
    const parsePayload = JSON.parse(getRequestPayload);
    const participantToken = parsePayload.participantToken;

    const maxretries = 10
    let attempts = 0
    const interval = 2000

    while (attempts < maxretries) {
      try {
        console.log(`Attempt ${attempts + 1}: Fetching data...`);
        const response = await axios.get(queryIOUUrl, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${participantToken}`,
          },
        });
  
        const responseBody = response.data;
        
        // Check if result array has data
        if (responseBody?.result?.length > 0) {
          console.log("Data fetched successfully:", responseBody.result);
          return responseBody; // Return the result if data is present
        }
        
        console.log("Result is empty, retrying...");
      } catch (error: any) {
        console.error("Error fetching data:", error.message);
      }
  
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval)); // Wait before retrying
    }
  
    throw new Error(`Failed to fetch data after ${maxretries} attempts.`);
  }

  public async getPartiesInvolved(
    req: GetPartiesInvolvedEndpointRequest,
  ): Promise<any> {
    // Generate the sample token for 1 participant
    const getRequestPayload = JSON.stringify(req);
    const parsePayload = JSON.parse(getRequestPayload);
    const participantToken = parsePayload.participantToken;

    const maxretries = 10
    let attempts = 0
    const interval = 2000
    const url = `${this.apiUrl}/parties`;

    while (attempts < maxretries) {
      try {
        console.log(`Attempt ${attempts + 1}: Fetching data...`);
        const response = await axios.get(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${participantToken}`,
          },
        });
  
        const responseBody = response.data;
        
        // Check if result array has data
        if (responseBody?.result?.length > 1) {
          console.log("Data fetched successfully:", responseBody.result);
          return responseBody; // Return the result if data is present
        }
        
        console.log("Result is empty, retrying...");
      } catch (error: any) {
        console.error("Error fetching data:", error.message);
      }
  
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval)); // Wait before retrying
    }
  
    throw new Error(`Failed to fetch data after ${maxretries} attempts.`);
  }
}