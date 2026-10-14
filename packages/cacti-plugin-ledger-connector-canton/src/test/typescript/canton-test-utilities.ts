import http from "http";
import { AddressInfo } from "net";
import express from "express";
import { Servers } from "@hyperledger-cacti/cactus-common";
import { installOpenapiValidationMiddleware } from "@hyperledger-cacti/cactus-core";
import OAS from "../../main/json/openapi.json";
import {
  CantonApiClient,
  CantonApiClientOptions,
} from "../../main/typescript/public-api";
import { PluginLedgerConnectorCanton } from "../../main/typescript/plugin-ledger-connector-canton";
import type {
  ICantonActiveContractEntry,
  ICantonWalletSdk,
  ICantonWalletSdkFactory,
} from "../../main/typescript/canton-wallet-sdk";
import { CantonWalletSdkFactory } from "../../main/typescript/canton-wallet-sdk";
import type { CantonCommand } from "../../main/typescript/generated/openapi/typescript-axios";

export const auth = {
  method: "self_signed" as const,
  issuer: "unsafe-auth",
  credentials: {
    clientId: "ledger-api-user",
    clientSecret: "test-only-secret",
    audience: "https://canton.network.global",
    scope: "",
  },
};

export const VALID_COMMAND: CantonCommand = {
  CreateCommand: {
    templateId: "package:Module:Asset",
    createArguments: {},
  },
};

export function toAcsEntry(contract: {
  readonly synchronizerId: string;
  readonly [field: string]: unknown;
}): ICantonActiveContractEntry {
  const { synchronizerId, ...createdEvent } = contract;
  return {
    contractEntry: {
      JsActiveContract: {
        createdEvent: createdEvent as never,
        synchronizerId,
      },
    },
  };
}

export function createSdkMock(): ICantonWalletSdk {
  return {
    ledger: {
      ledgerEnd: jest.fn().mockResolvedValue(10),
      internal: {
        submit: jest.fn().mockResolvedValue({
          updateId: "update-1",
          completionOffset: 42,
        }),
      },
      acsReader: {
        raw: {
          read: jest.fn().mockResolvedValue([]),
        },
      },
    },
    party: {
      list: jest.fn().mockResolvedValue(["Alice::1220"]),
    },
  };
}

export function createConnector(
  walletSdkFactory: ICantonWalletSdkFactory,
  options: {
    readonly allowedPartyIds?: readonly string[];
    readonly operationTimeoutMs?: number;
    readonly maxInFlightOperations?: number;
    readonly maxActiveContractLimit?: number;
  } = {},
): PluginLedgerConnectorCanton {
  return new PluginLedgerConnectorCanton({
    instanceId: "canton-connector-test",
    ledgerClientUrl: "http://127.0.0.1:7575",
    allowInsecureLoopbackHttp: true,
    auth,
    pluginRegistry: {} as never,
    walletSdkFactory,
    ...(options.allowedPartyIds === undefined ? { allowAllParties: true } : {}),
    ...options,
  });
}

export function createCommandWithSerializedSize(size: number): CantonCommand[] {
  const command = {
    CreateCommand: {
      templateId: "package:Module:Asset",
      createArguments: { payload: "" },
    },
  };
  const commands: CantonCommand[] = [command];
  const baseSize = Buffer.byteLength(JSON.stringify(commands), "utf8");
  command.CreateCommand.createArguments.payload = "x".repeat(size - baseSize);
  return commands;
}

export function createCommandWithPayloadNesting(levels: number): CantonCommand {
  let payload: unknown = "leaf";
  for (let index = 0; index < levels; index++) {
    payload = { value: payload };
  }
  return {
    CreateCommand: {
      templateId: "package:Module:Asset",
      createArguments: { payload },
    },
  } as CantonCommand;
}

