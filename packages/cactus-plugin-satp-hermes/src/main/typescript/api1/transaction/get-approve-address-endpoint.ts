import {
  Checks,
  IAsyncProvider,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
  LedgerType,
} from "@hyperledger/cactus-core-api";
import type { Express, Request, Response } from "express";
import type { IRequestOptions } from "../../core/types";
import OAS from "../../../json/openapi-blo-bundled.json";
import {
  handleRestEndpointException,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";
import { SATPInternalError } from "../../core/errors/satp-errors";
import { getEnumKeyByValue } from "../../services/utils";
import { Error as SATPErrorType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { GetApproveAddressRequestTokenTypeEnum } from "../../public-api";

export class GetApproveAddressEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetApproveAddressEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return GetApproveAddressEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IRequestOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.dispatcher, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get oasPath(): (typeof OAS.paths)["/api/v1/@hyperledger/cactus-plugin-satp-hermes/approve-address"] {
    return OAS.paths[
      "/api/v1/@hyperledger/cactus-plugin-satp-hermes/approve-address"
    ];
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }
  getVerbLowerCase(): string {
    return this.oasPath.get["x-hyperledger-cacti"].http.verbLowerCase;
  }
  getPath(): string {
    return this.oasPath.get["x-hyperledger-cacti"].http.path;
  }
  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public getOperationId(): string {
    return OAS.paths[
      "/api/v1/@hyperledger/cactus-plugin-satp-hermes/approve-address"
    ].get.operationId;
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: [],
      }),
    };
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = `${this.className}#handleRequest()`;
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(`${fnTag}, ${reqTag}`);
    const request = req.query;
    if (
      !request["ApproveAddressRequest.networkId.id"] ||
      !request["ApproveAddressRequest.networkId.ledgerType"] ||
      !request["ApproveAddressRequest.tokenType"]
    ) {
      res
        .status(400)
        .json({ message: "ApproveAddressRequest query parameter is required" });
      return;
    }
    try {
      const result = await this.options.dispatcher.GetApproveAddress({
        networkId: {
          id: request["ApproveAddressRequest.networkId.id"] as string,
          ledgerType: request[
            "ApproveAddressRequest.networkId.ledgerType"
          ] as LedgerType,
        },
        tokenType: request[
          "ApproveAddressRequest.tokenType"
        ] as GetApproveAddressRequestTokenTypeEnum,
      });
      res.json(result);
    } catch (ex) {
      const errorMsg = `${reqTag} ${fnTag} Failed to get approve address: ${getEnumKeyByValue(SATPErrorType, (ex as SATPInternalError).getSATPErrorType())}`;
      handleRestEndpointException({ errorMsg, log: this.log, error: ex, res });
    }
  }
}
