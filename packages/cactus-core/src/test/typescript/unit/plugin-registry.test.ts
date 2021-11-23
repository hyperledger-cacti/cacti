import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";

import { PluginRegistry } from "../../../main/typescript/public-api";

import { ICactusPlugin, IPluginKeychain } from "@hyperledger/cactus-core-api";

test("PluginRegistry", (tMain: Test) => {
  const keychainId = uuidv4();
  const instanceId = uuidv4();

  const mockKeychainPlugin: IPluginKeychain = {
    getInstanceId: () => instanceId,
    getKeychainId: () => keychainId,
    delete: async () => {
      throw new Error("This is a mock. Not implemented.");
    },
    has: async () => {
      throw new Error("This is a mock. Not implemented.");
    },
    get: async () => {
      throw new Error("This is a mock. Not implemented.");
    },
    set: async () => {
      throw new Error("This is a mock. Not implemented.");
    },
    getPackageName: () => "@hyperledger/cactus-plugin-keychain-mock",

    onPluginInit: async () => {
      throw new Error("not sure how this works");
    },
  };

  const pluginRegistry = new PluginRegistry({
    plugins: [
      mockKeychainPlugin,
      {
        getInstanceId: () => "some-mock-plugin-instance-id-1",
      } as ICactusPlugin,
      {
        getInstanceId: () => "some-mock-plugin-instance-id-2",
      } as ICactusPlugin,
      {
        getInstanceId: () => "some-mock-plugin-instance-id-3",
      } as ICactusPlugin,
    ],
  });

  test("findOneByKeychainId() finds plugin by keychain ID", (t: Test) => {
    t.doesNotThrow(() => pluginRegistry.findOneByKeychainId(keychainId));
    const keychainPlugin = pluginRegistry.findOneByKeychainId(keychainId);
    t.equal(keychainPlugin, mockKeychainPlugin, "Finds same object OK");

    t.throws(
      () => pluginRegistry.findOneByKeychainId(""),
      /need keychainId arg as non-blank string/,
      "Check for keychain ID blankness OK",
    );
    t.throws(
      () => pluginRegistry.findOneByKeychainId("x"),
      /No keychain found for ID/,
      "Throws for keychain not found OK",
    );

    t.end();
  });

  test("findOneById() finds plugin by its instanceID", (t: Test) => {
    t.doesNotThrow(() => pluginRegistry.findOneById(instanceId));
    const keychainPlugin = pluginRegistry.findOneById(instanceId).get();
    t.equal(keychainPlugin, mockKeychainPlugin, "Finds same object by ID OK");

    t.throws(
      () => pluginRegistry.findOneById(""),
      /instanceId.*Need non-blank/,
      "Check for instance ID blankness OK",
    );

    t.true(
      pluginRegistry.findOneById("x").isEmpty(),
      "return empty optional for non-existent instance ID OK",
    );

    t.end();
  });

  test("getOneById() finds plugin by its instanceID", (t: Test) => {
    t.doesNotThrow(() => pluginRegistry.getOneById(instanceId));
    const keychainPlugin = pluginRegistry.getOneById(instanceId);
    t.equal(keychainPlugin, mockKeychainPlugin, "Finds same object by ID OK");

    t.throws(
      () => pluginRegistry.getOneById(""),
      /instanceId.*Need non-blank/,
      "Check for instance ID blankness OK",
    );

    t.throws(
      () => pluginRegistry.getOneById("x"),
      /not/,
      "Plugin x not present in registry",
    );

    t.end();
  });

  tMain.end();
});
