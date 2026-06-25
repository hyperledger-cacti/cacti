/**
 * Unit tests for CordaApiClient#watchBlocksAsyncV1 re-entrancy fix.
 *
 * Verifies that when the Corda REST API responds slower than pollRate,
 * each transaction is still delivered exactly once to subscribers (no duplicates).
 *
 * Regression test for: https://github.com/hyperledger-cacti/cacti/issues/4231
 */

import "jest-extended";
import { Subscription } from "rxjs";

import {
  CordaApiClient,
  CordaApiClientOptions,
} from "../../../main/typescript/api-client/corda-api-client";

// poll interval shorter than the simulated slow response so the old
// setInterval approach would have fired a second tick mid-flight
const POLL_RATE_MS = 100;
const SLOW_RESPONSE_MS = 250;

function makeClient(): CordaApiClient {
  const client = new CordaApiClient(
    new CordaApiClientOptions({ basePath: "http://localhost:8080" }),
  );

  jest.spyOn(client, "startMonitorV1").mockResolvedValue({
    status: 200,
    data: { success: true },
  } as any);

  jest.spyOn(client, "stopMonitorV1").mockResolvedValue({
    status: 200,
    data: { success: true, msg: "" },
  } as any);

  jest.spyOn(client, "clearMonitorTransactionsV1").mockResolvedValue({
    status: 200,
    data: { success: true },
  } as any);

  return client;
}

describe("CordaApiClient#watchBlocksAsyncV1", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test(
    "delivers each transaction exactly once when poll response is slower than pollRate",
    async () => {
      const client = makeClient();
      let callCount = 0;

      // First call: returns one transaction but only after SLOW_RESPONSE_MS.
      // With the old setInterval approach a second poll tick fires at t=100ms
      // while the first response only arrives at t=250ms. Both iterations
      // see the same un-cleared transaction and both call subject.next,
      // delivering the transaction twice.
      // After the fix the next poll is only scheduled after the current one
      // completes, so the transaction is delivered exactly once.
      jest
        .spyOn(client, "getMonitorTransactionsV1")
        .mockImplementation(async () => {
          callCount++;
          await new Promise((resolve) =>
            setTimeout(resolve, SLOW_RESPONSE_MS),
          );
          if (callCount === 1) {
            return {
              status: 200,
              data: {
                success: true,
                stateFullClassName: "test.State",
                tx: [{ index: "0", data: "payload-1" }],
              },
            } as any;
          }
          return {
            status: 200,
            data: {
              success: true,
              stateFullClassName: "test.State",
              tx: undefined,
            },
          } as any;
        });

      const observable = await client.watchBlocksAsyncV1({
        clientAppId: "unit-test-client",
        stateFullClassName: "test.State",
        pollRate: POLL_RATE_MS,
      });

      const received: unknown[] = [];
      let sub: Subscription | undefined;

      // Wait until the first (and only) transaction arrives
      await new Promise<void>((resolve, reject) => {
        sub = observable.subscribe({
          next: (tx) => {
            received.push(tx);
            resolve();
          },
          error: reject,
        });
      });

      // Allow several more poll cycles — any duplicate would appear here
      await new Promise((resolve) =>
        setTimeout(resolve, SLOW_RESPONSE_MS * 4),
      );

      sub?.unsubscribe();

      expect(received).toHaveLength(1);
    },
    30_000,
  );

  test(
    "stops polling after unsubscribe and does not deliver further transactions",
    async () => {
      const client = makeClient();

      jest
        .spyOn(client, "getMonitorTransactionsV1")
        .mockResolvedValue({
          status: 200,
          data: {
            success: true,
            stateFullClassName: "test.State",
            tx: undefined,
          },
        } as any);

      const observable = await client.watchBlocksAsyncV1({
        clientAppId: "unit-test-client",
        stateFullClassName: "test.State",
        pollRate: POLL_RATE_MS,
      });

      const sub = observable.subscribe({ next: () => undefined });

      // Let a few polls run
      await new Promise((resolve) => setTimeout(resolve, POLL_RATE_MS * 4));
      sub.unsubscribe();

      // Wait long enough for any in-flight poll to settle
      await new Promise((resolve) =>
        setTimeout(resolve, SLOW_RESPONSE_MS + POLL_RATE_MS),
      );
      const countAtStop =
        (client.getMonitorTransactionsV1 as jest.Mock).mock.calls.length;

      // Wait another window — no new polls should be scheduled after cancel
      await new Promise((resolve) =>
        setTimeout(resolve, POLL_RATE_MS * 4),
      );
      const countAfterWait =
        (client.getMonitorTransactionsV1 as jest.Mock).mock.calls.length;

      expect(countAtStop).toBeGreaterThan(0);
      expect(countAfterWait).toBe(countAtStop);
    },
    30_000,
  );
});
