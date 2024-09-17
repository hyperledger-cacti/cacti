import { DLAccount, DefaultService } from "@hyperledger-cacti/cacti-copm-core";
import { LogLevelDesc, Logger } from "@hyperledger/cactus-common";
import * as fs from "fs";
import * as path from "path";
import { createPromiseClient, PromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";

import { CopmTester } from "../interfaces/copm-tester";
import { TestAssets } from "../interfaces/test-assets";
import { CopmNetworkMode } from "../lib/types";
import { TestAssetsCordaCli } from "./test-assets-corda-cli";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { ConfigService } from "@hyperledger/cactus-cmd-api-server";
import { AuthorizationProtocol } from "@hyperledger/cactus-cmd-api-server";
import { v4 as uuidV4 } from "uuid";
import { PluginCopmCorda } from "@hyperledger-cacti/cacti-plugin-copm-corda";
import { AddressInfo } from "node:net";
import { Servers } from "@hyperledger/cactus-common";
import http from "node:http";
import { ApiServer } from "@hyperledger/cactus-cmd-api-server";
import { CopmCordaContainer } from "./copm-corda-container";
import { CordaRPCConfig } from "./corda-rpc-config";

export class CopmTesterCorda implements CopmTester {
  logLevel: LogLevelDesc = "INFO";
  log: Logger;
  private weaverRelativePath = "../../../../../../weaver/";
  private packageRelativePath = "../../../../";
  private networkMode: CopmNetworkMode;
  private testAssetMap = new Map<string, TestAssetsCordaCli>();
  private httpServer: http.Server | null;
  private apiServer: ApiServer | null;
  private serverAddress: string;
  private copmCordaContainer: CopmCordaContainer;

  constructor(log: Logger, networkMode: CopmNetworkMode) {
    this.log = log;
    this.networkMode = networkMode;
    this.apiServer = null;
    this.httpServer = null;
    this.serverAddress = "";
    this.copmCordaContainer = new CopmCordaContainer({
      logLevel: this.logLevel,
      rpcConfigJson: this.getRPCConfig(),
      relayConfigJson: this.getRelayConfig(),
      remoteOrgConfigJson: this.getRemoteOrgConfig(),
    });
  }

  public async assetsFor(account: DLAccount): Promise<TestAssets> {
    const accountKey = account.userId + "@" + account.organization;
    if (!this.testAssetMap.has(accountKey)) {
      this.testAssetMap.set(accountKey, await this.createTestAssets(account));
    }
    const assets = this.testAssetMap.get(accountKey);
    if (!assets) {
      throw Error(`no assets found for account ${accountKey}`);
    }
    return assets;
  }

  private async createTestAssets(
    account: DLAccount,
  ): Promise<TestAssetsCordaCli> {
    return new TestAssetsCordaCli(account, this.log);
  }

  public networkNames(): string[] {
    return ["Corda_Network", "Corda_Network2"];
  }

  async startServer() {
    if (this.apiServer) {
      return;
    }
    this.log.info("corda tester startServer -  starting copmCordaContainer");
    await this.copmCordaContainer.start();
    this.log.info("corda tester startServer -  started copmCordaContainer");

    this.httpServer = await Servers.startOnPreferredPort(4050);
    const addressInfoHttp = this.httpServer.address() as AddressInfo;
    this.serverAddress = `http://${addressInfoHttp.address}:${addressInfoHttp.port}`;
    this.log.debug("HTTP API host: %s", this.serverAddress);

    const pluginRegistry = new PluginRegistry({ plugins: [] });

    const cfgSrv = new ConfigService();
    const apiSrvOpts = await cfgSrv.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.logLevel = this.logLevel;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = addressInfoHttp.port;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.grpcMtlsEnabled = false;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.crpcPort = 0;
    const cfg = await cfgSrv.newExampleConfigConvict(apiSrvOpts);
    this.log.debug("creating corda plugin");
    const copmPlugin = new PluginCopmCorda({
      instanceId: uuidV4(),
      logLevel: this.logLevel,
      copmKotlinServerBaseUrl: `http://127.0.0.1:${this.copmCordaContainer.apiPort}`,
    });

    pluginRegistry.add(copmPlugin);

    this.apiServer = new ApiServer({
      httpServerApi: this.httpServer,
      config: cfg.getProperties(),
      pluginRegistry,
    });

    this.log.info("typescript api wrapper - starting");
    await this.apiServer.start();
    this.log.info("typescript api wrapper - started");
  }

  async stopServer() {
    if (this.apiServer) {
      await this.apiServer.shutdown();
    }
    if (this.httpServer) {
      await this.httpServer.close();
    }
    await this.copmCordaContainer.stop();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getPartyA(_assetType: string): DLAccount {
    return {
      organization: "Corda_Network",
      userId: "O=PartyA, L=London, C=GB",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getPartyB(_assetType: string): DLAccount {
    switch (this.networkMode) {
      case CopmNetworkMode.Pledge:
        return {
          organization: "Corda_Network2",
          userId: "O=PartyA, L=London, C=GB",
        };
      case CopmNetworkMode.Lock:
        return {
          organization: "Corda_Network",
          userId: "O=PartyB, L=London, C=GB",
        };
      default:
        throw Error("network mode not implemented");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public clientFor(account: DLAccount): PromiseClient<typeof DefaultService> {
    const transport = createConnectTransport({
      baseUrl: this.serverAddress,
      httpVersion: "1.1",
    });
    return createPromiseClient(DefaultService, transport);
  }

  public getVerifiedViewExpectedResult(): string {
    return "UniqueIdentifier";
  }

  public async getVerifyViewCmd(
    pledgeId: string,
    src_crt: string,
    dest_cert: string,
    organization: string,
  ): Promise<{
    contractId: string;
    function: string;
    input: string[];
  }> {
    return {
      contractId: "com.cordaSimpleApplication.flow",
      function: "GetAssetPledgeStatusByPledgeId",
      input: [pledgeId, organization],
    };
  }

  public getCertificateString(account: DLAccount): Promise<string> {
    const certsFile = path.join(
      __dirname,
      this.weaverRelativePath,
      `samples/corda/corda-simple-application/clients/src/main/resources/config/remoteNetworkUsers/${account.organization}_UsersAndCerts.json`,
    );
    const configJSON = JSON.parse(fs.readFileSync(certsFile).toString());
    if (!configJSON[account.userId]) {
      throw Error(`${account.userId} not found in json at ${certsFile}`);
    }
    return configJSON[account.userId];
  }

  private getRelayConfig(): string {
    const relayConfigPath = path.resolve(
      __dirname,
      this.packageRelativePath,
      "src/test/json/resources/corda-relay-config.json",
    );
    const relayConfigContent = fs.readFileSync(relayConfigPath, "utf-8");
    return relayConfigContent.replace(/127.0.0.1/g, "172.17.0.1");
  }

  private getRPCConfig(): string {
    return CordaRPCConfig.rpcJSON().replace(/127.0.0.1/g, "172.17.0.1");
  }

  private getRemoteOrgConfig(): string {
    const configPath = path.resolve(
      __dirname,
      this.weaverRelativePath,
      "samples/corda/corda-simple-application/clients/src/main/resources/config/remote-network-config.json",
    );
    return fs.readFileSync(configPath, "utf-8");
  }
}