export function createFactoryFixture() {
  const sdk = createSdkMock();
  const cactiLog = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
  };
  const captured: {
    sdkLog?: (
      level: "info",
      context: Record<string, unknown>,
      message?: string,
    ) => void;
    clientOptions?: {
      baseUrl: URL;
      logger: Record<string, (...args: unknown[]) => unknown>;
      accessTokenProvider: unknown;
    };
    authLogger?: Record<string, (...args: unknown[]) => unknown>;
    ledgerClient?: Record<string, jest.Mock>;
    accessTokenProvider?: {
      getAuthContext: jest.Mock;
      getAccessToken: jest.Mock;
    };
    tokenProvider?: { getAuthContext: jest.Mock; getAccessToken: jest.Mock };
  } = {};
  const sdkCreate = jest.fn().mockResolvedValue(sdk);
  const moduleLoader = async () => ({
    SDK: { create: sdkCreate },
    CustomLogAdapter: class {
      public constructor(logFunction: typeof captured.sdkLog) {
        captured.sdkLog = logFunction;
      }
    },
    LedgerClient: class {
      public readonly getWithRetry = jest.fn();
      public readonly postWithRetry = jest.fn();
      public readonly patchWithRetry = jest.fn();
      public constructor(options: NonNullable<typeof captured.clientOptions>) {
        captured.clientOptions = options;
        captured.accessTokenProvider = options.accessTokenProvider as never;
        captured.ledgerClient = this as never;
      }
    },
    AuthTokenProvider: class {
      public readonly getAccessToken = jest.fn().mockResolvedValue("token");
      public readonly getAuthContext = jest
        .fn()
        .mockResolvedValue({ userId: "ledger-api-user" });
      public constructor(_config: unknown, logger: typeof captured.authLogger) {
        captured.authLogger = logger;
        captured.tokenProvider = this as never;
      }
    },
  });
  const factory = new CantonWalletSdkFactory(
    cactiLog as never,
    moduleLoader as never,
  );
  return { cactiLog, captured, factory, sdk, sdkCreate };
}

export const PING_TEMPLATE_ID =
  "#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping";

export const RESOLVED_PING_TEMPLATE_ID =
  /^[0-9a-f]{64}:Canton\.Internal\.Ping:Ping$/;

export function ledgerApiUserOf(token: string): string {
  const [, payload] = token.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new Error("The LocalNet token has no sub claim");
  }
  return claims.sub;
}

export function createPingCommand(pingId: string, partyId: string) {
  return {
    CreateCommand: {
      templateId: PING_TEMPLATE_ID,
      createArguments: {
        id: pingId,
        initiator: partyId,
        responder: partyId,
      },
    },
  };
}

export function invalidateJwt(token: string): string {
  const segments = token.split(".");
  const signature = segments[2];
  if (segments.length !== 3 || !signature) {
    throw new Error("The LocalNet token is not a signed JWT");
  }
  const replacement = signature[0] === "A" ? "B" : "A";
  segments[2] = `${replacement}${signature.slice(1)}`;
  return segments.join(".");
}

export async function startConnectorApi(
  app: express.Express,
  server: http.Server,
  connector: PluginLedgerConnectorCanton,
): Promise<CantonApiClient> {
  // Stand-in for the API server's JWT verification: it grants every connector
  // scope to the test request. Ledger authentication is still performed by
  // the real LocalNet participant using the connector's configured token.
  app.use(express.json({ limit: "1mb" }));
  app.use((req, _res, next) => {
    (req as typeof req & { auth: { scope: string[] } }).auth = {
      scope: [
        "write:canton-transactions",
        "read:canton-contracts",
        "read:canton-parties",
      ],
    };
    next();
  });
  await installOpenapiValidationMiddleware({
    app,
    apiSpec: OAS,
    logLevel: "INFO",
  });
  await connector.registerWebServices(app);
  const address = (await Servers.listen({
    hostname: "127.0.0.1",
    port: 0,
    server,
  })) as AddressInfo;
  return new CantonApiClient(
    new CantonApiClientOptions({
      basePath: `http://${address.address}:${address.port}`,
      accessToken: "test-only-token",
    }),
  );
}
