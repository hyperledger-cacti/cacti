// package: org.hyperledger.cactus.cmd_api_server
// file: services/default_service.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
import * as models_cmd_api_server_endpoint_error_response_pb_pb from "../models/cmd_api_server_endpoint_error_response_pb_pb";
import * as models_health_check_response_pb_pb from "../models/health_check_response_pb_pb";

export class GetHealthCheckV1Response extends jspb.Message { 

    hasHealthCheckResponsePb200(): boolean;
    clearHealthCheckResponsePb200(): void;
    getHealthCheckResponsePb200(): models_health_check_response_pb_pb.HealthCheckResponsePB | undefined;
    setHealthCheckResponsePb200(value?: models_health_check_response_pb_pb.HealthCheckResponsePB): GetHealthCheckV1Response;

    hasCmdApiServerEndpointErrorResponsePb401(): boolean;
    clearCmdApiServerEndpointErrorResponsePb401(): void;
    getCmdApiServerEndpointErrorResponsePb401(): models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB | undefined;
    setCmdApiServerEndpointErrorResponsePb401(value?: models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB): GetHealthCheckV1Response;

    hasCmdApiServerEndpointErrorResponsePb403(): boolean;
    clearCmdApiServerEndpointErrorResponsePb403(): void;
    getCmdApiServerEndpointErrorResponsePb403(): models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB | undefined;
    setCmdApiServerEndpointErrorResponsePb403(value?: models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB): GetHealthCheckV1Response;

    getResponseCase(): GetHealthCheckV1Response.ResponseCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetHealthCheckV1Response.AsObject;
    static toObject(includeInstance: boolean, msg: GetHealthCheckV1Response): GetHealthCheckV1Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetHealthCheckV1Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetHealthCheckV1Response;
    static deserializeBinaryFromReader(message: GetHealthCheckV1Response, reader: jspb.BinaryReader): GetHealthCheckV1Response;
}

export namespace GetHealthCheckV1Response {
    export type AsObject = {
        healthCheckResponsePb200?: models_health_check_response_pb_pb.HealthCheckResponsePB.AsObject,
        cmdApiServerEndpointErrorResponsePb401?: models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB.AsObject,
        cmdApiServerEndpointErrorResponsePb403?: models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        HEALTH_CHECK_RESPONSE_PB_200 = 1,
        CMD_API_SERVER_ENDPOINT_ERROR_RESPONSE_PB_401 = 2,
        CMD_API_SERVER_ENDPOINT_ERROR_RESPONSE_PB_403 = 3,
    }

}

export class GetOpenApiSpecV1Response extends jspb.Message { 

    hasString200(): boolean;
    clearString200(): void;
    getString200(): string;
    setString200(value: string): GetOpenApiSpecV1Response;

    hasCmdApiServerEndpointErrorResponsePb401(): boolean;
    clearCmdApiServerEndpointErrorResponsePb401(): void;
    getCmdApiServerEndpointErrorResponsePb401(): models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB | undefined;
    setCmdApiServerEndpointErrorResponsePb401(value?: models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB): GetOpenApiSpecV1Response;

    hasCmdApiServerEndpointErrorResponsePb403(): boolean;
    clearCmdApiServerEndpointErrorResponsePb403(): void;
    getCmdApiServerEndpointErrorResponsePb403(): models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB | undefined;
    setCmdApiServerEndpointErrorResponsePb403(value?: models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB): GetOpenApiSpecV1Response;

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
        cmdApiServerEndpointErrorResponsePb401?: models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB.AsObject,
        cmdApiServerEndpointErrorResponsePb403?: models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        STRING_200 = 1,
        CMD_API_SERVER_ENDPOINT_ERROR_RESPONSE_PB_401 = 2,
        CMD_API_SERVER_ENDPOINT_ERROR_RESPONSE_PB_403 = 3,
    }

}

export class GetPrometheusMetricsV1Response extends jspb.Message { 

    hasString200(): boolean;
    clearString200(): void;
    getString200(): string;
    setString200(value: string): GetPrometheusMetricsV1Response;

    hasCmdApiServerEndpointErrorResponsePb401(): boolean;
    clearCmdApiServerEndpointErrorResponsePb401(): void;
    getCmdApiServerEndpointErrorResponsePb401(): models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB | undefined;
    setCmdApiServerEndpointErrorResponsePb401(value?: models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB): GetPrometheusMetricsV1Response;

    hasCmdApiServerEndpointErrorResponsePb403(): boolean;
    clearCmdApiServerEndpointErrorResponsePb403(): void;
    getCmdApiServerEndpointErrorResponsePb403(): models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB | undefined;
    setCmdApiServerEndpointErrorResponsePb403(value?: models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB): GetPrometheusMetricsV1Response;

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
        cmdApiServerEndpointErrorResponsePb401?: models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB.AsObject,
        cmdApiServerEndpointErrorResponsePb403?: models_cmd_api_server_endpoint_error_response_pb_pb.CmdApiServerEndpointErrorResponsePB.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        STRING_200 = 1,
        CMD_API_SERVER_ENDPOINT_ERROR_RESPONSE_PB_401 = 2,
        CMD_API_SERVER_ENDPOINT_ERROR_RESPONSE_PB_403 = 3,
    }

}
