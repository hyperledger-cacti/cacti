import { DLTransactionParams, RemoteOrgConfig } from "./types";

export class ViewAddress {
  private remoteNetConfig: RemoteOrgConfig;
  private transactionParams: DLTransactionParams;

  constructor(
    remoteNetConfig: RemoteOrgConfig,
    transactionParams: DLTransactionParams,
  ) {
    this.remoteNetConfig = remoteNetConfig;
    this.transactionParams = transactionParams;
  }

  public toString(): string {
    let address =
      this.remoteNetConfig.relayAddr + "/" + this.remoteNetConfig.networkName;
    if (this.remoteNetConfig.networkType == "fabric") {
      address =
        address +
        "/" +
        this.remoteNetConfig.channelName +
        ":" +
        this.transactionParams.contractId +
        ":" +
        this.transactionParams.method +
        ":" +
        this.transactionParams.args.join(":");
    } else if (this.remoteNetConfig.networkType == "corda") {
      address =
        address +
        "/" +
        this.remoteNetConfig.partyEndPoint +
        "#" +
        this.transactionParams.contractId +
        "." +
        this.transactionParams.method +
        ":" +
        this.transactionParams.args.join(":");
    } else {
      throw new Error(
        `Error: remote network ${this.remoteNetConfig.networkType} not supported.`,
      );
    }
    return address;
  }
}
