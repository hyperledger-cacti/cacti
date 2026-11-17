import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import http from "http";
import path from "path";

import { Servers } from "@hyperledger-cacti/cactus-common";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import {
  CantonTestLedger,
  Containers,
  ICantonTestLedgerConnectionInfo,
  pruneDockerContainersIfGithubAction,
} from "@hyperledger-cacti/cactus-test-tooling";
import express from "express";

import {
  CantonApiClient,
  IPluginLedgerConnectorCantonOptions,
  PluginLedgerConnectorCanton,
  readCantonDar,
} from "../../../main/typescript/public-api";
import {
  CONNECTOR_SCOPES,
  getLocalNetActAsParty,
  invalidateJwt,
  startConnectorApi,
} from "../canton-test-utilities";

const TEST_TIMEOUT = 20 * 60 * 1000;
const ASSET_DAR = readFileSync(
  path.join(__dirname, "../../daml/asset/cacti-canton-test-asset.dar"),
);
const ASSET_DAR_BASE64 = ASSET_DAR.toString("base64");
const ASSET_TEMPLATE_NAME_ID = "#cacti-canton-test-asset:Asset:Asset";
const JSON_BODY_LIMIT = "32mb";

jest.setTimeout(TEST_TIMEOUT);

describe("Canton connector DAR deployment with LocalNet", () => {
  const ledger = new CantonTestLedger({ logLevel: "INFO" });
  const servers: http.Server[] = [];
  const connectors: PluginLedgerConnectorCanton[] = [];
  let connectionInfo: ICantonTestLedgerConnectionInfo;
  let partyId: string;
  let deployer: CantonApiClient;
  let writer: PluginLedgerConnectorCanton;
  let reader: PluginLedgerConnectorCanton;

  function createConnector(
    options: Partial<IPluginLedgerConnectorCantonOptions> = {},
  ): PluginLedgerConnectorCanton {
    const connector = new PluginLedgerConnectorCanton({
      instanceId: randomUUID(),
      ledgerClientUrl: connectionInfo.jsonLedgerApiHost,
      // LocalNet publishes its JSON Ledger API on plain HTTP at 127.0.0.1.
      allowInsecureLoopbackHttp: true,
      auth: { method: "static", token: connectionInfo.ledgerApiAuthToken },
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      logLevel: "INFO",
      allowedPartyIds: [partyId],
      ...options,
    });
    connectors.push(connector);
    return connector;
  }

  async function startApi(
    connector: PluginLedgerConnectorCanton,
    scopes: readonly string[] = CONNECTOR_SCOPES,
  ): Promise<CantonApiClient> {
    const app = express();
    const server = http.createServer(app);
    servers.push(server);
    return startConnectorApi(app, server, connector, {
      scopes,
      jsonBodyLimit: JSON_BODY_LIMIT,
    });
  }

  beforeAll(async () => {
    try {
      await ledger.start();
      connectionInfo = await ledger.getConnectionInfo();
      partyId = await getLocalNetActAsParty(
        connectionInfo.jsonLedgerApiHost,
        connectionInfo.ledgerApiAuthToken,
      );
      deployer = await startApi(createConnector());
      writer = createConnector();
      // A separate SDK/provider instance, so reads come from ledger state.
      reader = createConnector();
    } catch (error) {
      await Containers.logDiagnostics({ logLevel: "INFO" }).catch(
        () => undefined,
      );
      throw error;
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    const cleanupErrors: unknown[] = [];
    for (const cleanup of [
      ...connectors.map((connector) => () => connector.shutdown()),
      ...servers.map(
        (server) => () =>
          server.listening ? Servers.shutdown(server) : undefined,
      ),
      () => ledger.stop(),
      () => ledger.destroy(),
      () => pruneDockerContainersIfGithubAction({ logLevel: "INFO" }),
    ]) {
      try {
        await cleanup();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length > 0) {
      await Containers.logDiagnostics({ logLevel: "INFO" }).catch(
        () => undefined,
      );
      throw cleanupErrors[0];
    }
  }, TEST_TIMEOUT);

  test("deploys the Asset DAR and a second connector reads a contract created from it", async () => {
    const { data: deployed } = await deployer.deployDarV1({
      darBase64: ASSET_DAR_BASE64,
    });
    expect(deployed.packageId).toBe(
      readCantonDar(ASSET_DAR, 1 << 30).packageId,
    );

    // Commands accept package IDs; ACS filters take the package name and
    // return the template ID resolved to the package that was deployed.
    const templateId = `${deployed.packageId}:Asset:Asset`;
    const symbol = `CACTI-${randomUUID()}`;
    await writer.transact({
      partyId,
      commandId: `create-asset-${randomUUID()}`,
      commands: [
        {
          CreateCommand: {
            templateId,
            createArguments: {
              issuer: partyId,
              owner: partyId,
              symbol,
              amount: "10.0",
              locked: false,
            },
          },
        },
      ],
    });

    const { contracts } = await reader.getActiveContracts({
      parties: [partyId],
      templateIds: [ASSET_TEMPLATE_NAME_ID],
    });
    expect(contracts).toContainEqual(
      expect.objectContaining({
        templateId,
        createArgument: expect.objectContaining({ symbol }),
      }),
    );
  });

  test("deploying the same DAR again returns the same package ID", async () => {
    const first = await deployer.deployDarV1({ darBase64: ASSET_DAR_BASE64 });
    const second = await deployer.deployDarV1({ darBase64: ASSET_DAR_BASE64 });
    expect(second.data.packageId).toBe(first.data.packageId);
  });

  test("rejects a corrupt DAR", async () => {
    const corrupt = Buffer.from(ASSET_DAR.subarray(0, ASSET_DAR.length / 2));
    await expect(
      deployer.deployDarV1({ darBase64: corrupt.toString("base64") }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  test("rejects a DAR larger than the configured limit", async () => {
    const limited = await startApi(
      createConnector({ maxDarBytes: ASSET_DAR.length - 1 }),
    );
    await expect(
      limited.deployDarV1({ darBase64: ASSET_DAR_BASE64 }),
    ).rejects.toMatchObject({ response: { status: 413 } });
  });

  test("rejects a caller without the deploy scope", async () => {
    const withoutDeployScope = await startApi(
      createConnector(),
      CONNECTOR_SCOPES.filter((scope) => scope !== "deploy:canton-packages"),
    );
    await expect(
      withoutDeployScope.deployDarV1({ darBase64: ASSET_DAR_BASE64 }),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  test("rejects credentials that LocalNet cannot authenticate", async () => {
    const unauthorized = await startApi(
      createConnector({
        auth: {
          method: "static",
          token: invalidateJwt(connectionInfo.ledgerApiAuthToken),
        },
      }),
    );
    await expect(
      unauthorized.deployDarV1({ darBase64: ASSET_DAR_BASE64 }),
    ).rejects.toMatchObject({ response: { status: 502 } });
  });
});
