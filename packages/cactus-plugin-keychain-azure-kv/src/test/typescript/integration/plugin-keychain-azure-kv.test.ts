import http from "http";
import type { AddressInfo } from "net";

import test, { Test } from "tape-promise/tape";

import express from "express";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";

import { IListenOptions } from "@hyperledger/cactus-common";
import { LogLevelDesc, Servers } from "@hyperledger/cactus-common";

import {
  Configuration,
  DefaultApi as KeychainAzureKvApi,
  IPluginKeychainAzureKvOptions,
  PluginKeychainAzureKv,
} from "../../../main/typescript/public-api";

import { SecretClientMock } from "../mock/plugin-keychain-azure-kv-mock";

const logLevel: LogLevelDesc = "TRACE";

test("get,set,has,delete alters state as expected for AzureCredentialType.InMemory", async (t: Test) => {
  const options: IPluginKeychainAzureKvOptions = {
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    logLevel: logLevel,
    azureEndpoint: "testEndpoint",
    backend: new SecretClientMock({
      azureKvUrl: "testUrl",
      logLevel: logLevel,
    }),
  };
  const plugin = new PluginKeychainAzureKv(options);

  t.equal(plugin.getKeychainId(), options.keychainId, "Keychain ID set OK");
  t.equal(plugin.getInstanceId(), options.instanceId, "Instance ID set OK");

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  test.onFinish(async () => await Servers.shutdown(server));
  const { address, port } = addressInfo;
  const apiHost = `http://${address}:${port}`;

  const configuration = new Configuration({ basePath: apiHost });
  const apiClient = new KeychainAzureKvApi(configuration);

  await plugin.registerWebServices(expressApp);

  const key = uuidv4();
  const value = uuidv4();

  const res1 = await apiClient.hasKeychainEntryV1({ key });
  t.true(res1.status >= 200, "res1.status >= 200 OK");
  t.true(res1.status < 300, "res1.status < 300 OK");

  // FIXME: make it so that the hasKeychainEntryV1 endpoint returns the
  // response object as defined by the openapi.json in core-api
  // (remember that we have a pending pull request for applying those changes
  // in the main line so there's a dependency between pull requests here at play)
  t.ok(res1.data, "res1.data truthy OK");
  t.false(res1.data.isPresent, "res1.data.isPresent === false OK");
  t.ok(res1.data.checkedAt, "res1.data.checkedAt truthy OK");
  t.equal(res1.data.key, key, "res1.data.key === key OK");

  const res2 = await apiClient.setKeychainEntryV1({ key, value });
  t.true(res2.status >= 200, "res2.status >= 200 OK");
  t.true(res2.status < 300, "res2.status < 300 OK");
  t.notOk(res2.data, "res2.data truthy OK");

  // const hasAfter = await plugin.has(key);
  // t.true(hasAfter, "hasAfter === true OK");

  const res3 = await apiClient.hasKeychainEntryV1({ key });
  t.true(res3.status >= 200, "res3.status >= 200 OK");
  t.true(res3.status < 300, "res3.status < 300 OK");

  // FIXME: make it so that the hasKeychainEntryV1 endpoint returns the
  // response object as defined by the openapi.json in core-api
  // (remember that we have a pending pull request for applying those changes
  // in the main line so there's a dependency between pull requests here at play)
  t.ok(res3.data, "res3.data truthy OK");
  t.true(res3.data.isPresent, "res3.data.isPresent === true OK");
  t.ok(res3.data.checkedAt, "res3.data.checkedAt truthy OK");
  t.equal(res3.data.key, key, "res3.data.key === key OK");

  const res4 = await apiClient.getKeychainEntryV1({ key });
  t.true(res4.status >= 200, "res4.status >= 200 OK");
  t.true(res4.status < 300, "res4.status < 300 OK");
  t.ok(res4.data, "res4.data truthy OK");
  t.equal(res4.data.value, value, "res4.data.value === value OK");

  // await plugin.delete(key);

  const res5 = await apiClient.deleteKeychainEntryV1({ key });
  t.true(res5.status >= 200, "res5.status >= 200 OK");
  t.true(res5.status < 300, "res5.status < 300 OK");
  t.notOk(res5.data, "res5.data falsy OK");

  const res6 = await apiClient.hasKeychainEntryV1({ key });
  t.true(res6.status >= 200, "res6.status >= 200 OK");
  t.true(res6.status < 300, "res6.status < 300 OK");

  // FIXME: make it so that the hasKeychainEntryV1 endpoint returns the
  // response object as defined by the openapi.json in core-api
  // (remember that we have a pending pull request for applying those changes
  // in the main line so there's a dependency between pull requests here at play)
  t.ok(res6.data, "res6.data truthy OK");
  t.false(res6.data.isPresent, "res6.data.isPresent === false OK");
  t.ok(res6.data.checkedAt, "res6.data.checkedAt truthy OK");
  t.equal(res6.data.key, key, "res6.data.key === key OK");

  // const valueAfterDelete = plugin.get(key);
  // const regExp = new RegExp(/secret not found*/);
  // const rejectMsg = "valueAfterDelete === throws OK";
  // await t.rejects(valueAfterDelete, regExp, rejectMsg);

  try {
    await apiClient.getKeychainEntryV1({ key });
    t.fail(
      "Failing because getKeychainEntryV1 did not throw when called with non-existent key.",
    );
  } catch (ex) {
    t.ok(ex, "res7 -> ex truthy");
    const res7 = ex.response;
    t.equal(res7.status, 404, "res7.status === 404 OK");
    t.ok(res7.data, "res7.data truthy OK");
    t.ok(res7.data.error, "res7.data.error truthy OK");
    t.equal(typeof res7.data.error, "string", "res7.data.error truthy OK");
    t.true(
      res7.data.error.includes(`${key} secret not found`),
      "res7.data.error contains legible error message about missing key OK",
    );
  }

  t.end();
});
