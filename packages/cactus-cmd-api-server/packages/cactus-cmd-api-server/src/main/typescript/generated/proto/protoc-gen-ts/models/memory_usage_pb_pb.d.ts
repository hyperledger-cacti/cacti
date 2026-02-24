// package: org.hyperledger.cactus.cmd_api_server
// file: models/memory_usage_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class MemoryUsagePB extends jspb.Message { 
    getRss(): number;
    setRss(value: number): MemoryUsagePB;
    getHeaptotal(): number;
    setHeaptotal(value: number): MemoryUsagePB;
    getHeapused(): number;
    setHeapused(value: number): MemoryUsagePB;
    getExternal(): number;
    setExternal(value: number): MemoryUsagePB;
    getArraybuffers(): number;
    setArraybuffers(value: number): MemoryUsagePB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): MemoryUsagePB.AsObject;
    static toObject(includeInstance: boolean, msg: MemoryUsagePB): MemoryUsagePB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: MemoryUsagePB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): MemoryUsagePB;
    static deserializeBinaryFromReader(message: MemoryUsagePB, reader: jspb.BinaryReader): MemoryUsagePB;
}

export namespace MemoryUsagePB {
    export type AsObject = {
        rss: number,
        heaptotal: number,
        heapused: number,
        external: number,
        arraybuffers: number,
    }
}
