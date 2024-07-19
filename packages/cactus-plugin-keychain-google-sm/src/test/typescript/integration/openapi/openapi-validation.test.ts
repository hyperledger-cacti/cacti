import "jest-extended";
import { randomUUID } from "node:crypto";
import http from "http";
import type { AddressInfo } from "net";
import express from "express";
import bodyParser from "body-parser";

import {
  LogLevelDesc,
  IListenOptions,
  Servers,
  hasKey,
} from "@hyperledger/cactus-common";
import { installOpenapiValidationMiddleware } from "@hyperledger/cactus-core";
import { DeleteKeychainEntryRequestV1 } from "@hyperledger/cactus-core-api";
import {
  GetKeychainEntryRequestV1,
  HasKeychainEntryRequestV1,
  SetKeychainEntryRequestV1,
} from "@hyperledger/cactus-core-api";

import { DefaultApi as KeychainGoogleSmApi } from "../../../../main/typescript/generated/openapi/typescript-axios/index";
import { Configuration } from "../../../../main/typescript/generated/openapi/typescript-axios/index";

import { SecretManagerServiceClientMock } from "../../mock/plugin-keychain-google-sm-mock";

import OAS from "../../../../main/json/openapi.json";
import {
  IPluginKeychainGoogleSmOptions,
  PluginKeychainGoogleSm,
} from "../../../../main/typescript/plugin-keychain-google-sm";

const logLevel: LogLevelDesc = "TRACE";

