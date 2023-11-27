// package: org.hyperledger.cactus.cmd_api_server
// file: services/default_service.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
import * as models_health_check_response_pb_pb from "../models/health_check_response_pb_pb";

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
