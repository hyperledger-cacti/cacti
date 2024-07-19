/**
 * Component user can select columns to be rendered in a table list.
 * Possible fields and their configurations are defined in here.
 */
export const blockColumnsConfig = {
  number: {
    name: "Number",
    field: "number",
  },
  hash: {
    name: "Hash",
    field: "hash",
    isLongString: true,
    isUnique: true,
  },
  txCount: {
    name: "Transaction Count",
    field: "transaction_count",
  },
};
