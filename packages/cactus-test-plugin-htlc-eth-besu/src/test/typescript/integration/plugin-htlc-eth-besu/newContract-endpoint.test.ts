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
  NewContractObj,
} from "@hyperledger/cactus-plugin-htlc-eth-besu";

import { PluginRegistry } from "@hyperledger/cactus-core";

test("Test new Contract endpoint", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const httpServer = createServer();
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.once("listening", resolve);
    httpServer.listen(0, "127.0.0.1");
  });

  const addressInfo = httpServer.address() as AddressInfo;
  t.comment(`HttpServer1 AddressInfo: ${JSON.stringify(addressInfo)}`);
  const node1Host = `http://${addressInfo.address}:${addressInfo.port}`;
  t.comment(`Cactus Node 1 Host: ${node1Host}`);
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
  const bodyObj: NewContractObj = {
    outputAmount: 0x04,
    expiration: 2147483648,
    hashLock:
      "0x3c335ba7f06a8b01d0596589f73c19069e21c81e5013b91f408165d1bf623d32",
    receiver: "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0",
    outputNetwork: "BTC",
    outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
  };
  const res = await api.newContract(bodyObj);
  t.comment("Getting result");
  t.equal(res.status, 200);
  t.ok("End test 1");
});
