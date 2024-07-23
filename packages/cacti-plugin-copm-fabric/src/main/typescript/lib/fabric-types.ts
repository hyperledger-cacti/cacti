import { DiscoveryOptions, Wallet } from "fabric-network";
import { ICryptoKey } from "fabric-common";

export type FabricContractContext = {
  channelName: string;
  mspId: string;
  networkName: string;
  discoveryOptions: DiscoveryOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectionProfile: any;
  wallet: Wallet;
};

export type LocalUserKeyAndCert = {
  key: ICryptoKey;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cert: any;
};
