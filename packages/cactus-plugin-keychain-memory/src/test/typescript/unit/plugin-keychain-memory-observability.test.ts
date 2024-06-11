import "jest-extended";
import { v4 as uuidV4 } from "uuid";

import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";

import { PluginKeychainMemory } from "../../../main/typescript/public-api";

const logLevel: LogLevelDesc = "INFO";

describe("PluginKeychainMemory", () => {
  const log = LoggerProvider.getOrCreate({
    label: "plugin-keychain-memory-observability.test.ts",
    level: logLevel,
  });

  test("can observe set operations", async () => {
    const keychain = new PluginKeychainMemory({
      instanceId: uuidV4(),
      keychainId: uuidV4(),
      logLevel,
    });

    let getCount = 0;
    const stratedAt = new Date();

    const taskPromise = new Promise<void>((resolve) => {
      keychain.observeSet().subscribe({
        next: (value) => {
          getCount++;
          log.debug("NEXT_SET: startedAt=%o value=%o", stratedAt, value);
          if (getCount >= 5) {
            resolve();
          }
        },
      });

      keychain.set("some-key-that-does-not-matter-1", uuidV4());
      keychain.set("some-key-that-does-not-matter-2", uuidV4());
      keychain.set("some-key-that-does-not-matter-3", uuidV4());
      keychain.set("some-key-that-does-not-matter-4", uuidV4());
      keychain.set("some-key-that-does-not-matter-5", uuidV4());
    });
    await expect(taskPromise).toResolve();
  }, 500);

  test("can observe set operations with buffer", async () => {
    const keychain = new PluginKeychainMemory({
      instanceId: uuidV4(),
      keychainId: uuidV4(),
      logLevel,
      observabilityBufferSize: 5,
      observabilityTtlSeconds: 1000,
    });

    let getCount = 0;
    const stratedAt = new Date();

    keychain.set("some-key-that-does-not-matter-1", uuidV4());
    keychain.set("some-key-that-does-not-matter-2", uuidV4());
    keychain.set("some-key-that-does-not-matter-3", uuidV4());
    keychain.set("some-key-that-does-not-matter-4", uuidV4());
    keychain.set("some-key-that-does-not-matter-5", uuidV4());

    const taskPromise = new Promise<void>((resolve) => {
      keychain.observeSet().subscribe({
        next: (value) => {
          getCount++;
          log.debug("NEXT_SET_1: startedAt=%o value=%o", stratedAt, value);
        },
      });
      keychain.observeSet().subscribe({
        next: (value) => {
          getCount++;
          log.debug("NEXT_SET_2: startedAt=%o value=%o", stratedAt, value);
          if (getCount >= 10) {
            resolve();
          }
        },
      });
    });

    await expect(taskPromise).toResolve();
  }, 500);
});
