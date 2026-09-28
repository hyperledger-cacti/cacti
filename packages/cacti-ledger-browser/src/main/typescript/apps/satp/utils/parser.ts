import {
  AuditEntry,
  ParsedAuditRecord,
  ParsedSessionDetails,
  SatpKpiMetrics,
  SessionStageStepInfo,
  StageState,
  StatusResponse,
} from "../types";

export const STAGE_DEFINITIONS: {
  index: number;
  stageId: string;
  name: string;
  description: string;
}[] = [
  {
    index: 0,
    stageId: "STAGE_0",
    name: "Stage 0: Pre-Transfer Handshake",
    description: "Session establishment & parameter exchange",
  },
  {
    index: 1,
    stageId: "STAGE_1",
    name: "Stage 1: Transfer Initialization",
    description: "Transfer proposal & commence acknowledgement",
  },
  {
    index: 2,
    stageId: "STAGE_2",
    name: "Stage 2: Lock-Assertion",
    description: "Asset lock & cryptographic receipt verification",
  },
  {
    index: 3,
    stageId: "STAGE_3",
    name: "Stage 3: Commit & Complete",
    description: "Two-phase commit finalization on destination ledger",
  },
];

export function parseAuditEntries(
  entries?: AuditEntry[],
  filterSessionId?: string,
): ParsedAuditRecord[] {
  if (!entries || !Array.isArray(entries)) {
    return [];
  }

  const filtered = filterSessionId
    ? entries.filter((e) => e.session?.sessionId === filterSessionId)
    : entries;

  return filtered
    .map((e) => {
      let parsedPayload: Record<string, unknown> | null = null;
      const rawData = e.session?.data || "";
      if (rawData) {
        try {
          parsedPayload = JSON.parse(rawData);
        } catch {
          parsedPayload = null;
        }
      }

      const operation = e.session?.operation || "unknown";
      const opLower = operation.toLowerCase();
      const isRollback =
        opLower.includes("rollback") ||
        (e.session?.key || "").toLowerCase().includes("rollback");
      const isError =
        opLower.includes("error") ||
        opLower.includes("reject") ||
        opLower.includes("fail") ||
        (e.session?.type || "").toLowerCase().includes("error");

      const timestamp = e.timestamp || Date.now();
      const isoTime = new Date(timestamp).toISOString();

      return {
        auditEntryId: e.auditEntryId,
        sequenceNumber: e.session?.sequenceNumber ?? 0,
        timestamp,
        isoTime,
        operation,
        type: e.session?.type || "LOG",
        key: e.session?.key || "",
        rawData,
        parsedPayload,
        isError,
        isRollback,
      };
    })
    .sort(
      (a, b) =>
        a.sequenceNumber - b.sequenceNumber || a.timestamp - b.timestamp,
    );
}

export function buildSessionStages(
  currentStageId?: string,
  sessionStatus?: string,
  currentStep?: string,
  auditRecords: ParsedAuditRecord[] = [],
): SessionStageStepInfo[] {
  const normStatus = (sessionStatus || "PENDING").toUpperCase();
  const isFailed = normStatus === "FAILED";
  const isDone = normStatus === "DONE" || normStatus === "COMPLETED";

  const stageIdxMap: Record<string, number> = {
    STAGE_0: 0,
    STAGE_1: 1,
    STAGE_2: 2,
    STAGE_3: 3,
  };

  const activeIdx =
    currentStageId && currentStageId in stageIdxMap
      ? stageIdxMap[currentStageId]
      : isDone
        ? 3
        : 0;

  return STAGE_DEFINITIONS.map((def) => {
    let status: StageState;
    if (isDone || def.index < activeIdx) {
      status = "completed";
    } else if (def.index === activeIdx) {
      status = isFailed ? "failed" : "in-progress";
    } else {
      status = "pending";
    }

    const stageAudit = auditRecords.filter(
      (r) =>
        r.operation.toLowerCase().includes(`stage_${def.index}`) ||
        r.operation.toLowerCase().includes(`stage${def.index}`),
    );
    const timestamp =
      stageAudit.length > 0
        ? stageAudit[stageAudit.length - 1].isoTime
        : undefined;

    return {
      stageIndex: def.index,
      stageId: def.stageId,
      stageName: def.name,
      description: def.description,
      status,
      activeStep: def.index === activeIdx ? currentStep : undefined,
      timestamp,
    };
  });
}

