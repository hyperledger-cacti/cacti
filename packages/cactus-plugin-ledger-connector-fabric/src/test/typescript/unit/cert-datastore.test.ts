import "jest-extended";
import { CertDatastore, IIdentityData } from "../../../main/typescript/identity/internal/cert-datastore";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import { PluginKeychainMemory } from "@hyperledger-cacti/cactus-plugin-keychain-memory";
import { FabricSigningCredentialType } from "../../../main/typescript/generated/openapi/typescript-axios/api";
import { v4 as uuidv4 } from "uuid";

describe("CertDatastore unit tests", () => {
  let keychainPlugin: PluginKeychainMemory;
  let pluginRegistry: PluginRegistry;
  let datastore: CertDatastore;
  const keychainId = uuidv4();

  const testIdentityData: IIdentityData = {
    type: FabricSigningCredentialType.X509Pem,
    credentials: {
      certificate: "fake-cert",
      privateKey: "fake-key",
    },
    mspId: "Org1MSP",
  };

  beforeEach(() => {
    keychainPlugin = new PluginKeychainMemory({
      instanceId: uuidv4(),
      keychainId: keychainId,
      logLevel: "WARN",
    });

    pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });
    datastore = new CertDatastore(pluginRegistry);
  });

  test("get() retrieves and parses identity data", async () => {
    await keychainPlugin.set("keychain-ref", JSON.stringify(testIdentityData));
    const result = await datastore.get(keychainId, "keychain-ref");
    expect(result).toEqual(testIdentityData);
  });

  test("put() serializes and saves identity data", async () => {
    await datastore.put(keychainId, "keychain-ref", testIdentityData);
    const stored = await keychainPlugin.get("keychain-ref");
    expect(stored).toBe(JSON.stringify(testIdentityData));
  });

  test("has() checks existence of a key in keychain", async () => {
    await keychainPlugin.set("keychain-ref", JSON.stringify(testIdentityData));
    const exists = await datastore.has(keychainId, "keychain-ref");
    expect(exists).toBe(true);
  });

  test("has() returns false for non-existent key", async () => {
    const exists = await datastore.has(keychainId, "non-existent-key");
    expect(exists).toBe(false);
  });

  test("delete() removes a key from keychain", async () => {
    await keychainPlugin.set("keychain-ref", JSON.stringify(testIdentityData));
    expect(await keychainPlugin.has("keychain-ref")).toBe(true);
    await datastore.delete(keychainId, "keychain-ref");
    expect(await keychainPlugin.has("keychain-ref")).toBe(false);
  });
});
