// package: networks.networks
// file: networks/networks.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as common_ack_pb from "../common/ack_pb";
import * as common_state_pb from "../common/state_pb";

export class DbName extends jspb.Message { 
    getName(): string;
    setName(value: string): DbName;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DbName.AsObject;
    static toObject(includeInstance: boolean, msg: DbName): DbName.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DbName, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DbName;
    static deserializeBinaryFromReader(message: DbName, reader: jspb.BinaryReader): DbName;
}

export namespace DbName {
    export type AsObject = {
        name: string,
    }
}

export class RelayDatabase extends jspb.Message { 

    getPairsMap(): jspb.Map<string, string>;
    clearPairsMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RelayDatabase.AsObject;
    static toObject(includeInstance: boolean, msg: RelayDatabase): RelayDatabase.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RelayDatabase, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RelayDatabase;
    static deserializeBinaryFromReader(message: RelayDatabase, reader: jspb.BinaryReader): RelayDatabase;
}

export namespace RelayDatabase {
    export type AsObject = {

        pairsMap: Array<[string, string]>,
    }
}

export class GetStateMessage extends jspb.Message { 
    getRequestId(): string;
    setRequestId(value: string): GetStateMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetStateMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GetStateMessage): GetStateMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetStateMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetStateMessage;
    static deserializeBinaryFromReader(message: GetStateMessage, reader: jspb.BinaryReader): GetStateMessage;
}

export namespace GetStateMessage {
    export type AsObject = {
        requestId: string,
    }
}

export class NetworkQuery extends jspb.Message { 
    clearPolicyList(): void;
    getPolicyList(): Array<string>;
    setPolicyList(value: Array<string>): NetworkQuery;
    addPolicy(value: string, index?: number): string;
    getAddress(): string;
    setAddress(value: string): NetworkQuery;
    getRequestingRelay(): string;
    setRequestingRelay(value: string): NetworkQuery;
    getRequestingNetwork(): string;
    setRequestingNetwork(value: string): NetworkQuery;
    getCertificate(): string;
    setCertificate(value: string): NetworkQuery;
    getRequestorSignature(): string;
    setRequestorSignature(value: string): NetworkQuery;
    getNonce(): string;
    setNonce(value: string): NetworkQuery;
    getRequestingOrg(): string;
    setRequestingOrg(value: string): NetworkQuery;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NetworkQuery.AsObject;
    static toObject(includeInstance: boolean, msg: NetworkQuery): NetworkQuery.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NetworkQuery, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NetworkQuery;
    static deserializeBinaryFromReader(message: NetworkQuery, reader: jspb.BinaryReader): NetworkQuery;
}

export namespace NetworkQuery {
    export type AsObject = {
        policyList: Array<string>,
        address: string,
        requestingRelay: string,
        requestingNetwork: string,
        certificate: string,
        requestorSignature: string,
        nonce: string,
        requestingOrg: string,
    }
}
