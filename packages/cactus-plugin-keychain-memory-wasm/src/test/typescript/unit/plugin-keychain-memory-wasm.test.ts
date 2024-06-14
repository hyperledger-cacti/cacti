import bodyParser from "body-parser";
import express from "express";
import http from "http";
import "jest-extended";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";

import { Bools, IListenOptions, Servers } from "@hyperledger/cactus-common";

import {
  Configuration,
  DefaultApi as KeychainMemoryApi,
} from "../../../main/typescript/public-api";
import { wasm } from "../../../main/typescript/public-api";

import { PluginKeychainMemoryWasm } from "../../../main/typescript";
import { IPluginKeychainMemoryWasmOptions } from "../../../main/typescript/public-api";

describe("PluginKeychainMemoryWasm", () => {
  let server: http.Server;
  afterAll(async () => {
    await Servers.shutdown(server);
  });
  it("should not throw when creating a valid instance", () => {
    expect(
      () =>
        new PluginKeychainMemoryWasm({
          instanceId: "a",
          keychainId: "a",
          wasmPlugin: {} as PluginKeychainMemoryWasm,
        }),
    ).not.toThrow();
  });

  describe("constructor argument validation", () => {
    it("throws for null or empty instanceId", () => {
      expect(
        () =>
          new PluginKeychainMemoryWasm({
            instanceId: null as unknown as string,
            keychainId: "valid-value",
            wasmPlugin: {} as PluginKeychainMemoryWasm,
          }),
      ).toThrow();
      expect(
        () =>
          new PluginKeychainMemoryWasm({
            instanceId: "",
            keychainId: "valid-value",
            wasmPlugin: {} as PluginKeychainMemoryWasm,
          }),
      ).toThrow();
    });

    it("throws for null or empty keychainId", () => {
      expect(
        () =>
          new PluginKeychainMemoryWasm({
            instanceId: "valid-value",
            keychainId: null as unknown as string,
            wasmPlugin: {} as PluginKeychainMemoryWasm,
          }),
      ).toThrow();
      expect(
        () =>
          new PluginKeychainMemoryWasm({
            instanceId: "valid-value",
            keychainId: "",
            wasmPlugin: {} as PluginKeychainMemoryWasm,
          }),
      ).toThrow();
    });
  });

  it("get, set, has, delete alters state as expected", async () => {
    const instanceId = await uuidv4(); // Assuming uuidv4 is available
    const keychainId = await uuidv4();

    const pluginFactory = await wasm.createPluginFactory();
    const pluginWasm = await pluginFactory.create({
      instanceId,
      keychainId,
    });
    const options: IPluginKeychainMemoryWasmOptions = {
      instanceId,
      keychainId,
      wasmPlugin: pluginWasm,
    };
    const plugin = new PluginKeychainMemoryWasm(options);

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    server = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;

    const config = new Configuration({ basePath: apiHost });
    const apiClient = new KeychainMemoryApi(config);

    await plugin.registerWebServices(expressApp);

    expect(plugin.getKeychainId()).toBe(options.keychainId);
    expect(plugin.getInstanceId()).toBe(options.instanceId);

    const key1 = await uuidv4();
    const value1 = await uuidv4();

    const hasPriorRes = await apiClient.hasKeychainEntryV1({ key: key1 });
    expect(hasPriorRes).toBeTruthy();
    expect(hasPriorRes.data).toBeTruthy();
    expect(Bools.isBooleanStrict(hasPriorRes.data.isPresent)).toBeTrue();

    expect(hasPriorRes.data.isPresent).toBeFalsy();

    await plugin.set(key1, value1);

    expect(await plugin.has(key1)).toBeTruthy();

    const valueAfter1 = await plugin.get(key1);
    expect(valueAfter1).toBeTruthy();
    expect(valueAfter1).toBe(value1);

    await plugin.delete(key1);

    expect(await plugin.has(key1)).toBeFalsy();

    const key2 = await uuidv4();
    const value2 = await uuidv4();

    await plugin.set(key2, value2);

    expect(await plugin.has(key2)).toBeTruthy();

    const valueAfter2 = await plugin.get(key2);
    expect(valueAfter2).toBeTruthy();
    expect(valueAfter2).toBe(value2);
  });
});
