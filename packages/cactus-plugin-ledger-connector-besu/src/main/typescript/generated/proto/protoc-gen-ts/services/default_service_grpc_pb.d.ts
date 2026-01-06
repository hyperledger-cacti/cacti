// package: org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice
// file: services/default_service.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as services_default_service_pb from "../services/default_service_pb";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
import * as models_backing_ledger_unavailable_error_pb_pb from "../models/backing_ledger_unavailable_error_pb_pb";
import * as models_deploy_contract_solidity_bytecode_no_keychain_v1_request_pb_pb from "../models/deploy_contract_solidity_bytecode_no_keychain_v1_request_pb_pb";
import * as models_deploy_contract_solidity_bytecode_v1_request_pb_pb from "../models/deploy_contract_solidity_bytecode_v1_request_pb_pb";
import * as models_deploy_contract_solidity_bytecode_v1_response_pb_pb from "../models/deploy_contract_solidity_bytecode_v1_response_pb_pb";
import * as models_get_balance_v1_request_pb_pb from "../models/get_balance_v1_request_pb_pb";
import * as models_get_balance_v1_response_pb_pb from "../models/get_balance_v1_response_pb_pb";
import * as models_get_besu_record_v1_request_pb_pb from "../models/get_besu_record_v1_request_pb_pb";
import * as models_get_besu_record_v1_response_pb_pb from "../models/get_besu_record_v1_response_pb_pb";
import * as models_get_block_v1_request_pb_pb from "../models/get_block_v1_request_pb_pb";
import * as models_get_block_v1_response_pb_pb from "../models/get_block_v1_response_pb_pb";
import * as models_get_past_logs_v1_request_pb_pb from "../models/get_past_logs_v1_request_pb_pb";
import * as models_get_past_logs_v1_response_pb_pb from "../models/get_past_logs_v1_response_pb_pb";
import * as models_get_transaction_v1_request_pb_pb from "../models/get_transaction_v1_request_pb_pb";
import * as models_get_transaction_v1_response_pb_pb from "../models/get_transaction_v1_response_pb_pb";
import * as models_invoke_contract_v1_request_pb_pb from "../models/invoke_contract_v1_request_pb_pb";
import * as models_invoke_contract_v1_response_pb_pb from "../models/invoke_contract_v1_response_pb_pb";
import * as models_run_transaction_request_pb_pb from "../models/run_transaction_request_pb_pb";
import * as models_run_transaction_response_pb_pb from "../models/run_transaction_response_pb_pb";
import * as models_sign_transaction_request_pb_pb from "../models/sign_transaction_request_pb_pb";
import * as models_sign_transaction_response_pb_pb from "../models/sign_transaction_response_pb_pb";

interface IDefaultServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    deployContractSolBytecodeNoKeychainV1: IDefaultServiceService_IDeployContractSolBytecodeNoKeychainV1;
    deployContractSolBytecodeV1: IDefaultServiceService_IDeployContractSolBytecodeV1;
    getBalanceV1: IDefaultServiceService_IGetBalanceV1;
    getBesuRecordV1: IDefaultServiceService_IGetBesuRecordV1;
    getBlockV1: IDefaultServiceService_IGetBlockV1;
    getOpenApiSpecV1: IDefaultServiceService_IGetOpenApiSpecV1;
    getPastLogsV1: IDefaultServiceService_IGetPastLogsV1;
    getPrometheusMetricsV1: IDefaultServiceService_IGetPrometheusMetricsV1;
    getTransactionV1: IDefaultServiceService_IGetTransactionV1;
    invokeContractV1: IDefaultServiceService_IInvokeContractV1;
    runTransactionV1: IDefaultServiceService_IRunTransactionV1;
    signTransactionV1: IDefaultServiceService_ISignTransactionV1;
}

