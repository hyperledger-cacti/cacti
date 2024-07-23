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
    getConfidential(): boolean;
    setConfidential(value: boolean): InteropPayload;
    getRequestorCertificate(): string;
    setRequestorCertificate(value: string): InteropPayload;
    getNonce(): string;
    setNonce(value: string): InteropPayload;

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
        confidential: boolean,
        requestorCertificate: string,
        nonce: string,
    }
}

export class ConfidentialPayload extends jspb.Message { 
    getEncryptedPayload(): Uint8Array | string;
    getEncryptedPayload_asU8(): Uint8Array;
    getEncryptedPayload_asB64(): string;
    setEncryptedPayload(value: Uint8Array | string): ConfidentialPayload;
    getHashType(): ConfidentialPayload.HashType;
    setHashType(value: ConfidentialPayload.HashType): ConfidentialPayload;
    getHash(): Uint8Array | string;
    getHash_asU8(): Uint8Array;
    getHash_asB64(): string;
    setHash(value: Uint8Array | string): ConfidentialPayload;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ConfidentialPayload.AsObject;
    static toObject(includeInstance: boolean, msg: ConfidentialPayload): ConfidentialPayload.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ConfidentialPayload, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ConfidentialPayload;
    static deserializeBinaryFromReader(message: ConfidentialPayload, reader: jspb.BinaryReader): ConfidentialPayload;
}

export namespace ConfidentialPayload {
    export type AsObject = {
        encryptedPayload: Uint8Array | string,
        hashType: ConfidentialPayload.HashType,
        hash: Uint8Array | string,
    }

    export enum HashType {
    HMAC = 0,
    }

}

export class ConfidentialPayloadContents extends jspb.Message { 
    getPayload(): Uint8Array | string;
    getPayload_asU8(): Uint8Array;
    getPayload_asB64(): string;
    setPayload(value: Uint8Array | string): ConfidentialPayloadContents;
    getRandom(): Uint8Array | string;
    getRandom_asU8(): Uint8Array;
    getRandom_asB64(): string;
    setRandom(value: Uint8Array | string): ConfidentialPayloadContents;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ConfidentialPayloadContents.AsObject;
    static toObject(includeInstance: boolean, msg: ConfidentialPayloadContents): ConfidentialPayloadContents.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ConfidentialPayloadContents, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ConfidentialPayloadContents;
    static deserializeBinaryFromReader(message: ConfidentialPayloadContents, reader: jspb.BinaryReader): ConfidentialPayloadContents;
}

export namespace ConfidentialPayloadContents {
    export type AsObject = {
        payload: Uint8Array | string,
        random: Uint8Array | string,
    }
}
