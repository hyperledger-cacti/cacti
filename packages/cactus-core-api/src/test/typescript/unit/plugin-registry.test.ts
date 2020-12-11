import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";

import {
  ICactusPlugin,
  IPluginKeychain,
  PluginAspect,
  PluginRegistry,
} from "../../../main/typescript/public-api";

test("PluginRegistry", (tMain: Test) => {
  test("findOneByKeychainId() finds plugin by keychain ID", (t: Test) => {
    const keychainId = uuidv4();

    const mockKeychainPlugin = {
      getKeychainId: () => keychainId,
      getAspect: () => PluginAspect.KEYCHAIN,
    } as IPluginKeychain;

    const pluginRegistry = new PluginRegistry({
      plugins: [
        mockKeychainPlugin,
        {
          getAspect: () => PluginAspect.CONSORTIUM,
        } as ICactusPlugin,
        {
          getAspect: () => PluginAspect.KV_STORAGE,
        } as ICactusPlugin,
        {
          getAspect: () => PluginAspect.LEDGER_CONNECTOR,
        } as ICactusPlugin,
      ],
    });

    t.doesNotThrow(() => pluginRegistry.findOneByKeychainId(keychainId));
    const keychainPlugin = pluginRegistry.findOneByKeychainId(keychainId);
    t.equal(keychainPlugin, mockKeychainPlugin, "Finds same object OK");

    t.throws(
      () => pluginRegistry.findOneByKeychainId(""),
      /need keychainId arg as non-blank string/,
      "Check for keychain ID blankness OK"
    );
    t.throws(
      () => pluginRegistry.findOneByKeychainId("x"),
      /No keychain found for ID/,
      "Throws for keychain not found OK"
    );

    t.end();
  });

  tMain.end();
});
