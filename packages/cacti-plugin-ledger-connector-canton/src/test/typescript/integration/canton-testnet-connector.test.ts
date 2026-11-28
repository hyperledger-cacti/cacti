import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";

import { PluginRegistry } from "@hyperledger-cacti/cactus-core";

import { PluginLedgerConnectorCanton } from "../../../main/typescript/public-api";

// Public-network tests require operator-managed access. Ordinary CI must not
// contact a remote ledger or consume synchronizer traffic accidentally.
const testNet =
  process.env.CANTON_TESTNET_ENABLED === "true" ? describe : describe.skip;
// Deployment and writes additionally need participant_admin, CanActAs, and
// synchronizer traffic, so they are enabled separately.
const testNetWrites =
  process.env.CANTON_TESTNET_ENABLED === "true" &&
  process.env.CANTON_TESTNET_WRITES_ENABLED === "true"
    ? test
    : test.skip;

const ASSET_DAR = readFileSync(
  path.join(__dirname, "../../daml/asset/cacti-canton-test-asset.dar"),
);

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

    testNetWrites(
      "deploys the test Asset DAR, creates an Asset, reads it, and burns it",
      async () => {
        const { packageId } = await connector!.deployContract({
          darBase64: ASSET_DAR.toString("base64"),
        });
        const templateId = `${packageId}:Asset:Asset`;
        const symbol = `CACTI-${randomUUID()}`;
        await connector!.transact({
          partyId,
          commandId: `testnet-create-asset-${randomUUID()}`,
          commands: [
            {
              CreateCommand: {
                templateId,
                createArguments: {
                  issuer: partyId,
                  owner: partyId,
                  symbol,
                  amount: "1.0",
                  locked: false,
                },
              },
            },
          ],
        });
        // ACS filters take the package name, not the package ID.
        const created = await connector!.getActiveContracts({
          parties: [partyId],
          templateIds: ["#cacti-canton-test-asset:Asset:Asset"],
        });
        const asset = created.contracts.find(
          (contract) => contract.createArgument?.symbol === symbol,
        );
        expect(asset).toBeDefined();

        // Burn the asset so repeated runs leave no contracts behind.
        await connector!.transact({
          partyId,
          commandId: `testnet-burn-asset-${randomUUID()}`,
          commands: [
            {
              ExerciseCommand: {
                templateId,
                contractId: asset!.contractId,
                choice: "Burn",
                choiceArgument: {},
              },
            },
          ],
        });
      },
      300_000,
    );
  },
);
