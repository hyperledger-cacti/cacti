import { AddressInfo } from "node:net";
import http from "node:http";

import "jest-extended";
import { v4 as uuidV4 } from "uuid";
import { createPromiseClient, PromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import {
  AuthorizationProtocol,
  ConfigService,
  ApiServer,
} from "@hyperledger/cactus-cmd-api-server";
import { PluginCopmFabric } from "../../../main/typescript/plugin-copm-fabric";
import {
  PledgeAssetV1Request,
  GetVerifiedViewV1Request,
  DefaultService,
} from "@hyperledger-cacti/cacti-copm-core";
import { CopmWeaverFabricTestnet } from "../lib/copm-weaver-fabric-testnet";
import * as path from "path";
import * as dotenv from "dotenv";
import { TestAssetManager } from "../lib/test-asset-manager";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const logLevel: LogLevelDesc = "DEBUG";
const log: Logger = LoggerProvider.getOrCreate({
  label: "plugin-copm-crpc-server-test",
  level: logLevel,
});

describe("PluginCopmFabric", () => {
  let fabricTestnet: CopmWeaverFabricTestnet;
  let httpServer: http.Server;
  let apiServer: ApiServer;
  let assetManager: TestAssetManager;
  let net1: string, net2: string, user1: string, user2: string;
  let source_cert: string, dest_cert: string;
  let client: PromiseClient<typeof DefaultService>;
  const contractName: string = "simpleassettransfer";
  const proveAssetName: string = "proveasset" + new Date().getTime().toString();

  beforeAll(async () => {
    httpServer = await Servers.startOnPreferredPort(4050);
    const addressInfoHttp = httpServer.address() as AddressInfo;
    const apiHttpHost = `http://${addressInfoHttp.address}:${addressInfoHttp.port}`;
    log.debug("HTTP API host: %s", apiHttpHost);

    const pluginRegistry = new PluginRegistry({ plugins: [] });

    const cfgSrv = new ConfigService();
    const apiSrvOpts = await cfgSrv.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.logLevel = logLevel;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = addressInfoHttp.port;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.grpcMtlsEnabled = false;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.crpcPort = 0;
    const cfg = await cfgSrv.newExampleConfigConvict(apiSrvOpts);

    log.info("setting up fabric test network");

    fabricTestnet = new CopmWeaverFabricTestnet(log, contractName);

    const compFabricPlugin = new PluginCopmFabric({
      instanceId: uuidV4(),
      logLevel,
      fabricConfig: fabricTestnet.fabricConfig,
      interopConfig: fabricTestnet.interopConfig,
      contractNames: fabricTestnet.contractNames,
    });

    pluginRegistry.add(compFabricPlugin);

    apiServer = new ApiServer({
      httpServerApi: httpServer,
      config: cfg.getProperties(),
      pluginRegistry,
    });

    log.info("staring api server");
    const { addressInfoGrpc, addressInfoCrpc } = await apiServer.start();
    const grpcPort = addressInfoGrpc.port;
    const grpcHost = addressInfoGrpc.address;
    const grpcFamily = addressInfoHttp.family;
    log.info("gRPC family=%s host=%s port=%s", grpcFamily, grpcHost, grpcPort);
    log.info("CRPC AddressInfo=%o", addressInfoCrpc);

    expect(apiServer).toBeTruthy();

    const transport = createConnectTransport({
      baseUrl: apiHttpHost,
      httpVersion: "1.1",
    });
    client = createPromiseClient(DefaultService, transport);

    [net1, net2] = fabricTestnet.networkNames();
    [user1, user2] = fabricTestnet.userNames();
    assetManager = fabricTestnet.assetManager();

    source_cert = await fabricTestnet.getCertificateString({
      organization: net1,
      userId: user1,
    });

    dest_cert = await fabricTestnet.getCertificateString({
      organization: net2,
      userId: user2,
    });

    log.info("test setup complete");
  });

  afterAll(async () => {
    if (apiServer) {
      await apiServer.shutdown();
    }
  });

  test("fabric-fabric get verified view", async () => {
    await assetManager.addNonFungibleAsset("bond", proveAssetName, {
      organization: net1,
      userId: user1,
    });

    const pledgeResult = await client.pledgeAssetV1(
      new PledgeAssetV1Request({
        assetPledgeV1PB: {
          asset: {
            assetType: "bond",
            assetId: proveAssetName,
          },
          source: {
            network: net1,
            userId: user1,
          },
          destination: {
            network: net2,
            userId: user2,
          },
          expirySecs: BigInt(45),
          destinationCertificate: dest_cert,
        },
      }),
    );

    expect(pledgeResult).toBeTruthy();
    expect(pledgeResult.pledgeId).toBeString();

    const res = await client.getVerifiedViewV1(
      new GetVerifiedViewV1Request({
        getVerifiedViewV1RequestPB: {
          account: {
            network: net2,
            userId: user2,
          },
          view: {
            network: net1,
            viewAddress: {
              contractId: contractName,
              function: "GetAssetPledgeStatus",
              input: [pledgeResult.pledgeId, source_cert, net2, dest_cert],
            },
          },
        },
      }),
    );

    expect(res).toBeTruthy();
    expect(res.data).toBeString();
    log.info(res.data);
  });
});
