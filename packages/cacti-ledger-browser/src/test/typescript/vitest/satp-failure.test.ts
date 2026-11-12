/**
 * Failure classification of SATP sessions (`apps/satp/failure.ts`).
 */
import { describe, expect, it } from "vitest";

import {
  SATP_ERROR_DESCRIPTIONS,
  classifySatpFailure,
  findSatpErrorCode,
  phaseErrorStep,
} from "../../../main/typescript/apps/satp/failure";
import type { SatpTimelineEvent } from "../../../main/typescript/apps/satp/transform";

const event = (type: string, sequenceNumber: number): SatpTimelineEvent => ({
  type,
  sequenceNumber,
  operation: "",
});

describe("phaseErrorStep", () => {
  it("reads the MessageType enum as name or number", () => {
    expect(phaseErrorStep("MESSAGE_TYPE_LOCK_ASSERT")).toBe("LOCK_ASSERT");
    expect(phaseErrorStep(11)).toBe("LOCK_ASSERT");
    expect(phaseErrorStep(15)).toBe("COMMIT_FINAL");
  });

  it("treats unset values as no failed step", () => {
    expect(phaseErrorStep(0)).toBeUndefined();
    expect(phaseErrorStep("MESSAGE_TYPE_UNSPECIFIED")).toBeUndefined();
    expect(phaseErrorStep(undefined)).toBeUndefined();
    expect(phaseErrorStep({})).toBeUndefined();
  });
});

describe("findSatpErrorCode", () => {
  it("finds an IANA code in strings and objects", () => {
    expect(findSatpErrorCode(["err_2.2.8: asset already locked"])).toBe(
      "err_2.2.8",
    );
    expect(
      findSatpErrorCode([
        undefined,
        { type: "urn:ietf:params:satp:core:error:err_3.5.3" },
      ]),
    ).toBe("err_3.5.3");
    expect(findSatpErrorCode(["no code here", null])).toBeUndefined();
  });
});

describe("classifySatpFailure", () => {
  it("classifies by error code: stage, class, description and retry outlook", () => {
    const result = classifySatpFailure({
      snapshot: {
        phaseError: "MESSAGE_TYPE_LOCK_ASSERT",
        errorCode: "err_2.2.8: asset already locked",
      },
      substatus: "REJECTED",
    });
    expect(result).toMatchObject({
      failedStage: 2,
      failedStep: "LOCK_ASSERT",
      errorCode: "err_2.2.8",
      errorDescription: "asset already locked",
      errorClass: "Asset state conflict",
      retry: "retryable",
    });
  });

  it("finds error details logged on an earlier step than the latest snapshot", () => {
    const result = classifySatpFailure({
      snapshot: { state: 5 },
      substatus: "REJECTED",
      events: [
        { ...event("TRANSFER_PROPOSAL", 1), snapshot: { state: 1 } },
        {
          ...event("LOCK_ASSERT", 2),
          snapshot: {
            state: 5,
            phaseError: "MESSAGE_TYPE_LOCK_ASSERT",
            errorCode: "err_2.2.8: asset already locked",
          },
        },
        { ...event("TRANSFER_ROLLBACK_COMPLETE", 3), snapshot: { state: 5 } },
      ],
    });
    expect(result).toMatchObject({
      failedStage: 2,
      failedStep: "LOCK_ASSERT",
      errorCode: "err_2.2.8",
      errorClass: "Asset state conflict",
      retry: "retryable",
    });
  });

  it("marks protocol integrity errors as not retryable", () => {
    const result = classifySatpFailure({
      snapshot: { errorCode: "err_3.5.3" },
    });
    expect(result.errorClass).toBe("Message integrity mismatch");
    expect(result.retry).toBe("not-retryable");
    expect(result.failedStage).toBe(3);
  });

  it("lets an ongoing recovery/refund outrank the original error's outlook", () => {
    const result = classifySatpFailure({
      snapshot: { errorCode: "err_3.5.3" },
      substatus: "REFUND_IN_PROGRESS",
    });
    expect(result.errorClass).toBe("Message integrity mismatch");
    expect(result.retry).toBe("in-progress");
  });

  it("falls back to the gateway substatus without an error code", () => {
    expect(
      classifySatpFailure({ substatus: "CHAIN_NOT_AVAILABLE" }),
    ).toMatchObject({
      errorClass: "Ledger unavailable",
      retry: "retryable",
    });
    expect(classifySatpFailure({ substatus: "RECOVERY_FAILED" }).retry).toBe(
      "not-retryable",
    );
    expect(classifySatpFailure({ substatus: "REFUNDED" }).retry).toBe(
      "resolved",
    );
  });

  it("derives the failed stage from the timeline before the rollback", () => {
    const result = classifySatpFailure({
      events: [
        event("TRANSFER_PROPOSAL", 1),
        event("LOCK_ASSERT", 2),
        event("TRANSFER_ROLLBACK_START", 3),
        event("COMMIT_PREPARE", 4),
      ],
    });
    expect(result.failedStage).toBe(2);
    expect(result.retry).toBe("unknown");
    expect(result.errorClass).toBe("Unclassified error");
  });

  it("describes every stage error code of the registry", () => {
    for (const [code, description] of Object.entries(SATP_ERROR_DESCRIPTIONS)) {
      const result = classifySatpFailure({ snapshot: { errorCode: code } });
      expect(result.errorDescription, code).toBe(description);
      expect(result.errorClass, code).not.toBe("Unclassified error");
    }
  });
});
