import "jest-extended";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";

import { Bools, IListenOptions, Servers } from "@hyperledger/cactus-common";

import { v4 as uuidv4 } from "uuid";
import { Configuration } from "@hyperledger/cactus-core-api";

import {
  IPluginKeychainMemoryOptions,
  DefaultApi as KeychainMemoryApi,
  PluginKeychainMemory,
} from "../../../main/typescript/public-api";

describe("PluginKeychainMemory", () => {
  let addressInfo: AddressInfo;
  let httpServer: http.Server;
  let expressApp: express.Express;
  beforeAll(async () => {
    expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));

    httpServer = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server: httpServer,
    };
    addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  });

  afterAll(async () => {
    await Servers.shutdown(httpServer);
  });

  it("has a constructor that works with valid parameters", () => {
    expect(
      () =>
        new PluginKeychainMemory({
          instanceId: "a",
          keychainId: "a",
        }),
    ).not.toThrow();
  });

  it("has a constructor that validates the instanceId", () => {
    expect(
      () =>
        new PluginKeychainMemory({
          instanceId: null as unknown as string,
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

  it("has a constructor that validates the keychainId", () => {
    expect(
      () =>
        new PluginKeychainMemory({
          instanceId: "valid-value",
          keychainId: null as unknown as string,
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

  it("has get,set,has,delete ops which alter state as expected", async () => {
    const instanceId = uuidv4();
    const keychainId = uuidv4();

    const options: IPluginKeychainMemoryOptions = {
      instanceId,
      keychainId,
    };
    const plugin = new PluginKeychainMemory(options);

    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;

    const config = new Configuration({ basePath: apiHost });
    const apiClient = new KeychainMemoryApi(config);

    await plugin.registerWebServices(expressApp);

    expect(plugin.getKeychainId()).toBe(options.keychainId);
    expect(plugin.getInstanceId()).toBe(options.instanceId);

    const key1 = uuidv4();
    const value1 = uuidv4();

    const hasPriorRes = await apiClient.hasKeychainEntryV1({ key: key1 });
    expect(hasPriorRes).toBeTruthy();
    expect(hasPriorRes.data).toBeTruthy();
    expect(Bools.isBooleanStrict(hasPriorRes.data.isPresent)).toBeTrue();

    const hasPrior = hasPriorRes.data.isPresent;
    expect(hasPrior).toBeFalse();

    await plugin.set(key1, value1);

    const hasAfter1 = await plugin.has(key1);
    expect(hasAfter1).toBeTrue();

    const valueAfter1 = await plugin.get(key1);
    expect(valueAfter1).toBeTruthy();
    expect(valueAfter1).toEqual(value1);

    await plugin.delete(key1);

    const hasAfterDelete1 = await plugin.has(key1);
    expect(hasAfterDelete1).toBeFalse();

    const key2 = uuidv4();
    const value2 = uuidv4();

    await plugin.set(key2, value2);

    const hasAfter = await plugin.has(key2);
    expect(hasAfter).toBeTrue();

    const valueAfter2 = await plugin.get(key2);
    expect(valueAfter2).toBeTruthy();
    expect(valueAfter2).toEqual(value2);
  });
});
