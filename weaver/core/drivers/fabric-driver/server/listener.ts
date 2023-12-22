/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fabproto6 from "fabric-protos";
import { BlockDecoder } from "fabric-common/index";
import { Gateway, Network, BlockListener, BlockEvent } from "fabric-network";
import query_pb from "@hyperledger/cacti-weaver-protos-js/common/query_pb";
import events_pb from "@hyperledger/cacti-weaver-protos-js/common/events_pb";
import { lookupEventSubscriptions, readAllEventMatchers } from "./events";
import { invoke, getNetworkGateway, packageFabricView } from "./fabric-code";
import {
  handlePromise,
  relayCallback,
  getRelayClientForEventPublish,
} from "./utils";
import { DBConnector, LevelDBConnector } from "./dbConnector";
import logger from "./logger";

const networkGatewayMap = new Map<string, Gateway>();
const networkChannelMap = new Map<string, Network>();
const channelBlockListenerMap = new Map<string, BlockListener>();
const channelContractListenerMap = new Map<string, boolean>();
const globalLedgerListenerCount = new Map<string, number>();

const DB_NAME: string = "BLOCKCHAIN_DB";
const DB_OPEN_TIMEOUT = 20000;
const BH_KEY = "LAST_BLOCK_HEIGHT";

function getChannelContractKey(channelId: string, contractId: string) {
  return channelId + ":" + contractId;
}
function getBHKey(channelId: string) {
  return BH_KEY + ":" + channelId;
}

async function setLastReadBlockNumber(
  db: DBConnector,
  channelId: string,
  blockNum: number,
) {
  logger.debug(
    `Set last read block number ${blockNum} on channel: ${channelId}`,
  );
  await db.insert(getBHKey(channelId), blockNum);
}
async function getLastReadBlockNumber(
  db: DBConnector,
  channelId: string,
): Promise<number> {
  try {
    const blockNum = await db.read(getBHKey(channelId));
    return blockNum;
  } catch (error: any) {
    logger.error(`Error during GET block number in db: ${error.toString()}`);
    throw error;
  }
}

function createEventMatcher(eventName, channelId, chaincodeId, functionName) {
  const eventMatcher = new events_pb.EventMatcher();
  eventMatcher.setEventType(events_pb.EventType.LEDGER_STATE);
  eventMatcher.setEventClassId(eventName);
  eventMatcher.setTransactionLedgerId(channelId);
  eventMatcher.setTransactionContractId(chaincodeId);
  eventMatcher.setTransactionFunc(functionName);
  return eventMatcher;
}

async function eventHandler(
  eventMatcher: events_pb.EventMatcher,
  eventPayload: Buffer,
  networkName: string,
  loggerName: string,
) {
  logger.info(
    `${loggerName}: Trying to find subscriptions for ${JSON.stringify(eventMatcher.toObject())}`,
  );
  // Find all matching event subscriptions stored in the database
  const eventSubscriptionQueries = await lookupEventSubscriptions(eventMatcher);
  // Iterate through the view requests in the matching event subscriptions
  eventSubscriptionQueries.forEach(
    async (eventSubscriptionQuery: query_pb.Query) => {
      logger.info(
        `${loggerName}: Generating view and collecting proof for event matcher: ${JSON.stringify(eventMatcher.toObject())} with  event payload: ${eventPayload.toString()}`,
      );
      // Trigger proof collection
      const [result, invokeError] = await handlePromise(
        invoke(
          eventSubscriptionQuery,
          networkName,
          "HandleEventRequest",
          eventPayload,
        ),
      );
      if (!invokeError) {
        // Package view and send to relay
        const client = getRelayClientForEventPublish();
        const viewPayload = packageFabricView(eventSubscriptionQuery, result);

        logger.info(`${loggerName}: Sending event`);
        // Sending the Fabric event to the relay.
        client.sendDriverState(viewPayload, relayCallback);
      }
    },
  );
}

/*
 * For all VALID transactions in a block:
 * 1. Emits all subscribed Transaction Events
 * 2. Emits all subscribed Contract Events
 */
