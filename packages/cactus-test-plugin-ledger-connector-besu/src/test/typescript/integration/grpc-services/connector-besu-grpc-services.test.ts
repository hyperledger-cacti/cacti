import http from "http";
import { AddressInfo } from "node:net";

import "jest-extended";
import * as grpc from "@grpc/grpc-js";
import { v4 as uuidv4 } from "uuid";
import Web3 from "web3";
import { Account } from "web3-core";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Servers,
  isGrpcStatusObjectWithCode,
} from "@hyperledger/cactus-common";
import {
  BesuTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import {
  PluginLedgerConnectorBesu,
  createGrpcInsecureChannelCredentials,
  besu_grpc_svc_streams,
  default_service,
  get_block_v1_request_pb,
  get_block_v1_response_pb,
  google_protobuf_any,
  watch_blocks_v1_progress_pb,
  watch_blocks_v1_request_pb,
  watch_blocks_v1_pb,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
  createGrpcServer,
} from "@hyperledger/cactus-cmd-api-server";

const logLevel: LogLevelDesc = "INFO";

type WatchBlocksV1ProgressPB =
  watch_blocks_v1_progress_pb.org.hyperledger.cacti.plugin.ledger.connector.besu.WatchBlocksV1ProgressPB;

describe("BesuGrpcSvcOpenApi", () => {
  const log: Logger = LoggerProvider.getOrCreate({
    label: "plugin-ledger-connector-besu-grpc-service-test",
    level: logLevel,
  });

  let ledger: BesuTestLedger;
  let httpServer: http.Server;
  let grpcServer: grpc.Server;
  let connector: PluginLedgerConnectorBesu;
  let grpcClientDefaultSvc: default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultServiceClient;
  let grpcClientBesuSvc: besu_grpc_svc_streams.org.hyperledger.cacti.plugin.ledger.connector.besu.services.besuservice.BesuGrpcSvcStreamsClient;
  let targetEthAccount: Account;
  let apiServer: ApiServer;
  let addressInfo: AddressInfo;

  beforeAll(async () => {
    log.info("Prune Docker...");
    await pruneDockerAllIfGithubAction({ logLevel });

    log.info("Start BesuTestLedger...");
    ledger = new BesuTestLedger({});
    await ledger.start();

    grpcServer = createGrpcServer();

    httpServer = await Servers.startOnPreferredPort(4050);
    addressInfo = httpServer.address() as AddressInfo;
    const apiHttpHost = `http://${addressInfo.address}:${addressInfo.port}`;
    log.debug("HTTP API host: %s", apiHttpHost);

    const rpcApiHttpHost = await ledger.getRpcApiHttpHost();
    const rpcApiWsHost = await ledger.getRpcApiWsHost();
    log.debug("rpcApiHttpHost:", rpcApiHttpHost);
    log.debug("rpcApiWsHost:", rpcApiWsHost);

    // Target account - create new
    const web3 = new Web3(rpcApiHttpHost);
    targetEthAccount = web3.eth.accounts.create(uuidv4());

    const keychainEntryKey = uuidv4();
    const keychainEntryValue = targetEthAccount.privateKey;
    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      // pre-provision keychain with mock backend holding the private key of the
      // test account that we'll reference while sending requests with the
      // signing credential pointing to this keychain entry.
      backend: new Map([[keychainEntryKey, keychainEntryValue]]),
      logLevel,
    });

    log.debug("Instantiating PluginLedgerConnectorBesu...");

    connector = new PluginLedgerConnectorBesu({
      rpcApiHttpHost,
      rpcApiWsHost,
      logLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    });

    const pluginRegistry = new PluginRegistry({ plugins: [] });

    const cfgSrv = new ConfigService();
    const apiSrvOpts = await cfgSrv.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.NONE;
    apiSrvOpts.logLevel = logLevel;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = addressInfo.port;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.grpcPort = 0;
    apiSrvOpts.crpcPort = 0;
    apiSrvOpts.grpcMtlsEnabled = false;
    apiSrvOpts.apiTlsEnabled = false;
    const cfg = await cfgSrv.newExampleConfigConvict(apiSrvOpts);

    pluginRegistry.add(keychainPlugin);
    pluginRegistry.add(connector);

    apiServer = new ApiServer({
      httpServerApi: httpServer,
      grpcServer,
      config: cfg.getProperties(),
      pluginRegistry,
    });

    const { addressInfoGrpc } = await apiServer.start();
    const grpcPort = addressInfoGrpc.port;
    const grpcHost = addressInfoGrpc.address;
    const grpcFamily = addressInfo.family;
    log.info("gRPC family=%s host=%s port=%s", grpcFamily, grpcHost, grpcPort);

    const grpcChannelCredentials = createGrpcInsecureChannelCredentials();
    const grpcUrl = `${grpcHost}:${grpcPort}`;
    grpcClientDefaultSvc =
      new default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.DefaultServiceClient(
        grpcUrl,
        grpcChannelCredentials,
        {
          "grpc-node.tls_enable_trace": 1,
        },
      );

    grpcClientBesuSvc =
      new besu_grpc_svc_streams.org.hyperledger.cacti.plugin.ledger.connector.besu.services.besuservice.BesuGrpcSvcStreamsClient(
        grpcUrl,
        grpcChannelCredentials,
        {
          "grpc-node.tls_enable_trace": 1,
        },
      );

    log.debug("Created gRPC client OK.");
  });

  test("gRPC - getBlockV1() returns arbitrary ledger block", async () => {
    const blockHashOrBlockNumberData = Buffer.from("latest", "utf-8");
    const blockHashOrBlockNumber =
      new google_protobuf_any.google.protobuf.Any();

    blockHashOrBlockNumber.value = blockHashOrBlockNumberData;

    const getBlockV1RequestPB =
      new get_block_v1_request_pb.org.hyperledger.cacti.plugin.ledger.connector.besu.GetBlockV1RequestPB(
        { blockHashOrBlockNumber },
      );

    const req1 =
      new default_service.org.hyperledger.cacti.plugin.ledger.connector.besu.services.defaultservice.GetBlockV1Request(
        { getBlockV1RequestPB },
      );

    const metadata1 = new grpc.Metadata();

    const res1Promise =
      new Promise<get_block_v1_response_pb.org.hyperledger.cacti.plugin.ledger.connector.besu.GetBlockV1ResponsePB>(
        (resolve, reject) => {
          const call = grpcClientDefaultSvc.GetBlockV1(
            req1,
            metadata1,
            (
              err: grpc.ServiceError | null,
              value?: get_block_v1_response_pb.org.hyperledger.cacti.plugin.ledger.connector.besu.GetBlockV1ResponsePB,
            ) => {
              log.debug("Received callback from gRPC service: ", err, value);
              if (err) {
                reject(err);
              } else if (value) {
                resolve(value);
              } else {
                reject(new Error("Received no gRPC error nor response value."));
              }
            },
          );
          log.debug("gRPC call object: ", call);
          expect(call).toBeTruthy();
        },
      );

    expect(res1Promise).toResolve();
    const res1 = await res1Promise;
    expect(res1).toBeTruthy();
    expect(res1).toBeObject();

    const block = res1.block.toObject();
    expect(block).toBeTruthy();
    expect(block).toBeObject();
    expect(block).not.toBeEmptyObject();
    expect(block.number).toBeTruthy();
    expect(block.hash).toBeTruthy();
    expect(block.transactions).toBeArray();
  });

  test("gRPC - watchBlocksV1() streams ledger blocks as they are created", async () => {
    const reqMetadata = new grpc.Metadata();
    const stream = grpcClientBesuSvc.WatchBlocksV1(reqMetadata);

    const msgs: Array<WatchBlocksV1ProgressPB> = [];
    const MSG_COUNT_SUCCESS = 3;

    const streamDoneAsync = new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: WatchBlocksV1ProgressPB) => {
        msgs.push(chunk);
        log.debug("WatchBlocksV1::data=%o, msg.length=%o", chunk, msgs.length);
        if (msgs.length >= MSG_COUNT_SUCCESS) {
          const reqUnsubscribe =
            new watch_blocks_v1_request_pb.org.hyperledger.cacti.plugin.ledger.connector.besu.WatchBlocksV1RequestPB();

          reqUnsubscribe.event =
            watch_blocks_v1_pb.org.hyperledger.cacti.plugin.ledger.connector.besu.WatchBlocksV1PB.WatchBlocksV1PB_Unsubscribe;

          stream.write(reqUnsubscribe);
        }
      });

      stream.on("status", (status: unknown) => {
        log.debug("WatchBlocksV1::status=%o", status);
        if (
          isGrpcStatusObjectWithCode(status) &&
          status.code === grpc.status.OK
        ) {
          resolve();
        } else {
          const statusJson = JSON.stringify(status);
          reject(new Error(`Received non-OK grpc status code: ${statusJson}`));
        }
      });

      stream.on("error", (error: unknown) => {
        log.debug("WatchBlocksV1::error=%o", error);
        reject(error);
      });

      stream.on("close", () => {
        log.debug("WatchBlocksV1::close=");
        resolve();
      });
    });

    await expect(streamDoneAsync).toResolve();
  }, 15000);

  afterAll(async () => {
    if (apiServer) {
      await apiServer.shutdown();
    }
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  });
});
