import { Gateway } from "fabric-network";
import { Logger } from "@hyperledger/cactus-common";
import {
  DLTransactionParams,
  Interfaces as CopmIF,
  DLAccount,
} from "@hyperledger-cacti/cacti-copm-core";
import { FabricContractContext } from "./fabric-types";

export class FabricTransactionContext implements CopmIF.DLTransactionContext {
  private context: FabricContractContext;
  private account: DLAccount;
  private log: Logger;

  constructor(
    context: FabricContractContext,
    account: DLAccount,
    logger: Logger,
  ) {
    this.context = context;
    this.account = account;
    this.log = logger;
  }

  public async invoke(transactionParams: DLTransactionParams) {
    // get the user identity
    const identity = await this.context.wallet.get(this.account.userId);
    if (!identity) {
      throw new Error(
        `An identity for the user "${this.account.userId}" does not exist in the wallet for network "${this.account.organization}"`,
      );
    }
    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(this.context.connectionProfile, {
      wallet: this.context.wallet,
      identity: identity,
      discovery: this.context.discoveryOptions,
    });

    const network = await gateway.getNetwork(this.context.channelName);
    // Get the contract from the network.
    const contract = network.getContract(transactionParams.contractId);

    const currentQuery = {
      channel: this.context.channelName,
      contractName: transactionParams.contractId,
      ccFunc: transactionParams.method,
      args: transactionParams.args,
    };

    this.log.debug(currentQuery);

    const read = await contract.submitTransaction(
      currentQuery.ccFunc,
      ...currentQuery.args,
    );
    const res = Buffer.from(read).toString();
    if (res) {
      this.log.debug(`Response From Network: ${res}`);
    } else {
      this.log.debug("No Response from network");
    }

    // Disconnect from the gateway.
    gateway.disconnect();
    return res;
  }
}