describe("PluginKeychainGoogleSm", () => {
  const key = `${randomUUID()}?${randomUUID()}`;
  const value = randomUUID();

  const fSet = "setKeychainEntryV1";
  const fGet = "getKeychainEntryV1";
  const fHas = "hasKeychainEntryV1";
  const fDelete = "deleteKeychainEntryV1";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

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

  beforeAll(async () => {
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    const configuration = new Configuration({ basePath: apiHost });
    apiClient = new KeychainGoogleSmApi(configuration);

    await installOpenapiValidationMiddleware({
      logLevel,
      app: expressApp,
      apiSpec: OAS,
    });

    await plugin.getOrCreateWebServices();
    await plugin.registerWebServices(expressApp);
  });

  afterAll(async () => await Servers.shutdown(server));

  it(` ${fSet} - ${cOk}`, async () => {
    const res = await apiClient.setKeychainEntryV1({
      key,
      value,
    });
    expect(res.status).toEqual(200);
  });

  it(` ${fGet} - ${cOk}`, async () => {
    const res = await apiClient.getKeychainEntryV1({ key });
    expect(res.status).toEqual(200);
  });

  it(` ${fHas} - ${cOk}`, async () => {
    const res = await apiClient.hasKeychainEntryV1({ key });
    expect(res.status).toEqual(200);
  });

  it(` ${fDelete} - ${cOk}`, async () => {
    const res = await apiClient.deleteKeychainEntryV1({ key });
    expect(res.status).toEqual(200);
  });

  it(` ${fSet} - ${cWithoutParams}`, async () => {
    try {
      await apiClient.setKeychainEntryV1({
        value,
      } as unknown as SetKeychainEntryRequestV1);
    } catch (e) {
      const fields = e.response.data.map((param: unknown) => {
        if (!hasKey(param, "path")) {
          throw new TypeError("Expected param.path to exist.");
        }
        if (typeof param.path !== "string") {
          throw new TypeError("Expected param.path to be string");
        }
        return param.path.replace("/body/", "");
      });

      expect(fields.includes("key")).toBeTrue();
    }
  });

  it(` ${fGet} - ${cWithoutParams}`, async () => {
    try {
      await apiClient.getKeychainEntryV1(
        {} as unknown as GetKeychainEntryRequestV1,
      );
    } catch (e) {
      expect(e.response.status).toEqual(400);
      const fields = e.response.data.map((param: unknown) => {
        if (!hasKey(param, "path")) {
          throw new TypeError("Expected param.path to exist.");
        }
        if (typeof param.path !== "string") {
          throw new TypeError("Expected param.path to be string");
        }
        return param.path.replace("/body/", "");
      });

      expect(fields.includes("key")).toBeTrue();
    }
  });

  it(` ${fHas} - ${cWithoutParams}`, async () => {
    try {
      await apiClient.hasKeychainEntryV1(
        {} as unknown as HasKeychainEntryRequestV1,
      );
    } catch (e) {
      expect(e.response.status).toEqual(400);
      const fields = e.response.data.map((param: unknown) => {
        if (!hasKey(param, "path")) {
          throw new TypeError("Expected param.path to exist.");
        }
        if (typeof param.path !== "string") {
          throw new TypeError("Expected param.path to be string");
        }
        return param.path.replace("/body/", "");
      });

      expect(fields.includes("key")).toBeTrue();
    }
  });

  it(` ${fDelete} - ${cWithoutParams}`, async () => {
    try {
      await apiClient.deleteKeychainEntryV1(
        {} as unknown as DeleteKeychainEntryRequestV1,
      );
    } catch (e) {
      expect(e.response.status).toEqual(400);
      const fields = e.response.data.map((param: unknown) => {
        if (!hasKey(param, "path")) {
          throw new TypeError("Expected param.path to exist.");
        }
        if (typeof param.path !== "string") {
          throw new TypeError("Expected param.path to be string");
        }
        return param.path.replace("/body/", "");
      });

      expect(fields.includes("key")).toBeTrue();
    }
  });

  it(` ${fSet} - ${cInvalidParams}`, async () => {
    try {
      await apiClient.setKeychainEntryV1({
        key,
        value,
        fake: 4,
      } as any as SetKeychainEntryRequestV1);
    } catch (e) {
      expect(e.response.status).toEqual(400);
      const fields = e.response.data.map((param: unknown) => {
        if (!hasKey(param, "path")) {
          throw new TypeError("Expected param.path to exist.");
        }
        if (typeof param.path !== "string") {
          throw new TypeError("Expected param.path to be string");
        }
        return param.path.replace("/body/", "");
      });

      expect(fields.includes("fake")).toBeTrue();
    }
  });

  it(` ${fGet} - ${cInvalidParams}`, async () => {
    try {
      await apiClient.getKeychainEntryV1({
        key,
        fake: 4,
      } as unknown as GetKeychainEntryRequestV1);
    } catch (e) {
      expect(e.response.status).toEqual(400);
      const fields = e.response.data.map((param: unknown) => {
        if (!hasKey(param, "path")) {
          throw new TypeError("Expected param.path to exist.");
        }
        if (typeof param.path !== "string") {
          throw new TypeError("Expected param.path to be string");
        }
        return param.path.replace("/body/", "");
      });

      expect(fields.includes("fake")).toBeTrue();
    }
  });

  it(` ${fHas} - ${cInvalidParams}`, async () => {
    try {
      await apiClient.hasKeychainEntryV1({
        key,
        fake: 4,
      } as unknown as HasKeychainEntryRequestV1);
    } catch (e) {
      expect(e.response.status).toEqual(400);
      const fields = e.response.data.map((param: unknown) => {
        if (!hasKey(param, "path")) {
          throw new TypeError("Expected param.path to exist.");
        }
        if (typeof param.path !== "string") {
          throw new TypeError("Expected param.path to be string");
        }
        return param.path.replace("/body/", "");
      });

      expect(fields.includes("fake")).toBeTrue();
    }
  });

  it(` ${fDelete} - ${cInvalidParams}`, async () => {
    try {
      await apiClient.deleteKeychainEntryV1({
        key,
        fake: 4,
      } as unknown as DeleteKeychainEntryRequestV1);
    } catch (e) {
      expect(e.response.status).toEqual(400);
      const fields = e.response.data.map((param: unknown) => {
        if (!hasKey(param, "path")) {
          throw new TypeError("Expected param.path to exist.");
        }
        if (typeof param.path !== "string") {
          throw new TypeError("Expected param.path to be string");
        }
        return param.path.replace("/body/", "");
      });

      expect(fields.includes("fake")).toBeTrue();
    }
  });
});
