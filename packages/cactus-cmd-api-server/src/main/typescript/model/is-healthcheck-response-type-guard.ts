import { Bools } from "@hyperledger/cactus-common";
import { HealthCheckResponse } from "../generated/openapi/typescript-axios/api";

export function isHealthcheckResponse(x: unknown): x is HealthCheckResponse {
  return (
    !!x &&
    typeof x === "object" &&
    Bools.isBooleanStrict((x as HealthCheckResponse).success) &&
    typeof (x as HealthCheckResponse).memoryUsage === "object" &&
    typeof (x as HealthCheckResponse).memoryUsage.rss === "number" &&
    typeof (x as HealthCheckResponse).memoryUsage.heapTotal === "number" &&
    typeof (x as HealthCheckResponse).memoryUsage.heapUsed === "number" &&
    typeof (x as HealthCheckResponse).memoryUsage.external === "number" &&
    typeof (x as HealthCheckResponse).createdAt === "string"
  );
}
