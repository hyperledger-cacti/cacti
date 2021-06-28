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

  const ipfsClientOrOptions = create({
    url: ipfsApiUrl,
  });
  const instanceId = uuidv4();
  const plugin = new PluginObjectStoreIpfs({
    parentDir: `/${uuidv4()}/${uuidv4()}/`,
    logLevel,
    instanceId,
    ipfsClientOrOptions,
  });

  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    backend: new Map(),
    logLevel,
  });

  await plugin.getOrCreateWebServices();
  await plugin.registerWebServices(expressApp);

  const packageName = plugin.getPackageName();
  t.ok(packageName, "packageName truthy OK");

  const theInstanceId = plugin.getInstanceId();
  t.ok(theInstanceId, "theInstanceId truthy OK");
  t.equal(theInstanceId, instanceId, "instanceId === theInstanceId OK");

  const fileId = uuidv4();
  const fileContents = Buffer.from(uuidv4()).toString("base64");

  console.log(fileContents);

  // 172.18.0.8:"port""docker inspect containerId"/api/v1/plugins/@hyperledger/cactus-plugin-object-store-ipfs/set-object

  const res1 = await apiClient.setObjectV1({
    key: fileId,
    value: fileContents,
  });

  //setting the qm hash into the keychain
  await keychainPlugin.set(fileId, (res1.data as any).cidHash);
  console.log(
    "File: " +
      fileId +
      "set into the keychain with the corresponding value: " +
      (res1.data as any).cidHash,
  );

  //getting the qm hash from the keychain
  const keychainGet = await keychainPlugin.get(fileId);
  console.log(keychainGet);

  const res2 = await apiClient.getObjectV1({
    key: fileId,
    //extraArgs: { hashIncluded: true },
  });
  console.log(res2.data.value);

  const res3 = await apiClient.hasObjectV1({ key: fileId });
  console.log(res3);
  console.log(res3.data.key);
  console.log(res3.data.checkedAt);
  console.log(res3.data.isPresent);

  //const res3 = await apiClient.hasObjectV1({ key: key2 });
  //when you set into the ipfs you create a key with the qm hash as the value - when retrieving you simply give the key and it will return the object stored back to you
  //test azure keychain plugin with this - ask Enrique if they have an Azure Secretmanager/keyvault.
  t.end();
});