interface IDefaultServiceService_IDeployContractSolBytecodeNoKeychainV1 extends grpc.MethodDefinition<services_default_service_pb.DeployContractSolBytecodeNoKeychainV1Request, models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB> {
    path: "/org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultService/DeployContractSolBytecodeNoKeychainV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<services_default_service_pb.DeployContractSolBytecodeNoKeychainV1Request>;
    requestDeserialize: grpc.deserialize<services_default_service_pb.DeployContractSolBytecodeNoKeychainV1Request>;
    responseSerialize: grpc.serialize<models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB>;
    responseDeserialize: grpc.deserialize<models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB>;
}
interface IDefaultServiceService_IDeployContractSolBytecodeV1 extends grpc.MethodDefinition<services_default_service_pb.DeployContractSolBytecodeV1Request, models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB> {
    path: "/org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultService/DeployContractSolBytecodeV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<services_default_service_pb.DeployContractSolBytecodeV1Request>;
    requestDeserialize: grpc.deserialize<services_default_service_pb.DeployContractSolBytecodeV1Request>;
    responseSerialize: grpc.serialize<models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB>;
    responseDeserialize: grpc.deserialize<models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB>;
}
interface IDefaultServiceService_IGetBalanceV1 extends grpc.MethodDefinition<services_default_service_pb.GetBalanceV1Request, models_get_balance_v1_response_pb_pb.GetBalanceV1ResponsePB> {
    path: "/org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultService/GetBalanceV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<services_default_service_pb.GetBalanceV1Request>;
    requestDeserialize: grpc.deserialize<services_default_service_pb.GetBalanceV1Request>;
    responseSerialize: grpc.serialize<models_get_balance_v1_response_pb_pb.GetBalanceV1ResponsePB>;
    responseDeserialize: grpc.deserialize<models_get_balance_v1_response_pb_pb.GetBalanceV1ResponsePB>;
}
interface IDefaultServiceService_IGetBesuRecordV1 extends grpc.MethodDefinition<services_default_service_pb.GetBesuRecordV1Request, models_get_besu_record_v1_response_pb_pb.GetBesuRecordV1ResponsePB> {
    path: "/org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultService/GetBesuRecordV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<services_default_service_pb.GetBesuRecordV1Request>;
    requestDeserialize: grpc.deserialize<services_default_service_pb.GetBesuRecordV1Request>;
    responseSerialize: grpc.serialize<models_get_besu_record_v1_response_pb_pb.GetBesuRecordV1ResponsePB>;
    responseDeserialize: grpc.deserialize<models_get_besu_record_v1_response_pb_pb.GetBesuRecordV1ResponsePB>;
}
interface IDefaultServiceService_IGetBlockV1 extends grpc.MethodDefinition<services_default_service_pb.GetBlockV1Request, models_get_block_v1_response_pb_pb.GetBlockV1ResponsePB> {
    path: "/org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultService/GetBlockV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<services_default_service_pb.GetBlockV1Request>;
    requestDeserialize: grpc.deserialize<services_default_service_pb.GetBlockV1Request>;
    responseSerialize: grpc.serialize<models_get_block_v1_response_pb_pb.GetBlockV1ResponsePB>;
    responseDeserialize: grpc.deserialize<models_get_block_v1_response_pb_pb.GetBlockV1ResponsePB>;
}
interface IDefaultServiceService_IGetOpenApiSpecV1 extends grpc.MethodDefinition<google_protobuf_empty_pb.Empty, services_default_service_pb.GetOpenApiSpecV1Response> {
    path: "/org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultService/GetOpenApiSpecV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<google_protobuf_empty_pb.Empty>;
    requestDeserialize: grpc.deserialize<google_protobuf_empty_pb.Empty>;
    responseSerialize: grpc.serialize<services_default_service_pb.GetOpenApiSpecV1Response>;
    responseDeserialize: grpc.deserialize<services_default_service_pb.GetOpenApiSpecV1Response>;
}
interface IDefaultServiceService_IGetPastLogsV1 extends grpc.MethodDefinition<services_default_service_pb.GetPastLogsV1Request, models_get_past_logs_v1_response_pb_pb.GetPastLogsV1ResponsePB> {
    path: "/org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultService/GetPastLogsV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<services_default_service_pb.GetPastLogsV1Request>;
    requestDeserialize: grpc.deserialize<services_default_service_pb.GetPastLogsV1Request>;
    responseSerialize: grpc.serialize<models_get_past_logs_v1_response_pb_pb.GetPastLogsV1ResponsePB>;
    responseDeserialize: grpc.deserialize<models_get_past_logs_v1_response_pb_pb.GetPastLogsV1ResponsePB>;
}
interface IDefaultServiceService_IGetPrometheusMetricsV1 extends grpc.MethodDefinition<google_protobuf_empty_pb.Empty, services_default_service_pb.GetPrometheusMetricsV1Response> {
    path: "/org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultService/GetPrometheusMetricsV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<google_protobuf_empty_pb.Empty>;
    requestDeserialize: grpc.deserialize<google_protobuf_empty_pb.Empty>;
    responseSerialize: grpc.serialize<services_default_service_pb.GetPrometheusMetricsV1Response>;
    responseDeserialize: grpc.deserialize<services_default_service_pb.GetPrometheusMetricsV1Response>;
}
interface IDefaultServiceService_IGetTransactionV1 extends grpc.MethodDefinition<services_default_service_pb.GetTransactionV1Request, models_get_transaction_v1_response_pb_pb.GetTransactionV1ResponsePB> {
    path: "/org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultService/GetTransactionV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<services_default_service_pb.GetTransactionV1Request>;
    requestDeserialize: grpc.deserialize<services_default_service_pb.GetTransactionV1Request>;
    responseSerialize: grpc.serialize<models_get_transaction_v1_response_pb_pb.GetTransactionV1ResponsePB>;
    responseDeserialize: grpc.deserialize<models_get_transaction_v1_response_pb_pb.GetTransactionV1ResponsePB>;
}
interface IDefaultServiceService_IInvokeContractV1 extends grpc.MethodDefinition<services_default_service_pb.InvokeContractV1Request, models_invoke_contract_v1_response_pb_pb.InvokeContractV1ResponsePB> {
    path: "/org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultService/InvokeContractV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<services_default_service_pb.InvokeContractV1Request>;
    requestDeserialize: grpc.deserialize<services_default_service_pb.InvokeContractV1Request>;
    responseSerialize: grpc.serialize<models_invoke_contract_v1_response_pb_pb.InvokeContractV1ResponsePB>;
    responseDeserialize: grpc.deserialize<models_invoke_contract_v1_response_pb_pb.InvokeContractV1ResponsePB>;
}
interface IDefaultServiceService_IRunTransactionV1 extends grpc.MethodDefinition<services_default_service_pb.RunTransactionV1Request, models_run_transaction_response_pb_pb.RunTransactionResponsePB> {
    path: "/org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultService/RunTransactionV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<services_default_service_pb.RunTransactionV1Request>;
    requestDeserialize: grpc.deserialize<services_default_service_pb.RunTransactionV1Request>;
    responseSerialize: grpc.serialize<models_run_transaction_response_pb_pb.RunTransactionResponsePB>;
    responseDeserialize: grpc.deserialize<models_run_transaction_response_pb_pb.RunTransactionResponsePB>;
}
interface IDefaultServiceService_ISignTransactionV1 extends grpc.MethodDefinition<services_default_service_pb.SignTransactionV1Request, models_sign_transaction_response_pb_pb.SignTransactionResponsePB> {
    path: "/org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultService/SignTransactionV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<services_default_service_pb.SignTransactionV1Request>;
    requestDeserialize: grpc.deserialize<services_default_service_pb.SignTransactionV1Request>;
    responseSerialize: grpc.serialize<models_sign_transaction_response_pb_pb.SignTransactionResponsePB>;
    responseDeserialize: grpc.deserialize<models_sign_transaction_response_pb_pb.SignTransactionResponsePB>;
}

