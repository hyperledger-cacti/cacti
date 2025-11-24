/**
 * Unit Tests for SATP CLI Adapter Configuration Loading and Validation
 *
 * @description
 * Tests for validating adapter configuration loading from YAML files and
 * validation logic. These tests verify that:
 * - Valid YAML configurations are parsed correctly
 * - Validation functions properly identify valid configurations
 * - Invalid configurations throw appropriate errors
 *
 * @see {@link validateAdapterConfig} for validation implementation
 * @see {@link loadAdapterConfigFromYaml} for YAML loading
 */

import { describe, expect, it } from "@jest/globals";
import * as path from "node:path";
import {
  validateAdapterConfig,
  loadAdapterConfigFromYaml,
  loadAndValidateAdapterConfig,
} from "../../../main/typescript/services/validation/config-validating-functions/validate-adapter-config";
import type { AdapterLayerConfiguration } from "../../../main/typescript/adapters/adapter-config";
import { SatpStageKey } from "../../../main/typescript/adapters/adapter-config";

/**
 * Path to test fixture files
 */
const FIXTURES_DIR = path.join(__dirname, "..", "..", "yaml", "fixtures");

describe("SATP CLI Adapter Configuration - Unit Tests", () => {
  describe("validateAdapterConfig - valid configurations", () => {
    it("should return undefined when no configuration is provided", () => {
      const result = validateAdapterConfig({ configValue: undefined });
      expect(result).toBeUndefined();
    });

    it("should validate a minimal valid adapter configuration", () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "test-adapter",
            name: "Test Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "checkNewSessionRequest",
                point: "before",
              },
            ],
            outboundWebhook: {
              url: "https://example.com/webhook",
            },
          },
        ],
      };

      const result = validateAdapterConfig({ configValue: config });

      expect(result).toBeDefined();
      expect(result).toBe(config);
      expect(result?.adapters).toHaveLength(1);
      expect(result?.adapters[0].id).toBe("test-adapter");
    });

    it("should validate configuration with multiple adapters", () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "adapter-1",
            name: "First Adapter",
            active: true,
            priority: 1,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "checkNewSessionRequest",
                point: "before",
              },
            ],
            outboundWebhook: {
              url: "https://example.com/adapter1",
              timeoutMs: 5000,
            },
          },
          {
            id: "adapter-2",
            name: "Second Adapter",
            active: false,
            priority: 2,
            executionPoints: [
              {
                stage: SatpStageKey.Stage1,
                step: "checkTransferProposalRequestMessage",
                point: "after",
              },
            ],
            inboundWebhook: {
              timeoutMs: 10000,
            },
          },
        ],
      };

      const result = validateAdapterConfig({ configValue: config });

      expect(result).toBeDefined();
      expect(result?.adapters).toHaveLength(2);
      expect(result?.adapters[0].id).toBe("adapter-1");
      expect(result?.adapters[1].id).toBe("adapter-2");
    });

    it("should validate configuration with multiple execution points per adapter", () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "multi-point-adapter",
            name: "Multi-Point Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "checkNewSessionRequest",
                point: "before",
              },
              {
                stage: SatpStageKey.Stage0,
                step: "newSessionResponse",
                point: "after",
              },
              {
                stage: SatpStageKey.Stage0,
                step: "checkPreSATPTransferRequest",
                point: "before",
              },
            ],
            outboundWebhook: {
              url: "https://example.com/webhook",
            },
          },
        ],
      };

      const result = validateAdapterConfig({ configValue: config });

      expect(result).toBeDefined();
      expect(result?.adapters[0].executionPoints).toHaveLength(3);
    });

    it("should validate configuration with all execution steps", () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "before-adapter",
            name: "Before Step Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage1,
                step: "checkTransferProposalRequestMessage",
                point: "before",
              },
            ],
            outboundWebhook: { url: "https://example.com/before" },
          },
          {
            id: "during-adapter",
            name: "During Step Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage1,
                step: "transferProposalRequest",
                point: "during",
              },
            ],
            outboundWebhook: { url: "https://example.com/during" },
          },
          {
            id: "after-adapter",
            name: "After Step Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage1,
                step: "transferProposalResponse",
                point: "after",
              },
            ],
            outboundWebhook: { url: "https://example.com/after" },
          },
          {
            id: "rollback-adapter",
            name: "Rollback Step Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage2,
                step: "lockAssertionRequest",
                point: "rollback",
              },
            ],
            outboundWebhook: { url: "https://example.com/rollback" },
          },
        ],
      };

      const result = validateAdapterConfig({ configValue: config });

      expect(result).toBeDefined();
      expect(result?.adapters).toHaveLength(4);
    });

    it("should validate configuration with global defaults", () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "test-adapter",
            name: "Test Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "checkNewSessionRequest",
                point: "before",
              },
            ],
            outboundWebhook: { url: "https://example.com/webhook" },
          },
        ],
        global: {
          timeoutMs: 10000,
          retryAttempts: 3,
          retryDelayMs: 1000,
          logLevel: "info",
        },
      };

      const result = validateAdapterConfig({ configValue: config });

      expect(result).toBeDefined();
      expect(result?.global).toBeDefined();
      expect(result?.global?.timeoutMs).toBe(10000);
      expect(result?.global?.retryAttempts).toBe(3);
      expect(result?.global?.logLevel).toBe("info");
    });

    it("should validate configuration with both inbound and outbound webhooks", () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "dual-webhook-adapter",
            name: "Dual Webhook Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage1,
                step: "checkTransferProposalRequestMessage",
                point: "before",
              },
            ],
            outboundWebhook: {
              url: "https://compliance.example.com/check",
              timeoutMs: 5000,
            },
            inboundWebhook: {
              timeoutMs: 300000,
            },
          },
        ],
      };

      const result = validateAdapterConfig({ configValue: config });

      expect(result).toBeDefined();
      expect(result?.adapters[0].outboundWebhook).toBeDefined();
      expect(result?.adapters[0].inboundWebhook).toBeDefined();
      expect(result?.adapters[0].outboundWebhook?.url).toBe(
        "https://compliance.example.com/check",
      );
      expect(result?.adapters[0].inboundWebhook?.timeoutMs).toBe(300000);
    });

    it("should validate configuration for all SATP stages (0-3)", () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "stage-0-adapter",
            name: "Stage 0 Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "checkNewSessionRequest",
                point: "before",
              },
            ],
            outboundWebhook: { url: "https://example.com/s0" },
          },
          {
            id: "stage-1-adapter",
            name: "Stage 1 Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage1,
                step: "checkTransferProposalRequestMessage",
                point: "before",
              },
            ],
            outboundWebhook: { url: "https://example.com/s1" },
          },
          {
            id: "stage-2-adapter",
            name: "Stage 2 Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage2,
                step: "checkLockAssertionRequest",
                point: "before",
              },
            ],
            outboundWebhook: { url: "https://example.com/s2" },
          },
          {
            id: "stage-3-adapter",
            name: "Stage 3 Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage3,
                step: "checkCommitPreparationRequest",
                point: "before",
              },
            ],
            outboundWebhook: { url: "https://example.com/s3" },
          },
        ],
      };

      const result = validateAdapterConfig({ configValue: config });

      expect(result).toBeDefined();
      expect(result?.adapters).toHaveLength(4);
    });
  });

  describe("validateAdapterConfig - invalid configurations", () => {
    it("should throw when configuration is not an object", () => {
      expect(() => {
        validateAdapterConfig({
          configValue: "invalid" as unknown as AdapterLayerConfiguration,
        });
      }).toThrow("Adapter configuration must be an object when provided");
    });

    it("should throw when adapters array is missing", () => {
      expect(() => {
        validateAdapterConfig({ configValue: {} as AdapterLayerConfiguration });
      }).toThrow("Adapter configuration must contain 'adapters' array");
    });

    it("should throw when adapter ID is missing", () => {
      const config = {
        adapters: [
          {
            name: "No ID Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "checkNewSessionRequest",
                point: "before",
              },
            ],
          },
        ],
      } as AdapterLayerConfiguration;

      expect(() => {
        validateAdapterConfig({ configValue: config });
      }).toThrow("Adapter must have a valid 'id' string");
    });

    it("should throw when adapter IDs are duplicated", () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "duplicate-id",
            name: "First Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "checkNewSessionRequest",
                point: "before",
              },
            ],
            outboundWebhook: { url: "https://example.com/1" },
          },
          {
            id: "duplicate-id",
            name: "Second Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage1,
                step: "checkTransferProposalRequestMessage",
                point: "before",
              },
            ],
            outboundWebhook: { url: "https://example.com/2" },
          },
        ],
      };

      expect(() => {
        validateAdapterConfig({ configValue: config });
      }).toThrow('Duplicate adapter id "duplicate-id" found');
    });

    it("should throw when execution points array is empty", () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "empty-points-adapter",
            name: "Empty Points Adapter",
            active: true,
            executionPoints: [],
            outboundWebhook: { url: "https://example.com/webhook" },
          },
        ],
      };

      expect(() => {
        validateAdapterConfig({ configValue: config });
      }).toThrow(
        'Adapter "empty-points-adapter" must have at least one execution point',
      );
    });

    it("should throw when execution point has invalid stage", () => {
      // Use type assertion to test runtime validation with invalid stage value
      const config = {
        adapters: [
          {
            id: "invalid-stage-adapter",
            name: "Invalid Stage Adapter",
            active: true,
            executionPoints: [
              {
                stage: "stage5" as unknown, // Invalid stage value for testing runtime validation
                step: "checkNewSessionRequest",
                point: "before",
              },
            ],
            outboundWebhook: { url: "https://example.com/webhook" },
          },
        ],
      } as AdapterLayerConfiguration;

      expect(() => {
        validateAdapterConfig({ configValue: config });
      }).toThrow("must have a valid 'stage' number (0-3)");
    });

    it("should throw when execution point has invalid step for stage", () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "invalid-step-adapter",
            name: "Invalid Step Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "lockAssertion",
                point: "before",
              }, // lockAssertion is stage 2
            ],
            outboundWebhook: { url: "https://example.com/webhook" },
          },
        ],
      };

      expect(() => {
        validateAdapterConfig({ configValue: config });
      }).toThrow('has invalid step "lockAssertion" for stage 0');
    });

    it("should throw when execution point has invalid point value", () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "invalid-point-adapter",
            name: "Invalid Point Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "checkNewSessionRequest",
                point: "middle" as "before",
              },
            ],
            outboundWebhook: { url: "https://example.com/webhook" },
          },
        ],
      };

      expect(() => {
        validateAdapterConfig({ configValue: config });
      }).toThrow('has invalid point "middle"');
    });

    it("should throw when outbound webhook URL is invalid", () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "invalid-url-adapter",
            name: "Invalid URL Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "checkNewSessionRequest",
                point: "before",
              },
            ],
            outboundWebhook: { url: "not-a-valid-url" },
          },
        ],
      };

      expect(() => {
        validateAdapterConfig({ configValue: config });
      }).toThrow("outboundWebhook.url must be a valid URL");
    });

    it("should throw when global logLevel is invalid", () => {
      const config: AdapterLayerConfiguration = {
        adapters: [
          {
            id: "test-adapter",
            name: "Test Adapter",
            active: true,
            executionPoints: [
              {
                stage: SatpStageKey.Stage0,
                step: "checkNewSessionRequest",
                point: "before",
              },
            ],
            outboundWebhook: { url: "https://example.com/webhook" },
          },
        ],
        global: {
          logLevel: "invalid" as "info",
        },
      };

      expect(() => {
        validateAdapterConfig({ configValue: config });
      }).toThrow("Global logLevel must be one of:");
    });
  });

  describe("loadAdapterConfigFromYaml - YAML file loading", () => {
    it("should load the simple example YAML configuration", () => {
      const configPath = path.join(
        FIXTURES_DIR,
        "adapter-configuration-simple.example.yml",
      );

      const result = loadAdapterConfigFromYaml(configPath);

      expect(result).toBeDefined();
      expect(result.adapters).toBeDefined();
      expect(Array.isArray(result.adapters)).toBe(true);
      expect(result.adapters.length).toBeGreaterThan(0);

      // Verify first adapter structure
      const firstAdapter = result.adapters[0];
      expect(firstAdapter.id).toBe("validation-adapter-1");
      expect(firstAdapter.name).toBe("Transfer Validation Webhook");
      expect(firstAdapter.active).toBe(true);
      expect(firstAdapter.executionPoints).toBeDefined();
      expect(firstAdapter.executionPoints.length).toBeGreaterThan(0);
    });

    it("should load the comprehensive example YAML configuration", () => {
      const configPath = path.join(
        FIXTURES_DIR,
        "adapter-configuration.example.yml",
      );

      const result = loadAdapterConfigFromYaml(configPath);

      expect(result).toBeDefined();
      expect(result.adapters).toBeDefined();
      expect(result.adapters.length).toBeGreaterThanOrEqual(4);

      // Verify global config
      expect(result.global).toBeDefined();
      expect(result.global?.timeoutMs).toBe(3000);
      expect(result.global?.retryAttempts).toBe(5);
    });

    it("should load the newSessionRequest YAML configuration", () => {
      const configPath = path.join(
        FIXTURES_DIR,
        "adapter-configuration-newSessionRequest.yml",
      );

      const result = loadAdapterConfigFromYaml(configPath);

      expect(result).toBeDefined();
      expect(result.adapters).toBeDefined();
      expect(result.adapters).toHaveLength(2);

      // Verify outbound webhook adapter (before)
      const outboundAdapter = result.adapters[0];
      expect(outboundAdapter.id).toBe("newSessionRequest-outbound-validator");
      expect(outboundAdapter.name).toBe("New Session Request Validator");
      expect(outboundAdapter.active).toBe(true);
      expect(outboundAdapter.executionPoints).toHaveLength(1);
      expect(outboundAdapter.executionPoints[0].stage).toBe("stage0");
      expect(outboundAdapter.executionPoints[0].step).toBe("newSessionRequest");
      expect(outboundAdapter.executionPoints[0].point).toBe("before");
      expect(outboundAdapter.outboundWebhook).toBeDefined();
      expect(outboundAdapter.outboundWebhook?.url).toBe(
        "http://localhost:9223/webhook/outbound/validate",
      );

      // Verify inbound webhook adapter (after)
      const inboundAdapter = result.adapters[1];
      expect(inboundAdapter.id).toBe("newSessionRequest-inbound-approval");
      expect(inboundAdapter.name).toBe("New Session Request Approval");
      expect(inboundAdapter.active).toBe(true);
      expect(inboundAdapter.executionPoints).toHaveLength(1);
      expect(inboundAdapter.executionPoints[0].stage).toBe("stage0");
      expect(inboundAdapter.executionPoints[0].step).toBe("newSessionRequest");
      expect(inboundAdapter.executionPoints[0].point).toBe("after");
      expect(inboundAdapter.inboundWebhook).toBeDefined();
      expect(inboundAdapter.inboundWebhook?.timeoutMs).toBe(3000);

      // Verify global config
      expect(result.global).toBeDefined();
      expect(result.global?.timeoutMs).toBe(5000);
      expect(result.global?.retryAttempts).toBe(3);
    });

    it("should throw when file does not exist", () => {
      const nonExistentPath = path.join(FIXTURES_DIR, "non-existent.yml");

      expect(() => {
        loadAdapterConfigFromYaml(nonExistentPath);
      }).toThrow("Adapter configuration file not found");
    });
  });

  describe("loadAndValidateAdapterConfig - combined load and validate", () => {
    it("should load the simple example configuration (note: phase0-adapter-2 lacks executionPoints)", () => {
      const configPath = path.join(
        FIXTURES_DIR,
        "adapter-configuration-simple.example.yml",
      );

      // The simple example has phase0-adapter-2 without executionPoints,
      // which is now required. This test verifies that validation catches this.
      expect(() => {
        loadAndValidateAdapterConfig(configPath);
      }).toThrow(
        "Adapter \"phase0-adapter-2\" must have an 'executionPoints' array",
      );
    });

    it("should load and validate the comprehensive example configuration", () => {
      const configPath = path.join(
        FIXTURES_DIR,
        "adapter-configuration.example.yml",
      );

      const result = loadAndValidateAdapterConfig(configPath);

      expect(result).toBeDefined();
      expect(result?.adapters).toBeDefined();

      // Find the compliance adapter
      const complianceAdapter = result?.adapters.find(
        (a) => a.id === "stage1-compliance-adapter",
      );
      expect(complianceAdapter).toBeDefined();
      expect(complianceAdapter?.name).toBe("Compliance Check Webhook");
    });

    it("should load and validate the newSessionRequest configuration", () => {
      const configPath = path.join(
        FIXTURES_DIR,
        "adapter-configuration-newSessionRequest.yml",
      );

      const result = loadAndValidateAdapterConfig(configPath);

      expect(result).toBeDefined();
      expect(result?.adapters).toHaveLength(2);

      // Verify both adapters are valid
      const outboundAdapter = result?.adapters.find(
        (a) => a.id === "newSessionRequest-outbound-validator",
      );
      expect(outboundAdapter).toBeDefined();
      expect(outboundAdapter?.outboundWebhook).toBeDefined();

      const inboundAdapter = result?.adapters.find(
        (a) => a.id === "newSessionRequest-inbound-approval",
      );
      expect(inboundAdapter).toBeDefined();
      expect(inboundAdapter?.inboundWebhook).toBeDefined();
      expect(inboundAdapter?.inboundWebhook?.timeoutMs).toBe(3000);
    });

    it("should return undefined for optional missing file", () => {
      const nonExistentPath = path.join(FIXTURES_DIR, "non-existent.yml");

      const result = loadAndValidateAdapterConfig(nonExistentPath, true);

      expect(result).toBeUndefined();
    });

    it("should throw for required missing file", () => {
      const nonExistentPath = path.join(FIXTURES_DIR, "non-existent.yml");

      expect(() => {
        loadAndValidateAdapterConfig(nonExistentPath, false);
      }).toThrow("Adapter configuration file not found");
    });
  });

  describe("JSON.stringify for YAML config logging", () => {
    it("should serialize loaded YAML config to JSON string", () => {
      const configPath = path.join(
        FIXTURES_DIR,
        "adapter-configuration-simple.example.yml",
      );
      const config = loadAdapterConfigFromYaml(configPath);

      // This demonstrates how to log YAML config using JSON.stringify
      const jsonString = JSON.stringify(config, null, 2);

      expect(jsonString).toBeDefined();
      expect(typeof jsonString).toBe("string");
      expect(jsonString).toContain("validation-adapter-1");
      expect(jsonString).toContain("executionPoints");

      // Verify it can be parsed back
      const parsed = JSON.parse(jsonString);
      expect(parsed.adapters).toBeDefined();
      expect(parsed.adapters[0].id).toBe("validation-adapter-1");
    });

    it("should serialize comprehensive config preserving all fields", () => {
      const configPath = path.join(
        FIXTURES_DIR,
        "adapter-configuration.example.yml",
      );
      const config = loadAdapterConfigFromYaml(configPath);

      const jsonString = JSON.stringify(config, null, 2);

      // Check that nested structures are preserved
      expect(jsonString).toContain("outboundWebhook");
      expect(jsonString).toContain("inboundWebhook");
      expect(jsonString).toContain("executionPoints");
      expect(jsonString).toContain("global");
      expect(jsonString).toContain("timeoutMs");
    });
  });
});
