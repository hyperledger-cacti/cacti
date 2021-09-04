import { ServerUnaryCall, requestCallback } from "@grpc/grpc-js";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";

import * as health_check_response_pb from "../../generated/proto/protoc-gen-ts/models/health_check_response_pb";
import * as memory_usage_pb from "../../generated/proto/protoc-gen-ts/models/memory_usage_pb";
import * as default_service from "../../generated/proto/protoc-gen-ts/services/default_service";

export class GrpcServerApiServer extends default_service.org.hyperledger.cactus
  .cmd_api_server.UnimplementedDefaultServiceService {
  GetHealthCheckV1(
    call: ServerUnaryCall<
      Empty,
      health_check_response_pb.org.hyperledger.cactus.cmd_api_server.HealthCheckResponsePB
    >,
    callback: requestCallback<
      health_check_response_pb.org.hyperledger.cactus.cmd_api_server.HealthCheckResponsePB
    >,
  ): void {
    const memoryUsage = new memory_usage_pb.org.hyperledger.cactus.cmd_api_server.MemoryUsagePB(
      process.memoryUsage(),
    );

    const healthCheckResponse = new health_check_response_pb.org.hyperledger.cactus.cmd_api_server.HealthCheckResponsePB(
      {
        success: true,
        createdAt: new Date().toJSON(),
        memoryUsage,
      },
    );
    callback(null, healthCheckResponse);
  }

  GetPrometheusMetricsV1(
    call: ServerUnaryCall<
      Empty,
      default_service.org.hyperledger.cactus.cmd_api_server.GetPrometheusMetricsV1Response
    >,
    callback: requestCallback<
      default_service.org.hyperledger.cactus.cmd_api_server.GetPrometheusMetricsV1Response
    >,
  ): void {
    const res = new default_service.org.hyperledger.cactus.cmd_api_server.GetPrometheusMetricsV1Response();
    callback(null, res);
  }
}