export const DefaultServiceService: IDefaultServiceService;

export interface IDefaultServiceServer extends grpc.UntypedServiceImplementation {
    deployContractSolBytecodeNoKeychainV1: grpc.handleUnaryCall<services_default_service_pb.DeployContractSolBytecodeNoKeychainV1Request, models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB>;
    deployContractSolBytecodeV1: grpc.handleUnaryCall<services_default_service_pb.DeployContractSolBytecodeV1Request, models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB>;
    getBalanceV1: grpc.handleUnaryCall<services_default_service_pb.GetBalanceV1Request, models_get_balance_v1_response_pb_pb.GetBalanceV1ResponsePB>;
    getBesuRecordV1: grpc.handleUnaryCall<services_default_service_pb.GetBesuRecordV1Request, models_get_besu_record_v1_response_pb_pb.GetBesuRecordV1ResponsePB>;
    getBlockV1: grpc.handleUnaryCall<services_default_service_pb.GetBlockV1Request, models_get_block_v1_response_pb_pb.GetBlockV1ResponsePB>;
    getOpenApiSpecV1: grpc.handleUnaryCall<google_protobuf_empty_pb.Empty, services_default_service_pb.GetOpenApiSpecV1Response>;
    getPastLogsV1: grpc.handleUnaryCall<services_default_service_pb.GetPastLogsV1Request, models_get_past_logs_v1_response_pb_pb.GetPastLogsV1ResponsePB>;
    getPrometheusMetricsV1: grpc.handleUnaryCall<google_protobuf_empty_pb.Empty, services_default_service_pb.GetPrometheusMetricsV1Response>;
    getTransactionV1: grpc.handleUnaryCall<services_default_service_pb.GetTransactionV1Request, models_get_transaction_v1_response_pb_pb.GetTransactionV1ResponsePB>;
    invokeContractV1: grpc.handleUnaryCall<services_default_service_pb.InvokeContractV1Request, models_invoke_contract_v1_response_pb_pb.InvokeContractV1ResponsePB>;
    runTransactionV1: grpc.handleUnaryCall<services_default_service_pb.RunTransactionV1Request, models_run_transaction_response_pb_pb.RunTransactionResponsePB>;
    signTransactionV1: grpc.handleUnaryCall<services_default_service_pb.SignTransactionV1Request, models_sign_transaction_response_pb_pb.SignTransactionResponsePB>;
}

