import { MessageType } from "../generated/proto/cacti/satp/v02/common/message_pb";
import { getEnumKeyByValue } from "../utils/utils";

export function getMessageTypeName(
  messageType: MessageType | undefined,
): string {
  return (
    (!!messageType
      ? getEnumKeyByValue(MessageType, messageType)
      : getEnumKeyByValue(MessageType, MessageType.UNSPECIFIED)) ||
    "UNSPECIFIED"
  );
}

export function merge_receipt(
  receipt1: string | undefined,
  receipt2: string | undefined,
): string {
  let _receipt1 = receipt1;
  let _receipt2 = receipt2;

  if (!receipt1) {
    _receipt1 = "{}";
  }

  if (!receipt2) {
    _receipt2 = "{}";
  }

  const mergedReceipt = {
    ...JSON.parse(_receipt1 as string),
    ...JSON.parse(_receipt2 as string),
  };
  return JSON.stringify(mergedReceipt, null, 2);
}
