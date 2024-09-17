import { Identity } from "fabric-network";
import { ApiServer } from "@hyperledger/cactus-cmd-api-server";
import { DLAccount, DefaultService } from "@hyperledger-cacti/cacti-copm-core";
import { LogLevelDesc, Logger } from "@hyperledger/cactus-common";
import { TestAssets } from "../interfaces/test-assets";
import { TestAssetsFabric } from "./test-assets-fabric";
import { TestFabricConfiguration } from "./test-fabric-configuration";
import { WeaverInteropConfiguration } from "../lib/weaver-interop-configuration";
import { CopmTester } from "../interfaces/copm-tester";
import { createPromiseClient, PromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import http from "node:http";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { ConfigService } from "@hyperledger/cactus-cmd-api-server";
import { AuthorizationProtocol } from "@hyperledger/cactus-cmd-api-server";
import { v4 as uuidV4 } from "uuid";
import { AddressInfo } from "node:net";
import { Servers } from "@hyperledger/cactus-common";
import {
  PluginCopmFabric,
  FabricTransactionContextFactory,
} from "@hyperledger-cacti/cacti-plugin-copm-fabric";
import { CopmNetworkMode } from "../lib/types";

type FabricIdentity = Identity & {
  credentials: {
    certificate: string;
    privateKey: string;
  };
};

export class CopmTesterFabric implements CopmTester {
  logLevel: LogLevelDesc = "INFO";
  log: Logger;
  fabricConfig: TestFabricConfiguration;
  interopConfig: WeaverInteropConfiguration;

  private assetContractName: string;
  private networkAdminName: string;
  private networkMode: CopmNetworkMode;
  private serverAddress: string;
  private httpServer: http.Server | null;
  private apiServer: ApiServer | null;

  constructor(log: Logger, mode: CopmNetworkMode) {
    this.log = log;
    this.networkAdminName = "networkadmin";
    this.assetContractName =
      mode == CopmNetworkMode.Lock ? "simpleasset" : "simpleassettransfer";

    this.fabricConfig = new TestFabricConfiguration(
      log,
      this.assetContractName,
    );
    this.interopConfig = new WeaverInteropConfiguration("interop", this.log);
    this.networkMode = mode;
    this.serverAddress = "";
    this.httpServer = null;
    this.apiServer = null;
  }

  public async assetsFor(account: DLAccount): Promise<TestAssets> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const testnet = this;

    return new TestAssetsFabric(
      account,
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

  public async startServer() {
    if (this.apiServer) {
      return;
    }
    this.log.info("fabric startServer");
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
    const compFabricPlugin = new PluginCopmFabric({
      instanceId: uuidV4(),
      logLevel: this.logLevel,
      fabricConfig: this.fabricConfig,
      interopConfig: this.interopConfig,
    });

    pluginRegistry.add(compFabricPlugin);

    this.apiServer = new ApiServer({
      httpServerApi: this.httpServer,
      config: cfg.getProperties(),
      pluginRegistry,
    });

    this.log.info("api server - starting");
    const { addressInfoGrpc, addressInfoCrpc } = await this.apiServer.start();
    this.log.info("api server - started");
    const grpcPort = addressInfoGrpc.port;
    const grpcHost = addressInfoGrpc.address;
    const grpcFamily = addressInfoHttp.family;
    this.log.info(
      "gRPC family=%s host=%s port=%s",
      grpcFamily,
      grpcHost,
      grpcPort,
    );
    this.log.info("CRPC AddressInfo=%o", addressInfoCrpc);
  }

  public async stopServer() {
    if (this.apiServer) {
      await this.apiServer.shutdown();
    }
    if (this.httpServer) {
      await this.httpServer.close();
    }
  }

  public getPartyA(assetType: string): DLAccount {
    const usernames = this.userNames();
    const networks = this.networkNames();

    if (this.networkMode == CopmNetworkMode.Pledge) {
      return { organization: networks[0], userId: usernames[0] };
    } else {
      if (assetType.startsWith("bond")) {
        // bonds are on network 0, tokens on network 1
        return { organization: networks[0], userId: usernames[0] };
      } else {
        return { organization: networks[1], userId: usernames[0] };
      }
    }
  }

  public getPartyB(assetType: string): DLAccount {
    const usernames = this.userNames();
    const networks = this.networkNames();

    if (this.networkMode == CopmNetworkMode.Pledge) {
      return { organization: networks[1], userId: usernames[1] };
    } else {
      if (assetType.startsWith("bond")) {
        // bonds are on network 0, tokens on network 1
        return { organization: networks[0], userId: usernames[1] };
      } else {
        return { organization: networks[1], userId: usernames[1] };
      }
    }
  }

  getVerifiedViewExpectedResult(): string {
    return "replace";
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
    return {
      contractId: this.assetContractName,
      function: "GetAssetPledgeStatus",
      input: [pledgeId, src_crt, organization, dest_cert],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public clientFor(account: DLAccount): PromiseClient<typeof DefaultService> {
    const transport = createConnectTransport({
      baseUrl: this.serverAddress,
      httpVersion: "1.1",
    });
    return createPromiseClient(DefaultService, transport);
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
}
