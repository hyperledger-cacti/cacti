// package: common.events
// file: common/events.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as common_query_pb from "../common/query_pb";
import * as common_state_pb from "../common/state_pb";

export class EventMatcher extends jspb.Message { 
    getEventType(): EventType;
    setEventType(value: EventType): EventMatcher;
    getEventClassId(): string;
    setEventClassId(value: string): EventMatcher;
    getTransactionLedgerId(): string;
    setTransactionLedgerId(value: string): EventMatcher;
    getTransactionContractId(): string;
    setTransactionContractId(value: string): EventMatcher;
    getTransactionFunc(): string;
    setTransactionFunc(value: string): EventMatcher;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EventMatcher.AsObject;
    static toObject(includeInstance: boolean, msg: EventMatcher): EventMatcher.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EventMatcher, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EventMatcher;
    static deserializeBinaryFromReader(message: EventMatcher, reader: jspb.BinaryReader): EventMatcher;
}

export namespace EventMatcher {
    export type AsObject = {
        eventType: EventType,
        eventClassId: string,
        transactionLedgerId: string,
        transactionContractId: string,
        transactionFunc: string,
    }
}

export class EventSubscription extends jspb.Message { 

    hasEventMatcher(): boolean;
    clearEventMatcher(): void;
    getEventMatcher(): EventMatcher | undefined;
    setEventMatcher(value?: EventMatcher): EventSubscription;

    hasQuery(): boolean;
    clearQuery(): void;
    getQuery(): common_query_pb.Query | undefined;
    setQuery(value?: common_query_pb.Query): EventSubscription;
    getOperation(): EventSubOperation;
    setOperation(value: EventSubOperation): EventSubscription;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EventSubscription.AsObject;
    static toObject(includeInstance: boolean, msg: EventSubscription): EventSubscription.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EventSubscription, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EventSubscription;
    static deserializeBinaryFromReader(message: EventSubscription, reader: jspb.BinaryReader): EventSubscription;
}

export namespace EventSubscription {
    export type AsObject = {
        eventMatcher?: EventMatcher.AsObject,
        query?: common_query_pb.Query.AsObject,
        operation: EventSubOperation,
    }
}

export class EventSubscriptionState extends jspb.Message { 
    getRequestId(): string;
    setRequestId(value: string): EventSubscriptionState;
    getPublishingRequestId(): string;
    setPublishingRequestId(value: string): EventSubscriptionState;
    getStatus(): EventSubscriptionState.STATUS;
    setStatus(value: EventSubscriptionState.STATUS): EventSubscriptionState;
    getMessage(): string;
    setMessage(value: string): EventSubscriptionState;

    hasEventMatcher(): boolean;
    clearEventMatcher(): void;
    getEventMatcher(): EventMatcher | undefined;
    setEventMatcher(value?: EventMatcher): EventSubscriptionState;
    clearEventPublicationSpecsList(): void;
    getEventPublicationSpecsList(): Array<EventPublication>;
    setEventPublicationSpecsList(value: Array<EventPublication>): EventSubscriptionState;
    addEventPublicationSpecs(value?: EventPublication, index?: number): EventPublication;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EventSubscriptionState.AsObject;
    static toObject(includeInstance: boolean, msg: EventSubscriptionState): EventSubscriptionState.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EventSubscriptionState, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EventSubscriptionState;
    static deserializeBinaryFromReader(message: EventSubscriptionState, reader: jspb.BinaryReader): EventSubscriptionState;
}

export namespace EventSubscriptionState {
    export type AsObject = {
        requestId: string,
        publishingRequestId: string,
        status: EventSubscriptionState.STATUS,
        message: string,
        eventMatcher?: EventMatcher.AsObject,
        eventPublicationSpecsList: Array<EventPublication.AsObject>,
    }

    export enum STATUS {
    SUBSCRIBE_PENDING_ACK = 0,
    SUBSCRIBE_PENDING = 1,
    SUBSCRIBED = 2,
    UNSUBSCRIBE_PENDING_ACK = 3,
    UNSUBSCRIBE_PENDING = 4,
    UNSUBSCRIBED = 5,
    ERROR = 6,
    DUPLICATE_QUERY_SUBSCRIBED = 7,
    }

}

