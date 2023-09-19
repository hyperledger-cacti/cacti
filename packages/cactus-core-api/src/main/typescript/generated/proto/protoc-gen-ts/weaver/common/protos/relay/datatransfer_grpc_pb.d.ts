// package: relay.datatransfer
// file: relay/datatransfer.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as relay_datatransfer_pb from "../relay/datatransfer_pb";
import * as common_ack_pb from "../common/ack_pb";
import * as common_state_pb from "../common/state_pb";
import * as common_query_pb from "../common/query_pb";

interface IDataTransferService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    requestState: IDataTransferService_IRequestState;
    sendState: IDataTransferService_ISendState;
    sendDriverState: IDataTransferService_ISendDriverState;
}

interface IDataTransferService_IRequestState extends grpc.MethodDefinition<common_query_pb.Query, common_ack_pb.Ack> {
    path: "/relay.datatransfer.DataTransfer/RequestState";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<common_query_pb.Query>;
    requestDeserialize: grpc.deserialize<common_query_pb.Query>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IDataTransferService_ISendState extends grpc.MethodDefinition<common_state_pb.ViewPayload, common_ack_pb.Ack> {
    path: "/relay.datatransfer.DataTransfer/SendState";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<common_state_pb.ViewPayload>;
    requestDeserialize: grpc.deserialize<common_state_pb.ViewPayload>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface IDataTransferService_ISendDriverState extends grpc.MethodDefinition<common_state_pb.ViewPayload, common_ack_pb.Ack> {
    path: "/relay.datatransfer.DataTransfer/SendDriverState";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<common_state_pb.ViewPayload>;
    requestDeserialize: grpc.deserialize<common_state_pb.ViewPayload>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}

export const DataTransferService: IDataTransferService;

export interface IDataTransferServer extends grpc.UntypedServiceImplementation {
    requestState: grpc.handleUnaryCall<common_query_pb.Query, common_ack_pb.Ack>;
    sendState: grpc.handleUnaryCall<common_state_pb.ViewPayload, common_ack_pb.Ack>;
    sendDriverState: grpc.handleUnaryCall<common_state_pb.ViewPayload, common_ack_pb.Ack>;
}

export interface IDataTransferClient {
    requestState(request: common_query_pb.Query, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestState(request: common_query_pb.Query, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestState(request: common_query_pb.Query, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendState(request: common_state_pb.ViewPayload, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendDriverState(request: common_state_pb.ViewPayload, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendDriverState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    sendDriverState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}

export class DataTransferClient extends grpc.Client implements IDataTransferClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public requestState(request: common_query_pb.Query, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestState(request: common_query_pb.Query, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestState(request: common_query_pb.Query, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendState(request: common_state_pb.ViewPayload, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendDriverState(request: common_state_pb.ViewPayload, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendDriverState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public sendDriverState(request: common_state_pb.ViewPayload, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}
