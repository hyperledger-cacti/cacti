import { ClaimFormat } from "../../../../generated/proto/cacti/satp/v02/common/message_pb";

// Type guard for ClaimFormat
export function isClaimFormat(obj: unknown): obj is ClaimFormat {
  if (typeof obj !== "number") {
    return false;
  }
  return Object.values(ClaimFormat).includes(obj);
}