export function buildSessionDetails(
  sessionId: string,
  status?: StatusResponse | null,
  auditRecords: ParsedAuditRecord[] = [],
): ParsedSessionDetails {
  const sessionStatus =
    status?.status ||
    (auditRecords.some((a) => a.isError) ? "FAILED" : "PENDING");
  const substatus = status?.substatus || "WAITING";
  const currentStage = status?.stage || "STAGE_0";
  const currentStep = status?.step || "INITIALIZING";

  const hasRollback =
    auditRecords.some((a) => a.isRollback) ||
    currentStep.toLowerCase().includes("rollback") ||
    substatus.toLowerCase().includes("refund");

  const hasFailure =
    sessionStatus.toUpperCase() === "FAILED" ||
    substatus.toUpperCase().includes("FAILED") ||
    substatus.toUpperCase().includes("REJECTED") ||
    auditRecords.some((a) => a.isError);

  const stages = buildSessionStages(
    currentStage,
    sessionStatus,
    currentStep,
    auditRecords,
  );

  let originNetwork = status?.originNetwork?.networkId || "Source DLT";
  let destinationNetwork =
    status?.destinationNetwork?.networkId || "Destination DLT";
  let assetReference: string | undefined;
  let amount: string | undefined;
  let senderAddress: string | undefined;
  let recipientAddress: string | undefined;

  for (const record of auditRecords) {
    if (record.parsedPayload) {
      const p = record.parsedPayload as any;
      if (p.sourceAsset?.networkId?.id)
        originNetwork = p.sourceAsset.networkId.id;
      if (p.receiverAsset?.networkId?.id)
        destinationNetwork = p.receiverAsset.networkId.id;
      if (p.sourceAsset?.referenceId)
        assetReference = p.sourceAsset.referenceId;
      if (p.sourceAsset?.amount) amount = String(p.sourceAsset.amount);
      if (p.sourceAsset?.owner) senderAddress = p.sourceAsset.owner;
      if (p.receiverAsset?.owner) recipientAddress = p.receiverAsset.owner;
    }
  }

  const startTime =
    status?.startTime ||
    (auditRecords.length > 0 ? auditRecords[0].isoTime : undefined);
  const lastUpdate =
    auditRecords.length > 0
      ? auditRecords[auditRecords.length - 1].isoTime
      : startTime;

  let failureReason: string | undefined;
  if (hasFailure) {
    const errorLog = auditRecords
      .slice()
      .reverse()
      .find((a) => a.isError || a.isRollback);
    failureReason =
      errorLog?.operation ||
      substatus ||
      "Transfer failed during protocol execution";
  }

  return {
    sessionId,
    status: sessionStatus,
    substatus,
    currentStage,
    currentStep,
    originNetwork,
    destinationNetwork,
    assetReference,
    amount,
    senderAddress,
    recipientAddress,
    startTime,
    lastUpdate,
    stages,
    auditTrail: auditRecords,
    hasRollback,
    hasFailure,
    failureReason,
  };
}

export function computeKpiMetrics(
  sessions: {
    status?: string | StatusResponse | null;
    hasRollback?: boolean;
  }[],
): SatpKpiMetrics {
  let completed = 0;
  let inProgress = 0;
  let failed = 0;
  let rollback = 0;

  for (const s of sessions) {
    let st = "";
    if (typeof s.status === "string") {
      st = s.status.toUpperCase();
    } else if (s.status && typeof s.status === "object") {
      st = (s.status.status || "PENDING").toUpperCase();
    } else {
      st = "PENDING";
    }

    const substatus =
      typeof s.status === "object" && s.status?.substatus
        ? s.status.substatus.toUpperCase()
        : "";

    if (s.hasRollback || substatus.includes("REFUND")) {
      rollback++;
    }
    if (st === "DONE" || st === "COMPLETED") {
      completed++;
    } else if (st === "FAILED" || st === "INVALID") {
      failed++;
    } else {
      inProgress++;
    }
  }

  return {
    totalTransfers: sessions.length,
    completed,
    inProgress,
    failed,
    rollback,
  };
}
