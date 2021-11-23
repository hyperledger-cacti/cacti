import test, { Test } from "tape-promise/tape";
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

const logLevel: LogLevelDesc = "TRACE";
const testCase = "cactus-plugin-keychain-aws-sm API";

test(testCase, async (t: Test) => {
  const localStackContainer = new LocalStackContainer({
    logLevel: logLevel,
  });
  await localStackContainer.start();

  const ci = await Containers.getById(localStackContainer.containerId);
  const localstackIpAddr = await internalIpV4();
  const hostPort = await Containers.getPublicPort(
    K_DEFAULT_LOCALSTACK_HTTP_PORT,
    ci,
  );
  const localstackHost = `http://${localstackIpAddr}:${hostPort}`;

  test.onFinish(async () => {
    await localStackContainer.stop();
    await localStackContainer.destroy();
  });

  let tmpDirPath = "tmpDirPath";
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
  const plugin = new PluginKeychainAwsSm(options);

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

  const apiConfig = new Configuration({ basePath: apiHost });
  const apiClient = new KeychainAwsSmApi(apiConfig);

  await installOpenapiValidationMiddleware({
    logLevel,
    app: expressApp,
    apiSpec: OAS,
  });

  await plugin.getOrCreateWebServices();
  await plugin.registerWebServices(expressApp);

  const key = uuidv4();
  const value = uuidv4();

  const fSet = "setKeychainEntryV1";
  const fGet = "getKeychainEntryV1";
  const fHas = "hasKeychainEntryV1";
  const fDelete = "deleteKeychainEntryV1";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  test(`${testCase} - ${fSet} - ${cOk}`, async (t2: Test) => {
    const res = await apiClient.setKeychainEntryV1({
      key,
      value,
    });
    t2.equal(res.status, 200, `Endpoint ${fSet}: response.status === 200 OK`);
    t2.end();
  });

  test(`${testCase} - ${fGet} - ${cOk}`, async (t2: Test) => {
    const res = await apiClient.getKeychainEntryV1({ key });
    t2.equal(res.status, 200, `Endpoint ${fGet}: response.status === 200 OK`);
    t2.equal(res.data.value, value, "response.data.value === value1");
    t2.end();
  });

  test(`${testCase} - ${fHas} - ${cOk}`, async (t2: Test) => {
    const res = await apiClient.hasKeychainEntryV1({ key });
    t2.equal(res.status, 200, `Endpoint ${fHas}: response.status === 200 OK`);
    t2.end();
  });

  test(`${testCase} - ${fDelete} - ${cOk}`, async (t2: Test) => {
    const res = await apiClient.deleteKeychainEntryV1({ key });
    t2.equal(
      res.status,
      200,
      `Endpoint ${fDelete}: response.status === 200 OK`,
    );
    t2.end();
  });

  test(`${testCase} - ${fSet} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      await apiClient.setKeychainEntryV1(({
        value: value,
      } as any) as SetKeychainEntryRequestV1);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fSet} without required key: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(fields.includes("key"), "Rejected because key is required");
    }
    t2.end();
  });

  test(`${testCase} - ${fGet} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      await apiClient.getKeychainEntryV1(
        ({} as any) as GetKeychainEntryRequestV1,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fGet} without required key: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(fields.includes("key"), "Rejected because key is required");
    }
    t2.end();
  });

  test(`${testCase} - ${fHas} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      await apiClient.hasKeychainEntryV1(
        ({} as any) as HasKeychainEntryRequestV1,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fHas} without required key: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(fields.includes("key"), "Rejected because key is required");
    }
    t2.end();
  });

  test(`${testCase} - ${fDelete} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      await apiClient.deleteKeychainEntryV1(
        ({} as any) as DeleteKeychainEntryRequestV1,
      );
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fDelete} without required key: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(fields.includes("key"), "Rejected because key is required");
    }
    t2.end();
  });

  test(`${testCase} - ${fSet} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      await apiClient.setKeychainEntryV1(({
        key,
        value,
        fake: 4,
      } as any) as SetKeychainEntryRequestV1);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fSet} with fake=4: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fGet} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      await apiClient.getKeychainEntryV1(({
        key,
        fake: 4,
      } as any) as GetKeychainEntryRequestV1);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fGet} with fake=4: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fHas} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      await apiClient.hasKeychainEntryV1(({
        key,
        fake: 4,
      } as any) as HasKeychainEntryRequestV1);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fHas} with fake=4: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fDelete} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      await apiClient.deleteKeychainEntryV1(({
        key,
        fake: 4,
      } as any) as DeleteKeychainEntryRequestV1);
    } catch (e) {
      t2.equal(
        e.response.status,
        400,
        `Endpoint ${fDelete} with fake=4: response.status === 400 OK`,
      );
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }
    t2.end();
  });

  t.end();
});
