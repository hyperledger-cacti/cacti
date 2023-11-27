import {
  IListenOptions,
  LogLevelDesc,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Constants, PluginImportType } from "@hyperledger/cactus-core-api";
import bodyParser from "body-parser";
import express from "express";
import http from "http";
import "jest-extended";
import { AddressInfo } from "net";
import { Server as SocketIoServer } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import {
  BesuApiClient,
  BesuApiClientOptions,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
} from "../../../main/typescript/public-api";

describe(__filename, () => {
  const logLevel: LogLevelDesc = "TRACE";

  const log = LoggerProvider.getOrCreate({
    label: __filename,
    level: logLevel,
  });

  const rpcApiHttpHost = "http://127.0.0.1:8000";
  const rpcApiWsHost = "ws://127.0.0.1:9000";

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  let apiClient: BesuApiClient;

  afterAll(async () => {
    await Servers.shutdown(server);
  });

  beforeAll(async () => {
    const factory = new PluginFactoryLedgerConnector({
      pluginImportType: PluginImportType.Local,
    });

    const connector: PluginLedgerConnectorBesu = await factory.create({
      rpcApiHttpHost,
      rpcApiWsHost,
      logLevel,
      instanceId: uuidv4(),
      pluginRegistry: new PluginRegistry({ plugins: [] }),
    });

    const wsApi = new SocketIoServer(server, {
      path: Constants.SocketIoConnectionPathV1,
    });

    await connector.registerWebServices(expressApp, wsApi);

    const listenOptions: IListenOptions = {
      hostname: "localhost",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;

    const besuApiClientOptions = new BesuApiClientOptions({
      basePath: apiHost,
    });
    apiClient = new BesuApiClient(besuApiClientOptions);
    log.debug("Instantiated BesuApiClient OK");
  });

  it("Returns a JSON document containing the Open API specification of the plugin.", async () => {
    const res1Promise = apiClient.getOpenApiSpecV1();
    await expect(res1Promise).resolves.not.toThrow();
    const res1 = await res1Promise;
    expect(res1.status).toEqual(200);
    expect(res1.data).toBeTruthy();
    expect(res1.config).toBeTruthy();
    expect(res1.config.url).toBeString();
    log.debug("Fetched URL OK=%s", res1.config.url);
    expect(res1.data).toBeObject();
  });
});
