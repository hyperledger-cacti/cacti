// package: common.state
// file: common/state.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Meta extends jspb.Message { 
    getProtocol(): Meta.Protocol;
    setProtocol(value: Meta.Protocol): Meta;
    getTimestamp(): string;
    setTimestamp(value: string): Meta;
    getProofType(): string;
    setProofType(value: string): Meta;
    getSerializationFormat(): string;
    setSerializationFormat(value: string): Meta;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Meta.AsObject;
    static toObject(includeInstance: boolean, msg: Meta): Meta.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Meta, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Meta;
    static deserializeBinaryFromReader(message: Meta, reader: jspb.BinaryReader): Meta;
}

export namespace Meta {
    export type AsObject = {
        protocol: Meta.Protocol,
        timestamp: string,
        proofType: string,
        serializationFormat: string,
    }

    export enum Protocol {
    BITCOIN = 0,
    ETHEREUM = 1,
    FABRIC = 3,
    CORDA = 4,
    }

}

export class View extends jspb.Message { 

    hasMeta(): boolean;
    clearMeta(): void;
    getMeta(): Meta | undefined;
    setMeta(value?: Meta): View;
    getData(): Uint8Array | string;
    getData_asU8(): Uint8Array;
    getData_asB64(): string;
    setData(value: Uint8Array | string): View;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): View.AsObject;
    static toObject(includeInstance: boolean, msg: View): View.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: View, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): View;
    static deserializeBinaryFromReader(message: View, reader: jspb.BinaryReader): View;
}

export namespace View {
    export type AsObject = {
        meta?: Meta.AsObject,
        data: Uint8Array | string,
    }
}

export class ViewPayload extends jspb.Message { 
    getRequestId(): string;
    setRequestId(value: string): ViewPayload;

    hasView(): boolean;
    clearView(): void;
    getView(): View | undefined;
    setView(value?: View): ViewPayload;

    hasError(): boolean;
    clearError(): void;
    getError(): string;
    setError(value: string): ViewPayload;

    getStateCase(): ViewPayload.StateCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ViewPayload.AsObject;
    static toObject(includeInstance: boolean, msg: ViewPayload): ViewPayload.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ViewPayload, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ViewPayload;
    static deserializeBinaryFromReader(message: ViewPayload, reader: jspb.BinaryReader): ViewPayload;
}

export namespace ViewPayload {
    export type AsObject = {
        requestId: string,
        view?: View.AsObject,
        error: string,
    }

    export enum StateCase {
        STATE_NOT_SET = 0,
        VIEW = 2,
        ERROR = 3,
    }

}

export class RequestState extends jspb.Message { 
    getRequestId(): string;
    setRequestId(value: string): RequestState;
    getStatus(): RequestState.STATUS;
    setStatus(value: RequestState.STATUS): RequestState;

    hasView(): boolean;
    clearView(): void;
    getView(): View | undefined;
    setView(value?: View): RequestState;

    hasError(): boolean;
    clearError(): void;
    getError(): string;
    setError(value: string): RequestState;

    getStateCase(): RequestState.StateCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RequestState.AsObject;
    static toObject(includeInstance: boolean, msg: RequestState): RequestState.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RequestState, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RequestState;
    static deserializeBinaryFromReader(message: RequestState, reader: jspb.BinaryReader): RequestState;
}

export namespace RequestState {
    export type AsObject = {
        requestId: string,
        status: RequestState.STATUS,
        view?: View.AsObject,
        error: string,
    }

    export enum STATUS {
    PENDING_ACK = 0,
    PENDING = 1,
    ERROR = 2,
    COMPLETED = 3,
    }


    export enum StateCase {
        STATE_NOT_SET = 0,
        VIEW = 3,
        ERROR = 4,
    }

}
