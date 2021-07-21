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
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import { PluginObjectStoreIpfs } from "./typescript";

import { DefaultApi as ObjectStoreIpfsApi } from "./typescript/public-api";

const logLevel: LogLevelDesc = "TRACE";

const expressApp = express();
expressApp.use(bodyParser.json({ limit: "250mb" }));
const server = http.createServer(expressApp);

const expressApp2 = express();
expressApp2.use(bodyParser.json({ limit: "250mb" }));
const server2 = http.createServer(expressApp2);

const listenOptions: IListenOptions = {
  hostname: "0.0.0.0",
  port: 0,
  server,
};

const listenOptions2: IListenOptions = {
  hostname: "0.0.0.0",
  port: 0,
  server: server2,
};

const app = async () => {
  const ipfsContainer = new GoIpfsTestContainer({ logLevel });
  await ipfsContainer.start();
  const ipfsContainer2 = new GoIpfsTestContainer({ logLevel });
  await ipfsContainer2.start();

  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const addressInfo2 = (await Servers.listen(listenOptions2)) as AddressInfo;

  const { address, port } = addressInfo;
  const { address: address2, port: port2 } = addressInfo2;

  const apiHost = `http://${address}:${port}`;
  const apiHost2 = `http://${address2}:${port2}`;

  const config = new Configuration({ basePath: apiHost });
  const config2 = new Configuration({ basePath: apiHost2 });

  const apiClient = new ObjectStoreIpfsApi(config);
  const apiClient2 = new ObjectStoreIpfsApi(config2);

  const ipfsApiUrl = await ipfsContainer.getApiUrl();
  const ipfsApiUrl2 = await ipfsContainer2.getApiUrl();
  const ipfsGatewayUrl = await ipfsContainer.getWebGatewayUrl();
  const ipfsGatewayUrl2 = await ipfsContainer2.getWebGatewayUrl();

  console.log(ipfsApiUrl);
  console.log(ipfsGatewayUrl);
  console.log(ipfsApiUrl2);
  console.log(ipfsGatewayUrl2);

  const ipfsClientOrOptions = create({
    url: ipfsApiUrl,
  });

  const ipfsClientOrOptions2 = create({
    url: ipfsApiUrl2,
  });

  const instanceId = uuidv4();
  const plugin = new PluginObjectStoreIpfs({
    parentDir: `/${uuidv4()}/${uuidv4()}/`,
    logLevel,
    instanceId,
    ipfsClientOrOptions,
  });

  const instanceId2 = uuidv4();
  const plugin2 = new PluginObjectStoreIpfs({
    parentDir: `/${uuidv4()}/${uuidv4()}/`,
    logLevel,
    instanceId: instanceId2,
    ipfsClientOrOptions: ipfsClientOrOptions2,
  });

  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    backend: new Map(),
    logLevel,
  });

  await plugin.getOrCreateWebServices();
  await plugin2.getOrCreateWebServices();

  await plugin.registerWebServices(expressApp);
  await plugin2.registerWebServices(expressApp2);

  const packageName = plugin.getPackageName();
  console.log(packageName);

  const packageName2 = plugin2.getPackageName();
  console.log(packageName2);

  const theInstanceId = plugin.getInstanceId();
  console.log(theInstanceId);

  const theInstanceId2 = plugin2.getInstanceId();
  console.log(theInstanceId2);

  // let ipfsNodes = new Map();

  // ipfsNodes.set()

  const fileId = uuidv4();
  const fileId2 = uuidv4();
  const fileContents = Buffer.from(uuidv4()).toString("base64");
  const fileContents2 = Buffer.from(uuidv4()).toString("base64");

  const res1 = await apiClient.setObjectV1({
    key: fileId,
    value: fileContents,
  });

  await keychainPlugin.set(fileId, res1.data.extraOutput.cidHash);

  const res12 = await apiClient2.setObjectV1({
    key: fileId2,
    value: fileContents2,
  });

  console.log(res12.data.extraOutput.cidHash);

  const res32 = await apiClient.hasObjectV1({ key: fileId2 });
  console.log("res32 = " + res32);
  console.log("res32.data = " + res32.data);
  console.log("res32.data.checkedAt = " + res32.data.checkedAt);
  console.log("res32.data.isPresent = " + res32.data.isPresent);
  console.log("res32.data.key = " + res32.data.key);

  //using key that has only been stored on client 2 on client1
  try {
    await apiClient.getObjectV1({ key: fileId2 });
  } catch (ex) {
    const res22 = ex.response;
    console.log("res22 = " + res22);
    console.log("res22.data = " + res22.data);
    console.log("res22.data.key = " + res22.data.key);
    console.log("res22.data.value = " + res22.data.value);
  }

  const res222 = await apiClient2.hasObjectV1({ key: fileId });
  console.log("res222 = " + res222);
  console.log("res222.data = " + res222.data);
  console.log("res222.data.checkedAt = " + res222.data.checkedAt);
  console.log("res222.data.isPresent = " + res222.data.isPresent);
  console.log("res222.data.key = " + res222.data.key);

  //using key that has only been stored on client 2 on client1
  try {
    await apiClient2.getObjectV1({ key: fileId });
  } catch (ex) {
    const res322 = ex.response;
    console.log("res322 = " + res322);
    console.log("res322.data = " + res322.data);
    console.log("res322.data.key = " + res322.data.key);
    console.log("res322.data.value = " + res322.data.value);
  }

  const res2 = await apiClient.getObjectV1({ key: fileId });
  console.log("res2 = " + res2);
  console.log("res2.data = " + res2.data);
  console.log("res2.data.key = " + res2.data.key);
  console.log("res2.data.value = " + res2.data.value);

  const res3 = await apiClient.hasObjectV1({ key: fileId });
  console.log("res3 = " + res3);
  console.log("res3.data = " + res3.data);
  console.log("res3.data.checkedAt = " + res3.data.checkedAt);
  console.log("res3.data.isPresent = " + res3.data.isPresent);
  console.log("res3.data.key = " + res3.data.key);

  const res4 = await apiClient.removeObjectV1({ key: fileId });
  console.log("res4 = " + res4);
  console.log("res4.data = " + res4.data);
  console.log("res4.data.isRemoved = " + res4.data.isRemoved);
  console.log("res4.data.key = " + res4.data.key);

  const keychainGet = await keychainPlugin.get(fileId);
  console.log("keyChainGet result = " + keychainGet);

  await ipfsContainer.stop();
  await ipfsContainer.destroy();
  await Servers.shutdown(server);

  await ipfsContainer2.stop();
  await ipfsContainer2.destroy();
  await Servers.shutdown(server2);
};

app();
