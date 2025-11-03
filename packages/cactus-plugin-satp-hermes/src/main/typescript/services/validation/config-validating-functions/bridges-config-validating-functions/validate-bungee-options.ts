import { Logger } from "@hyperledger/cactus-common/";
import { ClaimFormat } from "../../../../generated/proto/cacti/satp/v02/common/message_pb";

// Type guard for ClaimFormat
export function isClaimFormat(obj: unknown, log: Logger): obj is ClaimFormat {
  if (typeof obj !== "number") {
    log.error("isClaimFormat: obj is not a number");
    return false;
  }
  return Object.values(ClaimFormat).includes(obj);
}
