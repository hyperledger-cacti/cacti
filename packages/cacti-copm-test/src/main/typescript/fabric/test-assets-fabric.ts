import {
  Interfaces as CopmIF,
  DLAccount,
} from "@hyperledger-cacti/cacti-copm-core";
import { TestAssets } from "../interfaces/test-assets";
import { Logger } from "@hyperledger/cactus-common";

export interface CertificateFactoryFunc {
  (account: DLAccount): Promise<string>;
}

export class TestAssetsFabric implements TestAssets {
  contractName: string;
  networkAdminName: string;
  log: Logger;
  owner: DLAccount;
  contextFactory: CopmIF.DLTransactionContextFactory;
  certificateFactory: CertificateFactoryFunc;

  constructor(
    account: DLAccount,
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
    this.owner = account;
  }

  public async userOwnsNonFungibleAsset(
    assetType: string,
    assetId: string,
  ): Promise<boolean> {
    const netContext = await this.contextFactory.getTransactionContext(
      this.owner,
    );

    try {
      const readResult = await netContext.invoke({
        contractId: this.contractName,
        method: "ReadAsset",
        args: [assetType, assetId],
      });
      return readResult.includes(assetId);
    } catch (ex) {
      if (ex.message.includes("does not exist")) {
        return false;
      }
      if (ex.message.includes(`cannot access Bond Asset ${assetId}`)) {
        return false;
      }
      // unexpected error case
      throw ex;
    }
    return false;
  }

  public async addToken(assetType: string, assetQuantity: number) {
    const transaction = await this.contextFactory.getTransactionContext(
      this.owner,
    );

    await transaction.invoke({
      contractId: this.contractName,
      method: "IssueTokenAssets",
      args: [
        assetType,
        assetQuantity.toString(),
        await this.certificateFactory(this.owner),
      ],
    });
  }

  public async addNonFungibleAsset(assetType: string, assetId: string) {
    const item = {
      assetType: assetType,
      id: assetId,
      owner: this.owner.userId,
      issuer: "treasury",
      facevalue: "500",
      maturitydate: "01 Jan 45 00:00 MST",
    };
    const transaction = await this.contextFactory.getTransactionContext(
      this.owner,
    );
    const userCert = await this.certificateFactory(this.owner);

    await transaction.invoke({
      contractId: this.contractName,
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

  public async tokenBalance(tokenType: string): Promise<number> {
    const transaction = await this.contextFactory.getTransactionContext(
      this.owner,
    );

    try {
      const walletBalance = await transaction.invoke({
        contractId: this.contractName,
        method: "GetMyWallet",
        args: [],
      });

      for (const asset of walletBalance.split(",")) {
        if (asset.includes(tokenType)) {
          const matches = walletBalance.match(/="(\d+)"/);
          if (matches) {
            return +matches[1];
          }
        }
      }
      throw new Error(`Could not find ${tokenType} in ${walletBalance}`);
    } catch (ex) {
      if (ex.message.includes("does not have a wallet")) {
        return 0;
      }
      throw ex;
    }
  }
}
