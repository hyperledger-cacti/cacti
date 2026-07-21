import { EventEmitter } from "events";
import {
  IWatchBlocksV1EndpointConfiguration,
  WatchBlocksV1HttpPollEndpoint,
} from "../../../main/typescript/web-services/watch-blocks-v1-endpoint";

describe("WatchBlocksV1HttpPollEndpoint", () => {
  test("does not overlap ticks on slow RPC", async () => {
    let isFetching = false;
    let maxConcurrentFetches = 0;
    let totalFetches = 0;

    const mockSocket = new EventEmitter() as any;
    mockSocket.id = "mock-socket-id";
    mockSocket.emit = () => {
      /* stub */
    };

    const mockWeb3 = {
      eth: {
        getBlockNumber: async () => {
          return 10;
        },
        getBlock: async () => {
          if (isFetching) {
            maxConcurrentFetches++;
          }
          isFetching = true;
          totalFetches++;

          // Artificial delay longer than httpPollInterval to simulate a slow RPC
          await new Promise((resolve) => setTimeout(resolve, 100));

          isFetching = false;
          return {
            number: 1,
            hash: "0x123",
            parentHash: "0xabc",
            nonce: "0x0",
            sha3Uncles: "0xdef",
            logsBloom: "0x",
            transactionsRoot: "0x",
            stateRoot: "0x",
            miner: "0x",
            difficulty: "0x",
            totalDifficulty: "0x",
            extraData: "0x",
            size: 100,
            gasLimit: 8000000,
            gasUsed: 21000,
            timestamp: 1234567890,
            transactions: [],
            uncles: [],
          };
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const config: IWatchBlocksV1EndpointConfiguration = {
      logLevel: "TRACE",
      socket: mockSocket,
      web3: mockWeb3,
      options: {
        httpPollInterval: 20,
        lastSeenBlock: 0,
        getBlockData: true,
      },
    };

    const endpoint = new WatchBlocksV1HttpPollEndpoint(config);

    await endpoint.subscribe();

    // Wait for 300ms, which is enough time for at least 3 overlapping ticks
    await new Promise((resolve) => setTimeout(resolve, 300));

    await endpoint.unsubscribe();

    expect(maxConcurrentFetches).toBe(0);
    expect(totalFetches).toBeGreaterThan(0);
  });

  test("handles quick subscribe calls properly", async () => {
    let totalFetches = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSocket = new EventEmitter() as any;
    mockSocket.id = "mock-socket-id-2";
    mockSocket.emit = () => {
      /* stub */
    };

    // Mock Web3
    const mockWeb3 = {
      eth: {
        getBlockNumber: async () => {
          return 10;
        },
        getBlock: async () => {
          totalFetches++;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            number: 1,
            sha3Uncles: "0xdef",
            transactions: [],
          };
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const config: IWatchBlocksV1EndpointConfiguration = {
      logLevel: "TRACE",
      socket: mockSocket,
      web3: mockWeb3,
      options: {
        httpPollInterval: 20,
        lastSeenBlock: 0,
        getBlockData: true,
      },
    };

    const endpoint = new WatchBlocksV1HttpPollEndpoint(config);

    // Trigger multiple quick subscribe calls while fetching is in-flight
    await endpoint.subscribe();
    await new Promise((resolve) => setTimeout(resolve, 10));
    await endpoint.subscribe();

    await new Promise((resolve) => setTimeout(resolve, 100));

    await endpoint.unsubscribe();

    // Because of pollGeneration tokens, the old tick should self-terminate
    // and only the new tick should continue running.
    expect(totalFetches).toBeGreaterThan(0);
  });
});
