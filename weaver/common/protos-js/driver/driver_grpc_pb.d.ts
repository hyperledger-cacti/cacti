// package: driver.driver
// file: driver/driver.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as driver_driver_pb from "../driver/driver_pb";
import * as common_ack_pb from "../common/ack_pb";
import * as common_query_pb from "../common/query_pb";
import * as common_events_pb from "../common/events_pb";
import * as common_state_pb from "../common/state_pb";

interface IDriverCommunicationService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    requestDriverState: IDriverCommunicationService_IRequestDriverState;
    subscribeEvent: IDriverCommunicationService_ISubscribeEvent;
    requestSignedEventSubscriptionQuery: IDriverCommunicationService_IRequestSignedEventSubscriptionQuery;
    writeExternalState: IDriverCommunicationService_IWriteExternalState;
    performLock: IDriverCommunicationService_IPerformLock;
    createAsset: IDriverCommunicationService_ICreateAsset;
    extinguish: IDriverCommunicationService_IExtinguish;
    assignAsset: IDriverCommunicationService_IAssignAsset;
}

interface IDriverCommunicationService_IRequestDriverState extends grpc.MethodDefinition<common_query_pb.Query, common_ack_pb.Ack> {
    path: "/driver.driver.DriverCommunication/RequestDriverState";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<common_query_pb.Query>;
    requestDeserialize: grpc.deserialize<common_query_pb.Query>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IDriverCommunicationService_ISubscribeEvent extends grpc.MethodDefinition<common_events_pb.EventSubscription, common_ack_pb.Ack> {
    path: "/driver.driver.DriverCommunication/SubscribeEvent";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<common_events_pb.EventSubscription>;
    requestDeserialize: grpc.deserialize<common_events_pb.EventSubscription>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IDriverCommunicationService_IRequestSignedEventSubscriptionQuery extends grpc.MethodDefinition<common_events_pb.EventSubscription, common_query_pb.Query> {
    path: "/driver.driver.DriverCommunication/RequestSignedEventSubscriptionQuery";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<common_events_pb.EventSubscription>;
    requestDeserialize: grpc.deserialize<common_events_pb.EventSubscription>;
    responseSerialize: grpc.serialize<common_query_pb.Query>;
    responseDeserialize: grpc.deserialize<common_query_pb.Query>;
}
interface IDriverCommunicationService_IWriteExternalState extends grpc.MethodDefinition<driver_driver_pb.WriteExternalStateMessage, common_ack_pb.Ack> {
    path: "/driver.driver.DriverCommunication/WriteExternalState";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<driver_driver_pb.WriteExternalStateMessage>;
    requestDeserialize: grpc.deserialize<driver_driver_pb.WriteExternalStateMessage>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IDriverCommunicationService_IPerformLock extends grpc.MethodDefinition<driver_driver_pb.PerformLockRequest, common_ack_pb.Ack> {
    path: "/driver.driver.DriverCommunication/PerformLock";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<driver_driver_pb.PerformLockRequest>;
    requestDeserialize: grpc.deserialize<driver_driver_pb.PerformLockRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IDriverCommunicationService_ICreateAsset extends grpc.MethodDefinition<driver_driver_pb.CreateAssetRequest, common_ack_pb.Ack> {
    path: "/driver.driver.DriverCommunication/CreateAsset";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<driver_driver_pb.CreateAssetRequest>;
    requestDeserialize: grpc.deserialize<driver_driver_pb.CreateAssetRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IDriverCommunicationService_IExtinguish extends grpc.MethodDefinition<driver_driver_pb.ExtinguishRequest, common_ack_pb.Ack> {
    path: "/driver.driver.DriverCommunication/Extinguish";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<driver_driver_pb.ExtinguishRequest>;
    requestDeserialize: grpc.deserialize<driver_driver_pb.ExtinguishRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IDriverCommunicationService_IAssignAsset extends grpc.MethodDefinition<driver_driver_pb.AssignAssetRequest, common_ack_pb.Ack> {
    path: "/driver.driver.DriverCommunication/AssignAsset";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<driver_driver_pb.AssignAssetRequest>;
    requestDeserialize: grpc.deserialize<driver_driver_pb.AssignAssetRequest>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}

export const DriverCommunicationService: IDriverCommunicationService;

export interface IDriverCommunicationServer extends grpc.UntypedServiceImplementation {
    requestDriverState: grpc.handleUnaryCall<common_query_pb.Query, common_ack_pb.Ack>;
    subscribeEvent: grpc.handleUnaryCall<common_events_pb.EventSubscription, common_ack_pb.Ack>;
    requestSignedEventSubscriptionQuery: grpc.handleUnaryCall<common_events_pb.EventSubscription, common_query_pb.Query>;
    writeExternalState: grpc.handleUnaryCall<driver_driver_pb.WriteExternalStateMessage, common_ack_pb.Ack>;
    performLock: grpc.handleUnaryCall<driver_driver_pb.PerformLockRequest, common_ack_pb.Ack>;
    createAsset: grpc.handleUnaryCall<driver_driver_pb.CreateAssetRequest, common_ack_pb.Ack>;
    extinguish: grpc.handleUnaryCall<driver_driver_pb.ExtinguishRequest, common_ack_pb.Ack>;
    assignAsset: grpc.handleUnaryCall<driver_driver_pb.AssignAssetRequest, common_ack_pb.Ack>;
}

export interface IDriverCommunicationClient {
    requestDriverState(request: common_query_pb.Query, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestDriverState(request: common_query_pb.Query, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestDriverState(request: common_query_pb.Query, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    subscribeEvent(request: common_events_pb.EventSubscription, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    subscribeEvent(request: common_events_pb.EventSubscription, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    subscribeEvent(request: common_events_pb.EventSubscription, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestSignedEventSubscriptionQuery(request: common_events_pb.EventSubscription, callback: (error: grpc.ServiceError | null, response: common_query_pb.Query) => void): grpc.ClientUnaryCall;
    requestSignedEventSubscriptionQuery(request: common_events_pb.EventSubscription, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_query_pb.Query) => void): grpc.ClientUnaryCall;
    requestSignedEventSubscriptionQuery(request: common_events_pb.EventSubscription, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_query_pb.Query) => void): grpc.ClientUnaryCall;
    writeExternalState(request: driver_driver_pb.WriteExternalStateMessage, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    writeExternalState(request: driver_driver_pb.WriteExternalStateMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    writeExternalState(request: driver_driver_pb.WriteExternalStateMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    performLock(request: driver_driver_pb.PerformLockRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    performLock(request: driver_driver_pb.PerformLockRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    performLock(request: driver_driver_pb.PerformLockRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    createAsset(request: driver_driver_pb.CreateAssetRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    createAsset(request: driver_driver_pb.CreateAssetRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    createAsset(request: driver_driver_pb.CreateAssetRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    extinguish(request: driver_driver_pb.ExtinguishRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    extinguish(request: driver_driver_pb.ExtinguishRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    extinguish(request: driver_driver_pb.ExtinguishRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    assignAsset(request: driver_driver_pb.AssignAssetRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    assignAsset(request: driver_driver_pb.AssignAssetRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    assignAsset(request: driver_driver_pb.AssignAssetRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}

export class DriverCommunicationClient extends grpc.Client implements IDriverCommunicationClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public requestDriverState(request: common_query_pb.Query, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestDriverState(request: common_query_pb.Query, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestDriverState(request: common_query_pb.Query, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public subscribeEvent(request: common_events_pb.EventSubscription, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public subscribeEvent(request: common_events_pb.EventSubscription, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public subscribeEvent(request: common_events_pb.EventSubscription, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestSignedEventSubscriptionQuery(request: common_events_pb.EventSubscription, callback: (error: grpc.ServiceError | null, response: common_query_pb.Query) => void): grpc.ClientUnaryCall;
    public requestSignedEventSubscriptionQuery(request: common_events_pb.EventSubscription, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_query_pb.Query) => void): grpc.ClientUnaryCall;
    public requestSignedEventSubscriptionQuery(request: common_events_pb.EventSubscription, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_query_pb.Query) => void): grpc.ClientUnaryCall;
    public writeExternalState(request: driver_driver_pb.WriteExternalStateMessage, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public writeExternalState(request: driver_driver_pb.WriteExternalStateMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public writeExternalState(request: driver_driver_pb.WriteExternalStateMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public performLock(request: driver_driver_pb.PerformLockRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public performLock(request: driver_driver_pb.PerformLockRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public performLock(request: driver_driver_pb.PerformLockRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public createAsset(request: driver_driver_pb.CreateAssetRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public createAsset(request: driver_driver_pb.CreateAssetRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public createAsset(request: driver_driver_pb.CreateAssetRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public extinguish(request: driver_driver_pb.ExtinguishRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public extinguish(request: driver_driver_pb.ExtinguishRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public extinguish(request: driver_driver_pb.ExtinguishRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public assignAsset(request: driver_driver_pb.AssignAssetRequest, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public assignAsset(request: driver_driver_pb.AssignAssetRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public assignAsset(request: driver_driver_pb.AssignAssetRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}
