// package: org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice
// file: services/default_service.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
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

export class DeployContractSolBytecodeNoKeychainV1Request extends jspb.Message { 

    hasDeploycontractsoliditybytecodenokeychainv1requestpb(): boolean;
    clearDeploycontractsoliditybytecodenokeychainv1requestpb(): void;
    getDeploycontractsoliditybytecodenokeychainv1requestpb(): models_deploy_contract_solidity_bytecode_no_keychain_v1_request_pb_pb.DeployContractSolidityBytecodeNoKeychainV1RequestPB | undefined;
    setDeploycontractsoliditybytecodenokeychainv1requestpb(value?: models_deploy_contract_solidity_bytecode_no_keychain_v1_request_pb_pb.DeployContractSolidityBytecodeNoKeychainV1RequestPB): DeployContractSolBytecodeNoKeychainV1Request;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeployContractSolBytecodeNoKeychainV1Request.AsObject;
    static toObject(includeInstance: boolean, msg: DeployContractSolBytecodeNoKeychainV1Request): DeployContractSolBytecodeNoKeychainV1Request.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeployContractSolBytecodeNoKeychainV1Request, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeployContractSolBytecodeNoKeychainV1Request;
    static deserializeBinaryFromReader(message: DeployContractSolBytecodeNoKeychainV1Request, reader: jspb.BinaryReader): DeployContractSolBytecodeNoKeychainV1Request;
}

export namespace DeployContractSolBytecodeNoKeychainV1Request {
    export type AsObject = {
        deploycontractsoliditybytecodenokeychainv1requestpb?: models_deploy_contract_solidity_bytecode_no_keychain_v1_request_pb_pb.DeployContractSolidityBytecodeNoKeychainV1RequestPB.AsObject,
    }
}

export class DeployContractSolBytecodeV1Request extends jspb.Message { 

    hasDeploycontractsoliditybytecodev1requestpb(): boolean;
    clearDeploycontractsoliditybytecodev1requestpb(): void;
    getDeploycontractsoliditybytecodev1requestpb(): models_deploy_contract_solidity_bytecode_v1_request_pb_pb.DeployContractSolidityBytecodeV1RequestPB | undefined;
    setDeploycontractsoliditybytecodev1requestpb(value?: models_deploy_contract_solidity_bytecode_v1_request_pb_pb.DeployContractSolidityBytecodeV1RequestPB): DeployContractSolBytecodeV1Request;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeployContractSolBytecodeV1Request.AsObject;
    static toObject(includeInstance: boolean, msg: DeployContractSolBytecodeV1Request): DeployContractSolBytecodeV1Request.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeployContractSolBytecodeV1Request, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeployContractSolBytecodeV1Request;
    static deserializeBinaryFromReader(message: DeployContractSolBytecodeV1Request, reader: jspb.BinaryReader): DeployContractSolBytecodeV1Request;
}

export namespace DeployContractSolBytecodeV1Request {
    export type AsObject = {
        deploycontractsoliditybytecodev1requestpb?: models_deploy_contract_solidity_bytecode_v1_request_pb_pb.DeployContractSolidityBytecodeV1RequestPB.AsObject,
    }
}

export class GetBalanceV1Request extends jspb.Message { 

    hasGetbalancev1requestpb(): boolean;
    clearGetbalancev1requestpb(): void;
    getGetbalancev1requestpb(): models_get_balance_v1_request_pb_pb.GetBalanceV1RequestPB | undefined;
    setGetbalancev1requestpb(value?: models_get_balance_v1_request_pb_pb.GetBalanceV1RequestPB): GetBalanceV1Request;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBalanceV1Request.AsObject;
    static toObject(includeInstance: boolean, msg: GetBalanceV1Request): GetBalanceV1Request.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBalanceV1Request, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBalanceV1Request;
    static deserializeBinaryFromReader(message: GetBalanceV1Request, reader: jspb.BinaryReader): GetBalanceV1Request;
}

export namespace GetBalanceV1Request {
    export type AsObject = {
        getbalancev1requestpb?: models_get_balance_v1_request_pb_pb.GetBalanceV1RequestPB.AsObject,
    }
}

export class GetBesuRecordV1Request extends jspb.Message { 

