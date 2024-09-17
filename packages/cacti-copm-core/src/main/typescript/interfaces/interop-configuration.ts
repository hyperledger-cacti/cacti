import {
  LocalRelayConfig,
  RemoteOrgConfig,
  DLTransactionParams,
} from "../lib/types";

export interface InteropConfiguration {
  getLocalRelayConfig(localOrgKey: string): LocalRelayConfig;
  getRemoteOrgConfig(remoteOrgKey: string): RemoteOrgConfig;
  getRemotePledgeStatusCmd(
    remoteOrgKey: string,
    ValidatedClaimPledgedAssetRequest,
  ): DLTransactionParams;

  interopContractName: string;
}
