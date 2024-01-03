import express from "express";
import "jest-extended";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";

import { IListenOptions, Servers } from "@hyperledger/cactus-common";

import { v4 as uuidv4 } from "uuid";
import {
  IPluginKeychainMemoryOptions,
  PluginKeychainMemory,
} from "../../../main/typescript";

import { K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT } from "../../../main/typescript/prometheus-exporter/metrics";

import { DefaultApi as KeychainMemoryApi } from "../../../main/typescript/public-api";
import { Configuration } from "@hyperledger/cactus-core-api";

const testcase = "PluginKeychainMemory";
describe(testcase, () => {
  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
    server,
  };
  afterAll(async () => await Servers.shutdown(server));

  expect(
    () => new PluginKeychainMemory({ instanceId: "a", keychainId: "a" }),
  ).not.toThrow();

  test("Validates constructor arg instanceId", () => {
    expect(
      () =>
        new PluginKeychainMemory({
          instanceId: null as any,
          keychainId: "valid-value",
        }),
    ).toThrow();
    expect(
      () =>
        new PluginKeychainMemory({
          instanceId: "",
          keychainId: "valid-value",
        }),
    ).toThrow();
  });

  test("Validates constructor arg keychainId", () => {
    expect(
      () =>
        new PluginKeychainMemory({
          instanceId: "valid-value",
          keychainId: null as any,
        }),
    ).toThrow();
    expect(
      () =>
        new PluginKeychainMemory({
          instanceId: "valid-value",
          keychainId: "",
        }),
    ).toThrow();
  });

  test("get,set,has,delete alters state as expected", async () => {
    const options: IPluginKeychainMemoryOptions = {
      instanceId: uuidv4(),
      keychainId: uuidv4(),
    };
    const plugin = new PluginKeychainMemory(options);

    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    const config = new Configuration({ basePath: apiHost });
    const apiClient = new KeychainMemoryApi(config);

    await plugin.getOrCreateWebServices();
    await plugin.registerWebServices(expressApp);

    expect(plugin.getKeychainId()).toBe(options.keychainId);
    expect(plugin.getInstanceId()).toBe(options.instanceId);

    const key1 = uuidv4();
    const value1 = uuidv4();

    const hasPrior = await plugin.has(key1);
    expect(hasPrior).toBe(false);

    await plugin.set(key1, value1);

    const hasAfter1 = await plugin.has(key1);
    expect(hasAfter1).toBe(true);

    const valueAfter1 = await plugin.get(key1);
    expect(valueAfter1).toBeTruthy();
    expect(valueAfter1).toBe(value1);

    await plugin.delete(key1);

    const hasAfterDelete1 = await plugin.has(key1);
    expect(hasAfterDelete1).not.toBeTruthy();
    await expect(plugin.get(key1)).not.toResolve();

    {
      const res = await apiClient.getPrometheusMetricsV1();
      const promMetricsOutput =
        "# HELP " +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        " Total keys present in memory\n" +
        "# TYPE " +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        " gauge\n" +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        '{type="' +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        '"} 0';
      expect(res);
      expect(res.data);
      expect(res.status).toEqual(200);
      expect(res.data.includes(promMetricsOutput)).toBe(true);
    }

    const key2 = uuidv4();
    const value2 = uuidv4();

    await plugin.set(key2, value2);

    const hasAfter = await plugin.has(key2);
    expect(hasAfter).toBe(true);

    const valueAfter2 = await plugin.get(key2);
    expect(valueAfter2).toBeTruthy();
    expect(valueAfter2).toEqual(value2);
    {
      const res = await apiClient.getPrometheusMetricsV1();
      const promMetricsOutput =
        "# HELP " +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        " Total keys present in memory\n" +
        "# TYPE " +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        " gauge\n" +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        '{type="' +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        '"} 1';
      expect(res);
      expect(res.data);
      expect(res.status).toEqual(200);
      expect(res.data.includes(promMetricsOutput)).toBe(true);
    }
  });
});
