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
  block: {
    name: "Block",
    field: "block_number",
  },
  from: {
    name: "From",
    field: "from",
    isLongString: true,
  },
  to: {
    name: "To",
    field: "to",
    isLongString: true,
  },
  value: {
    name: "Eth Value",
    field: "eth_value",
  },
  method: {
    name: "Method",
    field: "method_name",
  },
};
