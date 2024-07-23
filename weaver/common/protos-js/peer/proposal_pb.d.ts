// package: protos
// file: peer/proposal.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as peer_chaincode_pb from "../peer/chaincode_pb";
import * as peer_proposal_response_pb from "../peer/proposal_response_pb";

export class SignedProposal extends jspb.Message { 
    getProposalBytes(): Uint8Array | string;
    getProposalBytes_asU8(): Uint8Array;
    getProposalBytes_asB64(): string;
    setProposalBytes(value: Uint8Array | string): SignedProposal;
    getSignature(): Uint8Array | string;
    getSignature_asU8(): Uint8Array;
    getSignature_asB64(): string;
    setSignature(value: Uint8Array | string): SignedProposal;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SignedProposal.AsObject;
    static toObject(includeInstance: boolean, msg: SignedProposal): SignedProposal.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SignedProposal, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SignedProposal;
    static deserializeBinaryFromReader(message: SignedProposal, reader: jspb.BinaryReader): SignedProposal;
}

export namespace SignedProposal {
    export type AsObject = {
        proposalBytes: Uint8Array | string,
        signature: Uint8Array | string,
    }
}

export class Proposal extends jspb.Message { 
    getHeader(): Uint8Array | string;
    getHeader_asU8(): Uint8Array;
    getHeader_asB64(): string;
    setHeader(value: Uint8Array | string): Proposal;
    getPayload(): Uint8Array | string;
    getPayload_asU8(): Uint8Array;
    getPayload_asB64(): string;
    setPayload(value: Uint8Array | string): Proposal;
    getExtension$(): Uint8Array | string;
    getExtension_asU8(): Uint8Array;
    getExtension_asB64(): string;
    setExtension$(value: Uint8Array | string): Proposal;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Proposal.AsObject;
    static toObject(includeInstance: boolean, msg: Proposal): Proposal.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Proposal, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Proposal;
    static deserializeBinaryFromReader(message: Proposal, reader: jspb.BinaryReader): Proposal;
}

export namespace Proposal {
    export type AsObject = {
        header: Uint8Array | string,
        payload: Uint8Array | string,
        extension: Uint8Array | string,
    }
}

export class ChaincodeHeaderExtension extends jspb.Message { 

    hasChaincodeId(): boolean;
    clearChaincodeId(): void;
    getChaincodeId(): peer_chaincode_pb.ChaincodeID | undefined;
    setChaincodeId(value?: peer_chaincode_pb.ChaincodeID): ChaincodeHeaderExtension;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ChaincodeHeaderExtension.AsObject;
    static toObject(includeInstance: boolean, msg: ChaincodeHeaderExtension): ChaincodeHeaderExtension.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ChaincodeHeaderExtension, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ChaincodeHeaderExtension;
    static deserializeBinaryFromReader(message: ChaincodeHeaderExtension, reader: jspb.BinaryReader): ChaincodeHeaderExtension;
}

export namespace ChaincodeHeaderExtension {
    export type AsObject = {
        chaincodeId?: peer_chaincode_pb.ChaincodeID.AsObject,
    }
}

export class ChaincodeProposalPayload extends jspb.Message { 
    getInput(): Uint8Array | string;
    getInput_asU8(): Uint8Array;
    getInput_asB64(): string;
    setInput(value: Uint8Array | string): ChaincodeProposalPayload;

    getTransientmapMap(): jspb.Map<string, Uint8Array | string>;
    clearTransientmapMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ChaincodeProposalPayload.AsObject;
    static toObject(includeInstance: boolean, msg: ChaincodeProposalPayload): ChaincodeProposalPayload.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ChaincodeProposalPayload, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ChaincodeProposalPayload;
    static deserializeBinaryFromReader(message: ChaincodeProposalPayload, reader: jspb.BinaryReader): ChaincodeProposalPayload;
}

export namespace ChaincodeProposalPayload {
    export type AsObject = {
        input: Uint8Array | string,

        transientmapMap: Array<[string, Uint8Array | string]>,
    }
}

export class ChaincodeAction extends jspb.Message { 
    getResults(): Uint8Array | string;
    getResults_asU8(): Uint8Array;
    getResults_asB64(): string;
    setResults(value: Uint8Array | string): ChaincodeAction;
    getEvents(): Uint8Array | string;
    getEvents_asU8(): Uint8Array;
    getEvents_asB64(): string;
    setEvents(value: Uint8Array | string): ChaincodeAction;

    hasResponse(): boolean;
    clearResponse(): void;
    getResponse(): peer_proposal_response_pb.Response | undefined;
    setResponse(value?: peer_proposal_response_pb.Response): ChaincodeAction;

    hasChaincodeId(): boolean;
    clearChaincodeId(): void;
    getChaincodeId(): peer_chaincode_pb.ChaincodeID | undefined;
    setChaincodeId(value?: peer_chaincode_pb.ChaincodeID): ChaincodeAction;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ChaincodeAction.AsObject;
    static toObject(includeInstance: boolean, msg: ChaincodeAction): ChaincodeAction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ChaincodeAction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ChaincodeAction;
    static deserializeBinaryFromReader(message: ChaincodeAction, reader: jspb.BinaryReader): ChaincodeAction;
}

export namespace ChaincodeAction {
    export type AsObject = {
        results: Uint8Array | string,
        events: Uint8Array | string,
        response?: peer_proposal_response_pb.Response.AsObject,
        chaincodeId?: peer_chaincode_pb.ChaincodeID.AsObject,
    }
}
