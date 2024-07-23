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
import { ApiServer } from "@hyperledger/cactus-cmd-api-server";
import { AuthorizationProtocol } from "@hyperledger/cactus-cmd-api-server";
import { ConfigService } from "@hyperledger/cactus-cmd-api-server";
import {
  DefaultService,
  ClaimPledgedAssetV1Request,
  PledgeAssetV1Request,
  AssetAccountV1PB,
  DLAccount,
} from "@hyperledger-cacti/cacti-copm-core";
import { PluginCopmFabric } from "../../../main/typescript/plugin-copm-fabric";
import { CopmWeaverFabricTestnet } from "../lib/copm-weaver-fabric-testnet";
import { TestAssetManager } from "../lib/test-asset-manager";
import * as path from "path";
import * as dotenv from "dotenv";
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
  let sourceAccount: DLAccount, destAccount: DLAccount;
  let sourceCert: string, destCert: string;
  let sourceAccountPB: AssetAccountV1PB, destAccountPB: AssetAccountV1PB;
  let assetManager: TestAssetManager;
  let client: PromiseClient<typeof DefaultService>;

  const contractName: string = "simpleassettransfer";
  const pledgeAssetName: string =
    "pledgeasset" + new Date().getTime().toString();

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

    const [net1, net2] = fabricTestnet.networkNames();
    const [user1, user2] = fabricTestnet.userNames();
    assetManager = fabricTestnet.assetManager();
    sourceAccount = { organization: net1, userId: user1 };
    destAccount = { organization: net2, userId: user2 };
    sourceAccountPB = AssetAccountV1PB.fromJson({
      network: net1,
      userId: user1,
    });
    destAccountPB = AssetAccountV1PB.fromJson({ network: net2, userId: user2 });
    sourceCert = await fabricTestnet.getCertificateString(sourceAccount);
    destCert = await fabricTestnet.getCertificateString(destAccount);

    const transport = createConnectTransport({
      baseUrl: apiHttpHost,
      httpVersion: "1.1",
    });
    client = createPromiseClient(DefaultService, transport);

    log.info("test setup complete");
  });

  afterAll(async () => {
    if (apiServer) {
      await apiServer.shutdown();
    }
  });

  test("fabric-fabric asset nft pledge and claim by asset id", async () => {
    const assetType = "bond01";

    await assetManager.addNonFungibleAsset(
      assetType,
      pledgeAssetName,
      sourceAccount,
    );

    const pledgeNFTResult = await client.pledgeAssetV1(
      new PledgeAssetV1Request({
        assetPledgeV1PB: {
          asset: {
            assetType: assetType,
            assetId: pledgeAssetName,
          },
          source: sourceAccountPB,
          destination: destAccountPB,
          expirySecs: BigInt(45),
          destinationCertificate: destCert,
        },
      }),
    );

    expect(pledgeNFTResult).toBeTruthy();
    expect(pledgeNFTResult.pledgeId).toBeString();

    const claimNFTResult = await client.claimPledgedAssetV1(
      new ClaimPledgedAssetV1Request({
        assetPledgeClaimV1PB: {
          pledgeId: pledgeNFTResult.pledgeId,
          asset: {
            assetType: assetType,
            assetId: pledgeAssetName,
          },
          source: sourceAccountPB,
          destination: destAccountPB,
          sourceCertificate: sourceCert,
          destCertificate: destCert,
        },
      }),
    );
    expect(claimNFTResult).toBeTruthy();

    // Check that the asset changed networks.
    expect(
      await assetManager.userOwnsNonFungibleAsset(
        assetType,
        pledgeAssetName,
        sourceAccount,
      ),
    ).toBeFalse();

    expect(
      await assetManager.userOwnsNonFungibleAsset(
        assetType,
        pledgeAssetName,
        destAccount,
      ),
    ).toBeTrue();
  });

  test("fabric-fabric asset token pledge and claim", async () => {
    const assetType = "token1";
    const exchangeQuantity = 10;

    // ensure initial account balance - user will not have a wallet if 0 tokens
    await assetManager.addToken(assetType, 1 + exchangeQuantity, sourceAccount);
    await assetManager.addToken(assetType, 1, destAccount);

    const user1StartBalance = await assetManager.tokenBalance(
      assetType,
      sourceAccount,
    );
    const user2StartBalance = await assetManager.tokenBalance(
      assetType,
      destAccount,
    );

    const pledgeResult = await client.pledgeAssetV1(
      new PledgeAssetV1Request({
        assetPledgeV1PB: {
          asset: {
            assetType: assetType,
            assetQuantity: exchangeQuantity,
          },
          source: sourceAccountPB,
          destination: destAccountPB,
          expirySecs: BigInt(45),
          destinationCertificate: destCert,
        },
      }),
    );

    expect(pledgeResult).toBeTruthy();
    expect(pledgeResult.pledgeId).toBeString();

    const claimResult = await client.claimPledgedAssetV1(
      new ClaimPledgedAssetV1Request({
        assetPledgeClaimV1PB: {
          pledgeId: pledgeResult.pledgeId,
          asset: {
            assetType: assetType,
            assetQuantity: exchangeQuantity,
          },
          source: sourceAccountPB,
          destination: destAccountPB,
          sourceCertificate: sourceCert,
          destCertificate: destCert,
        },
      }),
    );
    expect(claimResult).toBeTruthy();

    // Check that the tokens changed networks.
    expect(await assetManager.tokenBalance(assetType, sourceAccount)).toEqual(
      user1StartBalance - exchangeQuantity,
    );

    expect(await assetManager.tokenBalance(assetType, destAccount)).toEqual(
      user2StartBalance + exchangeQuantity,
    );
  });
});