const processBlockForEvents = async (
  block: any,
  channelId: string,
  networkName: string,
  loggerName: string = "",
) => {
  // Parse the block data; typically there is only one element in this array but we will interate over it just to be safe
  const blockNum = block.header.number;
  const blockData = (
    (block as fabproto6.common.Block).data as fabproto6.common.BlockData
  ).data;
  const blockMetadata = (
    (block as fabproto6.common.Block).metadata as fabproto6.common.BlockMetadata
  ).metadata;
  const txFilterIndex = fabproto6.common.BlockMetadataIndex.TRANSACTIONS_FILTER;
  const txValid = blockMetadata[txFilterIndex];
  logger.debug(
    `Event ${loggerName}: block #${blockNum}, #Transactions: ${blockData.length}`,
  );
  logger.debug(
    `Event ${loggerName}: block #${blockNum}, TxValidity: ${JSON.stringify(txValid)}`,
  );

  blockData.forEach((item, index) => {
    const payload = item["payload"];
    const transactions = payload["data"].actions;
    const tx_id = payload["header"].channel_header.tx_id;
    logger.debug(
      `Event ${loggerName}: Transaction with TxId: ${tx_id}, index: ${index}`,
    );

    if (txValid[index] === fabproto6.protos.TxValidationCode.VALID) {
      // Iterate through the transaction list
      transactions.forEach(async (transaction: any) => {
        // Check if block subscription and then call handle block event
        if (channelBlockListenerMap.has(channelId)) {
          if (
            transaction.payload.chaincode_proposal_payload.input.chaincode_spec
              .input.args.length > 0
          ) {
            // Get transaction chaincode ID
            const chaincodeId =
              transaction.payload.chaincode_proposal_payload.input
                .chaincode_spec.chaincode_id.name;
            // below way of fetching payload requires that the response has been set by the chaincode function via return value
            const responsePayload =
              transaction.payload.action.proposal_response_payload.extension
                .response.payload;
            // Get transaction function name: first argument according to convention
            const chaincodeFunc =
              transaction.payload.chaincode_proposal_payload.input.chaincode_spec.input.args[0].toString();
            const eventMatcher = createEventMatcher(
              "",
              channelId,
              chaincodeId,
              chaincodeFunc,
            );
            eventHandler(
              eventMatcher,
              responsePayload,
              networkName,
              `BlockEvent ${loggerName}`,
            );
          }
        }

        // Check if contract subscription and then call handle contract event
        // Get transaction chaincode ID
        const chaincodeId =
          transaction.payload.chaincode_proposal_payload.input.chaincode_spec
            .chaincode_id.name;
        if (
          channelContractListenerMap.has(
            getChannelContractKey(channelId, chaincodeId),
          )
        ) {
          // below way of fetching payload is similar to ContractEventListener in which we fetch event.payload
          const eventPayload =
            transaction.payload.action.proposal_response_payload.extension
              .events.payload;
          const eventName =
            transaction.payload.action.proposal_response_payload.extension
              .events.event_name;
          const eventMatcher = createEventMatcher(
            eventName,
            channelId,
            chaincodeId,
            "*",
          );
          eventHandler(
            eventMatcher,
            eventPayload,
            networkName,
            `ContractEvent ${loggerName}`,
          );
        }
      });
    } else {
      logger.error(
        `Event ${loggerName}: Transaction with TxId: ${tx_id} is invalid with code ${txValid[index]}:${fabproto6.protos.TxValidationCode[txValid[index]]}. Discarding.`,
      );
    }
  });
};

/**
 * Register a block listener with a callback
 **/
