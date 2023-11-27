// package: networks.networks
// file: networks/networks.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as networks_networks_pb from "../networks/networks_pb";
import * as common_ack_pb from "../common/ack_pb";
import * as common_state_pb from "../common/state_pb";

interface INetworkService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    requestState: INetworkService_IRequestState;
    getState: INetworkService_IGetState;
    requestDatabase: INetworkService_IRequestDatabase;
}

interface INetworkService_IRequestState extends grpc.MethodDefinition<networks_networks_pb.NetworkQuery, common_ack_pb.Ack> {
    path: "/networks.networks.Network/RequestState";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<networks_networks_pb.NetworkQuery>;
    requestDeserialize: grpc.deserialize<networks_networks_pb.NetworkQuery>;
    responseSerialize: grpc.serialize<common_ack_pb.Ack>;
    responseDeserialize: grpc.deserialize<common_ack_pb.Ack>;
}
interface INetworkService_IGetState extends grpc.MethodDefinition<networks_networks_pb.GetStateMessage, common_state_pb.RequestState> {
    path: "/networks.networks.Network/GetState";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<networks_networks_pb.GetStateMessage>;
    requestDeserialize: grpc.deserialize<networks_networks_pb.GetStateMessage>;
    responseSerialize: grpc.serialize<common_state_pb.RequestState>;
    responseDeserialize: grpc.deserialize<common_state_pb.RequestState>;
}
interface INetworkService_IRequestDatabase extends grpc.MethodDefinition<networks_networks_pb.DbName, networks_networks_pb.RelayDatabase> {
    path: "/networks.networks.Network/RequestDatabase";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<networks_networks_pb.DbName>;
    requestDeserialize: grpc.deserialize<networks_networks_pb.DbName>;
    responseSerialize: grpc.serialize<networks_networks_pb.RelayDatabase>;
    responseDeserialize: grpc.deserialize<networks_networks_pb.RelayDatabase>;
}

export const NetworkService: INetworkService;

export interface INetworkServer extends grpc.UntypedServiceImplementation {
    requestState: grpc.handleUnaryCall<networks_networks_pb.NetworkQuery, common_ack_pb.Ack>;
    getState: grpc.handleUnaryCall<networks_networks_pb.GetStateMessage, common_state_pb.RequestState>;
    requestDatabase: grpc.handleUnaryCall<networks_networks_pb.DbName, networks_networks_pb.RelayDatabase>;
}

export interface INetworkClient {
    requestState(request: networks_networks_pb.NetworkQuery, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestState(request: networks_networks_pb.NetworkQuery, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestState(request: networks_networks_pb.NetworkQuery, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    getState(request: networks_networks_pb.GetStateMessage, callback: (error: grpc.ServiceError | null, response: common_state_pb.RequestState) => void): grpc.ClientUnaryCall;
    getState(request: networks_networks_pb.GetStateMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_state_pb.RequestState) => void): grpc.ClientUnaryCall;
    getState(request: networks_networks_pb.GetStateMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_state_pb.RequestState) => void): grpc.ClientUnaryCall;
    requestDatabase(request: networks_networks_pb.DbName, callback: (error: grpc.ServiceError | null, response: networks_networks_pb.RelayDatabase) => void): grpc.ClientUnaryCall;
    requestDatabase(request: networks_networks_pb.DbName, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: networks_networks_pb.RelayDatabase) => void): grpc.ClientUnaryCall;
    requestDatabase(request: networks_networks_pb.DbName, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: networks_networks_pb.RelayDatabase) => void): grpc.ClientUnaryCall;
}

export class NetworkClient extends grpc.Client implements INetworkClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public requestState(request: networks_networks_pb.NetworkQuery, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestState(request: networks_networks_pb.NetworkQuery, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestState(request: networks_networks_pb.NetworkQuery, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public getState(request: networks_networks_pb.GetStateMessage, callback: (error: grpc.ServiceError | null, response: common_state_pb.RequestState) => void): grpc.ClientUnaryCall;
    public getState(request: networks_networks_pb.GetStateMessage, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_state_pb.RequestState) => void): grpc.ClientUnaryCall;
    public getState(request: networks_networks_pb.GetStateMessage, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_state_pb.RequestState) => void): grpc.ClientUnaryCall;
    public requestDatabase(request: networks_networks_pb.DbName, callback: (error: grpc.ServiceError | null, response: networks_networks_pb.RelayDatabase) => void): grpc.ClientUnaryCall;
    public requestDatabase(request: networks_networks_pb.DbName, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: networks_networks_pb.RelayDatabase) => void): grpc.ClientUnaryCall;
    public requestDatabase(request: networks_networks_pb.DbName, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: networks_networks_pb.RelayDatabase) => void): grpc.ClientUnaryCall;
}
