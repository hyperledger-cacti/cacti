/**
 * Component user can select columns to be rendered in transaction list.
 * Possible fields and their configurations are defined in transactionColumnsConfig.
 */
export const transactionColumnsConfig = {
  hash: {
    name: "Hash",
    field: "hash",
    isLongString: true,
    isUnique: true,
  },
  timestamp: {
    name: "Timestamp",
    field: "timestamp",
  },
  type: {
    name: "Type",
    field: "type",
  },
  epoch: {
    name: "Epoch",
    field: "epoch",
  },
  channel_id: {
    name: "Channel ID",
    field: "channel_id",
  },
  protocol_version: {
    name: "Proto Version",
    field: "protocol_version",
  },
  block: {
    name: "Block",
    field: "block_number",
  },
};
