import test, { Test } from "tape-promise/tape";
import { v4 as internalIpV4 } from "internal-ip";

import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";

import {
  Containers,
  K_DEFAULT_VAULT_DEV_ROOT_TOKEN,
  K_DEFAULT_VAULT_HTTP_PORT,
  VaultTestServer,
} from "@hyperledger/cactus-test-tooling";

import { v4 as uuidv4 } from "uuid";

import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";

import {
  IPluginKeychainVaultOptions,
  PluginKeychainVault,
} from "../../../main/typescript/public-api";

import { K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT } from "../../../main/typescript/prometheus-exporter/metrics";

import { DefaultApi as KeychainVaultApi } from "../../../main/typescript/public-api";

const logLevel: LogLevelDesc = "TRACE";

test("get,set,has,delete alters state as expected", async (t: Test) => {
  const vaultTestContainer = new VaultTestServer({});
  await vaultTestContainer.start();

  const ci = await Containers.getById(vaultTestContainer.containerId);
  const vaultIpAddr = await internalIpV4();
  const hostPort = await Containers.getPublicPort(
    K_DEFAULT_VAULT_HTTP_PORT,
    ci,
  );
  const vaultHost = `http://${vaultIpAddr}:${hostPort}`;

  test.onFinish(async () => {
    await vaultTestContainer.stop();
    await vaultTestContainer.destroy();
  });

  const options: IPluginKeychainVaultOptions = {
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    endpoint: vaultHost,
    token: K_DEFAULT_VAULT_DEV_ROOT_TOKEN,
    apiVersion: "v1",
    kvSecretsMountPath: "secret/data/",
    logLevel,
  };
  const plugin = new PluginKeychainVault(options);

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
  t.comment(
    `Metrics URL: ${apiHost}/api/v1/plugins/@hyperledger/cactus-plugin-keychain-vault/get-prometheus-exporter-metrics`,
  );
  const apiClient = new KeychainVaultApi({ basePath: apiHost });

  await plugin.installWebServices(expressApp);

  t.equal(plugin.getKeychainId(), options.keychainId, "Keychain ID set OK");
  t.equal(plugin.getInstanceId(), options.instanceId, "Instance ID set OK");

  const key1 = uuidv4();
  const value1 = uuidv4();

  const hasPrior1 = await plugin.has(key1);

  t.false(hasPrior1, "hasPrior === false OK");

  await plugin.set(key1, value1);

  const hasAfter1 = await plugin.has(key1);
  t.true(hasAfter1, "hasAfter === true OK");

  const valueAfter1 = await plugin.get(key1);
  t.ok(valueAfter1, "valueAfter truthy OK");
  t.equal(valueAfter1, value1, "valueAfter === value OK");

  await plugin.delete(key1);

  const hasAfterDelete1 = await plugin.has(key1);
  t.false(hasAfterDelete1, "hasAfterDelete === false OK");

  const valueAfterDelete1 = await plugin.get(key1);
  t.notok(valueAfterDelete1, "valueAfterDelete falsy OK");

  {
    const res = await apiClient.getPrometheusExporterMetricsV1();
    const promMetricsOutput =
      "# HELP " +
      K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT +
      " The number of keys that were set in the backing Vault deployment via this specific keychain plugin instance\n" +
      "# TYPE " +
      K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT +
      " gauge\n" +
      K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT +
      '{type="' +
      K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT +
      '"} 0';
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.true(
      res.data.includes(promMetricsOutput),
      "Total Key Count 0 recorded as expected. RESULT OK",
    );
  }

  const key2 = uuidv4();
  const value2 = uuidv4();

  const hasPrior2 = await plugin.has(key2);

  t.false(hasPrior2, "hasPrior === false OK");

  await plugin.set(key2, value2);

  const hasAfter2 = await plugin.has(key2);
  t.true(hasAfter2, "hasAfter === true OK");

  const valueAfter2 = await plugin.get(key2);
  t.ok(valueAfter2, "valueAfter truthy OK");
  t.equal(valueAfter2, value2, "valueAfter === value OK");

  {
    const res = await apiClient.getPrometheusExporterMetricsV1();
    const promMetricsOutput =
      "# HELP " +
      K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT +
      " The number of keys that were set in the backing Vault deployment via this specific keychain plugin instance\n" +
      "# TYPE " +
      K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT +
      " gauge\n" +
      K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT +
      '{type="' +
      K_CACTUS_KEYCHAIN_VAULT_MANAGED_KEY_COUNT +
      '"} 1';
    t.ok(res);
    t.ok(res.data);
    t.equal(res.status, 200);
    t.true(
      res.data.includes(promMetricsOutput),
      "Total Key Count 1 recorded as expected. RESULT OK",
    );
  }

  t.end();
});

// FIXME: Writing the getExpressRequestHandler() method for
// GetKeychainEntryEndpointV1 and SetKeychainEntryEndpointV1

test.skip("rotateEncryptionKeys() fails fast", async (t: Test) => {
  const options: IPluginKeychainVaultOptions = {
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    endpoint: "http://127.0.0.1:9200",
    token: "root",
  };
  const plugin = new PluginKeychainVault(options);

  const promise = plugin.rotateEncryptionKeys();
  const expected = /not implemented/;
  await t.rejects(promise, expected, "rotateEncryptionKeys() rejects OK");

  t.end();
});

// FIXME: Writing the getExpressRequestHandler() method for
// GetKeychainEntryEndpointV1 and SetKeychainEntryEndpointV1

test.skip("getEncryptionAlgorithm() returns null", (t: Test) => {
  const options: IPluginKeychainVaultOptions = {
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    endpoint: "http://127.0.0.1:9200",
    token: "root",
  };
  const plugin = new PluginKeychainVault(options);

  t.notok(plugin.getEncryptionAlgorithm(), "encryption algorithm falsy OK");

  t.end();
});
