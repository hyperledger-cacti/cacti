import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import test, { Test } from "tape-promise/tape";
import { PluginFactoryKeychain } from "../../../main/typescript/plugin-factory-keychain";
import {
  AwsCredentialType,
  PluginKeychainAwsSm,
} from "../../../main/typescript/plugin-keychain-aws-sm";
import { v4 as uuidv4 } from "uuid";

test("get,set,has,delete alters state as expected", async (t: Test) => {
  const iPluginFactoryOptions1: IPluginFactoryOptions = {
    pluginImportType: PluginImportType.Local,
  };

  const invalid: IPluginFactoryOptions = {
    pluginImportType: (null as unknown) as PluginImportType,
  };

  const pluginRegistry = new PluginRegistry();
  const iPluginKeychainAwsSmOptions = {
    pluginRegistry,
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    logLevel: "TRACE",
    awsProfile: "true",
    awsRegion: "true",
    awsEndpoint: "true",
    awsAccessKeyId: "true",
    awsSecretAccessKey: "true",
    awsCredentialType: AwsCredentialType.InMemory,
  };

  const pluginFactoryKeychain1 = new PluginFactoryKeychain(
    iPluginFactoryOptions1,
  );

  const pluginFactoryKeychain3 = new PluginFactoryKeychain(invalid);

  const pluginKeychainAwsSm = await pluginFactoryKeychain1.create(
    iPluginKeychainAwsSmOptions,
  );

  t.true(
    pluginKeychainAwsSm instanceof PluginKeychainAwsSm,
    "pluginImportType.Local results in pluginKeychainAwsSm",
  );

  await t.rejects(
    pluginFactoryKeychain3.create({
      invalid,
    }),
  );

  t.end();
});
