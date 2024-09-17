import { PromiseClient } from "@connectrpc/connect";
import { DLAccount, DefaultService } from "@hyperledger-cacti/cacti-copm-core";
import { CopmTester } from "../interfaces/copm-tester";
import { copmTesterFactory } from "./copm-tester-factory";
import { TestAssets } from "../interfaces/test-assets";
import { Logger } from "@hyperledger/cactus-common";
import { CopmNetworkMode } from "./types";

export class CopmTestertMultiNetwork implements CopmTester {
  net1: CopmTester | null;
  net2: CopmTester | null;
  log: Logger;
  networkMode: CopmNetworkMode;
  net1Type: string | null;
  net2Type: string | null;
  netMap: Map<string, CopmTester> = new Map();

  constructor(log: Logger, mode: CopmNetworkMode) {
    this.networkMode = mode;
    this.log = log;
    this.net1 = null;
    this.net2 = null;
    this.net1Type = null;
    this.net2Type = null;
  }

  async setNetworks(net1Type: string, net2Type: string) {
    this.net1Type = net1Type;
    this.net2Type = net2Type;
    this.net1 = await this.getTesterForNetworkType(net1Type);
    this.net2 = await this.getTesterForNetworkType(net2Type);
  }

  networkNames(): string[] {
    return this.getNet1().networkNames();
  }

  async startServer() {}

  async stopServer() {
    for (const net of this.netMap.values()) {
      await net.stopServer();
    }
  }

  getPartyA(assetType: string): DLAccount {
    return this.getNet1().getPartyA(assetType);
  }

  getPartyB(assetType: string): DLAccount {
    if (
      this.net1Type != this.net2Type &&
      this.networkMode == CopmNetworkMode.Pledge
    ) {
      // for different network types,
      // cross network perms have only been set up for
      // the primary user on each network.
      return this.getNet2().getPartyA(assetType);
    } else {
      return this.getNet2().getPartyB(assetType);
    }
  }

  async assetsFor(account: DLAccount): Promise<TestAssets> {
    return this.getNetworkFor(account).assetsFor(account);
  }

  clientFor(account: DLAccount): PromiseClient<typeof DefaultService> {
    return this.getNetworkFor(account).clientFor(account);
  }

  async getCertificateString(account: DLAccount): Promise<string> {
    return await this.getNetworkFor(account).getCertificateString(account);
  }

  getVerifiedViewExpectedResult(): string {
    return this.getNet1().getVerifiedViewExpectedResult();
  }

  async getVerifyViewCmd(
    pledgeId: string,
    src_crt: string,
    dest_cert: string,
    organization: string,
  ): Promise<{
    contractId: string;
    function: string;
    input: string[];
  }> {
    return await this.getNet1().getVerifyViewCmd(
      pledgeId,
      src_crt,
      dest_cert,
      organization,
    );
  }

  private getNetworkFor(account: DLAccount): CopmTester {
    if (this.getNet1().networkNames().includes(account.organization)) {
      return this.getNet1();
    }
    if (this.getNet2().networkNames().includes(account.organization)) {
      return this.getNet2();
    }
    throw new Error("Unknown organization: " + account.organization);
  }

  private async getTesterForNetworkType(netType: string): Promise<CopmTester> {
    if (!this.netMap.has(netType)) {
      const tester = copmTesterFactory(this.log, netType, this.networkMode);
      this.netMap.set(netType, tester);
      await tester.startServer();
    }

    const tester = this.netMap.get(netType);
    if (tester == null) {
      throw new Error("Tester not found for " + netType);
    }
    return tester;
  }

  private getNet1(): CopmTester {
    if (this.net1 == null) {
      throw new Error("Network 1 not set");
    }
    return this.net1;
  }

  private getNet2(): CopmTester {
    if (this.net2 == null) {
      throw new Error("Network 2 not set");
    }
    return this.net2;
  }
}
