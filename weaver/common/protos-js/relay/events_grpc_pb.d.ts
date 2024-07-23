// package: relay.events
// file: relay/events.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as relay_events_pb from "../relay/events_pb";
import * as common_ack_pb from "../common/ack_pb";
import * as common_events_pb from "../common/events_pb";
import * as common_state_pb from "../common/state_pb";

interface IEventSubscribeService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    subscribeEvent: IEventSubscribeService_ISubscribeEvent;
    sendSubscriptionStatus: IEventSubscribeService_ISendSubscriptionStatus;
    sendDriverSubscriptionStatus: IEventSubscribeService_ISendDriverSubscriptionStatus;
}

interface IEventSubscribeService_ISubscribeEvent extends grpc.MethodDefinition<common_events_pb.EventSubscription, common_ack_pb.Ack> {
    path: "/relay.events.EventSubscribe/SubscribeEvent";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<common_events_pb.EventSubscription>;
    requestDeserialize: grpc.deserialize<common_events_pb.EventSubscription>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IEventSubscribeService_ISendSubscriptionStatus extends grpc.MethodDefinition<common_ack_pb.Ack, common_ack_pb.Ack> {
    path: "/relay.events.EventSubscribe/SendSubscriptionStatus";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<common_ack_pb.Ack>;
    requestDeserialize: grpc.deserialize<common_ack_pb.Ack>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IEventSubscribeService_ISendDriverSubscriptionStatus extends grpc.MethodDefinition<common_ack_pb.Ack, common_ack_pb.Ack> {
    path: "/relay.events.EventSubscribe/SendDriverSubscriptionStatus";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<common_ack_pb.Ack>;
    requestDeserialize: grpc.deserialize<common_ack_pb.Ack>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}

export const EventSubscribeService: IEventSubscribeService;

export interface IEventSubscribeServer extends grpc.UntypedServiceImplementation {
    subscribeEvent: grpc.handleUnaryCall<common_events_pb.EventSubscription, common_ack_pb.Ack>;
    sendSubscriptionStatus: grpc.handleUnaryCall<common_ack_pb.Ack, common_ack_pb.Ack>;
    sendDriverSubscriptionStatus: grpc.handleUnaryCall<common_ack_pb.Ack, common_ack_pb.Ack>;
}

export interface IEventSubscribeClient {
    subscribeEvent(request: common_events_pb.EventSubscription, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    subscribeEvent(request: common_events_pb.EventSubscription, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    subscribeEvent(request: common_events_pb.EventSubscription, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendSubscriptionStatus(request: common_ack_pb.Ack, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendSubscriptionStatus(request: common_ack_pb.Ack, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendSubscriptionStatus(request: common_ack_pb.Ack, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendDriverSubscriptionStatus(request: common_ack_pb.Ack, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendDriverSubscriptionStatus(request: common_ack_pb.Ack, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendDriverSubscriptionStatus(request: common_ack_pb.Ack, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}

export class EventSubscribeClient extends grpc.Client implements IEventSubscribeClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public subscribeEvent(request: common_events_pb.EventSubscription, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public subscribeEvent(request: common_events_pb.EventSubscription, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public subscribeEvent(request: common_events_pb.EventSubscription, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendSubscriptionStatus(request: common_ack_pb.Ack, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendSubscriptionStatus(request: common_ack_pb.Ack, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendSubscriptionStatus(request: common_ack_pb.Ack, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendDriverSubscriptionStatus(request: common_ack_pb.Ack, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendDriverSubscriptionStatus(request: common_ack_pb.Ack, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendDriverSubscriptionStatus(request: common_ack_pb.Ack, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}

interface IEventPublishService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    sendDriverState: IEventPublishService_ISendDriverState;
    sendState: IEventPublishService_ISendState;
}

interface IEventPublishService_ISendDriverState extends grpc.MethodDefinition<common_state_pb.ViewPayload, common_ack_pb.Ack> {
    path: "/relay.events.EventPublish/SendDriverState";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<common_state_pb.ViewPayload>;
    requestDeserialize: grpc.deserialize<common_state_pb.ViewPayload>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IEventPublishService_ISendState extends grpc.MethodDefinition<common_state_pb.ViewPayload, common_ack_pb.Ack> {
    path: "/relay.events.EventPublish/SendState";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<common_state_pb.ViewPayload>;
    requestDeserialize: grpc.deserialize<common_state_pb.ViewPayload>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}

export const EventPublishService: IEventPublishService;

export interface IEventPublishServer extends grpc.UntypedServiceImplementation {
    sendDriverState: grpc.handleUnaryCall<common_state_pb.ViewPayload, common_ack_pb.Ack>;
    sendState: grpc.handleUnaryCall<common_state_pb.ViewPayload, common_ack_pb.Ack>;
}

export interface IEventPublishClient {
    sendDriverState(request: common_state_pb.ViewPayload, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendDriverState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendDriverState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendState(request: common_state_pb.ViewPayload, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}

export class EventPublishClient extends grpc.Client implements IEventPublishClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public sendDriverState(request: common_state_pb.ViewPayload, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendDriverState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendDriverState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendState(request: common_state_pb.ViewPayload, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}
