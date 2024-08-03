import { v4 as internalIpV4 } from "internal-ip";
import {
  Containers,
  LocalStackContainer,
  K_DEFAULT_LOCALSTACK_HTTP_PORT,
} from "@hyperledger/cactus-test-tooling";
import { v4 as uuidv4 } from "uuid";
import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import {
  IPluginKeychainAwsSmOptions,
  PluginKeychainAwsSm,
  AwsCredentialType,
  DefaultApi as KeychainAwsSmApi,
  Configuration,
  SetKeychainEntryRequestV1,
  GetKeychainEntryRequestV1,
  HasKeychainEntryRequestV1,
  DeleteKeychainEntryRequestV1,
} from "../../../../main/typescript/public-api";
import fs from "fs";
import path from "path";
import os from "os";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import {
  installOpenapiValidationMiddleware,
  PluginRegistry,
} from "@hyperledger/cactus-core";
import OAS from "../../../../main/json/openapi.json";
import { AddressInfo } from "net";

const logLevel: LogLevelDesc = "INFO";
const testCase = "cactus-plugin-keychain-aws-sm API";

describe("PluginKeychainAwsSm", () => {
  let localStackContainer: LocalStackContainer;
  let tmpDirPath: string;
  let plugin: PluginKeychainAwsSm;
  let expressApp: express.Express;
  let server: http.Server;
  let apiClient: KeychainAwsSmApi;

  beforeAll(async () => {
    localStackContainer = new LocalStackContainer({ logLevel: logLevel });
    await localStackContainer.start();

    const ci = await Containers.getById(localStackContainer.containerId);
    const localstackIpAddr = await internalIpV4();
    const hostPort = await Containers.getPublicPort(
      K_DEFAULT_LOCALSTACK_HTTP_PORT,
      ci,
    );
    const localstackHost = `http://${localstackIpAddr}:${hostPort}`;

    tmpDirPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cactus-"));
    await fs.promises.writeFile(
      `${tmpDirPath}/credentials`,
      "[default]\naws_secret_access_key = test\naws_access_key_id = test",
      "utf-8",
    );

    const options: IPluginKeychainAwsSmOptions = {
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      pluginRegistry: new PluginRegistry({}),
      awsEndpoint: localstackHost,
      awsRegion: "us-east-1",
      awsProfile: "default",
      awsCredentialType: AwsCredentialType.LocalFile,
      awsCredentialFilePath: `${tmpDirPath}/credentials`,
      logLevel: logLevel,
    };
    plugin = new PluginKeychainAwsSm(options);

    expressApp = express();
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

    const apiConfig = new Configuration({ basePath: apiHost });
    apiClient = new KeychainAwsSmApi(apiConfig);

    await installOpenapiValidationMiddleware({
      logLevel,
      app: expressApp,
      apiSpec: OAS,
    });

    await plugin.getOrCreateWebServices();
    await plugin.registerWebServices(expressApp);
  });

  afterAll(async () => {
    await Servers.shutdown(server);
    await localStackContainer.stop();
    await localStackContainer.destroy();
    fs.promises.rm(tmpDirPath, { recursive: true, force: true });
  });

  const key = uuidv4();
  const value = uuidv4();

  const fSet = "setKeychainEntryV1";
  const fGet = "getKeychainEntryV1";
  const fHas = "hasKeychainEntryV1";
  const fDelete = "deleteKeychainEntryV1";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  test(`${testCase} - ${fSet} - ${cOk}`, async () => {
    const res = await apiClient.setKeychainEntryV1({ key, value });
    expect(res.status).toBe(200);
  });

  test(`${testCase} - ${fGet} - ${cOk}`, async () => {
    const res = await apiClient.getKeychainEntryV1({ key });
    expect(res.status).toBe(200);
    expect(res.data.value).toBe(value);
  });

  test(`${testCase} - ${fHas} - ${cOk}`, async () => {
    const res = await apiClient.hasKeychainEntryV1({ key });
    expect(res.status).toBe(200);
  });

  test(`${testCase} - ${fDelete} - ${cOk}`, async () => {
    const res = await apiClient.deleteKeychainEntryV1({ key });
    expect(res.status).toBe(200);
  });

  test(`${testCase} - ${fSet} - ${cWithoutParams}`, async () => {
    try {
      await apiClient.setKeychainEntryV1({
        value,
      } as SetKeychainEntryRequestV1);
    } catch (e) {
      expect(e.response.status).toBe(400);
      const fields = e.response.data.map((param: any) =>
        param.path.replace("/body/", ""),
      );
      expect(fields.includes("key")).toBeTruthy();
    }
  });

  test(`${testCase} - ${fGet} - ${cWithoutParams}`, async () => {
    try {
      await apiClient.getKeychainEntryV1({} as GetKeychainEntryRequestV1);
    } catch (e) {
      expect(e.response.status).toBe(400);
      const fields = e.response.data.map((param: any) =>
        param.path.replace("/body/", ""),
      );
      expect(fields.includes("key")).toBeTruthy();
    }
  });

  test(`${testCase} - ${fHas} - ${cWithoutParams}`, async () => {
    try {
      await apiClient.hasKeychainEntryV1({} as HasKeychainEntryRequestV1);
    } catch (e) {
      expect(e.response.status).toBe(400);
      const fields = e.response.data.map((param: any) =>
        param.path.replace("/body/", ""),
      );
      expect(fields.includes("key")).toBeTruthy();
    }
  });

  test(`${testCase} - ${fDelete} - ${cWithoutParams}`, async () => {
    try {
      await apiClient.deleteKeychainEntryV1({} as DeleteKeychainEntryRequestV1);
    } catch (e) {
      expect(e.response.status).toBe(400);
      const fields = e.response.data.map((param: any) =>
        param.path.replace("/body/", ""),
      );
      expect(fields.includes("key")).toBeTruthy();
    }
  });

  test(`${testCase} - ${fSet} - ${cInvalidParams}`, async () => {
    try {
      await apiClient.setKeychainEntryV1({
        key,
        value,
        fake: 4,
      } as SetKeychainEntryRequestV1);
    } catch (e) {
      expect(e.response.status).toBe(400);
      const fields = e.response.data.map((param: any) =>
        param.path.replace("/body/", ""),
      );
      expect(fields.includes("fake")).toBeTruthy();
    }
  });

  test(`${testCase} - ${fGet} - ${cInvalidParams}`, async () => {
    try {
      await apiClient.getKeychainEntryV1({
        key,
        fake: 4,
      } as GetKeychainEntryRequestV1);
    } catch (e) {
      expect(e.response.status).toBe(400);
      const fields = e.response.data.map((param: any) =>
        param.path.replace("/body/", ""),
      );
      expect(fields.includes("fake")).toBeTruthy();
    }
  });

  test(`${testCase} - ${fHas} - ${cInvalidParams}`, async () => {
    try {
      await apiClient.hasKeychainEntryV1({
        key,
        fake: 4,
      } as HasKeychainEntryRequestV1);
    } catch (e) {
      expect(e.response.status).toBe(400);
      const fields = e.response.data.map((param: any) =>
        param.path.replace("/body/", ""),
      );
      expect(fields.includes("fake")).toBeTruthy();
    }
  });

  test(`${testCase} - ${fDelete} - ${cInvalidParams}`, async () => {
    try {
      await apiClient.deleteKeychainEntryV1({
        key,
        fake: 4,
      } as DeleteKeychainEntryRequestV1);
    } catch (e) {
      expect(e.response.status).toBe(400);
      const fields = e.response.data.map((param: any) =>
        param.path.replace("/body/", ""),
      );
      expect(fields.includes("fake")).toBeTruthy();
    }
  });
});
