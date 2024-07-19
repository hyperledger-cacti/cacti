import "jest-extended";

import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { PluginFactoryKeychain } from "../../../main/typescript/plugin-factory-keychain";
import { PluginKeychainGoogleSm } from "../../../main/typescript/plugin-keychain-google-sm";
import { randomUUID } from "crypto";

test("get,set,has,delete alters state as expected", async () => {
  const iPluginFactoryOptions: IPluginFactoryOptions = {
    pluginImportType: PluginImportType.Local,
  };

  const pluginRegistry = new PluginRegistry();
  const iPluginKeychainGoogleSmOptions = {
    pluginRegistry,
    instanceId: randomUUID(),
    keychainId: randomUUID(),
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

  expect(pluginKeychainGoogleSm instanceof PluginKeychainGoogleSm).toBeTrue();
});
