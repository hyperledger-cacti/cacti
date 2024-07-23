import { DLTransactionParams, RemoteNetworkConfig } from "./types";

export class ViewAddress {
  private remoteNetConfig: RemoteNetworkConfig;
  private transactionParams: DLTransactionParams;

  constructor(
    remoteNetConfig: RemoteNetworkConfig,
    transactionParams: DLTransactionParams,
  ) {
    this.remoteNetConfig = remoteNetConfig;
    this.transactionParams = transactionParams;
  }

  public toString(): string {
    let address =
      this.remoteNetConfig.relayAddr + "/" + this.remoteNetConfig.network;
    if (this.remoteNetConfig.networkType == "fabric") {
      address =
        address +
        "/" +
        this.remoteNetConfig.channelName +
        ":" +
        this.transactionParams.contract +
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
        this.remoteNetConfig.flowPackage +
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
