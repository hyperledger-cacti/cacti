export type DLTransactionParams = {
  contractId: string;
  method: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[];
};

export type DLAccount = {
  organization: string;
  userId: string;
};

export type RemoteOrgConfig = {
  channelName: string; // fabric-specific
  networkName: string;
  relayAddr: string;
  e2eConfidentiality: boolean;
  partyEndPoint: string; // corda-specific
  networkType: string;
};

export type LocalRelayConfig = {
  endpoint: string;
  useTLS: boolean;
  tlsCerts: string[];
};
