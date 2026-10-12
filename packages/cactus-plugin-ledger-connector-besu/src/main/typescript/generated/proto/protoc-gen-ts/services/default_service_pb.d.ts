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

    hasDeployContractSolidityBytecodeNoKeychainV1RequestPb(): boolean;
    clearDeployContractSolidityBytecodeNoKeychainV1RequestPb(): void;
    getDeployContractSolidityBytecodeNoKeychainV1RequestPb(): models_deploy_contract_solidity_bytecode_no_keychain_v1_request_pb_pb.DeployContractSolidityBytecodeNoKeychainV1RequestPB | undefined;
    setDeployContractSolidityBytecodeNoKeychainV1RequestPb(value?: models_deploy_contract_solidity_bytecode_no_keychain_v1_request_pb_pb.DeployContractSolidityBytecodeNoKeychainV1RequestPB): DeployContractSolBytecodeNoKeychainV1Request;

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
        deployContractSolidityBytecodeNoKeychainV1RequestPb?: models_deploy_contract_solidity_bytecode_no_keychain_v1_request_pb_pb.DeployContractSolidityBytecodeNoKeychainV1RequestPB.AsObject,
    }
}

export class DeployContractSolBytecodeNoKeychainV1Response extends jspb.Message { 

    hasDeployContractSolidityBytecodeV1ResponsePb200(): boolean;
    clearDeployContractSolidityBytecodeV1ResponsePb200(): void;
    getDeployContractSolidityBytecodeV1ResponsePb200(): models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB | undefined;
    setDeployContractSolidityBytecodeV1ResponsePb200(value?: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB): DeployContractSolBytecodeNoKeychainV1Response;

    hasBackingLedgerUnavailableErrorPb503(): boolean;
    clearBackingLedgerUnavailableErrorPb503(): void;
    getBackingLedgerUnavailableErrorPb503(): models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB | undefined;
    setBackingLedgerUnavailableErrorPb503(value?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB): DeployContractSolBytecodeNoKeychainV1Response;

    getResponseCase(): DeployContractSolBytecodeNoKeychainV1Response.ResponseCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeployContractSolBytecodeNoKeychainV1Response.AsObject;
    static toObject(includeInstance: boolean, msg: DeployContractSolBytecodeNoKeychainV1Response): DeployContractSolBytecodeNoKeychainV1Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeployContractSolBytecodeNoKeychainV1Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeployContractSolBytecodeNoKeychainV1Response;
    static deserializeBinaryFromReader(message: DeployContractSolBytecodeNoKeychainV1Response, reader: jspb.BinaryReader): DeployContractSolBytecodeNoKeychainV1Response;
}

export namespace DeployContractSolBytecodeNoKeychainV1Response {
    export type AsObject = {
        deployContractSolidityBytecodeV1ResponsePb200?: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB.AsObject,
        backingLedgerUnavailableErrorPb503?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        DEPLOY_CONTRACT_SOLIDITY_BYTECODE_V1_RESPONSE_PB_200 = 1,
        BACKING_LEDGER_UNAVAILABLE_ERROR_PB_503 = 2,
    }

}

export class DeployContractSolBytecodeV1Request extends jspb.Message { 

    hasDeployContractSolidityBytecodeV1RequestPb(): boolean;
    clearDeployContractSolidityBytecodeV1RequestPb(): void;
    getDeployContractSolidityBytecodeV1RequestPb(): models_deploy_contract_solidity_bytecode_v1_request_pb_pb.DeployContractSolidityBytecodeV1RequestPB | undefined;
    setDeployContractSolidityBytecodeV1RequestPb(value?: models_deploy_contract_solidity_bytecode_v1_request_pb_pb.DeployContractSolidityBytecodeV1RequestPB): DeployContractSolBytecodeV1Request;

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
        deployContractSolidityBytecodeV1RequestPb?: models_deploy_contract_solidity_bytecode_v1_request_pb_pb.DeployContractSolidityBytecodeV1RequestPB.AsObject,
    }
}

export class DeployContractSolBytecodeV1Response extends jspb.Message { 

    hasDeployContractSolidityBytecodeV1ResponsePb200(): boolean;
    clearDeployContractSolidityBytecodeV1ResponsePb200(): void;
    getDeployContractSolidityBytecodeV1ResponsePb200(): models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB | undefined;
    setDeployContractSolidityBytecodeV1ResponsePb200(value?: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB): DeployContractSolBytecodeV1Response;

