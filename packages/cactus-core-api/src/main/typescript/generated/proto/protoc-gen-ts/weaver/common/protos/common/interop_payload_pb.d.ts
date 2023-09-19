// package: common.interop_payload
// file: common/interop_payload.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class InteropPayload extends jspb.Message { 
    getPayload(): Uint8Array | string;
    getPayload_asU8(): Uint8Array;
    getPayload_asB64(): string;
    setPayload(value: Uint8Array | string): InteropPayload;
    getAddress(): string;
    setAddress(value: string): InteropPayload;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InteropPayload.AsObject;
    static toObject(includeInstance: boolean, msg: InteropPayload): InteropPayload.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InteropPayload, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InteropPayload;
    static deserializeBinaryFromReader(message: InteropPayload, reader: jspb.BinaryReader): InteropPayload;
}

export namespace InteropPayload {
    export type AsObject = {
        payload: Uint8Array | string,
        address: string,
    }
}
