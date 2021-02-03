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

test("Test get status endpoint", async (t: Test) => {
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
  const res = await api.getStatus([
    "0x60107340ab9546874a0d68958c1888babba0b0429a55751ea7bdf3ed38adc442",
    "0x001",
  ]);
  t.comment("Getting result");
  t.equal(res.status, 200);
  //Test for 500 not found test case
  try {
    await api.getStatus([
      "0xfake5ba7f06a8b01d0596589f73c19069e21c81e5013b91f408165d1bf623d32",
      "0x001",
    ]);
  } catch (error) {
    t.equal(error.response.status, 500, "HTTP response status are equal");
    t.equal(
      error.response.statusText,
      'invalid bytes32 value (arg="ids", coderType="bytes32", value="0xfake5ba7f06a8b01d0596589f73c19069e21c81e5013b91f408165d1bf623d32")',
      "Response text are equal",
    );
  }
});