export interface IDefaultServiceClient {
    deployContractSolBytecodeNoKeychainV1(request: services_default_service_pb.DeployContractSolBytecodeNoKeychainV1Request, callback: (error: grpc.ServiceError | null, response: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB) => void): grpc.ClientUnaryCall;
    deployContractSolBytecodeNoKeychainV1(request: services_default_service_pb.DeployContractSolBytecodeNoKeychainV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB) => void): grpc.ClientUnaryCall;
    deployContractSolBytecodeNoKeychainV1(request: services_default_service_pb.DeployContractSolBytecodeNoKeychainV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB) => void): grpc.ClientUnaryCall;
    deployContractSolBytecodeV1(request: services_default_service_pb.DeployContractSolBytecodeV1Request, callback: (error: grpc.ServiceError | null, response: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB) => void): grpc.ClientUnaryCall;
    deployContractSolBytecodeV1(request: services_default_service_pb.DeployContractSolBytecodeV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB) => void): grpc.ClientUnaryCall;
    deployContractSolBytecodeV1(request: services_default_service_pb.DeployContractSolBytecodeV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB) => void): grpc.ClientUnaryCall;
    getBalanceV1(request: services_default_service_pb.GetBalanceV1Request, callback: (error: grpc.ServiceError | null, response: models_get_balance_v1_response_pb_pb.GetBalanceV1ResponsePB) => void): grpc.ClientUnaryCall;
    getBalanceV1(request: services_default_service_pb.GetBalanceV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_get_balance_v1_response_pb_pb.GetBalanceV1ResponsePB) => void): grpc.ClientUnaryCall;
    getBalanceV1(request: services_default_service_pb.GetBalanceV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_get_balance_v1_response_pb_pb.GetBalanceV1ResponsePB) => void): grpc.ClientUnaryCall;
    getBesuRecordV1(request: services_default_service_pb.GetBesuRecordV1Request, callback: (error: grpc.ServiceError | null, response: models_get_besu_record_v1_response_pb_pb.GetBesuRecordV1ResponsePB) => void): grpc.ClientUnaryCall;
    getBesuRecordV1(request: services_default_service_pb.GetBesuRecordV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_get_besu_record_v1_response_pb_pb.GetBesuRecordV1ResponsePB) => void): grpc.ClientUnaryCall;
    getBesuRecordV1(request: services_default_service_pb.GetBesuRecordV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_get_besu_record_v1_response_pb_pb.GetBesuRecordV1ResponsePB) => void): grpc.ClientUnaryCall;
    getBlockV1(request: services_default_service_pb.GetBlockV1Request, callback: (error: grpc.ServiceError | null, response: models_get_block_v1_response_pb_pb.GetBlockV1ResponsePB) => void): grpc.ClientUnaryCall;
    getBlockV1(request: services_default_service_pb.GetBlockV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_get_block_v1_response_pb_pb.GetBlockV1ResponsePB) => void): grpc.ClientUnaryCall;
    getBlockV1(request: services_default_service_pb.GetBlockV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_get_block_v1_response_pb_pb.GetBlockV1ResponsePB) => void): grpc.ClientUnaryCall;
    getOpenApiSpecV1(request: google_protobuf_empty_pb.Empty, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetOpenApiSpecV1Response) => void): grpc.ClientUnaryCall;
    getOpenApiSpecV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetOpenApiSpecV1Response) => void): grpc.ClientUnaryCall;
    getOpenApiSpecV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetOpenApiSpecV1Response) => void): grpc.ClientUnaryCall;
    getPastLogsV1(request: services_default_service_pb.GetPastLogsV1Request, callback: (error: grpc.ServiceError | null, response: models_get_past_logs_v1_response_pb_pb.GetPastLogsV1ResponsePB) => void): grpc.ClientUnaryCall;
    getPastLogsV1(request: services_default_service_pb.GetPastLogsV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_get_past_logs_v1_response_pb_pb.GetPastLogsV1ResponsePB) => void): grpc.ClientUnaryCall;
    getPastLogsV1(request: services_default_service_pb.GetPastLogsV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_get_past_logs_v1_response_pb_pb.GetPastLogsV1ResponsePB) => void): grpc.ClientUnaryCall;
    getPrometheusMetricsV1(request: google_protobuf_empty_pb.Empty, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetPrometheusMetricsV1Response) => void): grpc.ClientUnaryCall;
    getPrometheusMetricsV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetPrometheusMetricsV1Response) => void): grpc.ClientUnaryCall;
    getPrometheusMetricsV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetPrometheusMetricsV1Response) => void): grpc.ClientUnaryCall;
    getTransactionV1(request: services_default_service_pb.GetTransactionV1Request, callback: (error: grpc.ServiceError | null, response: models_get_transaction_v1_response_pb_pb.GetTransactionV1ResponsePB) => void): grpc.ClientUnaryCall;
    getTransactionV1(request: services_default_service_pb.GetTransactionV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_get_transaction_v1_response_pb_pb.GetTransactionV1ResponsePB) => void): grpc.ClientUnaryCall;
    getTransactionV1(request: services_default_service_pb.GetTransactionV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_get_transaction_v1_response_pb_pb.GetTransactionV1ResponsePB) => void): grpc.ClientUnaryCall;
    invokeContractV1(request: services_default_service_pb.InvokeContractV1Request, callback: (error: grpc.ServiceError | null, response: models_invoke_contract_v1_response_pb_pb.InvokeContractV1ResponsePB) => void): grpc.ClientUnaryCall;
    invokeContractV1(request: services_default_service_pb.InvokeContractV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_invoke_contract_v1_response_pb_pb.InvokeContractV1ResponsePB) => void): grpc.ClientUnaryCall;
    invokeContractV1(request: services_default_service_pb.InvokeContractV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_invoke_contract_v1_response_pb_pb.InvokeContractV1ResponsePB) => void): grpc.ClientUnaryCall;
    runTransactionV1(request: services_default_service_pb.RunTransactionV1Request, callback: (error: grpc.ServiceError | null, response: models_run_transaction_response_pb_pb.RunTransactionResponsePB) => void): grpc.ClientUnaryCall;
    runTransactionV1(request: services_default_service_pb.RunTransactionV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_run_transaction_response_pb_pb.RunTransactionResponsePB) => void): grpc.ClientUnaryCall;
    runTransactionV1(request: services_default_service_pb.RunTransactionV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_run_transaction_response_pb_pb.RunTransactionResponsePB) => void): grpc.ClientUnaryCall;
    signTransactionV1(request: services_default_service_pb.SignTransactionV1Request, callback: (error: grpc.ServiceError | null, response: models_sign_transaction_response_pb_pb.SignTransactionResponsePB) => void): grpc.ClientUnaryCall;
    signTransactionV1(request: services_default_service_pb.SignTransactionV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_sign_transaction_response_pb_pb.SignTransactionResponsePB) => void): grpc.ClientUnaryCall;
    signTransactionV1(request: services_default_service_pb.SignTransactionV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_sign_transaction_response_pb_pb.SignTransactionResponsePB) => void): grpc.ClientUnaryCall;
}

