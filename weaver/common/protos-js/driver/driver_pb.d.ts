// package: driver.driver
// file: driver/driver.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as common_ack_pb from "../common/ack_pb";
import * as common_query_pb from "../common/query_pb";
import * as common_events_pb from "../common/events_pb";
import * as common_state_pb from "../common/state_pb";

export class WriteExternalStateMessage extends jspb.Message { 

    hasViewPayload(): boolean;
    clearViewPayload(): void;
    getViewPayload(): common_state_pb.ViewPayload | undefined;
    setViewPayload(value?: common_state_pb.ViewPayload): WriteExternalStateMessage;

    hasCtx(): boolean;
    clearCtx(): void;
    getCtx(): common_events_pb.ContractTransaction | undefined;
    setCtx(value?: common_events_pb.ContractTransaction): WriteExternalStateMessage;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): WriteExternalStateMessage.AsObject;
    static toObject(includeInstance: boolean, msg: WriteExternalStateMessage): WriteExternalStateMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: WriteExternalStateMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): WriteExternalStateMessage;
    static deserializeBinaryFromReader(message: WriteExternalStateMessage, reader: jspb.BinaryReader): WriteExternalStateMessage;
}

export namespace WriteExternalStateMessage {
    export type AsObject = {
        viewPayload?: common_state_pb.ViewPayload.AsObject,
        ctx?: common_events_pb.ContractTransaction.AsObject,
    }
}

export class PerformLockRequest extends jspb.Message { 
    getSessionId(): string;
    setSessionId(value: string): PerformLockRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PerformLockRequest.AsObject;
    static toObject(includeInstance: boolean, msg: PerformLockRequest): PerformLockRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PerformLockRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PerformLockRequest;
    static deserializeBinaryFromReader(message: PerformLockRequest, reader: jspb.BinaryReader): PerformLockRequest;
}

export namespace PerformLockRequest {
    export type AsObject = {
        sessionId: string,
    }
}

export class CreateAssetRequest extends jspb.Message { 
    getSessionId(): string;
    setSessionId(value: string): CreateAssetRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CreateAssetRequest.AsObject;
    static toObject(includeInstance: boolean, msg: CreateAssetRequest): CreateAssetRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CreateAssetRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CreateAssetRequest;
    static deserializeBinaryFromReader(message: CreateAssetRequest, reader: jspb.BinaryReader): CreateAssetRequest;
}

export namespace CreateAssetRequest {
    export type AsObject = {
        sessionId: string,
    }
}

export class ExtinguishRequest extends jspb.Message { 
    getSessionId(): string;
    setSessionId(value: string): ExtinguishRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ExtinguishRequest.AsObject;
    static toObject(includeInstance: boolean, msg: ExtinguishRequest): ExtinguishRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ExtinguishRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ExtinguishRequest;
    static deserializeBinaryFromReader(message: ExtinguishRequest, reader: jspb.BinaryReader): ExtinguishRequest;
}

export namespace ExtinguishRequest {
    export type AsObject = {
        sessionId: string,
    }
}

export class AssignAssetRequest extends jspb.Message { 
    getSessionId(): string;
    setSessionId(value: string): AssignAssetRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AssignAssetRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AssignAssetRequest): AssignAssetRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AssignAssetRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AssignAssetRequest;
    static deserializeBinaryFromReader(message: AssignAssetRequest, reader: jspb.BinaryReader): AssignAssetRequest;
}

export namespace AssignAssetRequest {
    export type AsObject = {
        sessionId: string,
    }
}
