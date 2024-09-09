// package: networks.networks
// file: networks/networks.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as common_ack_pb from "../common/ack_pb";
import * as common_state_pb from "../common/state_pb";
import * as common_events_pb from "../common/events_pb";

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
    getConfidential(): boolean;
    setConfidential(value: boolean): NetworkQuery;

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
        confidential: boolean,
    }
}

export class NetworkEventSubscription extends jspb.Message { 

    hasEventMatcher(): boolean;
    clearEventMatcher(): void;
    getEventMatcher(): common_events_pb.EventMatcher | undefined;
    setEventMatcher(value?: common_events_pb.EventMatcher): NetworkEventSubscription;

    hasQuery(): boolean;
    clearQuery(): void;
    getQuery(): NetworkQuery | undefined;
    setQuery(value?: NetworkQuery): NetworkEventSubscription;

    hasEventPublicationSpec(): boolean;
    clearEventPublicationSpec(): void;
    getEventPublicationSpec(): common_events_pb.EventPublication | undefined;
    setEventPublicationSpec(value?: common_events_pb.EventPublication): NetworkEventSubscription;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NetworkEventSubscription.AsObject;
    static toObject(includeInstance: boolean, msg: NetworkEventSubscription): NetworkEventSubscription.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NetworkEventSubscription, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NetworkEventSubscription;
    static deserializeBinaryFromReader(message: NetworkEventSubscription, reader: jspb.BinaryReader): NetworkEventSubscription;
}

export namespace NetworkEventSubscription {
    export type AsObject = {
        eventMatcher?: common_events_pb.EventMatcher.AsObject,
        query?: NetworkQuery.AsObject,
        eventPublicationSpec?: common_events_pb.EventPublication.AsObject,
    }
}

export class NetworkEventUnsubscription extends jspb.Message { 

    hasRequest(): boolean;
    clearRequest(): void;
    getRequest(): NetworkEventSubscription | undefined;
    setRequest(value?: NetworkEventSubscription): NetworkEventUnsubscription;
    getRequestId(): string;
    setRequestId(value: string): NetworkEventUnsubscription;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NetworkEventUnsubscription.AsObject;
    static toObject(includeInstance: boolean, msg: NetworkEventUnsubscription): NetworkEventUnsubscription.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NetworkEventUnsubscription, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NetworkEventUnsubscription;
    static deserializeBinaryFromReader(message: NetworkEventUnsubscription, reader: jspb.BinaryReader): NetworkEventUnsubscription;
}

export namespace NetworkEventUnsubscription {
    export type AsObject = {
        request?: NetworkEventSubscription.AsObject,
        requestId: string,
    }
}

export class NetworkAssetTransfer extends jspb.Message { 
    getAssetType(): string;
    setAssetType(value: string): NetworkAssetTransfer;
    getAssetId(): string;
    setAssetId(value: string): NetworkAssetTransfer;
    getSender(): string;
    setSender(value: string): NetworkAssetTransfer;
    getSourceContractId(): string;
    setSourceContractId(value: string): NetworkAssetTransfer;
    getSourceRelay(): string;
    setSourceRelay(value: string): NetworkAssetTransfer;
    getSourceNetwork(): string;
    setSourceNetwork(value: string): NetworkAssetTransfer;
    getDestinationRelay(): string;
    setDestinationRelay(value: string): NetworkAssetTransfer;
    getDestinationNetwork(): string;
    setDestinationNetwork(value: string): NetworkAssetTransfer;
    getRecipient(): string;
    setRecipient(value: string): NetworkAssetTransfer;
    getDestinationContractId(): string;
    setDestinationContractId(value: string): NetworkAssetTransfer;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): NetworkAssetTransfer.AsObject;
    static toObject(includeInstance: boolean, msg: NetworkAssetTransfer): NetworkAssetTransfer.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: NetworkAssetTransfer, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): NetworkAssetTransfer;
    static deserializeBinaryFromReader(message: NetworkAssetTransfer, reader: jspb.BinaryReader): NetworkAssetTransfer;
}

export namespace NetworkAssetTransfer {
    export type AsObject = {
        assetType: string,
        assetId: string,
        sender: string,
        sourceContractId: string,
        sourceRelay: string,
        sourceNetwork: string,
        destinationRelay: string,
        destinationNetwork: string,
        recipient: string,
        destinationContractId: string,
    }
}
