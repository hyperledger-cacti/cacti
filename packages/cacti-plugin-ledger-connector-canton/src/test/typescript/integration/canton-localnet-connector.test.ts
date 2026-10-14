import { randomUUID } from "crypto";
import http from "http";

import { Servers } from "@hyperledger-cacti/cactus-common";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import {
  CantonTestLedger,
  Containers,
  ICantonTestLedgerConnectionInfo,
  pruneDockerContainersIfGithubAction,
} from "@hyperledger-cacti/cactus-test-tooling";
import axios from "axios";
import express from "express";

import {
  CantonApiClient,
  PluginLedgerConnectorCanton,
} from "../../../main/typescript/public-api";
import {
  PING_TEMPLATE_ID,
  RESOLVED_PING_TEMPLATE_ID,
  createPingCommand,
  invalidateJwt,
  ledgerApiUserOf,
  startConnectorApi,
} from "../canton-test-utilities";

const TEST_TIMEOUT = 20 * 60 * 1000;

interface IUserRightsResponse {
  readonly rights?: Array<{
    readonly kind?: {
      readonly CanActAs?: {
        readonly value?: { readonly party?: string };
      };
    };
  }>;
}

jest.setTimeout(TEST_TIMEOUT);

describe("Canton connector with LocalNet", () => {
  const ledger = new CantonTestLedger({ logLevel: "INFO" });
  const app = express();
  const server = http.createServer(app);
  const unauthorizedApp = express();
  const unauthorizedServer = http.createServer(unauthorizedApp);
  let connectionInfo: ICantonTestLedgerConnectionInfo;
  let connector: PluginLedgerConnectorCanton;
  let unauthorizedConnector: PluginLedgerConnectorCanton;
  let readerConnector: PluginLedgerConnectorCanton;
  let apiClient: CantonApiClient;
  let unauthorizedApiClient: CantonApiClient;
  let partyId: string;

  beforeAll(async () => {
    try {
      await ledger.start();
      connectionInfo = await ledger.getConnectionInfo();

      const userId = ledgerApiUserOf(connectionInfo.ledgerApiAuthToken);
      const rightsResponse = await axios.get<IUserRightsResponse>(
        `${connectionInfo.jsonLedgerApiHost}/v2/users/${encodeURIComponent(userId)}/rights`,
        {
          headers: {
            Authorization: `Bearer ${connectionInfo.ledgerApiAuthToken}`,
          },
        },
      );
      const actAsParty = rightsResponse.data.rights
        ?.map((right) => right.kind?.CanActAs?.value?.party)
        .find((party): party is string => typeof party === "string");
      if (!actAsParty) {
        throw new Error("The LocalNet user has no CanActAs party");
      }
      partyId = actAsParty;

      connector = new PluginLedgerConnectorCanton({
        instanceId: randomUUID(),
        ledgerClientUrl: connectionInfo.jsonLedgerApiHost,
        // LocalNet publishes its JSON Ledger API on plain HTTP at 127.0.0.1.
        allowInsecureLoopbackHttp: true,
        auth: {
          method: "static",
          token: connectionInfo.ledgerApiAuthToken,
        },
        pluginRegistry: new PluginRegistry({ plugins: [] }),
        logLevel: "INFO",
        allowedPartyIds: [partyId],
      });
      apiClient = await startConnectorApi(app, server, connector);

      // Independent SDK/provider instance reads transactions submitted by the
      // writer. This must succeed from ledger state, not a shared SDK cache.
      readerConnector = new PluginLedgerConnectorCanton({
        instanceId: randomUUID(),
        ledgerClientUrl: connectionInfo.jsonLedgerApiHost,
        allowInsecureLoopbackHttp: true,
        auth: { method: "static", token: connectionInfo.ledgerApiAuthToken },
        pluginRegistry: new PluginRegistry({ plugins: [] }),
        logLevel: "INFO",
        allowedPartyIds: [partyId],
      });

      unauthorizedConnector = new PluginLedgerConnectorCanton({
        instanceId: randomUUID(),
        ledgerClientUrl: connectionInfo.jsonLedgerApiHost,
        allowInsecureLoopbackHttp: true,
        auth: {
          method: "static",
          token: invalidateJwt(connectionInfo.ledgerApiAuthToken),
        },
        pluginRegistry: new PluginRegistry({ plugins: [] }),
        logLevel: "INFO",
        allowedPartyIds: [partyId],
      });
      unauthorizedApiClient = await startConnectorApi(
        unauthorizedApp,
        unauthorizedServer,
        unauthorizedConnector,
      );
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
      () => readerConnector?.shutdown(),
      () => unauthorizedConnector?.shutdown(),
      () => connector?.shutdown(),
      () =>
        unauthorizedServer.listening
          ? Servers.shutdown(unauthorizedServer)
          : undefined,
      () => (server.listening ? Servers.shutdown(server) : undefined),
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

  test("listParties returns the authorized LocalNet party", async () => {
    const { data: listed } = await apiClient.listPartiesV1();
    expect(listed.parties).toEqual([partyId]);
  });

  test("listParties rejects credentials that LocalNet cannot authenticate", async () => {
    await expect(unauthorizedApiClient.listPartiesV1()).rejects.toMatchObject({
      response: { status: 502 },
    });
  });

  test("transact creates a Ping on LocalNet", async () => {
    const pingId = `cacti-${randomUUID()}`;
    const { data: transaction } = await apiClient.runTransactionV1({
      partyId,
      commandId: `create-ping-${randomUUID()}`,
      commands: [createPingCommand(pingId, partyId)],
    });
    expect(transaction.updateId).not.toHaveLength(0);
    expect(transaction.completionOffset).toBeGreaterThan(0);
  });

  test("transact rejects credentials that LocalNet cannot authenticate", async () => {
    await expect(
      unauthorizedApiClient.runTransactionV1({
        partyId,
        commandId: `unauthorized-ping-${randomUUID()}`,
        commands: [createPingCommand(`cacti-${randomUUID()}`, partyId)],
      }),
    ).rejects.toMatchObject({ response: { status: 502 } });
  });

  test("transact rejects a duplicate command ID on LocalNet", async () => {
    const create = {
      partyId,
      commandId: `create-ping-${randomUUID()}`,
      commands: [createPingCommand(`cacti-${randomUUID()}`, partyId)],
    };
    await connector.transact(create);

    // A retry after an unknown outcome must reuse its commandId so Canton can
    // reject it instead of committing the same transaction twice.
    await expect(connector.transact(create)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test("getActiveContracts reads a Ping from the LocalNet ACS", async () => {
    const pingId = `cacti-${randomUUID()}`;
    const { data: transaction } = await apiClient.runTransactionV1({
      partyId,
      commandId: `create-ping-${randomUUID()}`,
      commands: [createPingCommand(pingId, partyId)],
    });

    const { data: byTemplate } = await apiClient.getActiveContractsV1({
      parties: [partyId],
      templateIds: [PING_TEMPLATE_ID],
    });
    expect(byTemplate.activeAtOffset).toBeGreaterThanOrEqual(
      transaction.completionOffset,
    );
    const ping = byTemplate.contracts.find(
      (contract) => contract.createArgument.id === pingId,
    );
    // The ledger reports the resolved package ID, not the package-name
    // reference used to submit the command.
    expect(ping).toMatchObject({
      templateId: expect.stringMatching(RESOLVED_PING_TEMPLATE_ID),
      signatories: expect.arrayContaining([partyId]),
      createArgument: { id: pingId, initiator: partyId, responder: partyId },
    });

    // A parties-only query uses a party-wide filter.
    const partyWide = await connector.getActiveContracts({
      parties: [partyId],
    });
    expect(
      partyWide.contracts.some(
        (contract) => contract.contractId === ping?.contractId,
      ) || partyWide.limitReached,
    ).toBe(true);

    // Each request's limit is honoured independently.
    const limited = await connector.getActiveContracts({
      parties: [partyId],
      limit: 1,
    });
    expect(limited.contracts).toHaveLength(1);
    expect(limited.limitReached).toBe(true);
  });

  test("getActiveContracts rejects credentials that LocalNet cannot authenticate", async () => {
    await expect(
      unauthorizedApiClient.getActiveContractsV1({
        parties: [partyId],
        templateIds: [PING_TEMPLATE_ID],
      }),
    ).rejects.toMatchObject({ response: { status: 502 } });
  });

  test("transact exercises Archive and removes the Ping from the ACS", async () => {
    const pingId = `cacti-${randomUUID()}`;
    await connector.transact({
      partyId,
      commandId: `create-ping-${randomUUID()}`,
      commands: [createPingCommand(pingId, partyId)],
    });

    const { contracts } = await connector.getActiveContracts({
      parties: [partyId],
      templateIds: [PING_TEMPLATE_ID],
    });
    const pings = contracts.filter(
      (contract) => contract.createArgument.id === pingId,
    );
    expect(pings).toHaveLength(1);
    const [ping] = pings;
    if (!ping) {
      throw new Error("The created Ping is not in the active contract set");
    }

    const archive = {
      partyId,
      commandId: `archive-ping-${randomUUID()}`,
      commands: [
        {
          ExerciseCommand: {
            templateId: PING_TEMPLATE_ID,
            contractId: ping.contractId,
            choice: "Archive",
            choiceArgument: {},
          },
        },
      ],
    };
    await connector.transact(archive);

    const afterArchive = await connector.getActiveContracts({
      parties: [partyId],
      templateIds: [PING_TEMPLATE_ID],
    });
    expect(
      afterArchive.contracts.map((contract) => contract.contractId),
    ).not.toContain(ping.contractId);
  });

  test("a second connector reads a contract created by the writer", async () => {
    const pingId = `two-connectors-${randomUUID()}`;
    const transaction = await connector.transact({
      partyId,
      commandId: `create-ping-${randomUUID()}`,
      commands: [createPingCommand(pingId, partyId)],
    });
    const snapshot = await readerConnector.getActiveContracts({
      parties: [partyId],
      templateIds: [PING_TEMPLATE_ID],
    });
    expect(snapshot.activeAtOffset).toBeGreaterThanOrEqual(
      transaction.completionOffset,
    );
    expect(snapshot.contracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          createArgument: {
            id: pingId,
            initiator: partyId,
            responder: partyId,
          },
        }),
      ]),
    );
  });

  test("a second connector cannot read a party outside its configured policy", async () => {
    const restrictedReader = new PluginLedgerConnectorCanton({
      instanceId: randomUUID(),
      ledgerClientUrl: connectionInfo.jsonLedgerApiHost,
      allowInsecureLoopbackHttp: true,
      auth: { method: "static", token: connectionInfo.ledgerApiAuthToken },
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      allowedPartyIds: [],
    });
    try {
      await expect(
        restrictedReader.getActiveContracts({ parties: [partyId] }),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(await restrictedReader.listParties()).toEqual({ parties: [] });
    } finally {
      await restrictedReader.shutdown();
    }
  });

  test("a second connector observes Archive submitted by the writer", async () => {
    const pingId = `two-connectors-archive-${randomUUID()}`;
    await connector.transact({
      partyId,
      commandId: `create-ping-${randomUUID()}`,
      commands: [createPingCommand(pingId, partyId)],
    });
    const before = await readerConnector.getActiveContracts({
      parties: [partyId],
      templateIds: [PING_TEMPLATE_ID],
    });
    const ping = before.contracts.find((c) => c.createArgument.id === pingId);
    expect(ping).toBeDefined();
    if (!ping) {
      throw new Error("Reader could not find the writer's Ping");
    }
    await connector.transact({
      partyId,
      commandId: `archive-ping-${randomUUID()}`,
      commands: [
        {
          ExerciseCommand: {
            templateId: PING_TEMPLATE_ID,
            contractId: ping.contractId,
            choice: "Archive",
            choiceArgument: {},
          },
        },
      ],
    });
    const after = await readerConnector.getActiveContracts({
      parties: [partyId],
      templateIds: [PING_TEMPLATE_ID],
    });
    expect(after.contracts.map((c) => c.contractId)).not.toContain(
      ping.contractId,
    );
  });
});
