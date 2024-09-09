// package: relay.satp
// file: relay/satp.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as common_ack_pb from "../common/ack_pb";

export class TransferProposalClaimsRequest extends jspb.Message { 
    getMessageType(): string;
    setMessageType(value: string): TransferProposalClaimsRequest;
    getAssetAssetId(): string;
    setAssetAssetId(value: string): TransferProposalClaimsRequest;
    getAssetProfileId(): string;
    setAssetProfileId(value: string): TransferProposalClaimsRequest;
    getVerifiedOriginatorEntityId(): string;
    setVerifiedOriginatorEntityId(value: string): TransferProposalClaimsRequest;
    getVerifiedBeneficiaryEntityId(): string;
    setVerifiedBeneficiaryEntityId(value: string): TransferProposalClaimsRequest;
    getOriginatorPubkey(): string;
    setOriginatorPubkey(value: string): TransferProposalClaimsRequest;
    getBeneficiaryPubkey(): string;
    setBeneficiaryPubkey(value: string): TransferProposalClaimsRequest;
    getSenderGatewayNetworkId(): string;
    setSenderGatewayNetworkId(value: string): TransferProposalClaimsRequest;
    getRecipientGatewayNetworkId(): string;
    setRecipientGatewayNetworkId(value: string): TransferProposalClaimsRequest;
    getClientIdentityPubkey(): string;
    setClientIdentityPubkey(value: string): TransferProposalClaimsRequest;
    getServerIdentityPubkey(): string;
    setServerIdentityPubkey(value: string): TransferProposalClaimsRequest;
    getSenderGatewayOwnerId(): string;
    setSenderGatewayOwnerId(value: string): TransferProposalClaimsRequest;
    getReceiverGatewayOwnerId(): string;
    setReceiverGatewayOwnerId(value: string): TransferProposalClaimsRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TransferProposalClaimsRequest.AsObject;
    static toObject(includeInstance: boolean, msg: TransferProposalClaimsRequest): TransferProposalClaimsRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TransferProposalClaimsRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TransferProposalClaimsRequest;
    static deserializeBinaryFromReader(message: TransferProposalClaimsRequest, reader: jspb.BinaryReader): TransferProposalClaimsRequest;
}

export namespace TransferProposalClaimsRequest {
    export type AsObject = {
        messageType: string,
        assetAssetId: string,
        assetProfileId: string,
        verifiedOriginatorEntityId: string,
        verifiedBeneficiaryEntityId: string,
        originatorPubkey: string,
        beneficiaryPubkey: string,
        senderGatewayNetworkId: string,
        recipientGatewayNetworkId: string,
        clientIdentityPubkey: string,
        serverIdentityPubkey: string,
        senderGatewayOwnerId: string,
        receiverGatewayOwnerId: string,
    }
}

export class TransferProposalReceiptRequest extends jspb.Message { 
    getMessageType(): string;
    setMessageType(value: string): TransferProposalReceiptRequest;
    getAssetAssetId(): string;
    setAssetAssetId(value: string): TransferProposalReceiptRequest;
    getAssetProfileId(): string;
    setAssetProfileId(value: string): TransferProposalReceiptRequest;
    getVerifiedOriginatorEntityId(): string;
    setVerifiedOriginatorEntityId(value: string): TransferProposalReceiptRequest;
    getVerifiedBeneficiaryEntityId(): string;
    setVerifiedBeneficiaryEntityId(value: string): TransferProposalReceiptRequest;
    getOriginatorPubkey(): string;
    setOriginatorPubkey(value: string): TransferProposalReceiptRequest;
    getBeneficiaryPubkey(): string;
    setBeneficiaryPubkey(value: string): TransferProposalReceiptRequest;
    getSenderGatewayNetworkId(): string;
    setSenderGatewayNetworkId(value: string): TransferProposalReceiptRequest;
    getRecipientGatewayNetworkId(): string;
    setRecipientGatewayNetworkId(value: string): TransferProposalReceiptRequest;
    getClientIdentityPubkey(): string;
    setClientIdentityPubkey(value: string): TransferProposalReceiptRequest;
    getServerIdentityPubkey(): string;
    setServerIdentityPubkey(value: string): TransferProposalReceiptRequest;
    getSenderGatewayOwnerId(): string;
    setSenderGatewayOwnerId(value: string): TransferProposalReceiptRequest;
    getReceiverGatewayOwnerId(): string;
    setReceiverGatewayOwnerId(value: string): TransferProposalReceiptRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TransferProposalReceiptRequest.AsObject;
    static toObject(includeInstance: boolean, msg: TransferProposalReceiptRequest): TransferProposalReceiptRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TransferProposalReceiptRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TransferProposalReceiptRequest;
    static deserializeBinaryFromReader(message: TransferProposalReceiptRequest, reader: jspb.BinaryReader): TransferProposalReceiptRequest;
}

