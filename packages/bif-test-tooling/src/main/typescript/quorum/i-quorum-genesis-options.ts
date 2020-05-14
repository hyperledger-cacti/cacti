export interface IAccount {
  balance: string;
}

export interface IAllocations {
  [key: string]: IAccount;
}

export interface IConfig {
  homesteadBlock: number;
  byzantiumBlock: number;
  constantinopleBlock: number;
  chainId: number;
  eip150Block: number;
  eip155Block: number;
  eip150Hash: string;
  eip158Block: number;
  maxCodeSize: number;
  isQuorum: boolean;
}

export interface IQuorumGenesisOptions {
  alloc: IAllocations;
  coinbase: string;
  config: IConfig;
  difficulty: string;
  extraData: string;
  gasLimit: string;
  mixhash: string;
  nonce: string;
  parentHash: string;
  timestamp: string;
}