    hasBackingLedgerUnavailableErrorPb503(): boolean;
    clearBackingLedgerUnavailableErrorPb503(): void;
    getBackingLedgerUnavailableErrorPb503(): models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB | undefined;
    setBackingLedgerUnavailableErrorPb503(value?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB): DeployContractSolBytecodeV1Response;

    getResponseCase(): DeployContractSolBytecodeV1Response.ResponseCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeployContractSolBytecodeV1Response.AsObject;
    static toObject(includeInstance: boolean, msg: DeployContractSolBytecodeV1Response): DeployContractSolBytecodeV1Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeployContractSolBytecodeV1Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeployContractSolBytecodeV1Response;
    static deserializeBinaryFromReader(message: DeployContractSolBytecodeV1Response, reader: jspb.BinaryReader): DeployContractSolBytecodeV1Response;
}

export namespace DeployContractSolBytecodeV1Response {
    export type AsObject = {
        deployContractSolidityBytecodeV1ResponsePb200?: models_deploy_contract_solidity_bytecode_v1_response_pb_pb.DeployContractSolidityBytecodeV1ResponsePB.AsObject,
        backingLedgerUnavailableErrorPb503?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        DEPLOY_CONTRACT_SOLIDITY_BYTECODE_V1_RESPONSE_PB_200 = 1,
        BACKING_LEDGER_UNAVAILABLE_ERROR_PB_503 = 2,
    }

}

export class GetBalanceV1Request extends jspb.Message { 

    hasGetBalanceV1RequestPb(): boolean;
    clearGetBalanceV1RequestPb(): void;
    getGetBalanceV1RequestPb(): models_get_balance_v1_request_pb_pb.GetBalanceV1RequestPB | undefined;
    setGetBalanceV1RequestPb(value?: models_get_balance_v1_request_pb_pb.GetBalanceV1RequestPB): GetBalanceV1Request;

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
        getBalanceV1RequestPb?: models_get_balance_v1_request_pb_pb.GetBalanceV1RequestPB.AsObject,
    }
}

export class GetBalanceV1Response extends jspb.Message { 

    hasGetBalanceV1ResponsePb200(): boolean;
    clearGetBalanceV1ResponsePb200(): void;
    getGetBalanceV1ResponsePb200(): models_get_balance_v1_response_pb_pb.GetBalanceV1ResponsePB | undefined;
    setGetBalanceV1ResponsePb200(value?: models_get_balance_v1_response_pb_pb.GetBalanceV1ResponsePB): GetBalanceV1Response;

    hasBackingLedgerUnavailableErrorPb503(): boolean;
    clearBackingLedgerUnavailableErrorPb503(): void;
    getBackingLedgerUnavailableErrorPb503(): models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB | undefined;
    setBackingLedgerUnavailableErrorPb503(value?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB): GetBalanceV1Response;

    getResponseCase(): GetBalanceV1Response.ResponseCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBalanceV1Response.AsObject;
    static toObject(includeInstance: boolean, msg: GetBalanceV1Response): GetBalanceV1Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBalanceV1Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBalanceV1Response;
    static deserializeBinaryFromReader(message: GetBalanceV1Response, reader: jspb.BinaryReader): GetBalanceV1Response;
}

export namespace GetBalanceV1Response {
    export type AsObject = {
        getBalanceV1ResponsePb200?: models_get_balance_v1_response_pb_pb.GetBalanceV1ResponsePB.AsObject,
        backingLedgerUnavailableErrorPb503?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        GET_BALANCE_V1_RESPONSE_PB_200 = 1,
        BACKING_LEDGER_UNAVAILABLE_ERROR_PB_503 = 2,
    }

}

export class GetBesuRecordV1Request extends jspb.Message { 

    hasGetBesuRecordV1RequestPb(): boolean;
    clearGetBesuRecordV1RequestPb(): void;
    getGetBesuRecordV1RequestPb(): models_get_besu_record_v1_request_pb_pb.GetBesuRecordV1RequestPB | undefined;
    setGetBesuRecordV1RequestPb(value?: models_get_besu_record_v1_request_pb_pb.GetBesuRecordV1RequestPB): GetBesuRecordV1Request;

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
        getBesuRecordV1RequestPb?: models_get_besu_record_v1_request_pb_pb.GetBesuRecordV1RequestPB.AsObject,
    }
}

