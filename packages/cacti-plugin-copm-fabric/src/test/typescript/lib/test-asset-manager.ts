import { Interfaces as CopmIF, DLAccount } from "@hyperledger/cacti-copm-core";
import { Logger } from "@hyperledger/cactus-common";

export interface CertificateFactoryFunc {
  (account: DLAccount): Promise<string>;
}

export class TestAssetManager {
  contractName: string;
  networkAdminName: string;
  log: Logger;
  contextFactory: CopmIF.DLTransactionContextFactory;
  certificateFactory: CertificateFactoryFunc;

  constructor(
    contractName: string,
    networkAdminName: string,
    contextFactory: CopmIF.DLTransactionContextFactory,
    certificateFactory: CertificateFactoryFunc,
    log: Logger,
  ) {
    this.contextFactory = contextFactory;
    this.certificateFactory = certificateFactory;
    this.contractName = contractName;
    this.networkAdminName = networkAdminName;
    this.log = log;
  }

  public async userOwnsNonFungibleAsset(
    assetType: string,
    assetId: string,
    account: DLAccount,
  ): Promise<boolean> {
    const netContext = await this.contextFactory.getTransactionContext(account);

    try {
      const readResult = await netContext.invoke({
        contract: this.contractName,
        method: "ReadAsset",
        args: [assetType, assetId],
      });
      return readResult.includes(assetId);
    } catch (ex) {
      if (ex.message.includes("does not exist")) {
        return false;
      }
      // unexpected error case
      throw ex;
    }
    return false;
  }

  public async addToken(
    assetType: string,
    assetQuantity: number,
    owner: DLAccount,
  ) {
    const transaction = await this.contextFactory.getTransactionContext(owner);

    await transaction.invoke({
      contract: this.contractName,
      method: "IssueTokenAssets",
      args: [
        assetType,
        assetQuantity.toString(),
        await this.certificateFactory(owner),
      ],
    });
  }

  public async addNonFungibleAsset(
    assetType: string,
    assetId: string,
    account: DLAccount,
  ) {
    const item = {
      assetType: assetType,
      id: assetId,
      owner: account.userId,
      issuer: "treasury",
      facevalue: "500",
      maturitydate: "01 Jan 45 00:00 MST",
    };
    const transaction =
      await this.contextFactory.getTransactionContext(account);
    const userCert = await this.certificateFactory(account);

    await transaction.invoke({
      contract: this.contractName,
      method: "CreateAsset",
      args: [
        item.assetType,
        item.id,
        userCert,
        item.issuer,
        item.facevalue,
        item.maturitydate,
      ],
    });
  }

  public async tokenBalance(
    tokenType: string,
    account: DLAccount,
  ): Promise<number> {
    const transaction =
      await this.contextFactory.getTransactionContext(account);

    const walletBalance = await transaction.invoke({
      contract: this.contractName,
      method: "GetMyWallet",
      args: [],
    });

    this.log.info(walletBalance);
    const walletParts = walletBalance.split("=");
    return +walletParts[1];
  }
}