    hasGetbesurecordv1requestpb(): boolean;
    clearGetbesurecordv1requestpb(): void;
    getGetbesurecordv1requestpb(): models_get_besu_record_v1_request_pb_pb.GetBesuRecordV1RequestPB | undefined;
    setGetbesurecordv1requestpb(value?: models_get_besu_record_v1_request_pb_pb.GetBesuRecordV1RequestPB): GetBesuRecordV1Request;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBesuRecordV1Request.AsObject;
    static toObject(includeInstance: boolean, msg: GetBesuRecordV1Request): GetBesuRecordV1Request.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBesuRecordV1Request, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBesuRecordV1Request;
    static deserializeBinaryFromReader(message: GetBesuRecordV1Request, reader: jspb.BinaryReader): GetBesuRecordV1Request;
}

export namespace GetBesuRecordV1Request {
    export type AsObject = {
        getbesurecordv1requestpb?: models_get_besu_record_v1_request_pb_pb.GetBesuRecordV1RequestPB.AsObject,
    }
}

export class GetBlockV1Request extends jspb.Message { 

    hasGetblockv1requestpb(): boolean;
    clearGetblockv1requestpb(): void;
    getGetblockv1requestpb(): models_get_block_v1_request_pb_pb.GetBlockV1RequestPB | undefined;
    setGetblockv1requestpb(value?: models_get_block_v1_request_pb_pb.GetBlockV1RequestPB): GetBlockV1Request;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBlockV1Request.AsObject;
    static toObject(includeInstance: boolean, msg: GetBlockV1Request): GetBlockV1Request.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBlockV1Request, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBlockV1Request;
    static deserializeBinaryFromReader(message: GetBlockV1Request, reader: jspb.BinaryReader): GetBlockV1Request;
}

export namespace GetBlockV1Request {
    export type AsObject = {
        getblockv1requestpb?: models_get_block_v1_request_pb_pb.GetBlockV1RequestPB.AsObject,
    }
}

export class GetOpenApiSpecV1Response extends jspb.Message { 
    getData(): string;
    setData(value: string): GetOpenApiSpecV1Response;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetOpenApiSpecV1Response.AsObject;
    static toObject(includeInstance: boolean, msg: GetOpenApiSpecV1Response): GetOpenApiSpecV1Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetOpenApiSpecV1Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetOpenApiSpecV1Response;
    static deserializeBinaryFromReader(message: GetOpenApiSpecV1Response, reader: jspb.BinaryReader): GetOpenApiSpecV1Response;
}

export namespace GetOpenApiSpecV1Response {
    export type AsObject = {
        data: string,
    }
}

export class GetPastLogsV1Request extends jspb.Message { 

    hasGetpastlogsv1requestpb(): boolean;
    clearGetpastlogsv1requestpb(): void;
    getGetpastlogsv1requestpb(): models_get_past_logs_v1_request_pb_pb.GetPastLogsV1RequestPB | undefined;
    setGetpastlogsv1requestpb(value?: models_get_past_logs_v1_request_pb_pb.GetPastLogsV1RequestPB): GetPastLogsV1Request;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetPastLogsV1Request.AsObject;
    static toObject(includeInstance: boolean, msg: GetPastLogsV1Request): GetPastLogsV1Request.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetPastLogsV1Request, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetPastLogsV1Request;
    static deserializeBinaryFromReader(message: GetPastLogsV1Request, reader: jspb.BinaryReader): GetPastLogsV1Request;
}

export namespace GetPastLogsV1Request {
    export type AsObject = {
        getpastlogsv1requestpb?: models_get_past_logs_v1_request_pb_pb.GetPastLogsV1RequestPB.AsObject,
    }
}

export class GetPrometheusMetricsV1Response extends jspb.Message { 
    getData(): string;
    setData(value: string): GetPrometheusMetricsV1Response;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetPrometheusMetricsV1Response.AsObject;
    static toObject(includeInstance: boolean, msg: GetPrometheusMetricsV1Response): GetPrometheusMetricsV1Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetPrometheusMetricsV1Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetPrometheusMetricsV1Response;
    static deserializeBinaryFromReader(message: GetPrometheusMetricsV1Response, reader: jspb.BinaryReader): GetPrometheusMetricsV1Response;
}

