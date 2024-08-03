import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import { AddressInfo } from "net";
import { v4 as uuidv4 } from "uuid";

import "jest-extended";
import express from "express";
import bodyParser from "body-parser";
import { v4 as internalIpV4 } from "internal-ip";

import {
  IListenOptions,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  installOpenapiValidationMiddleware,
  PluginRegistry,
} from "@hyperledger/cactus-core";

import {
  Containers,
  LocalStackContainer,
  K_DEFAULT_LOCALSTACK_HTTP_PORT,
} from "@hyperledger/cactus-test-tooling";

import OAS from "../../../main/json/openapi.json";
import {
  IPluginKeychainAwsSmOptions,
  PluginKeychainAwsSm,
  AwsCredentialType,
} from "../../../main/typescript/plugin-keychain-aws-sm";
import {
  DefaultApi as KeychainAwsSmApi,
  Configuration,
} from "../../../main/typescript/generated/openapi/typescript-axios/index";
import { K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT } from "../../../main/typescript/prometheus-exporter/metrics";

const logLevel: LogLevelDesc = "TRACE";

describe("PluginKeychainAwsSm", () => {
  const key = uuidv4();
  const value = uuidv4();
  const keychainId = uuidv4();
  const instanceId = uuidv4();
  const log = LoggerProvider.getOrCreate({
    label: "plugin-keychain-aws-sm.test.ts",
    level: logLevel,
  });
  let apiHost: string;
  let localStackContainer: LocalStackContainer;
  let localstackHost: string;
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
    localstackHost = `http://${localstackIpAddr}:${hostPort}`;
    log.info("LocalStack host: %s", localstackHost);

    tmpDirPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cacti-"));
    await fs.promises.writeFile(
      `${tmpDirPath}/credentials`,
      "[default]\naws_secret_access_key = test\naws_access_key_id = test",
      "utf-8",
    );

    const options: IPluginKeychainAwsSmOptions = {
      instanceId,
      keychainId,
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
    apiHost = `http://${address}:${port}`;

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

  test("get,set,has,delete alters state as expected", async () => {
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

      const metricsPath =
        OAS.paths[
          "/api/v1/plugins/@hyperledger/cactus-plugin-keychain-aws-sm/get-prometheus-exporter-metrics"
        ].get["x-hyperledger-cacti"].http.path;
      const metricsUrl = `${apiHost}${metricsPath}`;

      log.debug(`Metrics URL: ${metricsUrl}`);

      await plugin.registerWebServices(expressApp);

      expect(plugin.getKeychainId()).toEqual(keychainId);
      expect(plugin.getInstanceId()).toEqual(instanceId);

      const res1 = await apiClient.hasKeychainEntryV1({ key });
      expect(res1.status).toBeGreaterThanOrEqual(200);
      expect(res1.status).toBeLessThan(300);
      expect(res1.data).toBeTruthy();
      expect(res1.data).not.toBeEmptyObject();
      expect(res1.data.isPresent).toBeFalse();
      expect(res1.data.checkedAt).toBeTruthy();
      expect(res1.data.key).toEqual(key);

      const res2 = await apiClient.setKeychainEntryV1({
        key: key,
        value: value,
      });
      expect(res2.status).toBeGreaterThanOrEqual(200);
      expect(res2.status).toBeLessThan(300);
      expect(res2.data).toBeFalsy();

      const res3 = await apiClient.hasKeychainEntryV1({ key });

      expect(res3.status).toBeGreaterThanOrEqual(200);
      expect(res3.status).toBeLessThan(300);
      expect(res3.data).toBeTruthy();
      expect(res3.data).not.toBeEmptyObject();
      expect(res3.data.isPresent).toBeTrue();
      expect(res3.data.checkedAt).toBeTruthy();
      expect(res3.data.key).toEqual(key);

      const res3_5 = await apiClient.getPrometheusMetricsV1();
      const metricsData1 =
        "# HELP " +
        K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT +
        " The number of keys that were set in the backing Aws Secret Manager deployment via this specific keychain plugin instance\n" +
        "# TYPE " +
        K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT +
        " gauge\n" +
        K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT +
        '{type="' +
        K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT +
        '"} 1';

      expect(res3_5.status).toBeGreaterThanOrEqual(200);
      expect(res3_5.status).toBeLessThan(300);
      expect(res3_5.data).toBeTruthy();
      expect(res3_5.data).toMatch(metricsData1);

      const res4 = await apiClient.getKeychainEntryV1({
        key: key,
      });

      expect(res4.status).toBeGreaterThanOrEqual(200);
      expect(res4.status).toBeLessThan(300);
      expect(res4.data).toBeTruthy();
      expect(res4.data).not.toBeEmptyObject();
      expect(res4.data.value).toEqual(value);

      const res5 = await apiClient.deleteKeychainEntryV1({ key });

      expect(res5.status).toBeGreaterThanOrEqual(200);
      expect(res5.status).toBeLessThan(300);
      expect(res5.data).toBeFalsy();

      const res6 = await apiClient.hasKeychainEntryV1({ key });

      expect(res6.status).toBeGreaterThanOrEqual(200);
      expect(res6.status).toBeLessThan(300);
      expect(res6.data).toBeTruthy();
      expect(res6.data).not.toBeEmptyObject();
      expect(res6.data.isPresent).toBeFalse();
      expect(res6.data.checkedAt).toBeTruthy();
      expect(res6.data.key).toEqual(key);

      const res7 = await apiClient.getPrometheusMetricsV1();
      const metricsData2 =
        "# HELP " +
        K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT +
        " The number of keys that were set in the backing Aws Secret Manager deployment via this specific keychain plugin instance\n" +
        "# TYPE " +
        K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT +
        " gauge\n" +
        K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT +
        '{type="' +
        K_CACTUS_KEYCHAIN_AWSSM_MANAGED_KEY_COUNT +
        '"} 0';
      expect(res7.status).toBeGreaterThanOrEqual(200);
      expect(res7.status).toBeLessThan(300);
      expect(res7.data).toBeTruthy();
      expect(res7.data).toMatch(metricsData2);

      const deletionOfNonExistentKey = apiClient.getKeychainEntryV1({ key });
      await expect(deletionOfNonExistentKey).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 404,
          data: expect.objectContaining({
            error: expect.stringContaining(key),
          }),
        }),
      });
    }
  });
});