export class GetBesuRecordV1Response extends jspb.Message { 

    hasGetBesuRecordV1ResponsePb200(): boolean;
    clearGetBesuRecordV1ResponsePb200(): void;
    getGetBesuRecordV1ResponsePb200(): models_get_besu_record_v1_response_pb_pb.GetBesuRecordV1ResponsePB | undefined;
    setGetBesuRecordV1ResponsePb200(value?: models_get_besu_record_v1_response_pb_pb.GetBesuRecordV1ResponsePB): GetBesuRecordV1Response;

    hasBackingLedgerUnavailableErrorPb503(): boolean;
    clearBackingLedgerUnavailableErrorPb503(): void;
    getBackingLedgerUnavailableErrorPb503(): models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB | undefined;
    setBackingLedgerUnavailableErrorPb503(value?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB): GetBesuRecordV1Response;

    getResponseCase(): GetBesuRecordV1Response.ResponseCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBesuRecordV1Response.AsObject;
    static toObject(includeInstance: boolean, msg: GetBesuRecordV1Response): GetBesuRecordV1Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBesuRecordV1Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBesuRecordV1Response;
    static deserializeBinaryFromReader(message: GetBesuRecordV1Response, reader: jspb.BinaryReader): GetBesuRecordV1Response;
}

export namespace GetBesuRecordV1Response {
    export type AsObject = {
        getBesuRecordV1ResponsePb200?: models_get_besu_record_v1_response_pb_pb.GetBesuRecordV1ResponsePB.AsObject,
        backingLedgerUnavailableErrorPb503?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        GET_BESU_RECORD_V1_RESPONSE_PB_200 = 1,
        BACKING_LEDGER_UNAVAILABLE_ERROR_PB_503 = 2,
    }

}

export class GetBlockV1Request extends jspb.Message { 

    hasGetBlockV1RequestPb(): boolean;
    clearGetBlockV1RequestPb(): void;
    getGetBlockV1RequestPb(): models_get_block_v1_request_pb_pb.GetBlockV1RequestPB | undefined;
    setGetBlockV1RequestPb(value?: models_get_block_v1_request_pb_pb.GetBlockV1RequestPB): GetBlockV1Request;

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
        getBlockV1RequestPb?: models_get_block_v1_request_pb_pb.GetBlockV1RequestPB.AsObject,
    }
}

export class GetBlockV1Response extends jspb.Message { 

    hasGetBlockV1ResponsePb200(): boolean;
    clearGetBlockV1ResponsePb200(): void;
    getGetBlockV1ResponsePb200(): models_get_block_v1_response_pb_pb.GetBlockV1ResponsePB | undefined;
    setGetBlockV1ResponsePb200(value?: models_get_block_v1_response_pb_pb.GetBlockV1ResponsePB): GetBlockV1Response;

    hasBackingLedgerUnavailableErrorPb503(): boolean;
    clearBackingLedgerUnavailableErrorPb503(): void;
    getBackingLedgerUnavailableErrorPb503(): models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB | undefined;
    setBackingLedgerUnavailableErrorPb503(value?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB): GetBlockV1Response;

    getResponseCase(): GetBlockV1Response.ResponseCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBlockV1Response.AsObject;
    static toObject(includeInstance: boolean, msg: GetBlockV1Response): GetBlockV1Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBlockV1Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBlockV1Response;
    static deserializeBinaryFromReader(message: GetBlockV1Response, reader: jspb.BinaryReader): GetBlockV1Response;
}

export namespace GetBlockV1Response {
    export type AsObject = {
        getBlockV1ResponsePb200?: models_get_block_v1_response_pb_pb.GetBlockV1ResponsePB.AsObject,
        backingLedgerUnavailableErrorPb503?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        GET_BLOCK_V1_RESPONSE_PB_200 = 1,
        BACKING_LEDGER_UNAVAILABLE_ERROR_PB_503 = 2,
    }

}

export class GetOpenApiSpecV1Response extends jspb.Message { 

    hasString200(): boolean;
    clearString200(): void;
    getString200(): string;
    setString200(value: string): GetOpenApiSpecV1Response;

