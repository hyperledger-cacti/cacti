import { FabricRemoteTransactionContext } from "./fabric-remote-transaction-context";
import { FabricConfiguration } from "./fabric-configuration";
import {
  Interfaces as CopmIF,
  DLAccount,
} from "@hyperledger-cacti/cacti-copm-core";
import { Logger } from "@hyperledger/cactus-common";
import { FabricTransactionContext } from "./fabric-transaction-context";

export class FabricTransactionContextFactory
  implements CopmIF.DLTransactionContextFactory
{
  private fabricConfiguration: FabricConfiguration;
  private interopConfiguration: CopmIF.InteropConfiguration;
  private log: Logger;

  constructor(
    fabricConfiguration: FabricConfiguration,
    interopConfiguration: CopmIF.InteropConfiguration,
    log: Logger,
  ) {
    this.fabricConfiguration = fabricConfiguration;
    this.interopConfiguration = interopConfiguration;
    this.log = log;
  }

  public async getTransactionContext(
    account: DLAccount,
  ): Promise<CopmIF.DLTransactionContext> {
    const context = await this.fabricConfiguration.getContractContext(
      account.organization,
    );
    return new FabricTransactionContext(context, account, this.log);
  }

  public async getRemoteTransactionContext(
    account: DLAccount,
    remoteNetwork: string,
  ): Promise<FabricRemoteTransactionContext> {
    return new FabricRemoteTransactionContext(
      await this.fabricConfiguration.getContractContext(account.organization),
      this.interopConfiguration.getLocalRelayConfig(account.organization),
      account,
      this.interopConfiguration.getRemoteOrgConfig(remoteNetwork),
      this.interopConfiguration.interopContractName,
      this.log,
    );
  }
}
