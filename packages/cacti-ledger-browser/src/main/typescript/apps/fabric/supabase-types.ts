export interface FabricBlock {
  id: number;
  number: number;
  hash: string;
  transaction_count: number;
}

export interface FabricTransaction {
  block_id: string | null;
  block_number: number | null;
  channel_id: string;
  epoch: number;
  hash: string;
  id: string;
  protocol_version: number;
  timestamp: string;
  type: string;
}

export interface FabricTransactionAction {
  chaincode_id: string;
  creator_certificate_id: string | null;
  creator_msp_id: string;
  function_args: string | null;
  function_name: string | null;
  id: string;
  transaction_id: string | null;
}

export interface FabricTransactionActionEndorsement {
  certificate_id: string;
  id: string;
  mspid: string;
  signature: string;
  transaction_action_id: string | null;
}

export interface FabricCertificate {
  id: string;
  issuer_common_name: string | null;
  issuer_country: string | null;
  issuer_locality: string | null;
  issuer_org: string | null;
  issuer_org_unit: string | null;
  issuer_state: string | null;
  pem: string;
  serial_number: string;
  subject_alt_name: string;
  subject_common_name: string | null;
  subject_country: string | null;
  subject_locality: string | null;
  subject_org: string | null;
  subject_org_unit: string | null;
  subject_state: string | null;
  valid_from: string;
  valid_to: string;
}
