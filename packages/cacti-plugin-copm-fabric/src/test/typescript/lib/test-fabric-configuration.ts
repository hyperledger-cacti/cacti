import { FabricConfiguration } from "../../../main/typescript/lib/fabric-configuration";
import { FabricContractContext } from "../../../main/typescript/lib/fabric-types";
import { Wallet, DiscoveryOptions, Wallets } from "fabric-network";
import { Logger } from "@hyperledger/cactus-common";
import path from "path";
import fs from "fs-extra";

export class TestFabricConfiguration implements FabricConfiguration {
  private log: Logger;
  private discoveryOptions: DiscoveryOptions;
  private weaverRelativePath = "../../../../../../weaver/";
  private weaverWalletPath = path.join(
    __dirname,
    this.weaverRelativePath,
    "samples/fabric/fabric-cli/src",
  );
  private weaverNetConfigPath = path.join(
    __dirname,
    this.weaverRelativePath,
    "samples/fabric/fabric-cli",
  );

  constructor(log: Logger) {
    this.log = log;
    this.discoveryOptions = {
      enabled: true,
      asLocalhost: true,
    };
  }

  public async getContractContext(
    orgName: string,
  ): Promise<FabricContractContext> {
    const weaverConfig = this.getWeaverNetworkConfig(orgName);
    if (!weaverConfig.mspId) {
      throw Error(`no mspId defined for ${orgName}`);
    }
    if (!weaverConfig.channelName) {
      throw Error(`no channel name defined for ${orgName}`);
    }
    return {
      mspId: weaverConfig.mspId,
      networkName: orgName,
      channelName: weaverConfig.channelName,
      discoveryOptions: this.discoveryOptions,
      wallet: await this.getOrgWallet(orgName),
      connectionProfile: this.getConnectionProfile(orgName),
    };
  }

  public getConnectionProfile(orgName: string): object {
    const netConfig = this.getWeaverNetworkConfig(orgName);
    const ccp = JSON.parse(fs.readFileSync(netConfig.connProfilePath, "utf8"));
    return ccp;
  }

  public async getOrgWallet(orgName: string): Promise<Wallet> {
    const walletPath = path.join(this.weaverWalletPath, `wallet-${orgName}`);
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    return wallet;
  }

  private getWeaverNetworkConfig(networkId: string): {
    relayEndpoint?: string;
    connProfilePath: string;
    username?: string;
    mspId?: string;
    aclPolicyPrincipalType?: string;
    channelName?: string;
    chaincode?: string;
  } {
    const configPath = path.join(this.weaverNetConfigPath, "config.json");
    const configJSON = JSON.parse(fs.readFileSync(configPath).toString());
    if (!configJSON[networkId]) {
      throw Error(
        `Network: ${networkId} does not exist in the config.template.json file at ${configPath}`,
      );
    }

    const netConfig = configJSON[networkId];
    return netConfig;
  }
}
