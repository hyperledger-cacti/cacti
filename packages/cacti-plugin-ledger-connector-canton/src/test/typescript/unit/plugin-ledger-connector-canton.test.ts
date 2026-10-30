import {
  MAX_IN_FLIGHT_OPERATIONS,
  MAX_OPERATION_TIMEOUT_MS,
} from "../../../main/typescript/plugin-ledger-connector-canton";
import type { ICantonWalletSdk } from "../../../main/typescript/canton-wallet-sdk";
import { ConsensusAlgorithmFamily } from "@hyperledger-cacti/cactus-core-api";
import {
  VALID_COMMAND,
  createSdkMock,
  createConnector,
} from "../canton-test-utilities";

jest.setTimeout(30_000);

describe("Canton connector: lifecycle", () => {
  test("initializes lazily and does not create the Wallet SDK on plugin init", async () => {
    const create = jest.fn();
    const connector = createConnector({ create });

    await expect(connector.onPluginInit()).resolves.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });

  test("creates one Wallet SDK instance for concurrent first operations", async () => {
    const sdk = createSdkMock();
    const create = jest.fn().mockResolvedValue(sdk);
    const connector = createConnector({ create });

    await Promise.all([
      connector.listParties(),
      connector.getActiveContracts({ parties: ["Alice::1220"] }),
    ]);

    expect(create).toHaveBeenCalledTimes(1);
  });

  test("rejects new ledger work after shutdown", async () => {
    const sdk = createSdkMock();
    const create = jest.fn().mockResolvedValue(sdk);
    const connector = createConnector({ create });
    await connector.listParties();

    await connector.shutdown();

    await expect(connector.listParties()).rejects.toMatchObject({
      statusCode: 503,
      message: expect.stringMatching(/has been shut down/i),
    });
    await expect(
      connector.getActiveContracts({ parties: ["Alice::1220"] }),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(create).toHaveBeenCalledTimes(1);
    expect(sdk.party.list).toHaveBeenCalledTimes(1);
  });

  test("shutdown waits for pending upstream operations to settle", async () => {
    const sdk = createSdkMock();
    let resolveList: ((parties: string[]) => void) | undefined;
    jest.mocked(sdk.party.list).mockImplementationOnce(
      () =>
        new Promise<string[]>((resolve) => {
          resolveList = resolve;
        }),
    );
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });
    const operation = connector.listParties();
    await new Promise((resolve) => setImmediate(resolve));
    expect(resolveList).toBeDefined();

    let shutdownFinished = false;
    const shutdown = connector.shutdown().then(() => {
      shutdownFinished = true;
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(shutdownFinished).toBe(false);

    resolveList?.(["Alice::1220"]);
    await shutdown;
    await expect(operation).resolves.toEqual({ parties: ["Alice::1220"] });
  });

  test("shutdown waits up to the operation timeout for abandoned work, then warns", async () => {
    jest.useFakeTimers();
    try {
      const sdk = createSdkMock();
      jest
        .mocked(sdk.party.list)
        .mockImplementation(() => new Promise(() => undefined));
      const connector = createConnector(
        { create: jest.fn().mockResolvedValue(sdk) },
        { operationTimeoutMs: 25 },
      );
      const warn = jest.spyOn(
        (connector as unknown as { log: { warn: () => void } }).log,
        "warn",
      );
      const operation = connector.listParties();
      const rejection = expect(operation).rejects.toMatchObject({
        statusCode: 504,
      });
      await jest.advanceTimersByTimeAsync(25);
      await rejection;

      let settled = false;
      const shutdown = connector.shutdown().then(() => {
        settled = true;
      });
      await jest.advanceTimersByTimeAsync(24);
      expect(settled).toBe(false);
      await jest.advanceTimersByTimeAsync(1);
      await shutdown;

      expect(settled).toBe(true);
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /1 Canton Wallet SDK operation\(s\) were still pending/,
        ),
      );
    } finally {
      jest.useRealTimers();
    }
  }, 10_000);

  test("an operation waiting for SDK initialization at shutdown is rejected with 503", async () => {
    const sdk = createSdkMock();
    let resolveFirst: ((value: ICantonWalletSdk) => void) | undefined;
    const create = jest.fn().mockImplementationOnce(
      () =>
        new Promise<ICantonWalletSdk>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const connector = createConnector({ create });
    const firstOperation = connector.listParties();
    await new Promise((resolve) => setImmediate(resolve));

    const shutdown = connector.shutdown();
    resolveFirst?.(sdk);
    await shutdown;

    await expect(firstOperation).rejects.toMatchObject({ statusCode: 503 });
    await expect(connector.listParties()).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(sdk.party.list).not.toHaveBeenCalled();
  });

  test("times out a Wallet SDK operation at the configured deadline", async () => {
    jest.useFakeTimers();
    try {
      const sdk = createSdkMock();
      jest
        .mocked(sdk.ledger.internal.submit)
        .mockImplementation(() => new Promise(() => undefined));
      const connector = createConnector(
        { create: jest.fn().mockResolvedValue(sdk) },
        { operationTimeoutMs: 25 },
      );
      const result = connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
        commands: [VALID_COMMAND],
      });
      const rejection = expect(result).rejects.toThrow(
        /exceeded 25 ms; the final transaction outcome is unknown/i,
      );

      await jest.advanceTimersByTimeAsync(25);
      await rejection;
    } finally {
      jest.useRealTimers();
    }
  });

  test("rejects an operation timeout above the supported maximum", () => {
    expect(() =>
      createConnector(
        { create: jest.fn() },
        { operationTimeoutMs: MAX_OPERATION_TIMEOUT_MS + 1 },
      ),
    ).toThrow(/operationTimeoutMs must be an integer between/i);
  });

  test("retries Wallet SDK creation after a failed initialization", async () => {
    const sdk = createSdkMock();
    const create = jest
      .fn()
      .mockRejectedValueOnce(new Error("ledger unavailable"))
      .mockResolvedValueOnce(sdk);
    const connector = createConnector({ create });

    await expect(connector.listParties()).rejects.toThrow("ledger unavailable");
    await expect(connector.listParties()).resolves.toEqual({
      parties: ["Alice::1220"],
    });
    expect(create).toHaveBeenCalledTimes(2);
  });

  test("retries Wallet SDK creation after an initialization timeout", async () => {
    jest.useFakeTimers();
    try {
      const sdk = createSdkMock();
      const create = jest
        .fn()
        .mockImplementationOnce(() => new Promise(() => undefined))
        .mockResolvedValueOnce(sdk);
      const connector = createConnector({ create }, { operationTimeoutMs: 25 });
      const firstOperation = connector.listParties();
      const firstRejection = expect(firstOperation).rejects.toThrow(
        /Wallet SDK initialization exceeded 25 ms/i,
      );

      await jest.advanceTimersByTimeAsync(25);
      await firstRejection;
      await expect(connector.listParties()).resolves.toEqual({
        parties: ["Alice::1220"],
      });

      expect(create).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  test("reports authority consensus with transaction finality", async () => {
    const connector = createConnector({ create: jest.fn() });

    await expect(connector.getConsensusAlgorithmFamily()).resolves.toBe(
      ConsensusAlgorithmFamily.OrgHyperledgerCactusConsensusalgorithmProofOfAuthority,
    );
    await expect(connector.hasTransactionFinality()).resolves.toBe(true);
  });

  test("rejects work beyond the in-flight limit until abandoned operations settle", async () => {
    jest.useFakeTimers();
    try {
      const sdk = createSdkMock();
      const pending: Array<(parties: string[]) => void> = [];
      jest.mocked(sdk.party.list).mockImplementation(
        () =>
          new Promise<string[]>((resolve) => {
            pending.push(resolve);
          }),
      );
      const connector = createConnector(
        { create: jest.fn().mockResolvedValue(sdk) },
        { operationTimeoutMs: 25, maxInFlightOperations: 2 },
      );

      const timedOut = [connector.listParties(), connector.listParties()];
      const rejections = timedOut.map((operation) =>
        expect(operation).rejects.toMatchObject({ statusCode: 504 }),
      );
      await jest.advanceTimersByTimeAsync(25);
      await Promise.all(rejections);
      expect(pending).toHaveLength(2);

      // Both callers gave up, but the upstream calls are still running and
      // keep their slots.
      await expect(connector.listParties()).rejects.toMatchObject({
        statusCode: 503,
        message: expect.stringMatching(/too many pending ledger operations/i),
      });
      expect(sdk.party.list).toHaveBeenCalledTimes(2);

      pending[0](["Alice::1220"]);
      await jest.advanceTimersByTimeAsync(0);
      const next = connector.listParties();
      await jest.advanceTimersByTimeAsync(0);
      pending[2](["Alice::1220"]);
      await expect(next).resolves.toEqual({ parties: ["Alice::1220"] });
    } finally {
      jest.useRealTimers();
    }
  });

  test("counts a timed-out SDK initialization against the in-flight limit", async () => {
    jest.useFakeTimers();
    try {
      const create = jest.fn(
        () => new Promise<ICantonWalletSdk>(() => undefined),
      );
      const connector = createConnector(
        { create },
        { operationTimeoutMs: 25, maxInFlightOperations: 1 },
      );
      const first = connector.listParties();
      const firstRejection = expect(first).rejects.toMatchObject({
        statusCode: 504,
      });
      await jest.advanceTimersByTimeAsync(25);
      await firstRejection;

      await expect(connector.listParties()).rejects.toMatchObject({
        statusCode: 503,
      });
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  test("rejects an in-flight operation limit outside the supported range", () => {
    for (const maxInFlightOperations of [
      0,
      MAX_IN_FLIGHT_OPERATIONS + 1,
      1.5,
    ]) {
      expect(() =>
        createConnector({ create: jest.fn() }, { maxInFlightOperations }),
      ).toThrow(/maxInFlightOperations must be an integer between/i);
    }
  });
});