export class ContractTransaction extends jspb.Message { 
    getDriverId(): string;
    setDriverId(value: string): ContractTransaction;
    getLedgerId(): string;
    setLedgerId(value: string): ContractTransaction;
    getContractId(): string;
    setContractId(value: string): ContractTransaction;
    getFunc(): string;
    setFunc(value: string): ContractTransaction;
    clearArgsList(): void;
    getArgsList(): Array<Uint8Array | string>;
    getArgsList_asU8(): Array<Uint8Array>;
    getArgsList_asB64(): Array<string>;
    setArgsList(value: Array<Uint8Array | string>): ContractTransaction;
    addArgs(value: Uint8Array | string, index?: number): Uint8Array | string;
    getReplaceArgIndex(): number;
    setReplaceArgIndex(value: number): ContractTransaction;
    clearMembersList(): void;
    getMembersList(): Array<string>;
    setMembersList(value: Array<string>): ContractTransaction;
    addMembers(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ContractTransaction.AsObject;
    static toObject(includeInstance: boolean, msg: ContractTransaction): ContractTransaction.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ContractTransaction, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ContractTransaction;
    static deserializeBinaryFromReader(message: ContractTransaction, reader: jspb.BinaryReader): ContractTransaction;
}

export namespace ContractTransaction {
    export type AsObject = {
        driverId: string,
        ledgerId: string,
        contractId: string,
        func: string,
        argsList: Array<Uint8Array | string>,
        replaceArgIndex: number,
        membersList: Array<string>,
    }
}

export class EventPublication extends jspb.Message { 

    hasCtx(): boolean;
    clearCtx(): void;
    getCtx(): ContractTransaction | undefined;
    setCtx(value?: ContractTransaction): EventPublication;

    hasAppUrl(): boolean;
    clearAppUrl(): void;
    getAppUrl(): string;
    setAppUrl(value: string): EventPublication;

    getPublicationTargetCase(): EventPublication.PublicationTargetCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EventPublication.AsObject;
    static toObject(includeInstance: boolean, msg: EventPublication): EventPublication.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EventPublication, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EventPublication;
    static deserializeBinaryFromReader(message: EventPublication, reader: jspb.BinaryReader): EventPublication;
}

export namespace EventPublication {
    export type AsObject = {
        ctx?: ContractTransaction.AsObject,
        appUrl: string,
    }

    export enum PublicationTargetCase {
        PUBLICATION_TARGET_NOT_SET = 0,
        CTX = 1,
        APP_URL = 2,
    }

}

export class EventStates extends jspb.Message { 
    clearStatesList(): void;
    getStatesList(): Array<EventState>;
    setStatesList(value: Array<EventState>): EventStates;
    addStates(value?: EventState, index?: number): EventState;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EventStates.AsObject;
    static toObject(includeInstance: boolean, msg: EventStates): EventStates.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EventStates, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EventStates;
    static deserializeBinaryFromReader(message: EventStates, reader: jspb.BinaryReader): EventStates;
}

export namespace EventStates {
    export type AsObject = {
        statesList: Array<EventState.AsObject>,
    }
}

export class EventState extends jspb.Message { 

    hasState(): boolean;
    clearState(): void;
    getState(): common_state_pb.RequestState | undefined;
    setState(value?: common_state_pb.RequestState): EventState;
    getEventId(): string;
    setEventId(value: string): EventState;
    getMessage(): string;
    setMessage(value: string): EventState;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EventState.AsObject;
    static toObject(includeInstance: boolean, msg: EventState): EventState.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EventState, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EventState;
    static deserializeBinaryFromReader(message: EventState, reader: jspb.BinaryReader): EventState;
}

export namespace EventState {
    export type AsObject = {
        state?: common_state_pb.RequestState.AsObject,
        eventId: string,
        message: string,
    }
}

export enum EventType {
    LEDGER_STATE = 0,
    ASSET_LOCK = 1,
    ASSET_CLAIM = 2,
}

export enum EventSubOperation {
    SUBSCRIBE = 0,
    UNSUBSCRIBE = 1,
    UPDATE = 2,
}
