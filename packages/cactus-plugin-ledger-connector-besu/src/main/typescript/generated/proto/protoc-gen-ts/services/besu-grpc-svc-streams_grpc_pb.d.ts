// package: org.hyperledger.cacti.plugin.ledger.connector.besu.services.besuservice
// file: services/besu-grpc-svc-streams.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as services_besu_grpc_svc_streams_pb from "../services/besu-grpc-svc-streams_pb";
import * as models_watch_blocks_v1_progress_pb_pb from "../models/watch_blocks_v1_progress_pb_pb";
import * as models_watch_blocks_v1_request_pb_pb from "../models/watch_blocks_v1_request_pb_pb";

interface IBesuGrpcSvcStreamsService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    watchBlocksV1: IBesuGrpcSvcStreamsService_IWatchBlocksV1;
}

interface IBesuGrpcSvcStreamsService_IWatchBlocksV1 extends grpc.MethodDefinition<models_watch_blocks_v1_request_pb_pb.WatchBlocksV1RequestPB, models_watch_blocks_v1_progress_pb_pb.WatchBlocksV1ProgressPB> {
    path: "/org.hyperledger.cacti.plugin.ledger.connector.besu.services.besuservice.BesuGrpcSvcStreams/WatchBlocksV1";
    requestStream: true;
    responseStream: true;
    requestSerialize: grpc.serialize<models_watch_blocks_v1_request_pb_pb.WatchBlocksV1RequestPB>;
    requestDeserialize: grpc.deserialize<models_watch_blocks_v1_request_pb_pb.WatchBlocksV1RequestPB>;
    responseSerialize: grpc.serialize<models_watch_blocks_v1_progress_pb_pb.WatchBlocksV1ProgressPB>;
    responseDeserialize: grpc.deserialize<models_watch_blocks_v1_progress_pb_pb.WatchBlocksV1ProgressPB>;
}

export const BesuGrpcSvcStreamsService: IBesuGrpcSvcStreamsService;

export interface IBesuGrpcSvcStreamsServer extends grpc.UntypedServiceImplementation {
    watchBlocksV1: grpc.handleBidiStreamingCall<models_watch_blocks_v1_request_pb_pb.WatchBlocksV1RequestPB, models_watch_blocks_v1_progress_pb_pb.WatchBlocksV1ProgressPB>;
}

export interface IBesuGrpcSvcStreamsClient {
    watchBlocksV1(): grpc.ClientDuplexStream<models_watch_blocks_v1_request_pb_pb.WatchBlocksV1RequestPB, models_watch_blocks_v1_progress_pb_pb.WatchBlocksV1ProgressPB>;
    watchBlocksV1(options: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<models_watch_blocks_v1_request_pb_pb.WatchBlocksV1RequestPB, models_watch_blocks_v1_progress_pb_pb.WatchBlocksV1ProgressPB>;
    watchBlocksV1(metadata: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<models_watch_blocks_v1_request_pb_pb.WatchBlocksV1RequestPB, models_watch_blocks_v1_progress_pb_pb.WatchBlocksV1ProgressPB>;
}

export class BesuGrpcSvcStreamsClient extends grpc.Client implements IBesuGrpcSvcStreamsClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public watchBlocksV1(options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<models_watch_blocks_v1_request_pb_pb.WatchBlocksV1RequestPB, models_watch_blocks_v1_progress_pb_pb.WatchBlocksV1ProgressPB>;
    public watchBlocksV1(metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientDuplexStream<models_watch_blocks_v1_request_pb_pb.WatchBlocksV1RequestPB, models_watch_blocks_v1_progress_pb_pb.WatchBlocksV1ProgressPB>;
}
