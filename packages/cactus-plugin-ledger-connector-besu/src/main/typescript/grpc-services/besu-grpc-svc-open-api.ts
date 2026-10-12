import { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { status } from "@grpc/grpc-js";

import { google } from "../generated/proto/protoc-gen-ts/google/protobuf/empty";
import * as default_service from "../generated/proto/protoc-gen-ts/services/default_service";
import { getBlockV1Grpc } from "../impl/get-block-v1/get-block-v1-grpc";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  createRuntimeErrorWithCause,
  safeStringifyException,
} from "@hyperledger-cacti/cactus-common";
import Web3 from "web3";

export interface IBesuGrpcSvcOpenApiOptions {
  readonly logLevel?: LogLevelDesc;
  readonly web3: Web3;
}

export class BesuGrpcSvcOpenApi extends default_service.org.hyperledger.cacti
  .plugin.ledger.connector.besu.services.defaultservice
  .UnimplementedDefaultServiceService {
  // No choice but to disable the linter here because we need to be able to
  // declare fields on the implementation class but the parent class forces to
  // only have methods implementations not fields.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [field: string]: any;

  public static readonly CLASS_NAME = "BesuGrpcSvcOpenApi";

  public get className(): string {
    return BesuGrpcSvcOpenApi.CLASS_NAME;
  }

  private readonly log: Logger;

  private readonly web3: Web3;

  /**
   * The log level that will be used throughout all the methods of this class.
   */
  private readonly logLevel: LogLevelDesc;
  constructor(public readonly opts: IBesuGrpcSvcOpenApiOptions) {
    super();
    this.logLevel = opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level: this.logLevel, label });
    this.web3 = opts.web3;
    this.log.debug(`Created instance of ${this.className} OK`);
  }

  public DeployContractSolBytecodeV1(
    call: ServerUnaryCall<
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DeployContractSolBytecodeV1Request,
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DeployContractSolBytecodeV1Response
    >,
    callback: sendUnaryData<default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DeployContractSolBytecodeV1Response>,
  ): void {
    return callback({
      message: "Status.UNIMPLEMENTED",
      code: status.UNIMPLEMENTED,
      details: "Service endpoint not yet implemented.",
    });
  }

  public DeployContractSolBytecodeNoKeychainV1(
    call: ServerUnaryCall<
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DeployContractSolBytecodeNoKeychainV1Request,
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DeployContractSolBytecodeNoKeychainV1Response
    >,
    callback: sendUnaryData<default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DeployContractSolBytecodeNoKeychainV1Response>,
  ): void {
    return callback({
      message: "Status.UNIMPLEMENTED",
      code: status.UNIMPLEMENTED,
      details: "Service endpoint not yet implemented.",
    });
  }

  public GetBalanceV1(
    call: ServerUnaryCall<
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetBalanceV1Request,
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetBalanceV1Response
    >,
    callback: sendUnaryData<default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetBalanceV1Response>,
  ): void {
    return callback({
      message: "Status.UNIMPLEMENTED",
      code: status.UNIMPLEMENTED,
      details: "Service endpoint not yet implemented.",
    });
  }

  public GetBesuRecordV1(
    call: ServerUnaryCall<
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetBesuRecordV1Request,
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetBesuRecordV1Response
    >,
    callback: sendUnaryData<default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetBesuRecordV1Response>,
  ): void {
    return callback({
      message: "Status.UNIMPLEMENTED",
      code: status.UNIMPLEMENTED,
      details: "Service endpoint not yet implemented.",
    });
  }

  public GetBlockV1(
    call: ServerUnaryCall<
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetBlockV1Request,
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetBlockV1Response
    >,
    callback: sendUnaryData<default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetBlockV1Response>,
  ): void {
    getBlockV1Grpc({ web3: this.web3, logLevel: this.logLevel }, call.request)
      .then((res) => {
        const response =
          new default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetBlockV1Response();
        response.get_block_v1_response_pb_200 = res;
        callback(null, response);
      })
      .catch((cause: unknown) => {
        const ex = createRuntimeErrorWithCause("getBlockGrpc() crashed", cause);
        const exJson = safeStringifyException(ex);
        this.log.debug("getBlockGrpc() crashed with %o", cause);
        callback({
          message: "status.INTERNAL - getBlockGrpc() call crashed.",
          code: status.INTERNAL,
          stack: ex.stack,
          name: ex.name,
          details: exJson,
        });
      });
  }

  public GetOpenApiSpecV1(
    call: ServerUnaryCall<
      google.protobuf.Empty,
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetOpenApiSpecV1Response
    >,
    callback: sendUnaryData<default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetOpenApiSpecV1Response>,
  ): void {
    return callback({
      message: "Status.UNIMPLEMENTED",
      code: status.UNIMPLEMENTED,
      details: "Service endpoint not yet implemented.",
    });
  }

  public GetPastLogsV1(
    call: ServerUnaryCall<
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetPastLogsV1Request,
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetPastLogsV1Response
    >,
    callback: sendUnaryData<default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetPastLogsV1Response>,
  ): void {
    return callback({
      message: "Status.UNIMPLEMENTED",
      code: status.UNIMPLEMENTED,
      details: "Service endpoint not yet implemented.",
    });
  }

  public GetPrometheusMetricsV1(
    call: ServerUnaryCall<
      google.protobuf.Empty,
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetPrometheusMetricsV1Response
    >,
    callback: sendUnaryData<default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetPrometheusMetricsV1Response>,
  ): void {
    return callback({
      message: "Status.UNIMPLEMENTED",
      code: status.UNIMPLEMENTED,
      details: "Service endpoint not yet implemented.",
    });
  }

  public GetTransactionV1(
    call: ServerUnaryCall<
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetTransactionV1Request,
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetTransactionV1Response
    >,
    callback: sendUnaryData<default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetTransactionV1Response>,
  ): void {
    return callback({
      message: "Status.UNIMPLEMENTED",
      code: status.UNIMPLEMENTED,
      details: "Service endpoint not yet implemented.",
    });
  }

  public InvokeContractV1(
    call: ServerUnaryCall<
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.InvokeContractV1Request,
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.InvokeContractV1Response
    >,
    callback: sendUnaryData<default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.InvokeContractV1Response>,
  ): void {
    return callback({
      message: "Status.UNIMPLEMENTED",
      code: status.UNIMPLEMENTED,
      details: "Service endpoint not yet implemented.",
    });
  }

  public RunTransactionV1(
    call: ServerUnaryCall<
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.RunTransactionV1Request,
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.RunTransactionV1Response
    >,
    callback: sendUnaryData<default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.RunTransactionV1Response>,
  ): void {
    return callback({
      message: "Status.UNIMPLEMENTED",
      code: status.UNIMPLEMENTED,
      details: "Service endpoint not yet implemented.",
    });
  }

  public SignTransactionV1(
    call: ServerUnaryCall<
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.SignTransactionV1Request,
      default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.SignTransactionV1Response
    >,
    callback: sendUnaryData<default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.SignTransactionV1Response>,
  ): void {
    return callback({
      message: "Status.UNIMPLEMENTED",
      code: status.UNIMPLEMENTED,
      details: "Service endpoint not yet implemented.",
    });
  }
}
