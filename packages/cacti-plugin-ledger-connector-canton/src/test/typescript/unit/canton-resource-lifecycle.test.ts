import {
  createConnector,
  createSdkMock,
  VALID_COMMAND,
} from "../canton-test-utilities";
import type { ICantonWalletSdk } from "../../../main/typescript/canton-wallet-sdk";

describe("Canton SDK resource ownership", () => {
  test("disposes an initialized SDK once across concurrent shutdown calls", async () => {
    const sdk = {
      ...createSdkMock(),
      dispose: jest.fn().mockResolvedValue(undefined),
    };
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });
    await connector.listParties();
    await Promise.all([connector.shutdown(), connector.shutdown()]);
    expect(sdk.dispose).toHaveBeenCalledTimes(1);
  });

  test("disposes SDK initialization that finishes after shutdown", async () => {
    const sdk = {
      ...createSdkMock(),
      dispose: jest.fn().mockResolvedValue(undefined),
    };
    let resolveSdk!: (value: ICantonWalletSdk) => void;
    let resolveStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });
    const connector = createConnector({
      create: jest.fn(() => {
        resolveStarted();
        return new Promise<ICantonWalletSdk>((resolve) => {
          resolveSdk = resolve;
        });
      }),
    });
    const pending = connector.listParties();
    const rejected = expect(pending).rejects.toMatchObject({ statusCode: 503 });
    await started;
    const shutdown = connector.shutdown();
    resolveSdk(sdk);
    await Promise.all([shutdown, rejected]);
    expect(sdk.dispose).toHaveBeenCalledTimes(1);
  });

  test.each([" Alice::1220", "Alice::1220 "])(
    "rejects noncanonical party ID %j before submitting",
    async (partyId) => {
      const sdk = createSdkMock();
      const connector = createConnector({
        create: jest.fn().mockResolvedValue(sdk),
      });
      await expect(
        connector.transact({
          partyId,
          commandId: "canonical-test",
          commands: [VALID_COMMAND],
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(sdk.ledger.internal.submit).not.toHaveBeenCalled();
    },
  );

  test("disposes an abandoned initialization without disposing its retry", async () => {
    jest.useFakeTimers();
    try {
      const stale = {
        ...createSdkMock(),
        dispose: jest.fn().mockResolvedValue(undefined),
      };
      const current = {
        ...createSdkMock(),
        dispose: jest.fn().mockResolvedValue(undefined),
      };
      let finish!: (sdk: ICantonWalletSdk) => void;
      const create = jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<ICantonWalletSdk>((resolve) => {
              finish = resolve;
            }),
        )
        .mockResolvedValue(current);
      const connector = createConnector({ create }, { operationTimeoutMs: 25 });
      const first = expect(connector.listParties()).rejects.toMatchObject({
        statusCode: 504,
      });
      await jest.advanceTimersByTimeAsync(25);
      await first;
      await connector.listParties();
      finish(stale);
      await jest.advanceTimersByTimeAsync(0);
      expect(stale.dispose).toHaveBeenCalledTimes(1);
      expect(current.dispose).not.toHaveBeenCalled();
      await connector.shutdown();
      expect(current.dispose).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  test("does not fold case in party authorization", async () => {
    const sdk = createSdkMock();
    const connector = createConnector(
      { create: jest.fn().mockResolvedValue(sdk) },
      { allowedPartyIds: ["Alice::1220"] },
    );
    await expect(
      connector.transact({
        partyId: "alice::1220",
        commandId: "case-test",
        commands: [VALID_COMMAND],
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(sdk.ledger.internal.submit).not.toHaveBeenCalled();
  });
});
