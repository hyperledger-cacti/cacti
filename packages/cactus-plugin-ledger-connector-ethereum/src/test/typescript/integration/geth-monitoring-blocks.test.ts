/**
 * Tests for block monitoring endpoint.
 */

//////////////////////////////////
// Constants
//////////////////////////////////

const testLogLevel: LogLevelDesc = "info";
const containerImageName = "ghcr.io/hyperledger/cacti-geth-all-in-one";
const containerImageVersion = "2023-07-27-2a8c48ed6";
const asyncTestTimeout = 1000 * 60 * 5; // 5 minutes

import "jest-extended";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { v4 as uuidV4 } from "uuid";
import { Server as SocketIoServer } from "socket.io";
import type { Subscription } from "rxjs";

import {
  LogLevelDesc,
  Servers,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { Configuration, Constants } from "@hyperledger/cactus-core-api";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { GethTestLedger } from "@hyperledger/cactus-test-geth-ledger";

import {
  PluginLedgerConnectorEthereum,
  EthereumApiClient,
  WatchBlocksV1Progress,
  Web3BlockHeader,
} from "../../../main/typescript/public-api";

const log: Logger = LoggerProvider.getOrCreate({
  label: "geth-monitoring-blocks.test",
  level: testLogLevel,
});
const NODE_TYPE_WEBSOCKET = "WebSocket";
const NODE_TYPE_HTTP = "HTTP";

/**
 * Common helper function for testing block monitoring scenarios.
 *
 * @param apiClient apiClient to running connector
 * @param getBlockData true / false to get full block data or just the headers
 * @param count test will wait and return `count` from the connector.
 * @param lastSeenBlock block to start monitoring from
 * @returns `count` number of blocks
 */
async function testWatchBlock(
  apiClient: EthereumApiClient,
  getBlockData: boolean,
  count = 1,
  lastSeenBlock?: number,
) {
  let subscription: Subscription | undefined = undefined;
  const blocksReceived: WatchBlocksV1Progress[] = [];

  // Wait for blocks
  await new Promise<boolean>((resolve, reject) => {
    const watchObservable = apiClient.watchBlocksV1({
      getBlockData,
      lastSeenBlock,
      httpPollInterval: 1000,
    });

    subscription = watchObservable.subscribe({
      next(event) {
        blocksReceived.push(event);
        log.debug(
          "Received event:",
          JSON.stringify(event),
          "count:",
          blocksReceived.length,
        );
        if (blocksReceived.length >= count) {
          subscription?.unsubscribe();
          resolve(true);
        }
      },
      error(err) {
        log.error("watchBlocksV1() error:", err);
        subscription?.unsubscribe();
        reject(err);
      },
    });
  });

  return blocksReceived;
}

/**
 * Function for validating some block header fields.
 * @param header block header from connector
 */
function assertBlockHeader(header?: Web3BlockHeader) {
  if (!header) {
    throw new Error("Header is missing!");
  }

  // Check if defined and with expected type
  // Ignore nullable / undefine-able fields
  expect(typeof header.parentHash).toEqual("string");
  expect(typeof header.sha3Uncles).toEqual("string");
  expect(typeof header.miner).toEqual("string");
  expect(typeof header.number).toEqual("string");
  expect(typeof header.gasLimit).toEqual("string");
  expect(typeof header.gasUsed).toEqual("string");
  expect(typeof header.difficulty).toEqual("string");
}

/**
 * All monitoring tests use single ledger instance for performance reasons.
 */
describe("Ethereum monitoring endpoints tests", () => {
  let ledger: GethTestLedger;
  let rpcApiWsHost: string;
  let rpcApiHttpHost: string;

  //////////////////////////////////
  // Setup ledger
  //////////////////////////////////

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
    await expect(pruning).resolves.toBeTruthy();

    ledger = new GethTestLedger({
      containerImageName,
      containerImageVersion,
    });
    await ledger.start();
    rpcApiHttpHost = await ledger.getRpcApiHttpHost();
    rpcApiWsHost = await ledger.getRpcApiWebSocketHost();
  });

  afterAll(async () => {
    if (ledger) {
      log.info("Closing ethereum ledger");
      await ledger.stop();
      await ledger.destroy();
    }

    const pruning = pruneDockerAllIfGithubAction({ logLevel: testLogLevel });
    await expect(pruning).resolves.toBeTruthy();
  });

  //////////////////////////////////
  // Tests
  //////////////////////////////////

  /**
   * Test suite will run for the following setups:
   * - WS ethereum node (subscription method)
   * - HTTP ethereum node (HTTP polling method)
   */
  describe.each([[NODE_TYPE_WEBSOCKET], [NODE_TYPE_HTTP]])(
    "Monitoring ethereum blocks with %p node connection test",
    (nodeType: string) => {
      let apiClient: EthereumApiClient;
      let connector: PluginLedgerConnectorEthereum;
      const expressApp = express();
      expressApp.use(bodyParser.json({ limit: "250mb" }));
      const server = http.createServer(expressApp);
      const wsApi = new SocketIoServer(server, {
        path: Constants.SocketIoConnectionPathV1,
      });

      beforeAll(async () => {
        log.warn("Using ledger node connection type:", nodeType);

        const addressInfo = await Servers.listen({
          hostname: "127.0.0.1",
          port: 0,
          server,
        });
        apiClient = new EthereumApiClient(
          new Configuration({
            basePath: `http://${addressInfo.address}:${addressInfo.port}`,
          }),
        );

        connector = new PluginLedgerConnectorEthereum({
          instanceId: uuidV4(),
          rpcApiHttpHost:
            nodeType === NODE_TYPE_HTTP ? rpcApiHttpHost : undefined,
          rpcApiWsHost:
            nodeType === NODE_TYPE_WEBSOCKET ? rpcApiWsHost : undefined,
          logLevel: testLogLevel,
          pluginRegistry: new PluginRegistry({ plugins: [] }),
        });
        await connector.getOrCreateWebServices();
        await connector.registerWebServices(expressApp, wsApi);
      });

      afterAll(async () => {
        if (server) {
          log.info("Shutdown connector servers");
          await Servers.shutdown(server);
        }

        if (connector) {
          log.info("Shutdown connector");
          await connector.shutdown();
        }
      });

      test(
        "Monitor new blocks headers on Ethereum",
        async () => {
          const ledgerEvents = await testWatchBlock(apiClient, false);
          expect(ledgerEvents).toBeTruthy();
          expect(ledgerEvents.length).toEqual(1);
          const ledgerEvent = ledgerEvents[0];
          // blockData should not be present if called with empty options
          expect(ledgerEvent.blockData).toBeUndefined();
          expect(ledgerEvent.blockHeader).toBeTruthy();
          expect((ledgerEvent as any).blockHeader.transactions).toBeUndefined();

          // check some fields
          assertBlockHeader(ledgerEvent.blockHeader);
        },
        asyncTestTimeout,
      );

      test(
        "Monitor new blocks data on Ethereum",
        async () => {
          const ledgerEvents = await testWatchBlock(apiClient, true);
          expect(ledgerEvents).toBeTruthy();
          expect(ledgerEvents.length).toEqual(1);
          const ledgerEvent = ledgerEvents[0];
          // blockHeader should not be present if called with getBlockData option
          expect(ledgerEvent.blockHeader).toBeUndefined();
          expect(ledgerEvent.blockData).toBeTruthy();

          // check some fields
          assertBlockHeader(ledgerEvent.blockData as Web3BlockHeader);
          expect(typeof ledgerEvent.blockData?.transactions).toEqual("object");
          expect(typeof ledgerEvent.blockData?.size).toEqual("string");
          expect(typeof ledgerEvent.blockData?.totalDifficulty).toEqual(
            "string",
          );
          expect(typeof ledgerEvent.blockData?.uncles).toEqual("object");
        },
        asyncTestTimeout,
      );

      /**
       * Tests checks if missing blocks since lastSeenBlock are also pushed, and also that:
       * - Blocks are reported in order
       * - Blocks are not duplicated
       */
      test(
        "Monitor pushes missing block since lastSeenBlock",
        async () => {
          const missingBlocksCount = 3;

          // Wait until some blocks are created
          const olderBlocks = await testWatchBlock(
            apiClient,
            false,
            missingBlocksCount,
          );
          expect(olderBlocks).toBeTruthy();
          expect(olderBlocks.length).toEqual(missingBlocksCount);
          const missingBlockNumbers = olderBlocks.map((block) =>
            parseInt(block.blockHeader?.number as string, 10),
          );
          // should be pushed in order
          expect(missingBlockNumbers).toEqual(
            missingBlockNumbers.sort((a, b) => a - b),
          );
          // should push unique blocks (no duplicates)
          expect(new Set(missingBlockNumbers).size).toEqual(
            missingBlockNumbers.length,
          );
          log.debug("missingBlockNumbers:", missingBlockNumbers);

          // get blocks including missing ones
          const newBlocksToGet = 1;
          const blocksWithMissingOnes = await testWatchBlock(
            apiClient,
            false,
            missingBlocksCount + newBlocksToGet, // wait for all the missing and some new blocks
            missingBlockNumbers[0] - 1, // assume we've seen one block before the first missing one
          );
          expect(blocksWithMissingOnes).toBeTruthy();
          expect(blocksWithMissingOnes.length).toEqual(
            missingBlocksCount + newBlocksToGet,
          );
          const returnedBlockNumbers = blocksWithMissingOnes.map((block) =>
            parseInt(block.blockHeader?.number as string, 10),
          );
          // should be pushed in order
          expect(returnedBlockNumbers).toEqual(
            returnedBlockNumbers.sort((a, b) => a - b),
          );
          // should push unique blocks (no duplicates)
          expect(new Set(returnedBlockNumbers).size).toEqual(
            returnedBlockNumbers.length,
          );
          log.debug("returnedBlockNumbers:", returnedBlockNumbers);

          // Ensure missing blocks were returned
          expect(returnedBlockNumbers).toIncludeAllMembers(missingBlockNumbers);
          expect(returnedBlockNumbers.slice(0, missingBlocksCount)).toEqual(
            missingBlockNumbers,
          ); // should start with the missing blocks
        },
        asyncTestTimeout,
      );
    },
  );
});
