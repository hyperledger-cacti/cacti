// package: corda
// file: corda/view_data.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class ViewData extends jspb.Message { 
    clearNotarizationsList(): void;
    getNotarizationsList(): Array<ViewData.Notarization>;
    setNotarizationsList(value: Array<ViewData.Notarization>): ViewData;
    addNotarizations(value?: ViewData.Notarization, index?: number): ViewData.Notarization;
    getPayload(): Uint8Array | string;
    getPayload_asU8(): Uint8Array;
    getPayload_asB64(): string;
    setPayload(value: Uint8Array | string): ViewData;

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
        notarizationsList: Array<ViewData.Notarization.AsObject>,
        payload: Uint8Array | string,
    }


    export class Notarization extends jspb.Message { 
        getSignature(): string;
        setSignature(value: string): Notarization;
        getCertificate(): string;
        setCertificate(value: string): Notarization;
        getId(): string;
        setId(value: string): Notarization;

        serializeBinary(): Uint8Array;
        toObject(includeInstance?: boolean): Notarization.AsObject;
        static toObject(includeInstance: boolean, msg: Notarization): Notarization.AsObject;
        static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
        static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
        static serializeBinaryToWriter(message: Notarization, writer: jspb.BinaryWriter): void;
        static deserializeBinary(bytes: Uint8Array): Notarization;
        static deserializeBinaryFromReader(message: Notarization, reader: jspb.BinaryReader): Notarization;
    }

    export namespace Notarization {
        export type AsObject = {
            signature: string,
            certificate: string,
            id: string,
        }
    }

}
