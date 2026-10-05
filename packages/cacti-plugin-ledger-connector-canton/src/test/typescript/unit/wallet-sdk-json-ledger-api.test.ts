import http from "http";
import { AddressInfo } from "net";

import { Servers } from "@hyperledger-cacti/cactus-common";

import { PluginLedgerConnectorCanton } from "../../../main/typescript/public-api";

/**
 * Runs the connector with the real Wallet SDK (loaded through its ESM entry
 * point) against an in-process stand-in for the Canton JSON Ledger API. This
 * catches SDK loading and runtime incompatibilities without Docker. Run Jest
 * with NODE_OPTIONS=--experimental-vm-modules.
 */
describe("Canton connector with the real Wallet SDK", () => {
  interface IRecordedRequest {
    readonly method?: string;
    readonly path: string;
    readonly query: URLSearchParams;
    readonly body: unknown;
    readonly authorization?: string;
  }

  const requests: IRecordedRequest[] = [];
  const contractIds = ["contract-1", "contract-2", "contract-3"];
  const server = http.createServer((req, res) => {
    let rawBody = "";
    req.on("data", (chunk) => (rawBody += chunk));
    req.on("end", () => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      requests.push({
        method: req.method,
        path: url.pathname,
        query: url.searchParams,
        body: rawBody ? JSON.parse(rawBody) : undefined,
        authorization: req.headers.authorization,
      });
      res.setHeader("content-type", "application/json");
      const response = respond(url);
      if (response === undefined) {
        res.statusCode = 404;
        res.end(JSON.stringify({ code: "NOT_FOUND" }));
        return;
      }
      res.end(JSON.stringify(response));
    });
  });

  function respond(url: URL): unknown {
    const user = {
      id: "ledger-api-user",
      primaryParty: "Alice::1220",
      isDeactivated: false,
      identityProviderId: "",
    };
    switch (url.pathname) {
      case "/v2/version":
        return { version: "3.4.0", features: {} };
      case "/v2/authenticated-user":
        return { user };
      case "/v2/state/connected-synchronizers":
        return {
          connectedSynchronizers: [
            {
              synchronizerAlias: "global",
              synchronizerId: "synchronizer::1220",
              permission: "PARTICIPANT_PERMISSION_SUBMISSION",
            },
          ],
        };
      case "/v2/users/ledger-api-user/rights":
        return {
          rights: [{ kind: { CanActAs: { value: { party: "Alice::1220" } } } }],
        };
      case "/v2/state/ledger-end":
        return { offset: 10 };
      case "/v2/state/active-contracts": {
        const limit = Number(url.searchParams.get("limit") ?? Infinity);
        return contractIds.slice(0, limit).map((contractId) => ({
          contractEntry: {
            JsActiveContract: {
              createdEvent: {
                offset: 5,
                nodeId: 0,
                contractId,
                templateId: "package:Module:Asset",
                createArgument: { owner: "Alice::1220", note: null },
                witnessParties: ["Alice::1220"],
                signatories: ["Alice::1220"],
                createdAt: "2026-10-02T00:00:00Z",
                packageName: "asset",
                representativePackageId: "package",
                acsDelta: true,
              },
              synchronizerId: "synchronizer::1220",
              reassignmentCounter: 0,
            },
          },
        }));
      }
      case "/v2/commands/submit-and-wait":
        return { updateId: "update-1", completionOffset: 11 };
      default:
        return undefined;
    }
  }

  function base64Url(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
  }

  // The SDK decodes, but does not verify, a static token's expiry.
  const token = [
    base64Url({ alg: "HS256", typ: "JWT" }),
    base64Url({
      sub: "ledger-api-user",
      aud: "https://canton.network.global",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    "test-only-signature",
  ].join(".");

  let connector: PluginLedgerConnectorCanton;

  function activeContractRequests(): IRecordedRequest[] {
    return requests.filter(
      (request) => request.path === "/v2/state/active-contracts",
    );
  }

  beforeAll(async () => {
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server.address() as AddressInfo;
    connector = new PluginLedgerConnectorCanton({
      instanceId: "canton-wallet-sdk-test",
      ledgerClientUrl: `http://127.0.0.1:${port}`,
      allowInsecureLoopbackHttp: true,
      auth: { method: "static", token },
      pluginRegistry: {} as never,
      logLevel: "SILENT",
    });
  });

  afterAll(async () => {
    await connector?.shutdown();
    await Servers.shutdown(server);
  });

  beforeEach(() => {
    requests.length = 0;
  });

  test("initializes the SDK and lists parties", async () => {
    await expect(connector.listParties()).resolves.toEqual({
      parties: ["Alice::1220"],
    });
    expect(
      requests.every((request) => request.authorization === `Bearer ${token}`),
    ).toBe(true);
  });

  test("reads a parties-only query with one party-wide ACS request", async () => {
    const response = await connector.getActiveContracts({
      parties: ["Alice::1220"],
    });

    expect(response.contracts.map((contract) => contract.contractId)).toEqual(
      contractIds,
    );
    expect(response.contracts[0].createArgument).toEqual({
      owner: "Alice::1220",
      note: null,
    });
    expect(activeContractRequests()).toHaveLength(1);
    expect(activeContractRequests()[0].body).toMatchObject({
      eventFormat: { filtersByParty: { "Alice::1220": { cumulative: [] } } },
    });
  });

  test("reads several parties and templates with one ACS request and no duplicates", async () => {
    const response = await connector.getActiveContracts({
      parties: ["Alice::1220", "Bob::1220"],
      templateIds: ["package:Module:Asset", "package:Module:Other"],
    });

    const ids = response.contracts.map((contract) => contract.contractId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(activeContractRequests()).toHaveLength(1);
  });

  test("honours each request limit without reusing an earlier snapshot", async () => {
    const first = await connector.getActiveContracts({
      parties: ["Alice::1220"],
      limit: 1,
    });
    const second = await connector.getActiveContracts({
      parties: ["Alice::1220"],
      limit: 100,
    });

    expect(first.contracts).toHaveLength(1);
    expect(second.contracts).toHaveLength(3);
    expect(
      activeContractRequests().map((request) => request.query.get("limit")),
    ).toEqual(["1", "100"]);
  });

  test("submits with the caller's command ID and null Daml values", async () => {
    await expect(
      connector.transact({
        partyId: "Alice::1220",
        commandId: "asset-order-42-create",
        commands: [
          {
            CreateCommand: {
              templateId: "package:Module:Asset",
              createArguments: { owner: "Alice::1220", note: null },
            },
          },
        ],
      }),
    ).resolves.toEqual({ updateId: "update-1", completionOffset: 11 });

    const submit = requests.find(
      (request) => request.path === "/v2/commands/submit-and-wait",
    );
    expect(submit?.body).toMatchObject({
      commandId: "asset-order-42-create",
      actAs: ["Alice::1220"],
      commands: [
        {
          CreateCommand: {
            createArguments: { owner: "Alice::1220", note: null },
          },
        },
      ],
    });
  });
});