export namespace TransferProposalReceiptRequest {
    export type AsObject = {
        messageType: string,
        assetAssetId: string,
        assetProfileId: string,
        verifiedOriginatorEntityId: string,
        verifiedBeneficiaryEntityId: string,
        originatorPubkey: string,
        beneficiaryPubkey: string,
        senderGatewayNetworkId: string,
        recipientGatewayNetworkId: string,
        clientIdentityPubkey: string,
        serverIdentityPubkey: string,
        senderGatewayOwnerId: string,
        receiverGatewayOwnerId: string,
    }
}

export class TransferCommenceRequest extends jspb.Message { 
    getMessageType(): string;
    setMessageType(value: string): TransferCommenceRequest;
    getSessionId(): string;
    setSessionId(value: string): TransferCommenceRequest;
    getTransferContextId(): string;
    setTransferContextId(value: string): TransferCommenceRequest;
    getClientIdentityPubkey(): string;
    setClientIdentityPubkey(value: string): TransferCommenceRequest;
    getServerIdentityPubkey(): string;
    setServerIdentityPubkey(value: string): TransferCommenceRequest;
    getHashTransferInitClaims(): string;
    setHashTransferInitClaims(value: string): TransferCommenceRequest;
    getHashPrevMessage(): string;
    setHashPrevMessage(value: string): TransferCommenceRequest;
    getClientTransferNumber(): string;
    setClientTransferNumber(value: string): TransferCommenceRequest;
    getClientSignature(): string;
    setClientSignature(value: string): TransferCommenceRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TransferCommenceRequest.AsObject;
    static toObject(includeInstance: boolean, msg: TransferCommenceRequest): TransferCommenceRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TransferCommenceRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TransferCommenceRequest;
    static deserializeBinaryFromReader(message: TransferCommenceRequest, reader: jspb.BinaryReader): TransferCommenceRequest;
}

export namespace TransferCommenceRequest {
    export type AsObject = {
        messageType: string,
        sessionId: string,
        transferContextId: string,
        clientIdentityPubkey: string,
        serverIdentityPubkey: string,
        hashTransferInitClaims: string,
        hashPrevMessage: string,
        clientTransferNumber: string,
        clientSignature: string,
    }
}

export class AckCommenceRequest extends jspb.Message { 
    getMessageType(): string;
    setMessageType(value: string): AckCommenceRequest;
    getSessionId(): string;
    setSessionId(value: string): AckCommenceRequest;
    getTransferContextId(): string;
    setTransferContextId(value: string): AckCommenceRequest;
    getClientIdentityPubkey(): string;
    setClientIdentityPubkey(value: string): AckCommenceRequest;
    getServerIdentityPubkey(): string;
    setServerIdentityPubkey(value: string): AckCommenceRequest;
    getHashPrevMessage(): string;
    setHashPrevMessage(value: string): AckCommenceRequest;
    getServerTransferNumber(): string;
    setServerTransferNumber(value: string): AckCommenceRequest;
    getServerSignature(): string;
    setServerSignature(value: string): AckCommenceRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AckCommenceRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AckCommenceRequest): AckCommenceRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AckCommenceRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AckCommenceRequest;
    static deserializeBinaryFromReader(message: AckCommenceRequest, reader: jspb.BinaryReader): AckCommenceRequest;
}

export namespace AckCommenceRequest {
    export type AsObject = {
        messageType: string,
        sessionId: string,
        transferContextId: string,
        clientIdentityPubkey: string,
        serverIdentityPubkey: string,
        hashPrevMessage: string,
        serverTransferNumber: string,
        serverSignature: string,
    }
}

