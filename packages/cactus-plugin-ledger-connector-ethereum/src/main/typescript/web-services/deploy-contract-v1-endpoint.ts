import { Express, Request, Response } from "express";
import { Ajv } from "ajv";
import RefParser from "@apidevtools/json-schema-ref-parser";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
  safeStringifyException,
} from "@hyperledger/cactus-common";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { PluginLedgerConnectorEthereum } from "../plugin-ledger-connector-ethereum";
import OAS from "../../json/openapi.json";
import { ERR_INVALID_RESPONSE } from "web3";
import { isWeb3Error } from "../public-api";

async function preprocessSchema() {
  const resolvedSchema = await RefParser.dereference(OAS);
  function adjustNullable(obj: Record<string, unknown>) {
    if (typeof obj !== "object" || obj === null) return;
    if ("nullable" in obj && !("type" in obj)) {
      delete obj.nullable;
    }
    if (obj.nullable === true && obj.type && typeof obj.type === "string") {
      obj.type = [obj.type, "null"];
      delete obj.nullable;
    }
    if (obj.nullable === false) {
      delete obj.nullable;
    }
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        adjustNullable(obj[key] as Record<string, unknown>);
      }
    }
  }

  adjustNullable(resolvedSchema as Record<string, unknown>);
  return resolvedSchema;
}

let validateDeployContract: ReturnType<Ajv["compile"]> | undefined;
async function getValidateDeployContract(): Promise<
  ReturnType<Ajv["compile"]>
> {
  if (validateDeployContract) {
    return validateDeployContract;
  }

  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    allowMatchingProperties: true,
  });
  const processedSchema = await preprocessSchema();
  ajv.addSchema(processedSchema, "openapi.json");

  validateDeployContract = ajv.compile({
    $ref: "openapi.json#/components/schemas/DeployContractV1Request",
  });
  return validateDeployContract;
}

export interface IDeployContractSolidityBytecodeOptions {
  logLevel?: LogLevelDesc;
  connector: PluginLedgerConnectorEthereum;
}

export class DeployContractEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "DeployContractEndpoint";

  private readonly log: Logger;

  public get className(): string {
    return DeployContractEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: IDeployContractSolidityBytecodeOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.connector, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-ethereum/deploy-contract"] {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-ethereum/deploy-contract"
    ];
  }

  public getPath(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.path;
  }

  public getVerbLowerCase(): string {
    return this.oasPath.post["x-hyperledger-cacti"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return this.oasPath.post.operationId;
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    // TODO: make this an injectable dependency in the constructor
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: [],
      }),
    };
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);

    const validate = await getValidateDeployContract();
    const isValid = validate(req.body);
    if (!isValid) {
      const errorDetails = JSON.stringify(validate.errors);
      this.log.debug(`Validation failed for ${reqTag}: ${errorDetails}`);
      res.status(400).json({
        message: "Invalid request body",
        errors: validate.errors,
      });
      return;
    }
    try {
      res
        .status(200)
        .json(await this.options.connector.deployContract(req.body));
    } catch (ex) {
      this.log.error(`Crash while serving ${reqTag}`, ex);

      // Return errors responses from ethereum node as user errors
      if (isWeb3Error(ex) && ex.code === ERR_INVALID_RESPONSE) {
        res.status(400).json({
          message: "Invalid Response Error",
          error: safeStringifyException(ex),
        });
        return;
      }

      res.status(500).json({
        message: "Internal Server Error",
        error: safeStringifyException(ex),
      });
    }
  }
}
