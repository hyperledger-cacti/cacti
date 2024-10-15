// package: common.ack
// file: common/ack.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Ack extends jspb.Message { 
    getStatus(): Ack.STATUS;
    setStatus(value: Ack.STATUS): Ack;
    getRequestId(): string;
    setRequestId(value: string): Ack;
    getMessage(): string;
    setMessage(value: string): Ack;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Ack.AsObject;
    static toObject(includeInstance: boolean, msg: Ack): Ack.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Ack, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Ack;
    static deserializeBinaryFromReader(message: Ack, reader: jspb.BinaryReader): Ack;
}

export namespace Ack {
    export type AsObject = {
        status: Ack.STATUS,
        requestId: string,
        message: string,
    }

    export enum STATUS {
    OK = 0,
    ERROR = 1,
    }

}