const initBlockEventListenerForChannel = async (
  network: Network,
  networkName: string,
  channelId: string,
): Promise<any> => {
  const listener: BlockListener = async (event: BlockEvent) => {
    const bh_db: DBConnector = new LevelDBConnector(DB_NAME!, DB_OPEN_TIMEOUT);
    await bh_db.open();
    try {
      const lastBlockNum = await getLastReadBlockNumber(bh_db, channelId);
      const currBlockNum = event.blockNumber.toNumber();
      // Log failed events for debugging purpose
      event.getTransactionEvents().forEach((txEvent) => {
        logger.info(`BlockEvent Listener: Block #${currBlockNum} event; LastReadBlock #${lastBlockNum}\n
                    TxId: ${txEvent.transactionId},
                    TxStatus: ${txEvent.status},
                    isTxValid: ${txEvent.isValid}\n`);
      });
      if (currBlockNum === lastBlockNum + 1) {
        await processBlockForEvents(
          event.blockData,
          channelId,
          networkName,
          "Listener",
        );
        // Set current block number as listener block height
        await setLastReadBlockNumber(bh_db, channelId, currBlockNum);
      }
    } catch (error: any) {
      logger.error(`BlockEvent Listener: ${error.toString()}`);
    } finally {
      await bh_db.close();
    }
  };
  await network.addBlockListener(listener);
  channelBlockListenerMap.set(channelId, listener);
  logger.info(`Added block listener for channel ${channelId}`);
  return listener;
};

/**
 * Start an appropriate listener if there is currently none for the channel (or chaincode) this event subscription refers to.
 **/
const registerListenerForEventSubscription = async (
  eventMatcher: events_pb.EventMatcher,
  networkName: string,
): Promise<any> => {
  const channelId = eventMatcher.getTransactionLedgerId();
  const chaincodeId = eventMatcher.getTransactionContractId();
  let gateway: Gateway, network: Network;
  if (networkGatewayMap.has(networkName)) {
    gateway = networkGatewayMap.get(networkName);
    network = networkChannelMap.get(channelId);
    if (!network) {
      throw new Error(
        "No network/channel handle found for existing gateway and channel ID: " +
          channelId,
      );
    }
  } else {
    gateway = await getNetworkGateway(networkName);
    networkGatewayMap.set(networkName, gateway);
    network = await gateway.getNetwork(channelId);
    networkChannelMap.set(channelId, network);
  }
  let listener = null;
  if (globalLedgerListenerCount.has(channelId)) {
    globalLedgerListenerCount.set(
      channelId,
      globalLedgerListenerCount.get(channelId) + 1,
    );
  } else {
    const bh_db: DBConnector = new LevelDBConnector(DB_NAME!, DB_OPEN_TIMEOUT);
    await bh_db.open();
    try {
      const currBlockNum = await getCurrBlockNumber(network, channelId);
      await setLastReadBlockNumber(bh_db, channelId, currBlockNum);
      listener = await initBlockEventListenerForChannel(
        network,
        networkName,
        channelId,
      );
      if (eventMatcher.getEventClassId().length > 0) {
        channelContractListenerMap.set(
          getChannelContractKey(channelId, chaincodeId),
          true,
        );
      }
      globalLedgerListenerCount.set(channelId, 1);
    } catch (error: any) {
      logger.error(`registerListenerForEventSubscription: ${error.toString()}`);
      throw error;
    } finally {
      await bh_db.close();
    }
  }
  return listener; // If null, Listener was already running. Nothing to do.
};

/**
 * Decrement subscription count against an active listener. Stop the listener if the count is 0.
 **/
const unregisterListenerForEventSubscription = async (
  eventMatcher: events_pb.EventMatcher,
  networkName: string,
): Promise<boolean> => {
  const channelId = eventMatcher.getTransactionLedgerId();
  const chaincodeId = eventMatcher.getTransactionContractId();
  let gateway: Gateway, network: Network;
  if (networkGatewayMap.has(networkName)) {
    gateway = networkGatewayMap.get(networkName);
    network = networkChannelMap.get(channelId);
    if (!network) {
      throw new Error(
        "No network/channel handle found for existing gateway and channel ID: " +
          channelId,
      );
    }
  } else {
    gateway = await getNetworkGateway(networkName);
    networkGatewayMap.set(networkName, gateway);
    network = await gateway.getNetwork(channelId);
    networkChannelMap.set(channelId, network);
  }
  if (!channelBlockListenerMap.has(channelId)) {
    return false;
  }
  // Update Global Listener count for the ledger
  if (globalLedgerListenerCount.get(channelId) > 1) {
    globalLedgerListenerCount.set(
      channelId,
      globalLedgerListenerCount.get(channelId) - 1,
    );
    return true;
  } else {
    const bh_db: DBConnector = new LevelDBConnector(DB_NAME!, DB_OPEN_TIMEOUT);
    await bh_db.open();
    try {
      // Set DB Height to -1 if no listener running
      await setLastReadBlockNumber(bh_db, channelId, -1);
      network.removeBlockListener(channelBlockListenerMap.get(channelId));
      if (eventMatcher.getEventClassId().length > 0) {
        channelContractListenerMap.delete(
          getChannelContractKey(channelId, chaincodeId),
        );
      }
      channelBlockListenerMap.delete(channelId);
      globalLedgerListenerCount.set(channelId, 0);
      return true;
    } catch (error: any) {
      logger.error(
        `unregisterListenerForEventSubscription: ${error.toString()}`,
      );
      return false;
    } finally {
      await bh_db.close();
    }
  }
};

