// package: driver.driver
// file: driver/driver.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as driver_driver_pb from "../driver/driver_pb";
import * as common_ack_pb from "../common/ack_pb";
import * as common_query_pb from "../common/query_pb";

interface IDriverCommunicationService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    requestDriverState: IDriverCommunicationService_IRequestDriverState;
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

export const DriverCommunicationService: IDriverCommunicationService;

export interface IDriverCommunicationServer extends grpc.UntypedServiceImplementation {
    requestDriverState: grpc.handleUnaryCall<common_query_pb.Query, common_ack_pb.Ack>;
}

export interface IDriverCommunicationClient {
    requestDriverState(request: common_query_pb.Query, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestDriverState(request: common_query_pb.Query, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    requestDriverState(request: common_query_pb.Query, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}

export class DriverCommunicationClient extends grpc.Client implements IDriverCommunicationClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public requestDriverState(request: common_query_pb.Query, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestDriverState(request: common_query_pb.Query, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
    public requestDriverState(request: common_query_pb.Query, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: common_ack_pb.Ack) => void): grpc.ClientUnaryCall;
}
