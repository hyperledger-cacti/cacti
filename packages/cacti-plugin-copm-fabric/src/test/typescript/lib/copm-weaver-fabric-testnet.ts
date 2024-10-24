import { Identity } from "fabric-network";
import { DLAccount, CopmContractNames } from "@hyperledger-cacti/cacti-copm-core";
import { LogLevelDesc, Logger } from "@hyperledger/cactus-common";
import { TestAssetManager } from "./test-asset-manager";
import { TestFabricConfiguration } from "./test-fabric-configuration";
import { FabricTransactionContextFactory } from "../../../main/typescript/lib/fabric-context-factory";
import { TestInteropConfiguration } from "./test-interop-configuration";

type FabricIdentity = Identity & {
  credentials: {
    certificate: string;
    privateKey: string;
  };
};

export class CopmWeaverFabricTestnet {
  logLevel: LogLevelDesc = "INFO";
  log: Logger;
  fabricConfig: TestFabricConfiguration;
  interopConfig: TestInteropConfiguration;
  contractNames: CopmContractNames;

  private assetContractName: string;
  private networkAdminName: string;

  constructor(log: Logger, assetContractName: string) {
    this.log = log;
    this.assetContractName = assetContractName;
    this.networkAdminName = "networkadmin";
    this.fabricConfig = new TestFabricConfiguration(log);
    this.interopConfig = new TestInteropConfiguration("interop", this.log);
    this.contractNames = {
      pledgeContract: "simpleassettransfer",
      lockContract: "simpleasset",
    };
  }

  public networkNames(): string[] {
    return ["network1", "network2"];
  }

  public userNames(): string[] {
    return ["alice", "bob"];
  }

  public async getCertificateString(account: DLAccount): Promise<string> {
    const wallet = await this.fabricConfig.getOrgWallet(account.organization);
    const identity = (await wallet.get(account.userId)) as FabricIdentity;
    if (!identity?.credentials?.certificate) {
      throw new Error(`no credentials for user ${account.userId}`);
    }
    const userCert = Buffer.from(identity.credentials.certificate).toString(
      "base64",
    );
    return userCert;
  }

  public assetManager() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const testnet = this;
    return new TestAssetManager(
      this.assetContractName,
      this.networkAdminName,
      new FabricTransactionContextFactory(
        this.fabricConfig,
        this.interopConfig,
        this.log,
      ),
      async function (account: DLAccount): Promise<string> {
        return await testnet.getCertificateString(account);
      },
      this.log,
    );
  }
}