    hasBackingLedgerUnavailableErrorPb503(): boolean;
    clearBackingLedgerUnavailableErrorPb503(): void;
    getBackingLedgerUnavailableErrorPb503(): models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB | undefined;
    setBackingLedgerUnavailableErrorPb503(value?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB): GetOpenApiSpecV1Response;

    getResponseCase(): GetOpenApiSpecV1Response.ResponseCase;

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
        string200: string,
        backingLedgerUnavailableErrorPb503?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        STRING_200 = 1,
        BACKING_LEDGER_UNAVAILABLE_ERROR_PB_503 = 2,
    }

}

export class GetPastLogsV1Request extends jspb.Message { 

    hasGetPastLogsV1RequestPb(): boolean;
    clearGetPastLogsV1RequestPb(): void;
    getGetPastLogsV1RequestPb(): models_get_past_logs_v1_request_pb_pb.GetPastLogsV1RequestPB | undefined;
    setGetPastLogsV1RequestPb(value?: models_get_past_logs_v1_request_pb_pb.GetPastLogsV1RequestPB): GetPastLogsV1Request;

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
        getPastLogsV1RequestPb?: models_get_past_logs_v1_request_pb_pb.GetPastLogsV1RequestPB.AsObject,
    }
}

export class GetPastLogsV1Response extends jspb.Message { 

    hasGetPastLogsV1ResponsePb200(): boolean;
    clearGetPastLogsV1ResponsePb200(): void;
    getGetPastLogsV1ResponsePb200(): models_get_past_logs_v1_response_pb_pb.GetPastLogsV1ResponsePB | undefined;
    setGetPastLogsV1ResponsePb200(value?: models_get_past_logs_v1_response_pb_pb.GetPastLogsV1ResponsePB): GetPastLogsV1Response;

    hasBackingLedgerUnavailableErrorPb503(): boolean;
    clearBackingLedgerUnavailableErrorPb503(): void;
    getBackingLedgerUnavailableErrorPb503(): models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB | undefined;
    setBackingLedgerUnavailableErrorPb503(value?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB): GetPastLogsV1Response;

    getResponseCase(): GetPastLogsV1Response.ResponseCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetPastLogsV1Response.AsObject;
    static toObject(includeInstance: boolean, msg: GetPastLogsV1Response): GetPastLogsV1Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetPastLogsV1Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetPastLogsV1Response;
    static deserializeBinaryFromReader(message: GetPastLogsV1Response, reader: jspb.BinaryReader): GetPastLogsV1Response;
}

export namespace GetPastLogsV1Response {
    export type AsObject = {
        getPastLogsV1ResponsePb200?: models_get_past_logs_v1_response_pb_pb.GetPastLogsV1ResponsePB.AsObject,
        backingLedgerUnavailableErrorPb503?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        GET_PAST_LOGS_V1_RESPONSE_PB_200 = 1,
        BACKING_LEDGER_UNAVAILABLE_ERROR_PB_503 = 2,
    }

}

export class GetPrometheusMetricsV1Response extends jspb.Message { 

    hasString200(): boolean;
    clearString200(): void;
    getString200(): string;
    setString200(value: string): GetPrometheusMetricsV1Response;

    hasBackingLedgerUnavailableErrorPb503(): boolean;
    clearBackingLedgerUnavailableErrorPb503(): void;
    getBackingLedgerUnavailableErrorPb503(): models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB | undefined;
    setBackingLedgerUnavailableErrorPb503(value?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB): GetPrometheusMetricsV1Response;

    getResponseCase(): GetPrometheusMetricsV1Response.ResponseCase;

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
        string200: string,
        backingLedgerUnavailableErrorPb503?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        STRING_200 = 1,
        BACKING_LEDGER_UNAVAILABLE_ERROR_PB_503 = 2,
    }

}

export class GetTransactionV1Request extends jspb.Message { 

    hasGetTransactionV1RequestPb(): boolean;
    clearGetTransactionV1RequestPb(): void;
    getGetTransactionV1RequestPb(): models_get_transaction_v1_request_pb_pb.GetTransactionV1RequestPB | undefined;
    setGetTransactionV1RequestPb(value?: models_get_transaction_v1_request_pb_pb.GetTransactionV1RequestPB): GetTransactionV1Request;

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
        getTransactionV1RequestPb?: models_get_transaction_v1_request_pb_pb.GetTransactionV1RequestPB.AsObject,
    }
}

