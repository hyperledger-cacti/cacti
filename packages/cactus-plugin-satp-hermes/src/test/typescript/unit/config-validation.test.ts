/**
 * Simple Unit tests for SATP Gateway Configuration Loading
 *
 * This test suite validates that all configuration files in src/examples/config/
 * can be loaded by the gateway without throwing errors.
 *
 * Tests configuration files from: https://github.com/RafaelAPB/satp-gateway-demo
 */

import * as fs from "fs";
import * as path from "path";
import { validateConfiguration } from "../../../examples/config/gateway-configs";

const CONFIG_DIR = path.resolve(__dirname, "../../../examples/config");

// Dynamically load all JSON configuration files from the config directory
const CONFIG_FILES = fs
  .readdirSync(CONFIG_DIR)
  .filter((file) => file.endsWith(".json"))
  .sort(); // Sort for consistent test order

describe("SATP Gateway Configuration Loading", () => {
  CONFIG_FILES.forEach((configFile) => {
    describe(`${configFile}`, () => {
      let config: any;

      beforeAll(() => {
        const configPath = path.join(CONFIG_DIR, configFile);
        expect(fs.existsSync(configPath)).toBe(true);

        const configContent = fs.readFileSync(configPath, "utf8");
        expect(() => {
          config = JSON.parse(configContent);
        }).not.toThrow();
      });

      it("should load and parse as valid JSON", () => {
        expect(config).toBeDefined();
        expect(typeof config).toBe("object");
      });

      it("should pass gateway validation without throwing errors", () => {
        expect(() => validateConfiguration(config)).not.toThrow();
      });
    });
  });

  describe("Configuration Loading Edge Cases", () => {
    it("should handle configurations with environment variables", () => {
      const testConfig = {
        gid: {
          id: "${GATEWAY_ID}",
          name: "TestGateway",
          version: [{ Core: "v02", Architecture: "v02", Crash: "v02" }],
          address: "${GATEWAY_ADDRESS}",
          gatewayClientPort: 3011,
          gatewayServerPort: 3010,
          gatewayOapiPort: 4010,
        },
        logLevel: "INFO",
        counterPartyGateways: [],
        environment: "development",
        ccConfig: {
          oracleConfig: [
            {
              networkIdentification: {
                id: "test-network",
                ledgerType: "ETHEREUM",
              },
              signingCredential: {
                ethAccount: "0x123",
                secret: "0x456",
                type: "PRIVATE_KEY_HEX",
              },
              gasConfig: {
                gas: "1000000",
                gasPrice: "20000000000",
              },
              connectorOptions: {
                rpcApiHttpHost: "http://localhost:8545",
              },
              claimFormats: [2],
            },
          ],
        },
      };

      expect(() => validateConfiguration(testConfig)).not.toThrow();
    });

    it("should reject completely invalid configurations", () => {
      const invalidConfig = {
        // Missing all required fields
      };

      expect(() => validateConfiguration(invalidConfig)).toThrow();
    });
  });
});