export class DefaultServiceClient extends grpc.Client implements IDefaultServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public deployContractSolBytecodeNoKeychainV1(request: services_default_service_pb.DeployContractSolBytecodeNoKeychainV1Request, callback: (error: grpc.ServiceError | null, response: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB) => void): grpc.ClientUnaryCall;
    public deployContractSolBytecodeNoKeychainV1(request: services_default_service_pb.DeployContractSolBytecodeNoKeychainV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB) => void): grpc.ClientUnaryCall;
    public deployContractSolBytecodeNoKeychainV1(request: services_default_service_pb.DeployContractSolBytecodeNoKeychainV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB) => void): grpc.ClientUnaryCall;
    public deployContractSolBytecodeV1(request: services_default_service_pb.DeployContractSolBytecodeV1Request, callback: (error: grpc.ServiceError | null, response: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB) => void): grpc.ClientUnaryCall;
    public deployContractSolBytecodeV1(request: services_default_service_pb.DeployContractSolBytecodeV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB) => void): grpc.ClientUnaryCall;
    public deployContractSolBytecodeV1(request: services_default_service_pb.DeployContractSolBytecodeV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getBalanceV1(request: services_default_service_pb.GetBalanceV1Request, callback: (error: grpc.ServiceError | null, response: models_get_balance_v1_response_pb_pb.GetBalanceV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getBalanceV1(request: services_default_service_pb.GetBalanceV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_get_balance_v1_response_pb_pb.GetBalanceV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getBalanceV1(request: services_default_service_pb.GetBalanceV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_get_balance_v1_response_pb_pb.GetBalanceV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getBesuRecordV1(request: services_default_service_pb.GetBesuRecordV1Request, callback: (error: grpc.ServiceError | null, response: models_get_besu_record_v1_response_pb_pb.GetBesuRecordV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getBesuRecordV1(request: services_default_service_pb.GetBesuRecordV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_get_besu_record_v1_response_pb_pb.GetBesuRecordV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getBesuRecordV1(request: services_default_service_pb.GetBesuRecordV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_get_besu_record_v1_response_pb_pb.GetBesuRecordV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getBlockV1(request: services_default_service_pb.GetBlockV1Request, callback: (error: grpc.ServiceError | null, response: models_get_block_v1_response_pb_pb.GetBlockV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getBlockV1(request: services_default_service_pb.GetBlockV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_get_block_v1_response_pb_pb.GetBlockV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getBlockV1(request: services_default_service_pb.GetBlockV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_get_block_v1_response_pb_pb.GetBlockV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getOpenApiSpecV1(request: google_protobuf_empty_pb.Empty, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetOpenApiSpecV1Response) => void): grpc.ClientUnaryCall;
    public getOpenApiSpecV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetOpenApiSpecV1Response) => void): grpc.ClientUnaryCall;
    public getOpenApiSpecV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetOpenApiSpecV1Response) => void): grpc.ClientUnaryCall;
    public getPastLogsV1(request: services_default_service_pb.GetPastLogsV1Request, callback: (error: grpc.ServiceError | null, response: models_get_past_logs_v1_response_pb_pb.GetPastLogsV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getPastLogsV1(request: services_default_service_pb.GetPastLogsV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_get_past_logs_v1_response_pb_pb.GetPastLogsV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getPastLogsV1(request: services_default_service_pb.GetPastLogsV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_get_past_logs_v1_response_pb_pb.GetPastLogsV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getPrometheusMetricsV1(request: google_protobuf_empty_pb.Empty, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetPrometheusMetricsV1Response) => void): grpc.ClientUnaryCall;
    public getPrometheusMetricsV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetPrometheusMetricsV1Response) => void): grpc.ClientUnaryCall;
    public getPrometheusMetricsV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetPrometheusMetricsV1Response) => void): grpc.ClientUnaryCall;
    public getTransactionV1(request: services_default_service_pb.GetTransactionV1Request, callback: (error: grpc.ServiceError | null, response: models_get_transaction_v1_response_pb_pb.GetTransactionV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getTransactionV1(request: services_default_service_pb.GetTransactionV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_get_transaction_v1_response_pb_pb.GetTransactionV1ResponsePB) => void): grpc.ClientUnaryCall;
    public getTransactionV1(request: services_default_service_pb.GetTransactionV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_get_transaction_v1_response_pb_pb.GetTransactionV1ResponsePB) => void): grpc.ClientUnaryCall;
    public invokeContractV1(request: services_default_service_pb.InvokeContractV1Request, callback: (error: grpc.ServiceError | null, response: models_invoke_contract_v1_response_pb_pb.InvokeContractV1ResponsePB) => void): grpc.ClientUnaryCall;
    public invokeContractV1(request: services_default_service_pb.InvokeContractV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_invoke_contract_v1_response_pb_pb.InvokeContractV1ResponsePB) => void): grpc.ClientUnaryCall;
    public invokeContractV1(request: services_default_service_pb.InvokeContractV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_invoke_contract_v1_response_pb_pb.InvokeContractV1ResponsePB) => void): grpc.ClientUnaryCall;
    public runTransactionV1(request: services_default_service_pb.RunTransactionV1Request, callback: (error: grpc.ServiceError | null, response: models_run_transaction_response_pb_pb.RunTransactionResponsePB) => void): grpc.ClientUnaryCall;
    public runTransactionV1(request: services_default_service_pb.RunTransactionV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_run_transaction_response_pb_pb.RunTransactionResponsePB) => void): grpc.ClientUnaryCall;
    public runTransactionV1(request: services_default_service_pb.RunTransactionV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_run_transaction_response_pb_pb.RunTransactionResponsePB) => void): grpc.ClientUnaryCall;
    public signTransactionV1(request: services_default_service_pb.SignTransactionV1Request, callback: (error: grpc.ServiceError | null, response: models_sign_transaction_response_pb_pb.SignTransactionResponsePB) => void): grpc.ClientUnaryCall;
    public signTransactionV1(request: services_default_service_pb.SignTransactionV1Request, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_sign_transaction_response_pb_pb.SignTransactionResponsePB) => void): grpc.ClientUnaryCall;
    public signTransactionV1(request: services_default_service_pb.SignTransactionV1Request, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_sign_transaction_response_pb_pb.SignTransactionResponsePB) => void): grpc.ClientUnaryCall;
}
