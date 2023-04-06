export interface BlockDataResponse {
  decodedBlock: {
    header: Record<string, unknown>;
    data: { data: Record<string, unknown>[] };
    metadata: Record<string, unknown>;
  };
}

export interface getStatusReturn {
  instanceId: string;
  connected: boolean;
  webServicesRegistered: boolean;
  lastSeenBlock: number;
}

// db types
export interface InsertBlockDataEntryInterface {
  fabric_block_id: string;
  fabric_block_num: number;
  fabric_block_data: string;
}
export interface InsertBlockDetailsInterface {
  fabric_block_id: string;
  fabric_blocknum: string;
  fabric_datahash: string;
  fabric_tx_count: number;
  fabric_createdat: string;
  fabric_prev_blockhash: string;
  fabric_channel_id: string;
}

export interface InsertBlockTransactionEntryInterface {
  transaction_id: string;
  fabric_block_id: string;
  fabric_transaction_data: string;
}
export interface InsertDetailedTransactionEntryInterface {
  block_number: string;
  block_id: string;
  transaction_id: string;
  createdat: string;
  chaincodename: string;
  status: number;
  creator_msp_id: string;
  endorser_msp_id: string;
  chaincode_id: string;
  type: string;
  read_set: string;
  write_set: string;
  channel_id: string;
  payload_extension: string;
  creator_id_bytes: string;
  creator_nonce: string;
  chaincode_proposal_input: string;
  tx_response: string;
  payload_proposal_hash: string;
  endorser_id_bytes: string;
  endorser_signature: string;
}
