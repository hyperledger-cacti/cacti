import test, { Test } from "tape-promise/tape";

import { create } from "ipfs-http-client";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import type { AddressInfo } from "net";

import { v4 as uuidv4 } from "uuid";

import { IListenOptions, Servers } from "@hyperledger/cactus-common";
import type { LogLevelDesc } from "@hyperledger/cactus-common";
import { Configuration } from "@hyperledger/cactus-core-api";
import { GoIpfsTestContainer } from "@hyperledger/cactus-test-tooling";
import { Containers } from "@hyperledger/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import { PluginObjectStoreIpfs } from "../../../main/typescript";

import { DefaultApi as ObjectStoreIpfsApi } from "../../../main/typescript/public-api";
import { PluginRegistry } from "@hyperledger/cactus-core";

const logLevel: LogLevelDesc = "TRACE";
const testCase = "can work with go-ipfs container get/set/has operations";

test(testCase, async (t: Test) => {
  test.onFailure(async () => {
    await Containers.logDiagnostics({ logLevel });
  });
  test.onFinish(async () => {
    await ipfsContainer.stop();
    await ipfsContainer.destroy();
  });
  const ipfsContainer = new GoIpfsTestContainer({ logLevel });
  t.ok(ipfsContainer, "GoIpfsTestContainer instance truthy OK");

  const container = await ipfsContainer.start();
  t.ok(container, "Container returned by start() truthy OK");
  t.ok(container, "Started GoIpfsTestContainer OK");

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "0.0.0.0",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(server));
  const { address, port } = addressInfo;
  const apiHost = `http://${address}:${port}`;

  const config = new Configuration({ basePath: apiHost });
  const apiClient = new ObjectStoreIpfsApi(config);
  t.ok(apiClient, "ObjectStoreIpfsApi truthy OK");

  const ipfsApiUrl = await ipfsContainer.getApiUrl();
  const ipfsGatewayUrl = await ipfsContainer.getWebGatewayUrl();
  t.comment(`Go IPFS Test Container API URL: ${ipfsApiUrl}`);
  t.comment(`Go IPFS Test Container Gateway URL: ${ipfsGatewayUrl}`);

  const pluginRegistry = new PluginRegistry();

  const ipfsClientOrOptions = create({
    url: ipfsApiUrl,
  });
  const instanceId = uuidv4();
  const plugin = new PluginObjectStoreIpfs({
    parentDir: `/${uuidv4()}/${uuidv4()}/`,
    logLevel,
    instanceId,
    ipfsClientOrOptions,
    pluginRegistry,
  });

  const keychainEntryKey = uuidv4();
  const key2 = uuidv4();
  const keychainEntryValue = Buffer.from(uuidv4()).toString("base64");
  const value2 = Buffer.from(uuidv4()).toString("base64");

  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    backend: new Map([[keychainEntryKey, keychainEntryValue]]),
    logLevel,
  });

  pluginRegistry.add(keychainPlugin);

  await keychainPlugin.set(key2, value2);

  console.log("VALUE 2 ===== " + value2);
  const tested = await keychainPlugin.get(key2);
  console.log("Keychain.get(key2) ===== " + tested);

  await plugin.getOrCreateWebServices();
  await plugin.registerWebServices(expressApp);

  const packageName = plugin.getPackageName();
  t.ok(packageName, "packageName truthy OK");

  const theInstanceId = plugin.getInstanceId();
  t.ok(theInstanceId, "theInstanceId truthy OK");
  t.equal(theInstanceId, instanceId, "instanceId === theInstanceId OK");

  const res1 = await apiClient.setObjectV1({ key: key2, value: value2 });
  console.log("2 " + res1.status);
  console.log("3 " + JSON.stringify(res1.data));
  console.log("4 " + res1.data.key);
  console.log("=======================");

  const res2 = await apiClient.getObjectV1({ key: key2 });
  console.log("2 " + res2.status);
  console.log("3 " + JSON.stringify(res2.data));
  console.log("4 " + res2.data.key);
  console.log("=======================");

  const res3 = await apiClient.hasObjectV1({ key: key2 });
  console.log("2 " + res3.status);
  console.log("3 " + JSON.stringify(res3.data));
  console.log("4 " + res3.data.key);
  //when you set into the ipfs you create a key with the qm hash as the value - when retrieving you simply give the key and it will return the object stored back to you
});
