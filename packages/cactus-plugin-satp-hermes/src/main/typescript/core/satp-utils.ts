import { MessageType } from "../generated/proto/cacti/satp/v02/common/message_pb";
import { getEnumKeyByValue } from "../utils/utils";

export function getMessageTypeName(messageType: MessageType): string {
  return getEnumKeyByValue(MessageType, messageType) || "Unknown";
}
