import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import test, { Test } from "tape-promise/tape";
import { PluginFactoryKeychain } from "../../../main/typescript/plugin-factory-keychain";
import {
  AzureCredentialType,
  PluginKeychainAzureKv,
} from "../../../main/typescript/plugin-keychain-azure-kv";
import { v4 as uuidv4 } from "uuid";

test("get,set,has,delete alters state as expected", async (t: Test) => {
  const iPluginFactoryOptions1: IPluginFactoryOptions = {
    pluginImportType: PluginImportType.Local,
  };

  const invalid: IPluginFactoryOptions = {
    pluginImportType: (null as unknown) as PluginImportType,
  };

  const pluginRegistry = new PluginRegistry();
  const iPluginKeychainAzureKvOptions = {
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    pluginRegistry,
    azureEndpoint: "true",
    azureRegion: "us-east-1",
    azureProfile: "default",
    azureCredentialType: AzureCredentialType.InMemory,
    azureAccessKeyId: "fake",
    azureSecretAccessKey: "fake",
    logLevel: "TRACE",
  };

  const pluginFactoryKeychain1 = new PluginFactoryKeychain(
    iPluginFactoryOptions1,
  );

  const pluginFactoryKeychain3 = new PluginFactoryKeychain(invalid);

  const pluginKeychainAzureKv = await pluginFactoryKeychain1.create(
    iPluginKeychainAzureKvOptions,
  );

  t.true(
    pluginKeychainAzureKv instanceof PluginKeychainAzureKv,
    "pluginImportType.Local results in pluginKeychainAzureKv",
  );

  await t.rejects(
    pluginFactoryKeychain3.create({
      invalid,
    }),
  );

  t.end();
});
