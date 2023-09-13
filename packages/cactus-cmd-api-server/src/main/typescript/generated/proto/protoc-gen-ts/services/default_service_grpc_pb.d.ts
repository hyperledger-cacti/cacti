// package: org.hyperledger.cactus.cmd_api_server
// file: services/default_service.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as services_default_service_pb from "../services/default_service_pb";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
import * as models_health_check_response_pb_pb from "../models/health_check_response_pb_pb";

interface IDefaultServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    getHealthCheckV1: IDefaultServiceService_IGetHealthCheckV1;
    getOpenApiSpecV1: IDefaultServiceService_IGetOpenApiSpecV1;
    getPrometheusMetricsV1: IDefaultServiceService_IGetPrometheusMetricsV1;
}

interface IDefaultServiceService_IGetHealthCheckV1 extends grpc.MethodDefinition<google_protobuf_empty_pb.Empty, models_health_check_response_pb_pb.HealthCheckResponsePB> {
    path: "/org.hyperledger.cactus.cmd_api_server.DefaultService/GetHealthCheckV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<google_protobuf_empty_pb.Empty>;
    requestDeserialize: grpc.deserialize<google_protobuf_empty_pb.Empty>;
    responseSerialize: grpc.serialize<models_health_check_response_pb_pb.HealthCheckResponsePB>;
    responseDeserialize: grpc.deserialize<models_health_check_response_pb_pb.HealthCheckResponsePB>;
}
interface IDefaultServiceService_IGetOpenApiSpecV1 extends grpc.MethodDefinition<google_protobuf_empty_pb.Empty, services_default_service_pb.GetOpenApiSpecV1Response> {
    path: "/org.hyperledger.cactus.cmd_api_server.DefaultService/GetOpenApiSpecV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<google_protobuf_empty_pb.Empty>;
    requestDeserialize: grpc.deserialize<google_protobuf_empty_pb.Empty>;
    responseSerialize: grpc.serialize<services_default_service_pb.GetOpenApiSpecV1Response>;
    responseDeserialize: grpc.deserialize<services_default_service_pb.GetOpenApiSpecV1Response>;
}
interface IDefaultServiceService_IGetPrometheusMetricsV1 extends grpc.MethodDefinition<google_protobuf_empty_pb.Empty, services_default_service_pb.GetPrometheusMetricsV1Response> {
    path: "/org.hyperledger.cactus.cmd_api_server.DefaultService/GetPrometheusMetricsV1";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<google_protobuf_empty_pb.Empty>;
    requestDeserialize: grpc.deserialize<google_protobuf_empty_pb.Empty>;
    responseSerialize: grpc.serialize<services_default_service_pb.GetPrometheusMetricsV1Response>;
    responseDeserialize: grpc.deserialize<services_default_service_pb.GetPrometheusMetricsV1Response>;
}

export const DefaultServiceService: IDefaultServiceService;

export interface IDefaultServiceServer extends grpc.UntypedServiceImplementation {
    getHealthCheckV1: grpc.handleUnaryCall<google_protobuf_empty_pb.Empty, models_health_check_response_pb_pb.HealthCheckResponsePB>;
    getOpenApiSpecV1: grpc.handleUnaryCall<google_protobuf_empty_pb.Empty, services_default_service_pb.GetOpenApiSpecV1Response>;
    getPrometheusMetricsV1: grpc.handleUnaryCall<google_protobuf_empty_pb.Empty, services_default_service_pb.GetPrometheusMetricsV1Response>;
}

export interface IDefaultServiceClient {
    getHealthCheckV1(request: google_protobuf_empty_pb.Empty, callback: (error: grpc.ServiceError | null, response: models_health_check_response_pb_pb.HealthCheckResponsePB) => void): grpc.ClientUnaryCall;
    getHealthCheckV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_health_check_response_pb_pb.HealthCheckResponsePB) => void): grpc.ClientUnaryCall;
    getHealthCheckV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_health_check_response_pb_pb.HealthCheckResponsePB) => void): grpc.ClientUnaryCall;
    getOpenApiSpecV1(request: google_protobuf_empty_pb.Empty, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetOpenApiSpecV1Response) => void): grpc.ClientUnaryCall;
    getOpenApiSpecV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetOpenApiSpecV1Response) => void): grpc.ClientUnaryCall;
    getOpenApiSpecV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetOpenApiSpecV1Response) => void): grpc.ClientUnaryCall;
    getPrometheusMetricsV1(request: google_protobuf_empty_pb.Empty, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetPrometheusMetricsV1Response) => void): grpc.ClientUnaryCall;
    getPrometheusMetricsV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetPrometheusMetricsV1Response) => void): grpc.ClientUnaryCall;
    getPrometheusMetricsV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetPrometheusMetricsV1Response) => void): grpc.ClientUnaryCall;
}

export class DefaultServiceClient extends grpc.Client implements IDefaultServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public getHealthCheckV1(request: google_protobuf_empty_pb.Empty, callback: (error: grpc.ServiceError | null, response: models_health_check_response_pb_pb.HealthCheckResponsePB) => void): grpc.ClientUnaryCall;
    public getHealthCheckV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: models_health_check_response_pb_pb.HealthCheckResponsePB) => void): grpc.ClientUnaryCall;
    public getHealthCheckV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: models_health_check_response_pb_pb.HealthCheckResponsePB) => void): grpc.ClientUnaryCall;
    public getOpenApiSpecV1(request: google_protobuf_empty_pb.Empty, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetOpenApiSpecV1Response) => void): grpc.ClientUnaryCall;
    public getOpenApiSpecV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetOpenApiSpecV1Response) => void): grpc.ClientUnaryCall;
    public getOpenApiSpecV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetOpenApiSpecV1Response) => void): grpc.ClientUnaryCall;
    public getPrometheusMetricsV1(request: google_protobuf_empty_pb.Empty, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetPrometheusMetricsV1Response) => void): grpc.ClientUnaryCall;
    public getPrometheusMetricsV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetPrometheusMetricsV1Response) => void): grpc.ClientUnaryCall;
    public getPrometheusMetricsV1(request: google_protobuf_empty_pb.Empty, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: services_default_service_pb.GetPrometheusMetricsV1Response) => void): grpc.ClientUnaryCall;
}
