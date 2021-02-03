import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import { ApiServer, ConfigService } from "@hyperledger/cactus-cmd-api-server";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { AddressInfo } from "net";
import {
  Configuration,
  DefaultApi,
  IPluginHtlcEthBesuOptions,
  PluginHtlcEthBesu,
} from "@hyperledger/cactus-plugin-htlc-eth-besu";

import { PluginRegistry } from "@hyperledger/cactus-core";

test("Test refund endpoint", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const httpServer = createServer();
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.once("listening", resolve);
    httpServer.listen(0, "127.0.0.1");
  });

  const addressInfo = httpServer.address() as AddressInfo;
  t.comment(`HttpServer AddressInfo: ${JSON.stringify(addressInfo)}`);
  const node1Host = `http://${addressInfo.address}:${addressInfo.port}`;
  t.comment(`Cactus Node Host: ${node1Host}`);
  const pluginRegistry = new PluginRegistry({});
  const configService = new ConfigService();
  const apiServerOptions = configService.newExampleConfig();
  //TODO: Pass rpcHost in options
  const pluginOptions: IPluginHtlcEthBesuOptions = {
    instanceId: uuidv4(),
    pluginRegistry,
    logLevel,
  };
  const pluginHtlc = new PluginHtlcEthBesu(pluginOptions);
  pluginRegistry.add(pluginHtlc);
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = addressInfo.port;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  const config = configService.newExampleConfigConvict(apiServerOptions);
  const apiServer = new ApiServer({
    httpServerApi: httpServer,
    config: config.getProperties(),
    pluginRegistry,
  });
  await apiServer.start();
  t.comment("Start server");
  test.onFinish(() => apiServer.shutdown());
  const configuration = new Configuration({
    basePath: node1Host,
  });
  t.comment("Setting configuration");

  const api = new DefaultApi(configuration);
  t.comment("Api generated");

  // Test for 200 valid response test case
  const res = await api.refund(
    "0x307f70cf366b22d629046ed599a7ec4a589f913fc2905a70e162714ef06a754b",
  );
  t.comment("Getting result");
  t.equal(res.status, 200);
});