export class SendAssetStatusRequest extends jspb.Message { 
    getMessageType(): string;
    setMessageType(value: string): SendAssetStatusRequest;
    getSessionId(): string;
    setSessionId(value: string): SendAssetStatusRequest;
    getTransferContextId(): string;
    setTransferContextId(value: string): SendAssetStatusRequest;
    getClientIdentityPubkey(): string;
    setClientIdentityPubkey(value: string): SendAssetStatusRequest;
    getServerIdentityPubkey(): string;
    setServerIdentityPubkey(value: string): SendAssetStatusRequest;
    getHashPrevMessage(): string;
    setHashPrevMessage(value: string): SendAssetStatusRequest;
    getServerTransferNumber(): string;
    setServerTransferNumber(value: string): SendAssetStatusRequest;
    getServerSignature(): string;
    setServerSignature(value: string): SendAssetStatusRequest;
    getStatus(): string;
    setStatus(value: string): SendAssetStatusRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SendAssetStatusRequest.AsObject;
    static toObject(includeInstance: boolean, msg: SendAssetStatusRequest): SendAssetStatusRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SendAssetStatusRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SendAssetStatusRequest;
    static deserializeBinaryFromReader(message: SendAssetStatusRequest, reader: jspb.BinaryReader): SendAssetStatusRequest;
}

export namespace SendAssetStatusRequest {
    export type AsObject = {
        messageType: string,
        sessionId: string,
        transferContextId: string,
        clientIdentityPubkey: string,
        serverIdentityPubkey: string,
        hashPrevMessage: string,
        serverTransferNumber: string,
        serverSignature: string,
        status: string,
    }
}

export class LockAssertionRequest extends jspb.Message { 
    getMessageType(): string;
    setMessageType(value: string): LockAssertionRequest;
    getSessionId(): string;
    setSessionId(value: string): LockAssertionRequest;
    getTransferContextId(): string;
    setTransferContextId(value: string): LockAssertionRequest;
    getClientIdentityPubkey(): string;
    setClientIdentityPubkey(value: string): LockAssertionRequest;
    getServerIdentityPubkey(): string;
    setServerIdentityPubkey(value: string): LockAssertionRequest;
    getLockAssertionClaim(): string;
    setLockAssertionClaim(value: string): LockAssertionRequest;
    getLockAssertionClaimFormat(): string;
    setLockAssertionClaimFormat(value: string): LockAssertionRequest;
    getLockAssertionExpiration(): string;
    setLockAssertionExpiration(value: string): LockAssertionRequest;
    getHashPrevMessage(): string;
    setHashPrevMessage(value: string): LockAssertionRequest;
    getClientTransferNumber(): string;
    setClientTransferNumber(value: string): LockAssertionRequest;
    getClientSignature(): string;
    setClientSignature(value: string): LockAssertionRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): LockAssertionRequest.AsObject;
    static toObject(includeInstance: boolean, msg: LockAssertionRequest): LockAssertionRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: LockAssertionRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): LockAssertionRequest;
    static deserializeBinaryFromReader(message: LockAssertionRequest, reader: jspb.BinaryReader): LockAssertionRequest;
}

export namespace LockAssertionRequest {
    export type AsObject = {
        messageType: string,
        sessionId: string,
        transferContextId: string,
        clientIdentityPubkey: string,
        serverIdentityPubkey: string,
        lockAssertionClaim: string,
        lockAssertionClaimFormat: string,
        lockAssertionExpiration: string,
        hashPrevMessage: string,
        clientTransferNumber: string,
        clientSignature: string,
    }
}

export class LockAssertionReceiptRequest extends jspb.Message { 
    getMessageType(): string;
    setMessageType(value: string): LockAssertionReceiptRequest;
    getSessionId(): string;
    setSessionId(value: string): LockAssertionReceiptRequest;
    getTransferContextId(): string;
    setTransferContextId(value: string): LockAssertionReceiptRequest;
    getClientIdentityPubkey(): string;
    setClientIdentityPubkey(value: string): LockAssertionReceiptRequest;
    getServerIdentityPubkey(): string;
    setServerIdentityPubkey(value: string): LockAssertionReceiptRequest;
    getHashPrevMessage(): string;
    setHashPrevMessage(value: string): LockAssertionReceiptRequest;
    getServerTransferNumber(): string;
    setServerTransferNumber(value: string): LockAssertionReceiptRequest;
    getServerSignature(): string;
    setServerSignature(value: string): LockAssertionReceiptRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): LockAssertionReceiptRequest.AsObject;
    static toObject(includeInstance: boolean, msg: LockAssertionReceiptRequest): LockAssertionReceiptRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: LockAssertionReceiptRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): LockAssertionReceiptRequest;
    static deserializeBinaryFromReader(message: LockAssertionReceiptRequest, reader: jspb.BinaryReader): LockAssertionReceiptRequest;
}

