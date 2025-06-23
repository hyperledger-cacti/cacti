// src/main/typescript/gateway/core/oracle/oracle-log-types.ts

export interface IOracleOperationLogEntry {
  oracleTaskId: string;
  operationId: string;
  type: string; // e.g., "oracle-read", "oracle-update"
  status: string; // e.g., "init", "exec", "done", "fail"
  data: string; // Stringified representation of relevant data (e.g., operation, response, error)
  timestamp: number; // Unix timestamp
}
