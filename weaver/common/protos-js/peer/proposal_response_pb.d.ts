// package: protos
// file: peer/proposal_response.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";

export class ProposalResponse extends jspb.Message { 
    getVersion(): number;
    setVersion(value: number): ProposalResponse;

    hasTimestamp(): boolean;
    clearTimestamp(): void;
    getTimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
    setTimestamp(value?: google_protobuf_timestamp_pb.Timestamp): ProposalResponse;

    hasResponse(): boolean;
    clearResponse(): void;
    getResponse(): Response | undefined;
    setResponse(value?: Response): ProposalResponse;
    getPayload(): Uint8Array | string;
    getPayload_asU8(): Uint8Array;
    getPayload_asB64(): string;
    setPayload(value: Uint8Array | string): ProposalResponse;

    hasEndorsement(): boolean;
    clearEndorsement(): void;
    getEndorsement(): Endorsement | undefined;
    setEndorsement(value?: Endorsement): ProposalResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ProposalResponse.AsObject;
    static toObject(includeInstance: boolean, msg: ProposalResponse): ProposalResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ProposalResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ProposalResponse;
    static deserializeBinaryFromReader(message: ProposalResponse, reader: jspb.BinaryReader): ProposalResponse;
}

export namespace ProposalResponse {
    export type AsObject = {
        version: number,
        timestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
        response?: Response.AsObject,
        payload: Uint8Array | string,
        endorsement?: Endorsement.AsObject,
    }
}

export class Response extends jspb.Message { 
    getStatus(): number;
    setStatus(value: number): Response;
    getMessage(): string;
    setMessage(value: string): Response;
    getPayload(): Uint8Array | string;
    getPayload_asU8(): Uint8Array;
    getPayload_asB64(): string;
    setPayload(value: Uint8Array | string): Response;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Response.AsObject;
    static toObject(includeInstance: boolean, msg: Response): Response.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Response, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Response;
    static deserializeBinaryFromReader(message: Response, reader: jspb.BinaryReader): Response;
}

export namespace Response {
    export type AsObject = {
        status: number,
        message: string,
        payload: Uint8Array | string,
    }
}

export class ProposalResponsePayload extends jspb.Message { 
    getProposalHash(): Uint8Array | string;
    getProposalHash_asU8(): Uint8Array;
    getProposalHash_asB64(): string;
    setProposalHash(value: Uint8Array | string): ProposalResponsePayload;
    getExtension$(): Uint8Array | string;
    getExtension_asU8(): Uint8Array;
    getExtension_asB64(): string;
    setExtension$(value: Uint8Array | string): ProposalResponsePayload;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ProposalResponsePayload.AsObject;
    static toObject(includeInstance: boolean, msg: ProposalResponsePayload): ProposalResponsePayload.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ProposalResponsePayload, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ProposalResponsePayload;
    static deserializeBinaryFromReader(message: ProposalResponsePayload, reader: jspb.BinaryReader): ProposalResponsePayload;
}

export namespace ProposalResponsePayload {
    export type AsObject = {
        proposalHash: Uint8Array | string,
        extension: Uint8Array | string,
    }
}

export class Endorsement extends jspb.Message { 
    getEndorser(): Uint8Array | string;
    getEndorser_asU8(): Uint8Array;
    getEndorser_asB64(): string;
    setEndorser(value: Uint8Array | string): Endorsement;
    getSignature(): Uint8Array | string;
    getSignature_asU8(): Uint8Array;
    getSignature_asB64(): string;
    setSignature(value: Uint8Array | string): Endorsement;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Endorsement.AsObject;
    static toObject(includeInstance: boolean, msg: Endorsement): Endorsement.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Endorsement, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Endorsement;
    static deserializeBinaryFromReader(message: Endorsement, reader: jspb.BinaryReader): Endorsement;
}

export namespace Endorsement {
    export type AsObject = {
        endorser: Uint8Array | string,
        signature: Uint8Array | string,
    }
}
