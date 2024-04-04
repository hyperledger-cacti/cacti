import { AddressInfo } from "node:net";
import http from "node:http";

import "jest-extended";
import { v4 as uuidV4 } from "uuid";
import { createPromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { createGrpcTransport } from "@connectrpc/connect-node";
import { createGrpcWebTransport } from "@connectrpc/connect-node";

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
  DeleteKeychainEntryRequestV1PB,
  DeleteKeychainEntryV1Request,
  GetKeychainEntryRequestV1PB,
  GetKeychainEntryV1Request,
  HasKeychainEntryRequestV1PB,
  HasKeychainEntryV1Request,
  PluginKeychainMemory,
  SetKeychainEntryRequestV1PB,
  SetKeychainEntryV1Request,
} from "@hyperledger/cactus-plugin-keychain-memory";
import { DefaultService } from "@hyperledger/cactus-plugin-keychain-memory";

const logLevel: LogLevelDesc = "DEBUG";

describe("PluginKeychainMemory", () => {
  const log: Logger = LoggerProvider.getOrCreate({
    label: "plugin-ledger-connector-besu-grpc-service-test",
    level: logLevel,
  });

  let httpServer: http.Server;
  let apiServer: ApiServer;
  let addressInfoHttp: AddressInfo;
  let crpcApiUrl: string;
  let apiHttpHost: string;

  beforeAll(async () => {
    httpServer = await Servers.startOnPreferredPort(4050);
    addressInfoHttp = httpServer.address() as AddressInfo;
    apiHttpHost = `http://${addressInfoHttp.address}:${addressInfoHttp.port}`;
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

    const keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidV4(),
      keychainId: uuidV4(),
      logLevel,
    });

    pluginRegistry.add(keychainPlugin);

    apiServer = new ApiServer({
      httpServerApi: httpServer,
      config: cfg.getProperties(),
      pluginRegistry,
    });

    const { addressInfoGrpc, addressInfoCrpc } = await apiServer.start();
    const grpcPort = addressInfoGrpc.port;
    const grpcHost = addressInfoGrpc.address;
    const grpcFamily = addressInfoHttp.family;
    log.info("gRPC family=%s host=%s port=%s", grpcFamily, grpcHost, grpcPort);
    log.info("CRPC AddressInfo=%o", addressInfoCrpc);
    crpcApiUrl = `http://${addressInfoCrpc.address}:${addressInfoCrpc.port}`;

    expect(apiServer).toBeTruthy();

    const keychain = new PluginKeychainMemory({
      logLevel,
      instanceId: uuidV4(),
      keychainId: uuidV4(),
    });

    expect(keychain).toBeTruthy();
  });

  afterAll(async () => {
    await apiServer.shutdown();
  });

  test("works via CRPC API server - HTTP/1.1 Transport:Connect", async () => {
    const transport = createConnectTransport({
      baseUrl: apiHttpHost,
      httpVersion: "1.1",
    });

    const key = uuidV4();
    const value = uuidV4();

    const client = createPromiseClient(DefaultService, transport);

    const res1 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res1).toBeTruthy();
    expect(res1.isPresent).toBeFalse();
    expect(res1.checkedAt).toBeTruthy();
    expect(res1.checkedAt).toBeDateString();
    expect(res1.key).toEqual(key);

    const res2 = await client.setKeychainEntryV1(
      new SetKeychainEntryV1Request({
        setKeychainEntryRequestV1PB: new SetKeychainEntryRequestV1PB({
          key,
          value,
        }),
      }),
    );
    expect(res2).toBeTruthy();
    expect(res2.key).toEqual(key);

    const res3 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res3).toBeTruthy();
    expect(res3.isPresent).toBeTrue();
    expect(res3.checkedAt).toBeTruthy();
    expect(res3.checkedAt).toBeDateString();
    expect(res3.key).toEqual(key);

    const res4 = await client.getKeychainEntryV1(
      new GetKeychainEntryV1Request({
        getKeychainEntryRequestV1PB: new GetKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res4).toBeTruthy();
    expect(res4.value).toBeTruthy();
    expect(res4.value).toEqual(value);
    expect(res4.key).toEqual(key);

    const res5 = await client.deleteKeychainEntryV1(
      new DeleteKeychainEntryV1Request({
        deleteKeychainEntryRequestV1PB: new DeleteKeychainEntryRequestV1PB({
          key,
        }),
      }),
    );
    expect(res5).toBeTruthy();
    expect(res5.key).toEqual(key);

    const res6 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res6).toBeTruthy();
    expect(res6.isPresent).toBeFalse();
    expect(res6.checkedAt).toBeTruthy();
    expect(res6.checkedAt).toBeDateString();
    expect(res6.key).toEqual(key);
  });

  test("works via CRPC API server - HTTP/1.1 Transport:gRPC", async () => {
    const transport = createGrpcTransport({
      baseUrl: apiHttpHost,
      httpVersion: "1.1",
    });

    const key = uuidV4();
    const value = uuidV4();

    const client = createPromiseClient(DefaultService, transport);

    const res1 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res1).toBeTruthy();
    expect(res1.isPresent).toBeFalse();
    expect(res1.checkedAt).toBeTruthy();
    expect(res1.checkedAt).toBeDateString();
    expect(res1.key).toEqual(key);

    const res2 = await client.setKeychainEntryV1(
      new SetKeychainEntryV1Request({
        setKeychainEntryRequestV1PB: new SetKeychainEntryRequestV1PB({
          key,
          value,
        }),
      }),
    );
    expect(res2).toBeTruthy();
    expect(res2.key).toEqual(key);

    const res3 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res3).toBeTruthy();
    expect(res3.isPresent).toBeTrue();
    expect(res3.checkedAt).toBeTruthy();
    expect(res3.checkedAt).toBeDateString();
    expect(res3.key).toEqual(key);

    const res4 = await client.getKeychainEntryV1(
      new GetKeychainEntryV1Request({
        getKeychainEntryRequestV1PB: new GetKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res4).toBeTruthy();
    expect(res4.value).toBeTruthy();
    expect(res4.value).toEqual(value);
    expect(res4.key).toEqual(key);

    const res5 = await client.deleteKeychainEntryV1(
      new DeleteKeychainEntryV1Request({
        deleteKeychainEntryRequestV1PB: new DeleteKeychainEntryRequestV1PB({
          key,
        }),
      }),
    );
    expect(res5).toBeTruthy();
    expect(res5.key).toEqual(key);

    const res6 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res6).toBeTruthy();
    expect(res6.isPresent).toBeFalse();
    expect(res6.checkedAt).toBeTruthy();
    expect(res6.checkedAt).toBeDateString();
    expect(res6.key).toEqual(key);
  });

  test("works via CRPC API server - HTTP/1.1 Transport:gRPC-Web", async () => {
    const transport = createGrpcWebTransport({
      baseUrl: apiHttpHost,
      httpVersion: "1.1",
    });

    const key = uuidV4();
    const value = uuidV4();

    const client = createPromiseClient(DefaultService, transport);

    const res1 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res1).toBeTruthy();
    expect(res1.isPresent).toBeFalse();
    expect(res1.checkedAt).toBeTruthy();
    expect(res1.checkedAt).toBeDateString();
    expect(res1.key).toEqual(key);

    const res2 = await client.setKeychainEntryV1(
      new SetKeychainEntryV1Request({
        setKeychainEntryRequestV1PB: new SetKeychainEntryRequestV1PB({
          key,
          value,
        }),
      }),
    );
    expect(res2).toBeTruthy();
    expect(res2.key).toEqual(key);

    const res3 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res3).toBeTruthy();
    expect(res3.isPresent).toBeTrue();
    expect(res3.checkedAt).toBeTruthy();
    expect(res3.checkedAt).toBeDateString();
    expect(res3.key).toEqual(key);

    const res4 = await client.getKeychainEntryV1(
      new GetKeychainEntryV1Request({
        getKeychainEntryRequestV1PB: new GetKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res4).toBeTruthy();
    expect(res4.value).toBeTruthy();
    expect(res4.value).toEqual(value);
    expect(res4.key).toEqual(key);

    const res5 = await client.deleteKeychainEntryV1(
      new DeleteKeychainEntryV1Request({
        deleteKeychainEntryRequestV1PB: new DeleteKeychainEntryRequestV1PB({
          key,
        }),
      }),
    );
    expect(res5).toBeTruthy();
    expect(res5.key).toEqual(key);

    const res6 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res6).toBeTruthy();
    expect(res6.isPresent).toBeFalse();
    expect(res6.checkedAt).toBeTruthy();
    expect(res6.checkedAt).toBeDateString();
    expect(res6.key).toEqual(key);
  });

  test("works via CRPC API server - HTTP/2 Transport:Connect", async () => {
    const transport = createConnectTransport({
      baseUrl: crpcApiUrl,
      httpVersion: "2",
    });

    const key = uuidV4();
    const value = uuidV4();

    const client = createPromiseClient(DefaultService, transport);

    const res1 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res1).toBeTruthy();
    expect(res1.isPresent).toBeFalse();
    expect(res1.checkedAt).toBeTruthy();
    expect(res1.checkedAt).toBeDateString();
    expect(res1.key).toEqual(key);

    const res2 = await client.setKeychainEntryV1(
      new SetKeychainEntryV1Request({
        setKeychainEntryRequestV1PB: new SetKeychainEntryRequestV1PB({
          key,
          value,
        }),
      }),
    );
    expect(res2).toBeTruthy();
    expect(res2.key).toEqual(key);

    const res3 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res3).toBeTruthy();
    expect(res3.isPresent).toBeTrue();
    expect(res3.checkedAt).toBeTruthy();
    expect(res3.checkedAt).toBeDateString();
    expect(res3.key).toEqual(key);

    const res4 = await client.getKeychainEntryV1(
      new GetKeychainEntryV1Request({
        getKeychainEntryRequestV1PB: new GetKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res4).toBeTruthy();
    expect(res4.value).toBeTruthy();
    expect(res4.value).toEqual(value);
    expect(res4.key).toEqual(key);

    const res5 = await client.deleteKeychainEntryV1(
      new DeleteKeychainEntryV1Request({
        deleteKeychainEntryRequestV1PB: new DeleteKeychainEntryRequestV1PB({
          key,
        }),
      }),
    );
    expect(res5).toBeTruthy();
    expect(res5.key).toEqual(key);

    const res6 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res6).toBeTruthy();
    expect(res6.isPresent).toBeFalse();
    expect(res6.checkedAt).toBeTruthy();
    expect(res6.checkedAt).toBeDateString();
    expect(res6.key).toEqual(key);
  });

  test("works via CRPC API server - HTTP/2 Transport:gRPC", async () => {
    const transport = createGrpcTransport({
      baseUrl: crpcApiUrl,
      httpVersion: "2",
    });

    const key = uuidV4();
    const value = uuidV4();

    const client = createPromiseClient(DefaultService, transport);

    const res1 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res1).toBeTruthy();
    expect(res1.isPresent).toBeFalse();
    expect(res1.checkedAt).toBeTruthy();
    expect(res1.checkedAt).toBeDateString();
    expect(res1.key).toEqual(key);

    const res2 = await client.setKeychainEntryV1(
      new SetKeychainEntryV1Request({
        setKeychainEntryRequestV1PB: new SetKeychainEntryRequestV1PB({
          key,
          value,
        }),
      }),
    );
    expect(res2).toBeTruthy();
    expect(res2.key).toEqual(key);

    const res3 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res3).toBeTruthy();
    expect(res3.isPresent).toBeTrue();
    expect(res3.checkedAt).toBeTruthy();
    expect(res3.checkedAt).toBeDateString();
    expect(res3.key).toEqual(key);

    const res4 = await client.getKeychainEntryV1(
      new GetKeychainEntryV1Request({
        getKeychainEntryRequestV1PB: new GetKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res4).toBeTruthy();
    expect(res4.value).toBeTruthy();
    expect(res4.value).toEqual(value);
    expect(res4.key).toEqual(key);

    const res5 = await client.deleteKeychainEntryV1(
      new DeleteKeychainEntryV1Request({
        deleteKeychainEntryRequestV1PB: new DeleteKeychainEntryRequestV1PB({
          key,
        }),
      }),
    );
    expect(res5).toBeTruthy();
    expect(res5.key).toEqual(key);

    const res6 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res6).toBeTruthy();
    expect(res6.isPresent).toBeFalse();
    expect(res6.checkedAt).toBeTruthy();
    expect(res6.checkedAt).toBeDateString();
    expect(res6.key).toEqual(key);
  });

  test("works via CRPC API server - HTTP/2 Transport:gRPC-Web", async () => {
    const transport = createGrpcWebTransport({
      baseUrl: crpcApiUrl,
      httpVersion: "2",
    });

    const key = uuidV4();
    const value = uuidV4();

    const client = createPromiseClient(DefaultService, transport);

    const res1 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res1).toBeTruthy();
    expect(res1.isPresent).toBeFalse();
    expect(res1.checkedAt).toBeTruthy();
    expect(res1.checkedAt).toBeDateString();
    expect(res1.key).toEqual(key);

    const res2 = await client.setKeychainEntryV1(
      new SetKeychainEntryV1Request({
        setKeychainEntryRequestV1PB: new SetKeychainEntryRequestV1PB({
          key,
          value,
        }),
      }),
    );
    expect(res2).toBeTruthy();
    expect(res2.key).toEqual(key);

    const res3 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res3).toBeTruthy();
    expect(res3.isPresent).toBeTrue();
    expect(res3.checkedAt).toBeTruthy();
    expect(res3.checkedAt).toBeDateString();
    expect(res3.key).toEqual(key);

    const res4 = await client.getKeychainEntryV1(
      new GetKeychainEntryV1Request({
        getKeychainEntryRequestV1PB: new GetKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res4).toBeTruthy();
    expect(res4.value).toBeTruthy();
    expect(res4.value).toEqual(value);
    expect(res4.key).toEqual(key);

    const res5 = await client.deleteKeychainEntryV1(
      new DeleteKeychainEntryV1Request({
        deleteKeychainEntryRequestV1PB: new DeleteKeychainEntryRequestV1PB({
          key,
        }),
      }),
    );
    expect(res5).toBeTruthy();
    expect(res5.key).toEqual(key);

    const res6 = await client.hasKeychainEntryV1(
      new HasKeychainEntryV1Request({
        hasKeychainEntryRequestV1PB: new HasKeychainEntryRequestV1PB({ key }),
      }),
    );
    expect(res6).toBeTruthy();
    expect(res6.isPresent).toBeFalse();
    expect(res6.checkedAt).toBeTruthy();
    expect(res6.checkedAt).toBeDateString();
    expect(res6.key).toEqual(key);
  });
});