export namespace LockAssertionReceiptRequest {
    export type AsObject = {
        messageType: string,
        sessionId: string,
        transferContextId: string,
        clientIdentityPubkey: string,
        serverIdentityPubkey: string,
        hashPrevMessage: string,
        serverTransferNumber: string,
        serverSignature: string,
    }
}

export class CommitPrepareRequest extends jspb.Message { 
    getMessageType(): string;
    setMessageType(value: string): CommitPrepareRequest;
    getSessionId(): string;
    setSessionId(value: string): CommitPrepareRequest;
    getTransferContextId(): string;
    setTransferContextId(value: string): CommitPrepareRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CommitPrepareRequest.AsObject;
    static toObject(includeInstance: boolean, msg: CommitPrepareRequest): CommitPrepareRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CommitPrepareRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CommitPrepareRequest;
    static deserializeBinaryFromReader(message: CommitPrepareRequest, reader: jspb.BinaryReader): CommitPrepareRequest;
}

export namespace CommitPrepareRequest {
    export type AsObject = {
        messageType: string,
        sessionId: string,
        transferContextId: string,
    }
}

export class CommitReadyRequest extends jspb.Message { 
    getMessageType(): string;
    setMessageType(value: string): CommitReadyRequest;
    getSessionId(): string;
    setSessionId(value: string): CommitReadyRequest;
    getTransferContextId(): string;
    setTransferContextId(value: string): CommitReadyRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CommitReadyRequest.AsObject;
    static toObject(includeInstance: boolean, msg: CommitReadyRequest): CommitReadyRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CommitReadyRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CommitReadyRequest;
    static deserializeBinaryFromReader(message: CommitReadyRequest, reader: jspb.BinaryReader): CommitReadyRequest;
}

export namespace CommitReadyRequest {
    export type AsObject = {
        messageType: string,
        sessionId: string,
        transferContextId: string,
    }
}

export class CommitFinalAssertionRequest extends jspb.Message { 
    getMessageType(): string;
    setMessageType(value: string): CommitFinalAssertionRequest;
    getSessionId(): string;
    setSessionId(value: string): CommitFinalAssertionRequest;
    getTransferContextId(): string;
    setTransferContextId(value: string): CommitFinalAssertionRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CommitFinalAssertionRequest.AsObject;
    static toObject(includeInstance: boolean, msg: CommitFinalAssertionRequest): CommitFinalAssertionRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CommitFinalAssertionRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CommitFinalAssertionRequest;
    static deserializeBinaryFromReader(message: CommitFinalAssertionRequest, reader: jspb.BinaryReader): CommitFinalAssertionRequest;
}

export namespace CommitFinalAssertionRequest {
    export type AsObject = {
        messageType: string,
        sessionId: string,
        transferContextId: string,
    }
}

export class AckFinalReceiptRequest extends jspb.Message { 
    getMessageType(): string;
    setMessageType(value: string): AckFinalReceiptRequest;
    getSessionId(): string;
    setSessionId(value: string): AckFinalReceiptRequest;
    getTransferContextId(): string;
    setTransferContextId(value: string): AckFinalReceiptRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AckFinalReceiptRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AckFinalReceiptRequest): AckFinalReceiptRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AckFinalReceiptRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AckFinalReceiptRequest;
    static deserializeBinaryFromReader(message: AckFinalReceiptRequest, reader: jspb.BinaryReader): AckFinalReceiptRequest;
}

export namespace AckFinalReceiptRequest {
    export type AsObject = {
        messageType: string,
        sessionId: string,
        transferContextId: string,
    }
}

export class TransferCompletedRequest extends jspb.Message { 
    getMessageType(): string;
    setMessageType(value: string): TransferCompletedRequest;
    getSessionId(): string;
    setSessionId(value: string): TransferCompletedRequest;
    getTransferContextId(): string;
    setTransferContextId(value: string): TransferCompletedRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): TransferCompletedRequest.AsObject;
    static toObject(includeInstance: boolean, msg: TransferCompletedRequest): TransferCompletedRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: TransferCompletedRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): TransferCompletedRequest;
    static deserializeBinaryFromReader(message: TransferCompletedRequest, reader: jspb.BinaryReader): TransferCompletedRequest;
}

export namespace TransferCompletedRequest {
    export type AsObject = {
        messageType: string,
        sessionId: string,
        transferContextId: string,
    }
}
