import test, { Test } from "tape-promise/tape";

import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";

import { IListenOptions, Servers } from "@hyperledger/cactus-common";

import { v4 as internalIpV4 } from "internal-ip";
import {
  Containers,
  LocalStackContainer,
  K_DEFAULT_LOCALSTACK_HTTP_PORT,
} from "@hyperledger/cactus-test-tooling";

import { v4 as uuidv4 } from "uuid";

import { LogLevelDesc } from "@hyperledger/cactus-common";

import {
  IPluginKeychainAwsSmOptions,
  PluginKeychainAwsSm,
  AwsCredentialType,
} from "../../../main/typescript/public-api";

import {
  DefaultApi as KeychainAwsSmApi,
  Configuration,
} from "../../../main/typescript/generated/openapi/typescript-axios/index";

import fs from "fs";
import path from "path";
import os from "os";
import { PluginRegistry } from "@hyperledger/cactus-core";

const logLevel: LogLevelDesc = "TRACE";

test("get,set,has,delete alters state as expected", async (t: Test) => {
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

  // Using awsCredentialType: AwsCredentialType.FromAwsCredentialFile
  {
    // Create aws credential file in a local directory
    let tmpDirPath = "tmpDirPath";
    tmpDirPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cactus-"));
    await fs.promises.writeFile(
      `${tmpDirPath}/credentials`,
      "[default]\naws_secret_access_key = test\naws_access_key_id = test",
      "utf-8",
    );

    const options1: IPluginKeychainAwsSmOptions = {
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
    const plugin1 = new PluginKeychainAwsSm(options1);

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
    const apiClient = new KeychainAwsSmApi(config);

    await plugin1.registerWebServices(expressApp);

    t.equal(plugin1.getKeychainId(), options1.keychainId, "Keychain ID set OK");
    t.equal(plugin1.getInstanceId(), options1.instanceId, "Instance ID set OK");

    const key = uuidv4();
    const value = uuidv4();

    //const hasPrior1 = await plugin1.has(key1);
    //t.false(hasPrior1, "hasPrior1 === false OK");

    const res1 = await apiClient.hasKeychainEntryV1({ key });
    t.true(res1.status >= 200, "res1.status >= 200 OK");
    t.true(res1.status < 300, "res1.status < 300");

    t.ok(res1.data, "res1.data truthy OK");
    t.false(res1.data.isPresent, "res1.data.isPresent === false OK");
    t.ok(res1.data.checkedAt, "res1.data.checkedAt truthy OK");
    t.equal(res1.data.key, key, "res1.data.key === key OK");

    const res2 = await apiClient.setKeychainEntryV1({
      key: key,
      value: value,
    });
    t.true(res2.status >= 200, "res2.status >= 200 OK");
    t.true(res2.status < 300, "res2.status < 300 OK");
    t.notOk(res2.data, "res2.data truthy OK");

    const res3 = await apiClient.hasKeychainEntryV1({ key });
    t.true(res3.status >= 200, "res3.status >= 200 OK");
    t.true(res3.status < 300, "res3.status < 300 OK");
    t.ok(res3.data, "res3.data truthy OK");
    t.true(res3.data.isPresent, "res3.data.isPresent === true OK");
    t.ok(res3.data.checkedAt, "res3.data.checkedAt truthy OK");
    t.equal(res3.data.key, key, "res3.data.key === key OK");

    const res4 = await apiClient.getKeychainEntryV1({
      key: key,
    });
    t.true(res4.status >= 200, "res4.status >= 200 OK");
    t.true(res4.status < 300, "res4.status < 300 OK");
    t.ok(res4.data, "res4.data truthy OK");
    t.equal(res4.data.value, value, "res4.data.value === value OK");

    const res5 = await apiClient.deleteKeychainEntryV1({ key });
    t.true(res5.status >= 200, "res5.status >= 200 OK");
    t.true(res5.status < 300, "res5.status < 300 OK");
    t.notOk(res5.data, "res5.data falsy OK");

    const res6 = await apiClient.hasKeychainEntryV1({ key });
    t.true(res6.status >= 200, "res6.status >= 200 OK");
    t.true(res6.status < 300, "res6.status < 300 OK");
    t.ok(res6.data, "res6.data truthy OK");
    t.false(res6.data.isPresent, "res6.data.isPresent === false OK");
    t.ok(res6.data.checkedAt, "res6.data.checkedAt truthy OK");
    t.equal(res6.data.key, key, "res6.data.key === key OK");

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
  }

  t.end();
});