export namespace GetPrometheusMetricsV1Response {
    export type AsObject = {
        data: string,
    }
}

export class GetTransactionV1Request extends jspb.Message { 

    hasGettransactionv1requestpb(): boolean;
    clearGettransactionv1requestpb(): void;
    getGettransactionv1requestpb(): models_get_transaction_v1_request_pb_pb.GetTransactionV1RequestPB | undefined;
    setGettransactionv1requestpb(value?: models_get_transaction_v1_request_pb_pb.GetTransactionV1RequestPB): GetTransactionV1Request;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetTransactionV1Request.AsObject;
    static toObject(includeInstance: boolean, msg: GetTransactionV1Request): GetTransactionV1Request.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetTransactionV1Request, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetTransactionV1Request;
    static deserializeBinaryFromReader(message: GetTransactionV1Request, reader: jspb.BinaryReader): GetTransactionV1Request;
}

export namespace GetTransactionV1Request {
    export type AsObject = {
        gettransactionv1requestpb?: models_get_transaction_v1_request_pb_pb.GetTransactionV1RequestPB.AsObject,
    }
}

export class InvokeContractV1Request extends jspb.Message { 

    hasInvokecontractv1requestpb(): boolean;
    clearInvokecontractv1requestpb(): void;
    getInvokecontractv1requestpb(): models_invoke_contract_v1_request_pb_pb.InvokeContractV1RequestPB | undefined;
    setInvokecontractv1requestpb(value?: models_invoke_contract_v1_request_pb_pb.InvokeContractV1RequestPB): InvokeContractV1Request;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InvokeContractV1Request.AsObject;
    static toObject(includeInstance: boolean, msg: InvokeContractV1Request): InvokeContractV1Request.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InvokeContractV1Request, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InvokeContractV1Request;
    static deserializeBinaryFromReader(message: InvokeContractV1Request, reader: jspb.BinaryReader): InvokeContractV1Request;
}

export namespace InvokeContractV1Request {
    export type AsObject = {
        invokecontractv1requestpb?: models_invoke_contract_v1_request_pb_pb.InvokeContractV1RequestPB.AsObject,
    }
}

export class RunTransactionV1Request extends jspb.Message { 

    hasRuntransactionrequestpb(): boolean;
    clearRuntransactionrequestpb(): void;
    getRuntransactionrequestpb(): models_run_transaction_request_pb_pb.RunTransactionRequestPB | undefined;
    setRuntransactionrequestpb(value?: models_run_transaction_request_pb_pb.RunTransactionRequestPB): RunTransactionV1Request;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RunTransactionV1Request.AsObject;
    static toObject(includeInstance: boolean, msg: RunTransactionV1Request): RunTransactionV1Request.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RunTransactionV1Request, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RunTransactionV1Request;
    static deserializeBinaryFromReader(message: RunTransactionV1Request, reader: jspb.BinaryReader): RunTransactionV1Request;
}

export namespace RunTransactionV1Request {
    export type AsObject = {
        runtransactionrequestpb?: models_run_transaction_request_pb_pb.RunTransactionRequestPB.AsObject,
    }
}

export class SignTransactionV1Request extends jspb.Message { 

    hasSigntransactionrequestpb(): boolean;
    clearSigntransactionrequestpb(): void;
    getSigntransactionrequestpb(): models_sign_transaction_request_pb_pb.SignTransactionRequestPB | undefined;
    setSigntransactionrequestpb(value?: models_sign_transaction_request_pb_pb.SignTransactionRequestPB): SignTransactionV1Request;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SignTransactionV1Request.AsObject;
    static toObject(includeInstance: boolean, msg: SignTransactionV1Request): SignTransactionV1Request.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SignTransactionV1Request, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SignTransactionV1Request;
    static deserializeBinaryFromReader(message: SignTransactionV1Request, reader: jspb.BinaryReader): SignTransactionV1Request;
}

export namespace SignTransactionV1Request {
    export type AsObject = {
        signtransactionrequestpb?: models_sign_transaction_request_pb_pb.SignTransactionRequestPB.AsObject,
    }
}
