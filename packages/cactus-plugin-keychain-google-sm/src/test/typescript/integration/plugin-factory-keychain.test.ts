import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import test, { Test } from "tape-promise/tape";
import { PluginFactoryKeychain } from "../../../main/typescript/plugin-factory-keychain";
import { PluginKeychainGoogleSm } from "../../../main/typescript/plugin-keychain-google-sm";
import { v4 as uuidv4 } from "uuid";

test("get,set,has,delete alters state as expected", async (t: Test) => {
  const iPluginFactoryOptions: IPluginFactoryOptions = {
    pluginImportType: PluginImportType.Local,
  };

  const pluginRegistry = new PluginRegistry();
  const iPluginKeychainGoogleSmOptions = {
    pluginRegistry,
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    googleProfile: "true",
    googleRegion: "true",
    googleEndpoint: "true",
    googleAccessKeyId: "true",
    googleSecretAccessKey: "true",
  };

  const pluginFactoryKeychain = new PluginFactoryKeychain(
    iPluginFactoryOptions,
  );

  const pluginKeychainGoogleSm = await pluginFactoryKeychain.create(
    iPluginKeychainGoogleSmOptions,
  );

  t.true(
    pluginKeychainGoogleSm instanceof PluginKeychainGoogleSm,
    "pluginImportType.Local results in pluginKeychainGoogleSm",
  );

  t.end();
});
