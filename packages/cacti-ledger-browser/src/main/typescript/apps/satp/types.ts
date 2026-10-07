export interface SatpAppOptions {
  gatewayApiUrl: string;
  refreshIntervalMs?: number;
}

export interface LocalLog {
  sessionId: string;
  type: string;
  key: string;
  operation: string;
  timestamp?: string;
  data: string;
  sequenceNumber: number;
}

export interface AuditEntry {
  auditEntryId: string;
  session: LocalLog;
  timestamp: number;
}

export interface AuditResponse {
  auditEntries?: {
    entries: AuditEntry[];
  };
  startTimestamp?: string;
  endTimestamp?: string;
}

export interface NetworkInfo {
  networkId?: string;
  subnetworkId?: string;
  type?: string;
}

export interface StatusResponse {
  status: "NOT_FOUND" | "INVALID" | "PENDING" | "DONE" | "FAILED" | string;
  substatus: string;
  stage: "STAGE_0" | "STAGE_1" | "STAGE_2" | "STAGE_3" | string;
  step: string;
  startTime: string;
  originNetwork?: NetworkInfo;
  destinationNetwork?: NetworkInfo;
}

export interface HealthCheckResponse {
  status?: "AVAILABLE" | "UNAVAILABLE" | string;
}

export interface SupportedLedgersResponse {
  supportedLedgers?: string[];
}

export interface ParsedAuditRecord {
  auditEntryId: string;
  sequenceNumber: number;
  timestamp: number;
  isoTime: string;
  operation: string;
  type: string;
  key: string;
  rawData: string;
  parsedPayload?: Record<string, unknown> | null;
  isError: boolean;
  isRollback: boolean;
}

export type StageState = "completed" | "in-progress" | "failed" | "pending";

export interface SessionStageStepInfo {
  stageIndex: number;
  stageId: string;
  stageName: string;
  description: string;
  status: StageState;
  activeStep?: string;
  timestamp?: string;
}

export interface ParsedSessionDetails {
  sessionId: string;
  status: string;
  substatus: string;
  currentStage: string;
  currentStep: string;
  originNetwork: string;
  destinationNetwork: string;
  assetReference?: string;
  amount?: string;
  senderAddress?: string;
  recipientAddress?: string;
  startTime?: string;
  lastUpdate?: string;
  stages: SessionStageStepInfo[];
  auditTrail: ParsedAuditRecord[];
  hasRollback: boolean;
  hasFailure: boolean;
  failureReason?: string;
}

export interface SatpKpiMetrics {
  totalTransfers: number;
  completed: number;
  inProgress: number;
  failed: number;
  rollback: number;
}
