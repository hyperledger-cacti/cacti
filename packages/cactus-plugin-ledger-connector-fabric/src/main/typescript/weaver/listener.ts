import {
  ILoggerOptions,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { Gateway, Network, BlockListener, BlockEvent } from "fabric-network";
import { DBConnector, LevelDBConnector } from "./dbConnector";
import {
  FabricEvent,
  PluginLedgerConnectorFabric,
} from "../plugin-ledger-connector-fabric";
import { EventType } from "../public-api";
import {
  EventMatcher,
  EventMatcherSchema,
  EventType as FabricEventType,
} from "../generated/protos/common/events_pb";
import { create, toBinary } from "@bufbuild/protobuf";
import { Query, QuerySchema } from "../generated/protos/common/query_pb";
import {
  handlePromise,
  packageFabricView,
  relayCallback,
  transformToFabricView,
} from "./utils";
import { Events } from "./events";
import { FabricDriverServer } from "./fabric-driver-server";
import * as FabricProto6 from "fabric-protos";
import {
  GatewayOptions,
  GetBlockResponseDecodedV1,
  GetBlockResponseTypeV1,
} from "../generated/openapi/typescript-axios/index";

export interface IListenerOptions {
  logLevel: LogLevelDesc;
  driver: FabricDriverServer;
  chainCodeId?: string;
}

export const DB_NAME = "BLOCKCHAIN_DB";
export const DB_OPEN_TIMEOUT = 20000;
export const BH_KEY = "LAST_BLOCK_HEIGHT";
export class Listener {
  public static readonly className = "Listener";
  channelBlockListenerMap = new Map<string, BlockListener>();
  channelContractListenerMap = new Map<string, boolean>();
  globalLedgerListenerCount = new Map<string, number>();
  networkChannelList: string[] = [];
  private readonly logger: Logger;

  private readonly connector: PluginLedgerConnectorFabric;

  private readonly driver: FabricDriverServer;

  private readonly events: Events;

  private chainCodeId = "interop";

  private logLevel: LogLevelDesc;

  constructor(options: IListenerOptions) {
    this.logLevel = options.logLevel || "INFO";
    const logOptions: ILoggerOptions = {
      level: options.logLevel,
      label: Listener.className,
    };
    this.logger = LoggerProvider.getOrCreate(logOptions);
    this.driver = options.driver;
    this.events = this.driver.getEventsInstance();
    this.connector = this.driver.getConnectorInstance();
    if (options.chainCodeId) {
      this.chainCodeId = options.chainCodeId;
    }
  }

  getChannelContractKey(channelId: string, contractId: string) {
    return channelId + ":" + contractId;
  }
  getBHKey(channelId: string) {
    return BH_KEY + ":" + channelId;
  }

  async setLastReadBlockNumber(
    db: DBConnector,
    channelId: string,
    blockNum: number,
  ) {
    this.logger.debug(
      `Set last read block number ${blockNum} on channel: ${channelId}`,
    );
    await db.insert(this.getBHKey(channelId), blockNum);
  }

  async getLastReadBlockNumber(
    db: DBConnector,
    channelId: string,
  ): Promise<number> {
    try {
      const blockNum = await db.read(this.getBHKey(channelId));
      return blockNum;
    } catch (error: any) {
      this.logger.error(
        `Error during GET block number in db: ${error.toString()}`,
      );
      throw error;
    }
  }

  /**
   * Start an appropriate listener if there is currently none for the channel (or chaincode) this event subscription refers to.
   **/
  async registerListenerForEventSubscription(
    eventMatcher: EventMatcher,
    gatewayOptions: GatewayOptions,
  ): Promise<any> {
    const channelId = eventMatcher.transactionLedgerId;
    const chaincodeId = eventMatcher.transactionContractId;

    const gateway: Gateway = await this.connector.createGateway({
      gatewayOptions,
    });
    const network: Network = await gateway.getNetwork(channelId);
    if (!network) {
      throw new Error(
        "No network/channel handle found for existing gateway and channel ID: " +
          channelId,
      );
    }
    if (!this.channelBlockListenerMap.has(channelId)) {
      this.networkChannelList.push(channelId);
    }
    let listener = null;
    if (this.globalLedgerListenerCount.has(channelId)) {
      this.globalLedgerListenerCount.set(
        channelId,
        this.globalLedgerListenerCount.get(channelId)! + 1,
      );
    } else {
      const bh_db: DBConnector = new LevelDBConnector(DB_NAME, DB_OPEN_TIMEOUT);
      await bh_db.open();
      try {
        const currBlockNum = (
          await this.connector.getLatestBlockNumber({
            channelName: channelId,
            gatewayOptions: gatewayOptions,
          })
        ).blockNumber;
        await this.setLastReadBlockNumber(bh_db, channelId, currBlockNum);

        listener = await this.connector.createFabricListener(
          {
            channelName: channelId,
            contractName: chaincodeId,
            gatewayOptions: gatewayOptions,
            eventType: EventType.Block,
          },
          this.createBlockEventListenerCallback(channelId, gatewayOptions) as (
            event: FabricEvent,
          ) => Promise<void>,
        );
        if (eventMatcher.eventClassId.length > 0) {
          this.channelContractListenerMap.set(
            this.getChannelContractKey(channelId, chaincodeId),
            true,
          );
        }
        this.globalLedgerListenerCount.set(channelId, 1);
      } catch (error: any) {
        this.logger.error(
          `registerListenerForEventSubscription: ${error.toString()}`,
        );
        throw error;
      } finally {
        await bh_db.close();
      }
    }
    return listener; // If null, Listener was already running. Nothing to do.
  }

  createBlockEventListenerCallback(
    channelId: string,
    gatewayOptions: GatewayOptions,
  ): (event: BlockEvent) => Promise<void> {
    return async (event: BlockEvent): Promise<void> => {
      const bh_db: DBConnector = new LevelDBConnector(DB_NAME, DB_OPEN_TIMEOUT);
      await bh_db.open();
      try {
        const lastBlockNum = await this.getLastReadBlockNumber(
          bh_db,
          channelId,
        );
        const currBlockNum = event.blockNumber.toNumber();
        // Log failed events for debugging purpose
        event.getTransactionEvents().forEach((txEvent) => {
          this.logger
            .info(`BlockEvent Listener: Block #${currBlockNum} event; LastReadBlock #${lastBlockNum}\n
                    TxId: ${txEvent.transactionId},
                    TxStatus: ${txEvent.status},
                    isTxValid: ${txEvent.isValid}\n`);
        });
        if (currBlockNum === lastBlockNum + 1) {
          await this.processBlockForEvents(
            event.blockData,
            channelId,
            "Listener",
            gatewayOptions,
          );
          // Set current block number as listener block height
          await this.setLastReadBlockNumber(bh_db, channelId, currBlockNum);
        }
      } catch (error: any) {
        this.logger.error(`BlockEvent Listener: ${error.toString()}`);
      } finally {
        await bh_db.close();
      }
    };
  }

  /*
   * For all VALID transactions in a block:
   * 1. Emits all subscribed Transaction Events
   * 2. Emits all subscribed Contract Events
   */
  async processBlockForEvents(
    block: any,
    channelId: string,
    loggerName: string = "",
    gatewayOptions: GatewayOptions,
  ) {
    // Parse the block data; typically there is only one element in this array but we will interate over it just to be safe
    const blockNum = block.header.number;
    const blockData = (
      (block as FabricProto6.common.Block).data as FabricProto6.common.BlockData
    ).data;
    const blockMetadata = (
      (block as FabricProto6.common.Block)
        .metadata as FabricProto6.common.BlockMetadata
    ).metadata;
    const txFilterIndex =
      FabricProto6.common.BlockMetadataIndex.TRANSACTIONS_FILTER;
    const txValid = blockMetadata[txFilterIndex];
    this.logger.debug(
      `Event ${loggerName}: block #${blockNum}, #Transactions: ${blockData.length}`,
    );
    this.logger.debug(
      `Event ${loggerName}: block #${blockNum}, TxValidity: ${JSON.stringify(txValid)}`,
    );

    blockData.forEach((item: any, index: number) => {
      const payload = item.payload;
      const transactions = payload["data"].actions;
      const tx_id = payload["header"].channel_header.tx_id;
      this.logger.debug(
        `Event ${loggerName}: Transaction with TxId: ${tx_id}, index: ${index}`,
      );

      if (txValid[index] === FabricProto6.protos.TxValidationCode.VALID) {
        // Iterate through the transaction list
        transactions.forEach(async (transaction: any) => {
          // Check if block subscription and then call handle block event
          if (this.channelBlockListenerMap.has(channelId)) {
            if (
              transaction.payload.chaincode_proposal_payload.input
                .chaincode_spec.input.args.length > 0
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
              const eventMatcher = this.createEventMatcher(
                "",
                channelId,
                chaincodeId,
                chaincodeFunc,
              );
              this.eventHandler(
                eventMatcher,
                responsePayload,
                channelId,
                `BlockEvent ${loggerName}`,
                gatewayOptions,
              );
            }
          }

          // Check if contract subscription and then call handle contract event
          // Get transaction chaincode ID
          const chaincodeId =
            transaction.payload.chaincode_proposal_payload.input.chaincode_spec
              .chaincode_id.name;
          if (
            this.channelContractListenerMap.has(
              this.getChannelContractKey(channelId, chaincodeId),
            )
          ) {
            // below way of fetching payload is similar to ContractEventListener in which we fetch event.payload
            const eventPayload =
              transaction.payload.action.proposal_response_payload.extension
                .events.payload;
            const eventName =
              transaction.payload.action.proposal_response_payload.extension
                .events.event_name;
            const eventMatcher = this.createEventMatcher(
              eventName,
              channelId,
              chaincodeId,
              "*",
            );
            this.eventHandler(
              eventMatcher,
              eventPayload,
              channelId,
              `ContractEvent ${loggerName}`,
              gatewayOptions,
            );
          }
        });
      } else {
        this.logger.error(
          `Event ${loggerName}: Transaction with TxId: ${tx_id} is invalid with code ${txValid[index]}:${FabricProto6.protos.TxValidationCode[txValid[index]]}. Discarding.`,
        );
      }
    });
  }

  createEventMatcher(
    eventName: string,
    channelId: string,
    chaincodeId: string,
    functionName: string,
  ) {
    return create(EventMatcherSchema, {
      eventType: FabricEventType.LEDGER_STATE,
      transactionLedgerId: channelId,
      transactionContractId: chaincodeId,
      transactionFunc: functionName,
      eventClassId: eventName,
    });
  }

  async eventHandler(
    eventMatcher: EventMatcher,
    eventPayload: Buffer,
    channelId: string,
    loggerName: string,
    gatewayOptions: GatewayOptions,
  ) {
    this.logger.info(
      `${loggerName}: Trying to find subscriptions for ${JSON.stringify(eventMatcher)}`,
    );

    if (!this.events) {
      throw new Error("Events instance not set in Listener");
    }

    // Find all matching event subscriptions stored in the database
    const eventSubscriptionQueries =
      await this.events.lookupEventSubscriptions(eventMatcher);
    // Iterate through the view requests in the matching event subscriptions
    eventSubscriptionQueries.forEach(async (eventSubscriptionQuery: Query) => {
      this.logger.info(
        `${loggerName}: Generating view and collecting proof for event matcher: ${JSON.stringify(eventMatcher)} with  event payload: ${eventPayload.toString()}`,
      );
      // Trigger proof collection
      const [result, invokeError] = await handlePromise(
        this.connector.invoke({
          gatewayOptions,
          channelName: channelId,
          contractName: this.chainCodeId,
          methodName: "HandleEventRequest",
          params: [
            Buffer.from(toBinary(QuerySchema, eventSubscriptionQuery)).toString(
              "base64",
            ),
            eventPayload ? eventPayload.toLocaleString() : "",
          ],
        }),
      );
      if (!invokeError) {
        // Package view and send to relay
        const client = this.driver.getRelayClientForEventPublish();
        const viewPayload = packageFabricView(
          eventSubscriptionQuery,
          transformToFabricView(result!.view),
        );

        this.logger.info(`${loggerName}: Sending event`);
        // Sending the Fabric event to the relay.
        client
          .sendDriverState(viewPayload)
          .then((response) => relayCallback({ response }))
          .catch((error) => relayCallback({ error }));
      }
    });
  }

  /**
   * Decrement subscription count against an active listener. Stop the listener if the count is 0.
   **/
  async unregisterListenerForEventSubscription(
    eventMatcher: EventMatcher,
    gatewayOptions: GatewayOptions,
  ): Promise<boolean> {
    const channelId = eventMatcher.transactionLedgerId;
    const chaincodeId = eventMatcher.transactionContractId;

    const gateway: Gateway = await this.connector.createGateway({
      gatewayOptions,
    });
    const network: Network = await gateway.getNetwork(channelId);
    if (!network) {
      throw new Error(
        "No network/channel handle found for existing gateway and channel ID: " +
          channelId,
      );
    }
    if (!this.channelBlockListenerMap.has(channelId)) {
      this.networkChannelList.push(channelId);
    }
    if (!this.channelBlockListenerMap.has(channelId)) {
      return false;
    }
    // Update Global Listener count for the ledger
    if (this.globalLedgerListenerCount.get(channelId)! > 1) {
      this.globalLedgerListenerCount.set(
        channelId,
        this.globalLedgerListenerCount.get(channelId)! - 1,
      );
      return true;
    } else {
      const bh_db: DBConnector = new LevelDBConnector(
        DB_NAME!,
        DB_OPEN_TIMEOUT,
      );
      await bh_db.open();
      try {
        // Set DB Height to -1 if no listener running
        await this.setLastReadBlockNumber(bh_db, channelId, -1);
        network.removeBlockListener(
          this.channelBlockListenerMap.get(channelId)!,
        );
        if (eventMatcher.eventClassId.length > 0) {
          this.channelContractListenerMap.delete(
            this.getChannelContractKey(channelId, chaincodeId),
          );
        }
        this.channelBlockListenerMap.delete(channelId);
        this.globalLedgerListenerCount.set(channelId, 0);
        return true;
      } catch (error: any) {
        this.logger.error(
          `unregisterListenerForEventSubscription: ${error.toString()}`,
        );
        return false;
      } finally {
        await bh_db.close();
      }
    }
  }

  /**
   * Load event subscriptions from the driver database.
   * Start a listener for each channel from which one of the subscribed events originate.
   **/
  async loadEventSubscriptionsFromStorage(
    gatewayOptions: GatewayOptions,
  ): Promise<boolean> {
    this.logger.info(
      "Starting event listeners for subscribed events in database...",
    );
    try {
      const eventMatchers = await this.events.readAllEventMatchers();
      for (const eventMatcher of eventMatchers) {
        try {
          await this.registerListenerForEventSubscription(
            eventMatcher,
            gatewayOptions,
          );
        } catch (error) {
          this.logger.error(
            `Error: Could not start event listener for ${JSON.stringify(eventMatcher)} with error: ${error}`,
          );
          return false;
        }
      }
    } catch (error) {
      this.logger.error(`Error: event matcher read error: ${error}`);
      return false;
    }
    return true;
  }

  /*
   * Monitor to handle block events that were missed/discarded by listener.
   */
  public async monitorBlockForMissedEvents(
    gatewayOptions: GatewayOptions,
  ): Promise<void> {
    this.logger.debug("############### Monitor Begin #################");
    // Create connection to a database
    const bh_db: DBConnector = new LevelDBConnector(
      DB_NAME!,
      DB_OPEN_TIMEOUT,
      this.logLevel,
    );
    await bh_db.open();
    try {
      // Handle Block Events
      for (const channelId of this.networkChannelList) {
        const currBlockNum = (
          await this.connector.getLatestBlockNumber({
            channelName: channelId,
            gatewayOptions: gatewayOptions,
          })
        ).blockNumber;
        const lastBlockNum = await this.getLastReadBlockNumber(
          bh_db,
          channelId,
        );
        this.logger.debug(
          `Monitor: Current Block #${currBlockNum}; LastReadBlock #${lastBlockNum}`,
        );
        if (currBlockNum > lastBlockNum) {
          for (let bnum = lastBlockNum + 1; bnum <= currBlockNum; bnum++) {
            const block = (
              (await this.connector.getBlock({
                channelName: channelId,
                query: { blockNumber: bnum.toString() },
                gatewayOptions: gatewayOptions,
                responseType: GetBlockResponseTypeV1.Full,
              })) as GetBlockResponseDecodedV1
            ).decodedBlock;
            await this.processBlockForEvents(
              block,
              channelId,
              "Monitor",
              gatewayOptions,
            );
          }
          // Update block number in DB
          await this.setLastReadBlockNumber(bh_db, channelId, currBlockNum);
        }
      }
    } catch (error: any) {
      this.logger.error(`Monitor Error: ${error}`);
    }
    await bh_db.close();
    this.logger.debug("############### Monitor End ###################");
  }
}