/**
 * Load event subscriptions from the driver database.
 * Start a listener for each channel from which one of the subscribed events originate.
 **/
const loadEventSubscriptionsFromStorage = async (
  networkName: string,
): Promise<boolean> => {
  logger.info("Starting event listeners for subscribed events in database...");
  try {
    const eventMatchers = await readAllEventMatchers();
    for (const eventMatcher of eventMatchers) {
      try {
        await registerListenerForEventSubscription(eventMatcher, networkName);
      } catch (error) {
        logger.error(
          `Error: Could not start event listener for ${JSON.stringify(eventMatcher.toObject())} with error: ${error}`,
        );
        return false;
      }
    }
  } catch (error) {
    logger.error(`Error: event matcher read error: ${error}`);
    return false;
  }
  return true;
};

/*
 * Get block by block number using query to QSCC
 */
async function getBlockByNum(
  network: Network,
  channelId: string,
  blockNum: number,
): Promise<any> {
  const contract = network.getContract("qscc");

  const [result, invokeError] = await handlePromise(
    contract.evaluateTransaction("GetBlockByNumber", channelId, `${blockNum}`),
  );
  if (invokeError) {
    throw invokeError;
  }
  const block = BlockDecoder.decode(result);
  return block;
}

/*
 * Get latest block number using query to QSCC
 */
async function getCurrBlockNumber(
  network: Network,
  channelId: string,
): Promise<number> {
  const contract = network.getContract("qscc");

  const [result, invokeError] = await handlePromise(
    contract.evaluateTransaction("GetChainInfo", channelId),
  );
  if (invokeError) {
    throw invokeError;
  }
  const blockHeight = fabproto6.common.BlockchainInfo.decode(
    Buffer.from(result),
  ).height as number;
  const blockNum = blockHeight - 1;
  logger.debug(`getCurrBlockNumber: Get current block number: ${blockNum}`);
  return blockNum;
}

/*
 * Monitor to handle block events that were missed/discarded by listener.
 */
const monitorBlockForMissedEvents = async (networkName: string) => {
  logger.debug("############### Monitor Begin #################");
  // Create connection to a database
  const bh_db: DBConnector = new LevelDBConnector(DB_NAME!, DB_OPEN_TIMEOUT);
  await bh_db.open();
  try {
    if (networkGatewayMap.has(networkName)) {
      // Handle Block Events
      for (const [channelId, network] of networkChannelMap) {
        const currBlockNum = await getCurrBlockNumber(network, channelId);
        const lastBlockNum = await getLastReadBlockNumber(bh_db, channelId);
        logger.debug(
          `Monitor: Current Block #${currBlockNum}; LastReadBlock #${lastBlockNum}`,
        );
        if (currBlockNum > lastBlockNum) {
          for (let bnum = lastBlockNum + 1; bnum <= currBlockNum; bnum++) {
            const block = await getBlockByNum(network, channelId, bnum);
            await processBlockForEvents(
              block,
              channelId,
              networkName,
              "Monitor",
            );
          }
          // Update block number in DB
          await setLastReadBlockNumber(bh_db, channelId, currBlockNum);
        }
      }
    }
  } catch (error: any) {
    logger.error(`Monitor Error: ${error}`);
  }
  await bh_db.close();
  logger.debug("############### Monitor End ###################");
};

export {
  registerListenerForEventSubscription,
  unregisterListenerForEventSubscription,
  loadEventSubscriptionsFromStorage,
  monitorBlockForMissedEvents,
};
