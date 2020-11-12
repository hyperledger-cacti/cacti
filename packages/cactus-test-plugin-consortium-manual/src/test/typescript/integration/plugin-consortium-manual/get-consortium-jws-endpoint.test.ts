import { createServer } from "http";
import { AddressInfo } from "net";

import test, { Test } from "tape";
import { JWK, JWS } from "jose";
import { v4 as uuidV4 } from "uuid";

import { ApiServer, ConfigService } from "@hyperledger/cactus-cmd-api-server";
import {
  IPluginConsortiumManualOptions,
  PluginConsortiumManual,
  DefaultApi,
  Configuration,
} from "@hyperledger/cactus-plugin-consortium-manual";
import { Consortium, PluginRegistry } from "@hyperledger/cactus-core-api";

test("member node public keys and hosts are pre-shared", async (t: Test) => {
  const consortiumId = uuidV4();
  const consortiumName = "Example Corp. & Friends Crypto Consortium";

  const memberId1 = uuidV4();
  const memberId2 = uuidV4();
  const memberId3 = uuidV4();

  const httpServer1 = createServer();
  await new Promise((resolve, reject) => {
    httpServer1.once("error", reject);
    httpServer1.once("listening", resolve);
    httpServer1.listen(0, "127.0.0.1");
  });
  const addressInfo1 = httpServer1.address() as AddressInfo;
  t.comment(`HttpServer1 AddressInfo: ${JSON.stringify(addressInfo1)}`);
  const node1Host = `http://${addressInfo1.address}:${addressInfo1.port}`;
  t.comment(`Cactus Node 1 Host: ${node1Host}`);

  const keyPair1 = await JWK.generate("EC", "secp256k1");
  const pubKeyPem1 = keyPair1.toPEM(false);
  t.comment(`Cactus Node 1 Public Key PEM: ${pubKeyPem1}`);

  const httpServer2 = createServer();
  await new Promise((resolve, reject) => {
    httpServer2.once("error", reject);
    httpServer2.once("listening", resolve);
    httpServer2.listen(0, "127.0.0.1");
  });
  const addressInfo2 = httpServer2.address() as AddressInfo;
  t.comment(`HttpServer2 AddressInfo: ${JSON.stringify(addressInfo2)}`);
  const node2Host = `http://${addressInfo2.address}:${addressInfo2.port}`;

  const keyPair2 = await JWK.generate("EC", "secp256k1");
  const pubKeyPem2 = keyPair2.toPEM(false);
  t.comment(`Cactus Node 2 Public Key PEM: ${pubKeyPem2}`);

  const httpServer3 = createServer();
  await new Promise((resolve, reject) => {
    httpServer3.once("error", reject);
    httpServer3.once("listening", resolve);
    httpServer3.listen(0, "127.0.0.1");
  });
  const addressInfo3 = httpServer3.address() as AddressInfo;
  t.comment(`HttpServer3 AddressInfo: ${JSON.stringify(addressInfo3)}`);
  const node3Host = `http://${addressInfo3.address}:${addressInfo3.port}`;

  const keyPair3 = await JWK.generate("EC", "secp256k1");
  const pubKeyPem3 = keyPair3.toPEM(false);
  t.comment(`Cactus Node 3 Public Key PEM: ${pubKeyPem3}`);

  const consortium: Consortium = {
    id: consortiumId,
    mainApiHost: node1Host,
    name: consortiumName,
    members: [
      {
        id: memberId1,
        name: "Example Corp 1",
        nodes: [
          {
            consortiumId,
            memberId: memberId1,
            id: "Example_Cactus_Node_1",
            nodeApiHost: node1Host,
            publicKeyPem: pubKeyPem1,
            ledgers: [],
            plugins: [],
          },
        ],
      },
      {
        id: memberId2,
        name: "Example Corp 2",
        nodes: [
          {
            consortiumId,
            memberId: memberId2,
            id: "Example_Cactus_Node_2",
            nodeApiHost: node2Host,
            publicKeyPem: pubKeyPem2,
            ledgers: [],
            plugins: [],
          },
        ],
      },
      {
        id: memberId3,
        name: "Example Corp 3",
        nodes: [
          {
            consortiumId,
            memberId: memberId3,
            id: "Example_Cactus_Node_3",
            nodeApiHost: node3Host,
            publicKeyPem: pubKeyPem3,
            ledgers: [],
            plugins: [],
          },
        ],
      },
    ],
  };

  t.comment(`Setting up first node...`);
  {
    // 2. Instantiate plugin registry which will provide the web service plugin with the key value storage plugin
    const pluginRegistry = new PluginRegistry({ plugins: [] });

    // 3. Instantiate the web service consortium plugin
    const options: IPluginConsortiumManualOptions = {
      instanceId: uuidV4(),
      pluginRegistry,
      keyPairPem: keyPair1.toPEM(true),
      consortium,
      logLevel: "trace",
    };
    const pluginConsortiumManual = new PluginConsortiumManual(options);

    // 4. Create the API Server object that we embed in this test
    const configService = new ConfigService();
    const apiServerOptions = configService.newExampleConfig();
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = addressInfo1.port;
    apiServerOptions.cockpitPort = 0;
    apiServerOptions.apiTlsEnabled = false;
    const config = configService.newExampleConfigConvict(apiServerOptions);

    pluginRegistry.add(pluginConsortiumManual);

    const apiServer = new ApiServer({
      httpServerApi: httpServer1,
      config: config.getProperties(),
      pluginRegistry,
    });

    // 5. make sure the API server is shut down when the testing if finished.
    test.onFinish(() => apiServer.shutdown());

    // 6. Start the API server which is now listening on port A and it's healthcheck works through the main SDK
    await apiServer.start();

    // 7. Instantiate the main SDK dynamically with whatever port the API server ended up bound to (port 0)
    t.comment(`AddressInfo: ${JSON.stringify(addressInfo1)}`);

    const configuration = new Configuration({ basePath: node1Host });
    const api = new DefaultApi(configuration);
    const res = await api.apiV1PluginsHyperledgerCactusPluginConsortiumManualNodeJwsGet();
    t.ok(res, "API response object is truthy");
    t.equal(res.status, 200, "Node JWS response status code is 200");
    t.ok(res.data, "Node JWS response.body is truthy");
    t.ok(res.data.jws, "Node JWS response.body.jws is truthy");
    const payload = JWS.verify(res.data.jws, keyPair1.toPEM(false));
    t.ok(payload, "Verified Node JWS payload is truthy");
    t.comment(`Node1 JWS Payload: ${JSON.stringify(payload)}`);
  }
  t.comment(`Set up first node OK`);

  t.comment(`Setting up second node...`);
  {
    const pluginRegistry = new PluginRegistry({ plugins: [] });

    const options: IPluginConsortiumManualOptions = {
      instanceId: uuidV4(),
      pluginRegistry,
      keyPairPem: keyPair2.toPEM(true),
      consortium,
      logLevel: "trace",
    };
    const pluginConsortiumManual = new PluginConsortiumManual(options);

    // 4. Create the API Server object that we embed in this test
    const configService = new ConfigService();
    const apiServerOptions = configService.newExampleConfig();
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = addressInfo2.port;
    apiServerOptions.cockpitPort = 0;
    apiServerOptions.apiTlsEnabled = false;
    const config = configService.newExampleConfigConvict(apiServerOptions);

    pluginRegistry.add(pluginConsortiumManual);

    const apiServer = new ApiServer({
      httpServerApi: httpServer2,
      config: config.getProperties(),
      pluginRegistry,
    });

    // 5. make sure the API server is shut down when the testing if finished.
    test.onFinish(() => apiServer.shutdown());

    // 6. Start the API server which is now listening on port A and it's healthcheck works through the main SDK
    await apiServer.start();

    t.comment(`AddressInfo: ${JSON.stringify(addressInfo2)}`);

    const configuration = new Configuration({ basePath: node2Host });
    const api = new DefaultApi(configuration);
    const res = await api.apiV1PluginsHyperledgerCactusPluginConsortiumManualNodeJwsGet();
    t.ok(res, "API response object is truthy");
    t.equal(res.status, 200, "Node JWS response status code is 200");
    t.ok(res.data, "Node2 JWS response.body is truthy");
    t.ok(res.data.jws, "Node JWS response.body.jws is truthy");
    const payload = JWS.verify(res.data.jws, keyPair2.toPEM(false));
    t.ok(payload, "Verified Node JWS payload is truthy");
    t.comment(`Node2 JWS Payload: ${JSON.stringify(payload)}`);
  }
  t.comment(`Set up second node OK`);

  t.comment(`Setting up third node...`);
  {
    // 2. Instantiate plugin registry which will provide the web service plugin with the key value storage plugin
    const pluginRegistry = new PluginRegistry({ plugins: [] });

    // 3. Instantiate the web service consortium plugin
    const options: IPluginConsortiumManualOptions = {
      instanceId: uuidV4(),
      pluginRegistry,
      keyPairPem: keyPair3.toPEM(true),
      consortium,
      logLevel: "trace",
    };
    const pluginConsortiumManual = new PluginConsortiumManual(options);

    // 4. Create the API Server object that we embed in this test
    const configService = new ConfigService();
    const apiServerOptions = configService.newExampleConfig();
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = addressInfo3.port;
    apiServerOptions.cockpitPort = 0;
    apiServerOptions.apiTlsEnabled = false;
    const config = configService.newExampleConfigConvict(apiServerOptions);

    pluginRegistry.add(pluginConsortiumManual);

    const apiServer = new ApiServer({
      httpServerApi: httpServer3,
      config: config.getProperties(),
      pluginRegistry,
    });

    // 5. make sure the API server is shut down when the testing if finished.
    test.onFinish(() => apiServer.shutdown());

    // 6. Start the API server which is now listening on port A and it's healthcheck works through the main SDK
    await apiServer.start();

    // 7. Instantiate the main SDK dynamically with whatever port the API server ended up bound to (port 0)
    t.comment(`AddressInfo: ${JSON.stringify(addressInfo3)}`);

    const configuration = new Configuration({ basePath: node3Host });
    const api = new DefaultApi(configuration);
    const res = await api.apiV1PluginsHyperledgerCactusPluginConsortiumManualNodeJwsGet();
    t.ok(res, "API response object is truthy");
    t.equal(res.status, 200, "Node JWS response status code is 200");
    t.ok(res.data, "Node3 JWS response.body is truthy");
    t.ok(res.data.jws, "Node3 JWS response.body.jws is truthy");
    const payload = JWS.verify(res.data.jws, keyPair3.toPEM(false));
    t.ok(payload, "Verified Node3 JWS payload is truthy");
    t.comment(`Node3 JWS Payload: ${JSON.stringify(payload)}`);
  }
  t.comment(`Set up third node OK`);

  {
    const configuration = new Configuration({ basePath: node3Host });
    const api = new DefaultApi(configuration);
    const res = await api.apiV1PluginsHyperledgerCactusPluginConsortiumManualConsortiumJwsGet();
    t.equal(res.status, 200, "Consortium JWS response status code is 200");
    const getConsortiumJwsResponse = res.data;
    const consortiumJws = getConsortiumJwsResponse.jws;
    t.comment(`Consortium JWS: ${JSON.stringify(consortiumJws, null, 4)}`);
    const payload1 = JWS.verify(consortiumJws, keyPair1.toPEM(false));
    const payload2 = JWS.verify(consortiumJws, keyPair2.toPEM(false));
    const payload3 = JWS.verify(consortiumJws, keyPair3.toPEM(false));
    t.ok(payload1, "Verified Consortium JWS payload1 is truthy");
    t.ok(payload2, "Verified Consortium JWS payload2 is truthy");
    t.ok(payload3, "Verified Consortium JWS payload3 is truthy");

    const wrongKey = await JWK.generate("EC", "secp256k1");
    t.throws(() => JWS.verify(consortiumJws, wrongKey));
  }

  {
    const configuration = new Configuration({ basePath: node2Host });
    const api = new DefaultApi(configuration);
    const res = await api.apiV1PluginsHyperledgerCactusPluginConsortiumManualConsortiumJwsGet();
    t.equal(res.status, 200, "Consortium JWS response status code is 200");
    const getConsortiumJwsResponse = res.data;
    const consortiumJws = getConsortiumJwsResponse.jws;
    t.comment(`Consortium JWS: ${JSON.stringify(consortiumJws, null, 4)}`);
    const payload1 = JWS.verify(consortiumJws, keyPair1.toPEM(false));
    const payload2 = JWS.verify(consortiumJws, keyPair2.toPEM(false));
    const payload3 = JWS.verify(consortiumJws, keyPair3.toPEM(false));
    t.ok(payload1, "Verified Consortium JWS payload1 is truthy");
    t.ok(payload2, "Verified Consortium JWS payload2 is truthy");
    t.ok(payload3, "Verified Consortium JWS payload3 is truthy");

    const wrongKey = await JWK.generate("EC", "secp256k1");
    t.throws(() => JWS.verify(consortiumJws, wrongKey));
  }

  {
    const configuration = new Configuration({ basePath: node1Host });
    const api = new DefaultApi(configuration);
    const res = await api.apiV1PluginsHyperledgerCactusPluginConsortiumManualConsortiumJwsGet();
    t.equal(res.status, 200, "Consortium JWS response status code is 200");
    const getConsortiumJwsResponse = res.data;
    const consortiumJws = getConsortiumJwsResponse.jws;
    t.comment(`Consortium JWS: ${JSON.stringify(consortiumJws, null, 4)}`);
    const payload1 = JWS.verify(consortiumJws, keyPair1.toPEM(false));
    const payload2 = JWS.verify(consortiumJws, keyPair2.toPEM(false));
    const payload3 = JWS.verify(consortiumJws, keyPair3.toPEM(false));
    t.ok(payload1, "Verified Consortium JWS payload1 is truthy");
    t.ok(payload2, "Verified Consortium JWS payload2 is truthy");
    t.ok(payload3, "Verified Consortium JWS payload3 is truthy");

    const wrongKey = await JWK.generate("EC", "secp256k1");
    t.throws(() => JWS.verify(consortiumJws, wrongKey));
    t.comment(JSON.stringify(payload1));
  }

  t.end();
});
