/**
 * Component user can select columns to be rendered in a table list.
 * Possible fields and their configurations are defined in here.
 */
export const blockColumnsConfig = {
  hash: {
    name: "Hash",
    field: "hash",
    isLongString: true,
    isUnique: true,
  },
  number: {
    name: "Number",
    field: "number",
  },
  createdAt: {
    name: "Created At",
    field: "created_at",
    isDate: true,
  },
  txCount: {
    name: "Transaction Count",
    field: "number_of_tx",
  },
};
