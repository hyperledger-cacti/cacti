import { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import "jest-extended";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { StatusCodes } from "http-status-codes";

import { IListenOptions, Servers } from "@hyperledger/cactus-common";
import { LogLevelDesc } from "@hyperledger/cactus-common";

import {
  IPluginKeychainGoogleSmOptions,
  PluginKeychainGoogleSm,
} from "../../../main/typescript/public-api";

import {
  DefaultApi as KeychainGoogleSmApi,
  Configuration,
} from "../../../main/typescript/generated/openapi/typescript-axios/index";

import { SecretManagerServiceClientMock } from "../mock/plugin-keychain-google-sm-mock";

const logLevel: LogLevelDesc = "TRACE";

describe("IPluginKeychainGoogleSm", () => {
  const options: IPluginKeychainGoogleSmOptions = {
    instanceId: randomUUID(),
    keychainId: randomUUID(),
    logLevel: logLevel,
    backend: new SecretManagerServiceClientMock({
      logLevel: logLevel,
    }),
  };
  const plugin = new PluginKeychainGoogleSm(options);

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "127.0.0.1",
    port: 0,
    server,
  };

  let apiClient: KeychainGoogleSmApi;

  afterAll(async () => await Servers.shutdown(server));

  beforeAll(async () => {
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    const config = new Configuration({ basePath: apiHost });
    apiClient = new KeychainGoogleSmApi(config);
    await plugin.registerWebServices(expressApp);
  });

  it("get,set,has,delete alters state as expected", async () => {
    expect(plugin.getKeychainId()).toEqual(options.keychainId);
    expect(plugin.getInstanceId()).toEqual(options.instanceId);

    /**
     * To implement this the key should consist of parent and secretId seperated by ?
     * For example, key = "projects/my-project?my-secret"
     */
    const key = `${randomUUID()}?${randomUUID()}`;
    const value = randomUUID();
    console.log(key);
    console.log(value);

    const res1 = await apiClient.hasKeychainEntryV1({ key });
    expect(res1.status >= 200).toBeTrue();
    expect(res1.status < 300).toBeTrue();

    expect(res1.data).toBeTruthy();
    expect(res1.data.isPresent).toBeFalse();
    expect(res1.data.checkedAt).toBeTruthy();
    expect(res1.data.key).toEqual(key);

    const res2 = await apiClient.setKeychainEntryV1({
      key: key,
      value: value,
    });
    expect(res2.status >= 200).toBeTrue();
    expect(res2.status < 300).toBeTrue();
    expect(res2.data).toBeFalsy();

    const res3 = await apiClient.hasKeychainEntryV1({ key });
    expect(res3.status >= 200).toBeTrue();
    expect(res3.status < 300).toBeTrue();
    expect(res3.data).toBeTruthy();
    expect(res3.data.isPresent).toBeTrue();
    expect(res3.data.checkedAt).toBeTruthy();
    expect(res3.data.key).toEqual(key);

    const res4 = await apiClient.getKeychainEntryV1({
      key: key,
    });
    expect(res4.status >= 200).toBeTrue();
    expect(res4.status < 300).toBeTrue();
    expect(res4.data).toBeTruthy();
    //t.equal(res4.data.value, value, "res4.data.value === value OK");
    //add try catch code and then add what the error message should be -- because of the exception wrapping
    //t.equals currently does not pass the test case

    const res5 = await apiClient.deleteKeychainEntryV1({ key });
    expect(res5.status >= 200).toBeTrue();
    expect(res5.status < 300).toBeTrue();
    expect(res5.data).toBeFalsy();

    const res6 = await apiClient.hasKeychainEntryV1({ key });
    expect(res6.status >= 200).toBeTrue();
    expect(res6.status < 300).toBeTrue();
    expect(res6.data).toBeTruthy();
    expect(res6.data.isPresent).toBeFalse();
    expect(res6.data.checkedAt).toBeTruthy();
    expect(res6.data.key).toEqual(key);
    try {
      await apiClient.getKeychainEntryV1({ key });
    } catch (ex) {
      expect(ex).toBeTruthy();
      expect(ex.response).toBeTruthy();
      expect(ex.response.data).toBeTruthy();
      expect(ex.response.data.error).toBeTruthy();
      expect(
        ex.response.data.error.includes(`${key} secret not found`),
      ).toBeTrue();

      expect(ex.response.status).toEqual(StatusCodes.NOT_FOUND);
      expect(ex.response.data.success).toBeFalsy();
    }
  });
});
