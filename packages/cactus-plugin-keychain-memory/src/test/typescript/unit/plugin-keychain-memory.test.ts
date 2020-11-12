import test, { Test } from "tape-promise/tape";

import { v4 as uuidv4 } from "uuid";
import {
  IPluginKeychainMemoryOptions,
  PluginKeychainMemory,
} from "../../../main/typescript";

test("PluginKeychainMemory", (t1: Test) => {
  t1.doesNotThrow(
    () => new PluginKeychainMemory({ instanceId: "a", keychainId: "a" })
  );

  test("Validates constructor arg instanceId", (t: Test) => {
    t.throws(
      () =>
        new PluginKeychainMemory({
          instanceId: null as any,
          keychainId: "valid-value",
        })
    );
    t.throws(
      () =>
        new PluginKeychainMemory({
          instanceId: "",
          keychainId: "valid-value",
        })
    );
    t.end();
  });

  test("Validates constructor arg keychainId", (t: Test) => {
    t.throws(
      () =>
        new PluginKeychainMemory({
          instanceId: "valid-value",
          keychainId: null as any,
        })
    );
    t.throws(
      () =>
        new PluginKeychainMemory({
          instanceId: "valid-value",
          keychainId: "",
        })
    );
    t.end();
  });

  test("get,set,has,delete alters state as expected", async (t: Test) => {
    const options: IPluginKeychainMemoryOptions = {
      instanceId: uuidv4(),
      keychainId: uuidv4(),
    };
    const plugin = new PluginKeychainMemory(options);
    t.equal(plugin.getKeychainId(), options.keychainId, "Keychain ID set OK");
    t.equal(plugin.getInstanceId(), options.instanceId, "Instance ID set OK");

    const key = uuidv4();
    const value = uuidv4();

    const hasPrior = await plugin.has(key);
    t.false(hasPrior, "hasPrior === false OK");

    await plugin.set(key, value);

    const hasAfter = await plugin.has(key);
    t.true(hasAfter, "hasAfter === true OK");

    const valueAfter = await plugin.get(key);
    t.ok(valueAfter, "valueAfter truthy OK");
    t.equal(valueAfter, value, "valueAfter === value OK");

    await plugin.delete(key);

    const hasAfterDelete = await plugin.has(key);
    t.false(hasAfterDelete, "hasAfterDelete === false OK");

    const valueAfterDelete = await plugin.get(key);
    t.notok(valueAfterDelete, "valueAfterDelete falsy OK");

    t.end();
  });

  test("rotateEncryptionKeys() fails fast", async (t: Test) => {
    const options: IPluginKeychainMemoryOptions = {
      instanceId: uuidv4(),
      keychainId: uuidv4(),
    };
    const plugin = new PluginKeychainMemory(options);

    const promise = plugin.rotateEncryptionKeys();
    const expected = /not implemented/;
    await t.rejects(promise, expected, "rotateEncryptionKeys() rejects OK");

    t.end();
  });

  test("getEncryptionAlgorithm() returns null", (t: Test) => {
    const options: IPluginKeychainMemoryOptions = {
      instanceId: uuidv4(),
      keychainId: uuidv4(),
    };
    const plugin = new PluginKeychainMemory(options);

    t.notok(plugin.getEncryptionAlgorithm(), "encryption algorithm falsy OK");

    t.end();
  });

  t1.end();
});