export class GetTransactionV1Response extends jspb.Message { 

    hasGetTransactionV1ResponsePb200(): boolean;
    clearGetTransactionV1ResponsePb200(): void;
    getGetTransactionV1ResponsePb200(): models_get_transaction_v1_response_pb_pb.GetTransactionV1ResponsePB | undefined;
    setGetTransactionV1ResponsePb200(value?: models_get_transaction_v1_response_pb_pb.GetTransactionV1ResponsePB): GetTransactionV1Response;

    hasBackingLedgerUnavailableErrorPb503(): boolean;
    clearBackingLedgerUnavailableErrorPb503(): void;
    getBackingLedgerUnavailableErrorPb503(): models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB | undefined;
    setBackingLedgerUnavailableErrorPb503(value?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB): GetTransactionV1Response;

    getResponseCase(): GetTransactionV1Response.ResponseCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetTransactionV1Response.AsObject;
    static toObject(includeInstance: boolean, msg: GetTransactionV1Response): GetTransactionV1Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetTransactionV1Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetTransactionV1Response;
    static deserializeBinaryFromReader(message: GetTransactionV1Response, reader: jspb.BinaryReader): GetTransactionV1Response;
}

export namespace GetTransactionV1Response {
    export type AsObject = {
        getTransactionV1ResponsePb200?: models_get_transaction_v1_response_pb_pb.GetTransactionV1ResponsePB.AsObject,
        backingLedgerUnavailableErrorPb503?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        GET_TRANSACTION_V1_RESPONSE_PB_200 = 1,
        BACKING_LEDGER_UNAVAILABLE_ERROR_PB_503 = 2,
    }

}

export class InvokeContractV1Request extends jspb.Message { 

    hasInvokeContractV1RequestPb(): boolean;
    clearInvokeContractV1RequestPb(): void;
    getInvokeContractV1RequestPb(): models_invoke_contract_v1_request_pb_pb.InvokeContractV1RequestPB | undefined;
    setInvokeContractV1RequestPb(value?: models_invoke_contract_v1_request_pb_pb.InvokeContractV1RequestPB): InvokeContractV1Request;

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
        invokeContractV1RequestPb?: models_invoke_contract_v1_request_pb_pb.InvokeContractV1RequestPB.AsObject,
    }
}

export class InvokeContractV1Response extends jspb.Message { 

    hasInvokeContractV1ResponsePb200(): boolean;
    clearInvokeContractV1ResponsePb200(): void;
    getInvokeContractV1ResponsePb200(): models_invoke_contract_v1_response_pb_pb.InvokeContractV1ResponsePB | undefined;
    setInvokeContractV1ResponsePb200(value?: models_invoke_contract_v1_response_pb_pb.InvokeContractV1ResponsePB): InvokeContractV1Response;

    hasBackingLedgerUnavailableErrorPb503(): boolean;
    clearBackingLedgerUnavailableErrorPb503(): void;
    getBackingLedgerUnavailableErrorPb503(): models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB | undefined;
    setBackingLedgerUnavailableErrorPb503(value?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB): InvokeContractV1Response;

    getResponseCase(): InvokeContractV1Response.ResponseCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InvokeContractV1Response.AsObject;
    static toObject(includeInstance: boolean, msg: InvokeContractV1Response): InvokeContractV1Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InvokeContractV1Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InvokeContractV1Response;
    static deserializeBinaryFromReader(message: InvokeContractV1Response, reader: jspb.BinaryReader): InvokeContractV1Response;
}

export namespace InvokeContractV1Response {
    export type AsObject = {
        invokeContractV1ResponsePb200?: models_invoke_contract_v1_response_pb_pb.InvokeContractV1ResponsePB.AsObject,
        backingLedgerUnavailableErrorPb503?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        INVOKE_CONTRACT_V1_RESPONSE_PB_200 = 1,
        BACKING_LEDGER_UNAVAILABLE_ERROR_PB_503 = 2,
    }

}

export class RunTransactionV1Request extends jspb.Message { 

    hasRunTransactionRequestPb(): boolean;
    clearRunTransactionRequestPb(): void;
    getRunTransactionRequestPb(): models_run_transaction_request_pb_pb.RunTransactionRequestPB | undefined;
    setRunTransactionRequestPb(value?: models_run_transaction_request_pb_pb.RunTransactionRequestPB): RunTransactionV1Request;

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
        runTransactionRequestPb?: models_run_transaction_request_pb_pb.RunTransactionRequestPB.AsObject,
    }
}

