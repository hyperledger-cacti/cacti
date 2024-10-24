// package: corda
// file: corda/view_data.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class ViewData extends jspb.Message { 
    clearNotarizedPayloadsList(): void;
    getNotarizedPayloadsList(): Array<ViewData.NotarizedPayload>;
    setNotarizedPayloadsList(value: Array<ViewData.NotarizedPayload>): ViewData;
    addNotarizedPayloads(value?: ViewData.NotarizedPayload, index?: number): ViewData.NotarizedPayload;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ViewData.AsObject;
    static toObject(includeInstance: boolean, msg: ViewData): ViewData.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ViewData, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ViewData;
    static deserializeBinaryFromReader(message: ViewData, reader: jspb.BinaryReader): ViewData;
}

export namespace ViewData {
    export type AsObject = {
        notarizedPayloadsList: Array<ViewData.NotarizedPayload.AsObject>,
    }


    export class NotarizedPayload extends jspb.Message { 
        getSignature(): string;
        setSignature(value: string): NotarizedPayload;
        getCertificate(): string;
        setCertificate(value: string): NotarizedPayload;
        getId(): string;
        setId(value: string): NotarizedPayload;
        getPayload(): Uint8Array | string;
        getPayload_asU8(): Uint8Array;
        getPayload_asB64(): string;
        setPayload(value: Uint8Array | string): NotarizedPayload;

        serializeBinary(): Uint8Array;
        toObject(includeInstance?: boolean): NotarizedPayload.AsObject;
        static toObject(includeInstance: boolean, msg: NotarizedPayload): NotarizedPayload.AsObject;
        static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
        static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
        static serializeBinaryToWriter(message: NotarizedPayload, writer: jspb.BinaryWriter): void;
        static deserializeBinary(bytes: Uint8Array): NotarizedPayload;
        static deserializeBinaryFromReader(message: NotarizedPayload, reader: jspb.BinaryReader): NotarizedPayload;
    }

    export namespace NotarizedPayload {
        export type AsObject = {
            signature: string,
            certificate: string,
            id: string,
            payload: Uint8Array | string,
        }
    }

}
