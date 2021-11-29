import { v4 as uuidv4 } from "uuid";
import "jest-extended";

import { PluginRegistry } from "../../../main/typescript/public-api";

import { ICactusPlugin, IPluginKeychain } from "@hyperledger/cactus-core-api";

describe("PluginRegistry", () => {
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

  test("findOneByKeychainId() finds plugin by keychain ID", () => {
    expect(() => pluginRegistry.findOneByKeychainId(keychainId)).not.toThrow();
    const keychainPlugin = pluginRegistry.findOneByKeychainId(keychainId);
    expect(keychainPlugin).toEqual(mockKeychainPlugin);
    expect(() => pluginRegistry.findOneByKeychainId("")).toThrowError(
      new Error(
        `PluginRegistry#findOneByKeychainId() need keychainId arg as non-blank string.`,
      ),
    );
    expect(() => pluginRegistry.findOneByKeychainId("x")).toThrowError(
      new Error(
        `PluginRegistry#findOneByKeychainId() No keychain found for ID x`,
      ),
    );
  });

  test("findOneById() finds plugin by its instanceID", () => {
    expect(() => pluginRegistry.findOneById(instanceId)).not.toThrow();
    const keychainPlugin = pluginRegistry.findOneById(instanceId).get();
    expect(keychainPlugin).toEqual(mockKeychainPlugin);
    expect(() => pluginRegistry.findOneById("")).toThrowError(
      new Error(`"instanceId" is a blank string. Need non-blank.`),
    );

    expect(pluginRegistry.findOneById("x").isEmpty()).toBe(true);
  });

  test("getOneById() finds plugin by its instanceID", () => {
    expect(() => pluginRegistry.getOneById(instanceId)).not.toThrow();
    const keychainPlugin = pluginRegistry.getOneById(instanceId);
    expect(keychainPlugin).toEqual(mockKeychainPlugin);
    expect(() => pluginRegistry.getOneById("")).toThrowError(
      new Error(`"instanceId" is a blank string. Need non-blank.`),
    );
    expect(() => pluginRegistry.getOneById("x")).toThrowError(
      new Error("Plugin x not present in registry"),
    );
  });
});
