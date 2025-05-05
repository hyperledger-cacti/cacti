/**
 * Data structure for updating the ledger with some payload.
 */
export interface IOracleEntryBase {
  contractName: string;
  methodName: string;
  params: any[];
}

export interface IOracleListenerBase {
  contractName: string;
  contractAddress: string;
  contractAbi: object[];
  eventSignature: string;
}

// export type IOracleRepeatableTask = OracleTask & {
//   mode: OracleRegisterRequestTaskModeEnum;
//   pollingInterval?: number;
//   srcEventSignature?: string;
//   // trigger: () => void;
// };
