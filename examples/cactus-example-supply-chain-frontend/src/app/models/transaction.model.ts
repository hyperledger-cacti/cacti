export interface Transaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  gasUsed: number;
  gasPrice: string;
  status: boolean;
  nonce: number;
  input: string;
} 