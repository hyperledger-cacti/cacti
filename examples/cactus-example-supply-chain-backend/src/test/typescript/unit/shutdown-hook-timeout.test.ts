import "jest-extended";

import { SupplyChainApp } from "../../../main/typescript/supply-chain-app";

describe("SupplyChainApp shutdown hooks with timeout", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("hung hook does not block shutdown and next hooks run", async () => {
    const app = new SupplyChainApp({ disableSignalHandlers: true, logLevel: "ERROR" });

    const log = (app as any).log;
    const warnSpy = jest.spyOn(log, "warn").mockImplementation(() => undefined);

    let secondRun = false;

    app.onShutdown(() => new Promise(() => {})); // never-resolving
    app.onShutdown(async () => {
      secondRun = true;
    });

    const stopPromise = app.stop();

    // advance past the timeout used by the implementation (5s)
    await jest.advanceTimersByTimeAsync(6_000);
    await stopPromise;

    expect(secondRun).toBeTrue();
    expect(warnSpy).toHaveBeenCalled();
  });

  test("normal hook resolves and subsequent hooks run", async () => {
    const app = new SupplyChainApp({ disableSignalHandlers: true, logLevel: "ERROR" });
    let a = false;
    let b = false;

    app.onShutdown(async () => {
      a = true;
    });
    app.onShutdown(async () => {
      b = true;
    });

    await app.stop();

    expect(a).toBeTrue();
    expect(b).toBeTrue();
  });

  test("rejected hook logs error and subsequent hooks run", async () => {
    const app = new SupplyChainApp({ disableSignalHandlers: true, logLevel: "ERROR" });
    const log = (app as any).log;
    const errorSpy = jest.spyOn(log, "error").mockImplementation(() => undefined);

    let ran = false;
    app.onShutdown(async () => {
      throw new Error("boom");
    });
    app.onShutdown(async () => {
      ran = true;
    });

    await app.stop();
    expect(ran).toBeTrue();
    expect(errorSpy).toHaveBeenCalled();
  });

  test("hook that resolves after timeout is treated as timed-out", async () => {
    const app = new SupplyChainApp({ disableSignalHandlers: true, logLevel: "ERROR" });
    const log = (app as any).log;
    const warnSpy = jest.spyOn(log, "warn").mockImplementation(() => undefined);

    let lateResolved = false;
    app.onShutdown(() =>
      new Promise<void>((resolve) => setTimeout(() => {
        lateResolved = true;
        resolve();
      }, 10_000)),
    );
    app.onShutdown(async () => {
      /* noop */
    });

    const stopPromise = app.stop();
    await jest.advanceTimersByTimeAsync(6_000);
    await stopPromise;

    expect(lateResolved).toBeFalse();
    expect(warnSpy).toHaveBeenCalled();
  });
});
