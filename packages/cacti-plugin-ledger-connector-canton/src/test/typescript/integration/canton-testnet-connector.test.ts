import { randomUUID } from "crypto";

import { PluginRegistry } from "@hyperledger-cacti/cactus-core";

import { PluginLedgerConnectorCanton } from "../../../main/typescript/public-api";

// Public-network tests require operator-managed access. Ordinary CI must not
// contact a remote ledger or consume synchronizer traffic accidentally.
const testNet =
  process.env.CANTON_TESTNET_ENABLED === "true" ? describe : describe.skip;

testNet(
  "Canton connector with an operator-provided TestNet participant",
  () => {
    let connector: PluginLedgerConnectorCanton | undefined;
    let partyId: string;
    let templateId: string;

    beforeAll(async () => {
      const required = (name: string): string => {
        const value = process.env[name];
        if (!value?.trim()) {
          throw new Error(`${name} is required for the opt-in TestNet suite`);
        }
        return value;
      };
      partyId = required("CANTON_TESTNET_PARTY_ID");
      templateId = required("CANTON_TESTNET_TEMPLATE_ID");
      connector = new PluginLedgerConnectorCanton({
        instanceId: `canton-testnet-${randomUUID()}`,
        pluginRegistry: new PluginRegistry(),
        ledgerClientUrl: required("CANTON_TESTNET_LEDGER_API_URL"),
        auth: {
          method: "static",
          token: required("CANTON_TESTNET_LEDGER_API_TOKEN"),
        },
        allowedPartyIds: [partyId],
        operationTimeoutMs: 60_000,
        logLevel: "ERROR",
      });
      await connector.onPluginInit();
    }, 120_000);

    afterAll(async () => {
      await connector?.shutdown();
    }, 120_000);

    test("listParties discovers the configured hosted party without mocks", async () => {
      const result = await connector!.listParties();
      expect(result.parties).toContain(partyId);
    }, 120_000);

    test("getActiveContracts reads the operator-selected TestNet template", async () => {
      const result = await connector!.getActiveContracts({
        parties: [partyId],
        templateIds: [templateId],
        limit: 1,
      });
      expect(result.activeAtOffset).toBeGreaterThanOrEqual(0);
      expect(result.contracts.length).toBeLessThanOrEqual(1);
      // Empty ACS is valid; this smoke test verifies authenticated connectivity.
    }, 120_000);

    // Requires an approved model/choice, test funds/traffic, and cleanup plan.
    // LocalNet exercises create/exercise, negative paths, and cross-instance ACS
    // deterministically; do not report this placeholder as TestNet write coverage.
    test.todo(
      "transact creates and archives an operator-approved TestNet contract",
    );
  },
);