export class RunTransactionV1Response extends jspb.Message { 

    hasRunTransactionResponsePb200(): boolean;
    clearRunTransactionResponsePb200(): void;
    getRunTransactionResponsePb200(): models_run_transaction_response_pb_pb.RunTransactionResponsePB | undefined;
    setRunTransactionResponsePb200(value?: models_run_transaction_response_pb_pb.RunTransactionResponsePB): RunTransactionV1Response;

    hasBackingLedgerUnavailableErrorPb503(): boolean;
    clearBackingLedgerUnavailableErrorPb503(): void;
    getBackingLedgerUnavailableErrorPb503(): models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB | undefined;
    setBackingLedgerUnavailableErrorPb503(value?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB): RunTransactionV1Response;

    getResponseCase(): RunTransactionV1Response.ResponseCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RunTransactionV1Response.AsObject;
    static toObject(includeInstance: boolean, msg: RunTransactionV1Response): RunTransactionV1Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RunTransactionV1Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RunTransactionV1Response;
    static deserializeBinaryFromReader(message: RunTransactionV1Response, reader: jspb.BinaryReader): RunTransactionV1Response;
}

export namespace RunTransactionV1Response {
    export type AsObject = {
        runTransactionResponsePb200?: models_run_transaction_response_pb_pb.RunTransactionResponsePB.AsObject,
        backingLedgerUnavailableErrorPb503?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        RUN_TRANSACTION_RESPONSE_PB_200 = 1,
        BACKING_LEDGER_UNAVAILABLE_ERROR_PB_503 = 2,
    }

}

export class SignTransactionV1Request extends jspb.Message { 

    hasSignTransactionRequestPb(): boolean;
    clearSignTransactionRequestPb(): void;
    getSignTransactionRequestPb(): models_sign_transaction_request_pb_pb.SignTransactionRequestPB | undefined;
    setSignTransactionRequestPb(value?: models_sign_transaction_request_pb_pb.SignTransactionRequestPB): SignTransactionV1Request;

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
        signTransactionRequestPb?: models_sign_transaction_request_pb_pb.SignTransactionRequestPB.AsObject,
    }
}

export class SignTransactionV1Response extends jspb.Message { 

    hasSignTransactionResponsePb200(): boolean;
    clearSignTransactionResponsePb200(): void;
    getSignTransactionResponsePb200(): models_sign_transaction_response_pb_pb.SignTransactionResponsePB | undefined;
    setSignTransactionResponsePb200(value?: models_sign_transaction_response_pb_pb.SignTransactionResponsePB): SignTransactionV1Response;

    hasEmpty404(): boolean;
    clearEmpty404(): void;
    getEmpty404(): google_protobuf_empty_pb.Empty | undefined;
    setEmpty404(value?: google_protobuf_empty_pb.Empty): SignTransactionV1Response;

    hasBackingLedgerUnavailableErrorPb503(): boolean;
    clearBackingLedgerUnavailableErrorPb503(): void;
    getBackingLedgerUnavailableErrorPb503(): models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB | undefined;
    setBackingLedgerUnavailableErrorPb503(value?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB): SignTransactionV1Response;

    getResponseCase(): SignTransactionV1Response.ResponseCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SignTransactionV1Response.AsObject;
    static toObject(includeInstance: boolean, msg: SignTransactionV1Response): SignTransactionV1Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SignTransactionV1Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SignTransactionV1Response;
    static deserializeBinaryFromReader(message: SignTransactionV1Response, reader: jspb.BinaryReader): SignTransactionV1Response;
}

export namespace SignTransactionV1Response {
    export type AsObject = {
        signTransactionResponsePb200?: models_sign_transaction_response_pb_pb.SignTransactionResponsePB.AsObject,
        empty404?: google_protobuf_empty_pb.Empty.AsObject,
        backingLedgerUnavailableErrorPb503?: models_backing_ledger_unavailable_error_pb_pb.BackingLedgerUnavailableErrorPB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        SIGN_TRANSACTION_RESPONSE_PB_200 = 1,
        EMPTY_404 = 2,
        BACKING_LEDGER_UNAVAILABLE_ERROR_PB_503 = 3,
    }

}
