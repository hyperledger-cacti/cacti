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
  DefaultService,
  ClaimLockedAssetV1Request,
  LockAssetV1Request,
} from "@hyperledger/cacti-copm-core";
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
  let assetManager: TestAssetManager;
  let client: PromiseClient<typeof DefaultService>;
  let user1: string, net1: string, user2: string, net2: string;

  const hashSecret: string = "my_secret_123";
  const lockAssetName: string = "lockasset" + new Date().getTime().toString();

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

    fabricTestnet = new CopmWeaverFabricTestnet(log, "simpleasset");

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

    [net1, net2] = fabricTestnet.networkNames();
    [user1, user2] = fabricTestnet.userNames();
    assetManager = fabricTestnet.assetManager();

    const transport = createConnectTransport({
      baseUrl: apiHttpHost,
      httpVersion: "1.1",
    });

    client = createPromiseClient(DefaultService, transport);
  });

  afterAll(async () => {
    if (apiServer) {
      await apiServer.shutdown();
    }
  });

  test("fabric-fabric can lock/claim nft on same network by asset agreement", async () => {
    const assetType = "bond";

    const sourceCert = await fabricTestnet.getCertificateString({
      organization: net1,
      userId: user1,
    });
    const destCert = await fabricTestnet.getCertificateString({
      organization: net1,
      userId: user2,
    });

    await assetManager.addNonFungibleAsset(assetType, lockAssetName, {
      organization: net1,
      userId: user1,
    });

    const lockResult = await client.lockAssetV1(
      new LockAssetV1Request({
        assetLockV1PB: {
          asset: {
            assetType: assetType,
            assetId: lockAssetName,
          },
          owner: {
            network: net1,
            userId: user1,
          },
          hashInfo: {
            secret: hashSecret,
          },
          expirySecs: BigInt(45),
          sourceCertificate: sourceCert,
          destinationCertificate: destCert,
        },
      }),
    );

    expect(lockResult).toBeTruthy();

    const claimResult = await client.claimLockedAssetV1(
      new ClaimLockedAssetV1Request({
        assetLockClaimV1PB: {
          asset: {
            assetType: assetType,
            assetId: lockAssetName,
          },
          source: {
            network: net1,
            userId: user1,
          },
          destination: {
            network: net1,
            userId: user2,
          },
          sourceCertificate: sourceCert,
          destCertificate: destCert,
          hashInfo: {
            secret: hashSecret,
          },
        },
      }),
    );
    expect(claimResult).toBeTruthy();
  });

  test("fabric-fabric can lock/claim tokens on same network", async () => {
    const assetType = "token1";
    const assetQuantity = 10;

    await assetManager.addToken(assetType, assetQuantity, {
      organization: net2,
      userId: user2,
    });

    const srcCert = await fabricTestnet.getCertificateString({
      organization: net2,
      userId: user2,
    });
    const destCert = await fabricTestnet.getCertificateString({
      organization: net2,
      userId: user1,
    });

    const lockResult = await client.lockAssetV1(
      new LockAssetV1Request({
        assetLockV1PB: {
          asset: {
            assetType: assetType,
            assetQuantity: assetQuantity,
          },
          owner: { network: net2, userId: user2 },
          hashInfo: {
            secret: hashSecret,
          },
          expirySecs: BigInt(45),
          sourceCertificate: srcCert,
          destinationCertificate: destCert,
        },
      }),
    );

    expect(lockResult).toBeTruthy();
    expect(lockResult.lockId).toBeString();
    log.debug(lockResult.lockId);

    const claimResult = await client.claimLockedAssetV1(
      new ClaimLockedAssetV1Request({
        assetLockClaimV1PB: {
          lockId: lockResult.lockId,
          asset: {
            assetType: assetType,
            assetQuantity: assetQuantity,
          },
          source: {
            network: net2,
            userId: user2,
          },
          destination: {
            network: net2,
            userId: user1,
          },
          sourceCertificate: srcCert,
          destCertificate: destCert,
          hashInfo: {
            secret: hashSecret,
          },
        },
      }),
    );
    expect(claimResult).toBeTruthy();
  });
});
