// package: org.hyperledger.cactus.cmd_api_server
// file: models/health_check_response_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as models_memory_usage_pb_pb from "../models/memory_usage_pb_pb";

export class HealthCheckResponsePB extends jspb.Message { 
    getSuccess(): boolean;
    setSuccess(value: boolean): HealthCheckResponsePB;
    getCreatedat(): string;
    setCreatedat(value: string): HealthCheckResponsePB;

    hasMemoryusage(): boolean;
    clearMemoryusage(): void;
    getMemoryusage(): models_memory_usage_pb_pb.MemoryUsagePB | undefined;
    setMemoryusage(value?: models_memory_usage_pb_pb.MemoryUsagePB): HealthCheckResponsePB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): HealthCheckResponsePB.AsObject;
    static toObject(includeInstance: boolean, msg: HealthCheckResponsePB): HealthCheckResponsePB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: HealthCheckResponsePB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): HealthCheckResponsePB;
    static deserializeBinaryFromReader(message: HealthCheckResponsePB, reader: jspb.BinaryReader): HealthCheckResponsePB;
}

export namespace HealthCheckResponsePB {
    export type AsObject = {
        success: boolean,
        createdat: string,
        memoryusage?: models_memory_usage_pb_pb.MemoryUsagePB.AsObject,
    }
}
