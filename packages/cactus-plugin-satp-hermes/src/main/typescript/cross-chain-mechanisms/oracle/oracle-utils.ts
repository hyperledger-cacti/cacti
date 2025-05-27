import {
  OracleOperation,
  OracleOperationStatusEnum,
  OracleResponse,
} from "../../public-api";

export function updateOracleOperation(
  operation: OracleOperation,
  newStatus: OracleOperationStatusEnum,
  output: OracleResponse,
): void {
  operation.status = newStatus;
  operation.output = output;
}
