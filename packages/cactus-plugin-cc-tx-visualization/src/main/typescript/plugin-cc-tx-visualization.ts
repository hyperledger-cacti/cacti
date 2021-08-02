/* eslint-disable prettier/prettier */
import { Server } from "http";
import { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import { promisify } from "util";
import {
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
  LedgerType,
} from "@hyperledger/cactus-core-api";
//import { BesuApiClient} from "@hyperledger/cactus-plugin-ledger-connector-besu/src/main/typescript/public-api";
import { stringify } from 'csv-stringify';

import fs from 'fs';
import path from 'path';

import { PluginRegistry } from "@hyperledger/cactus-core";
import { Express } from "express";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { calculateGasPriceBesu, CarbonFootPrintConstants, gweiToDollar } from "./models/carbon-footprint";
import { CrossChainEvent, CrossChainEventLog } from "./models/cross-chain-event";

export interface IWebAppOptions {
  port: number;
  hostname: string;
}
import * as Amqp from "amqp-ts";
import { CrossChainModel, CrossChainModelType, CrossChainTransactionSchema } from "./models/crosschain-model";
import { BesuV2TxReceipt, FabricV2TxReceipt, millisecondsLatency } from "./models/transaction-receipt";
import { randomUUID } from "crypto";

export interface IChannelOptions {
  queueId: string,
  dltTechnology: LedgerType | null,
  persistMessages: boolean
}

export type APIConfig = {
  type:LedgerType, 
  basePath: string
}

export interface IPluginCcTxVisualizationOptions extends ICactusPluginOptions {
  connectorRegistry?: PluginRegistry;
  logLevel?: LogLevelDesc;
  webAppOptions?: IWebAppOptions;
  eventProvider: string;
  channelOptions: IChannelOptions;
  instanceId: string;
}

// TODO - for extensability, modularity, and flexibility,
// this plugin could have a list of connections and list of queues
export class CcTxVisualization
  implements ICactusPlugin, IPluginWebService {
  private readonly log: Logger;
  private readonly instanceId: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private httpServer: Server | SecureServer | null = null;
  private crossChainLog: CrossChainEventLog;
  private crossChainModel: CrossChainModel;
  private readonly eventProvider: string;
  private amqpConnection: Amqp.Connection;
  private amqpQueue: Amqp.Queue;
  private amqpExchange: Amqp.Exchange;
  public readonly className = "plugin-cc-tx-visualization";
  private readonly queueId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private txReceipts: any[];
  private readonly persistMessages: boolean;

  constructor(public readonly options: IPluginCcTxVisualizationOptions) {
    const startTime = new Date();
    const fnTag = `PluginCcTxVisualization#constructor()`;
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.queueId = options.channelOptions.queueId || "cc-tx-viz-queue";
    this.log = LoggerProvider.getOrCreate({
      label:  label,
      level: level,
    });
    this.instanceId = this.options.instanceId;
    this.crossChainLog = new CrossChainEventLog({name:"CC-TX-VIZ_EVENT_LOGS"});
    //todo should allow different models to be instantiated
    this.crossChainModel = new CrossChainModel();
    this.txReceipts = [];
    this.persistMessages = options.channelOptions.persistMessages || false;
    this.eventProvider = options.eventProvider;
    this.log.debug("Initializing connection to RabbitMQ");
    this.amqpConnection = new Amqp.Connection(this.eventProvider);
    this.log.info("Connection to RabbitMQ server initialized");
    this.amqpExchange = this.amqpConnection.declareExchange(`cc-tx-viz-exchange`, "direct", {durable: this.persistMessages});
    this.amqpQueue = this.amqpConnection.declareQueue(this.queueId, {durable: this.persistMessages});
    this.amqpQueue.bind(this.amqpExchange);
  
    const finalTime = new Date();
    this.log.debug(`EVAL-${this.className}-SETUP-CONSTRUCTOR:${finalTime.getTime()-startTime.getTime()}`);

  } 
  getOpenApiSpec(): unknown {
    throw new Error("Method not implemented.");
  }

  get numberEventsLog(): number {
    return this.crossChainLog.numberEvents();
  }

  get numberUnprocessedReceipts(): number {
    return this.txReceipts.length;
  }  

  public purgeCrossChainEvents(): void {
    this.crossChainLog.purgeLogs();
  }

  // todo connection closing is  problematic, tests are left hanging
  public async closeConnection(): Promise<void>  {
    this.log.debug("Closing Amqp connection");
    try {
      this.amqpConnection.close();
      this.log.debug(" Amqp connection closed");

    } catch (error) {
      this.log.error(error);
    }

  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down...`);
    const serverMaybe = this.getHttpServer();
    if (serverMaybe.isPresent()) {
      this.log.info(`Awaiting server.close() ...`);
      const server = serverMaybe.get();
      await promisify(server.close.bind(server))();
      this.log.info(`server.close() OK`);
    } else {
      this.log.info(`No HTTP server found, skipping...`);
    }
  }

  
  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const { log } = this;

    log.info(`Installing web services for plugin ${this.getPackageName()}...`);

    const endpoints: IWebServiceEndpoint[] = [];

    // TODO implement endpoints

    const pkg = this.getPackageName();
    log.info(`Installed web services for plugin ${pkg} OK`, { endpoints });

    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-cc-tx-visualization`;
  }

  public  pollTxReceipts(): Promise<void>  {
    const fnTag = `${this.className}#pollTxReceipts()`;
    this.log.debug(fnTag);
    return this.amqpQueue.activateConsumer( (message) => {
      const messageContent = message.getContent();
      this.log.debug(`Received message from ${this.queueId}: ${message.content.toString()}`);
      this.txReceipts.push(messageContent);
      message.ack();
    }, { noAck: false });
  }

  // Precion minimum is 4ms by convention
  public async hasProcessedXMessages(numberMessages: number, precision: number): Promise<void>  {
    while (this.txReceipts.length < numberMessages) {
      await new Promise((resolve) => setTimeout(resolve, precision));
    }
    return;

  }

  public async txReceiptToCrossChainEventLogEntry(): Promise<CrossChainEvent[]|void> {
    const startTime = new Date();
    const fnTag = `${this.className}#pollTxReceipts()`;
    this.log.debug(fnTag);
    // We are processing receipts to update the CrossChainLog.
    // At the end of the processing, we need to clear the transaction receipts that have been processed
    // Therefore, we need a listen method that cctxviz is always running, doing polls every X seconds, followed by receipt processing (this method)
    try {    
      this.txReceipts.forEach(receipt => {
        switch(receipt.blockchainID) {
          case LedgerType.Besu2X:
            const besuReceipt: BesuV2TxReceipt = receipt;
            const ccEventFromBesu:CrossChainEvent = {
              caseID: besuReceipt.caseID,
              receiptID: besuReceipt.transactionHash,
              blockchainID:besuReceipt.blockchainID,
              invocationType: besuReceipt.invocationType,
              methodName:besuReceipt.methodName,
              parameters:besuReceipt.parameters,
              timestamp: besuReceipt.timestamp,
              identity: besuReceipt.from,
              cost: gweiToDollar(calculateGasPriceBesu(besuReceipt.gasUsed as number)),
              carbonFootprint: CarbonFootPrintConstants(LedgerType.Besu2X),
              latency: millisecondsLatency(new Date(receipt.timestamp)),
              revenue: receipt.revenue || 0,
            };
            this.crossChainLog.addCrossChainEvent(ccEventFromBesu);
            this.log.info("Added Cross Chain event from BESU"); 
            this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventFromBesu)}`);
            break;
          case LedgerType.Fabric2:
            const fabricReceipt: FabricV2TxReceipt = receipt;
            const ccEventFromFabric:CrossChainEvent = {
              caseID: fabricReceipt.caseID,
              receiptID: fabricReceipt.transactionID || `FABRIC-CALL-${randomUUID()}`,
              blockchainID: fabricReceipt.blockchainID,
              invocationType: fabricReceipt.invocationType,
              methodName: fabricReceipt.methodName,
              parameters: fabricReceipt.parameters,
              timestamp: fabricReceipt.timestamp,
              identity: fabricReceipt.signingCredentials.keychainRef,
              cost: receipt.cost || 0,
              carbonFootprint: CarbonFootPrintConstants(LedgerType.Fabric2),
              latency: millisecondsLatency(new Date(receipt.timestamp)),
              revenue: receipt.revenue || 0,
            };
            this.crossChainLog.addCrossChainEvent(ccEventFromFabric);
            this.log.info("Added Cross Chain event from FABRIC");
            this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventFromFabric)}`);
            break;
          // used to test cctxviz
          case "TEST":
            const ccEventTest:CrossChainEvent = {
              caseID: receipt.caseID,
              receiptID: receipt.receiptID || randomUUID(),
              blockchainID: receipt.blockchainID,
              invocationType: receipt.invocationType,
              methodName: receipt.methodName,
              parameters: receipt.parameters,
              timestamp: receipt.timestamp,
              identity: receipt.identity,
              cost: receipt.cost || 0,
              carbonFootprint: receipt.carbonFootprint || 0,
              latency: receipt.latency || millisecondsLatency(new Date(receipt.timestamp)),
              revenue: receipt.revenue,
            };
            this.crossChainLog.addCrossChainEvent(ccEventTest);
            this.log.info("Added Cross Chain event TEST");
            this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventTest)}`);
            break;
          default:
            this.log.warn(`Tx Receipt with case ID ${receipt.caseID} is not supported`);
            break;
        }
        
      }); 
      // Clear receipt array
      this.txReceipts = [];
      const finalTime = new Date();
      this.log.debug(`EVAL-${this.className}-RECEIPT2EVENT:${finalTime.getTime()-startTime.getTime()}`);
    return;
    } catch (error) {
      this.log.error(error);
    }

  }

  // Parses the cross chain event log and updates the cross chain model
  // This is part of the cc model; have a set that maps case id to data structure; this data structure are the consolidated metrics for a cctx, stores each txid
  // run over cc log; if case id is unique create new entry, otherwise add tx to cctx, update metrics, update last update; this is an updatable model
  public async aggregateCcTx(): Promise<void> {
    const startTime = new Date();
    const lastAggregated = this.crossChainModel.lastAggregation;
    const newAggregationDate = new Date(); 
    const ccTxSet = this.crossChainModel.getCCTxs();
    const logEntries = this.crossChainLog.logEntries;
    // If entries are more recent than aggregation
    let metrics: CrossChainTransactionSchema = {
      ccTxID: "", 
      processedCrossChainEvents: [],
      latency: 0,
      carbonFootprint: 0,
      cost: 0,
      throughput: 0,
      latestUpdate: newAggregationDate,
      revenue: 0,
    };
    const logsToAggregate = logEntries.filter(log => new Date(log.timestamp).getTime() > new Date(lastAggregated).getTime());
    if (logsToAggregate.length === 0) {
      const finalTime = new Date();

      this.log.debug(`EVAL-${this.className}-AGGREGATE-CCTX-NO_NEW_LOGS:${finalTime.getTime()-startTime.getTime()}`);
      return;}
    logsToAggregate.forEach(eventEntry => {
      const key = eventEntry.caseID;
      const eventID = eventEntry.receiptID;
      let latency = eventEntry.latency as number;
      let carbonFootprint = eventEntry.carbonFootprint as number;
      let cost = eventEntry.cost as number;
      const revenue = eventEntry.revenue as number;

      if (!latency) {latency = 0;}
      if (!carbonFootprint) {carbonFootprint = 0;}
      if (!cost) {cost = 0;}
      if (ccTxSet?.has(key))  {
        const existingCCTx = ccTxSet.get(key);
        const previousEvents = existingCCTx?.processedCrossChainEvents || [];
        const numberOfCurrentEvents = previousEvents.length + 1;
        const previousLatency = existingCCTx?.latency || 0;
        const previousCarbonFootprint = existingCCTx?.carbonFootprint || 0;
        const previousCost = existingCCTx?.cost || 0;
        const currentCost = (cost + previousCost) / numberOfCurrentEvents;
        const previousRevenue = existingCCTx?.revenue || 0;
        const currentRevenue = (revenue + previousRevenue) / numberOfCurrentEvents;

        const updatedMetrics = {
          ccTxID: key,
          processedCrossChainEvents: [...previousEvents , eventID],
          latency:  (latency + previousLatency) / numberOfCurrentEvents,
          carbonFootprint: (carbonFootprint + previousCarbonFootprint) / numberOfCurrentEvents,
          cost: currentCost,
          throughput: Number(latency != 0 ? (1 / ((latency + previousLatency) / numberOfCurrentEvents)).toFixed(3) as unknown as number  : 0),
          latestUpdate: lastAggregated,
          revenue: currentRevenue, 
          };
        this.crossChainModel.setCCTxs(key,updatedMetrics);
      } else {
        metrics = {
          ccTxID: key,
          processedCrossChainEvents: [eventID],
          latency: latency,
          carbonFootprint: carbonFootprint,
          cost: cost,
          throughput: Number((latency != 0 ? 1 / latency : 0).toFixed(3) as unknown as number),
          latestUpdate: lastAggregated,
          revenue: revenue,
          };
          this.crossChainModel.setCCTxs(key,metrics);
        }
    });
    this.crossChainModel.setLastAggregationDate(newAggregationDate);
    const finalTime = new Date();
    this.log.debug(`${this.className}-AGGREGATE-CCTX-SUCCESS:${finalTime.getTime()-startTime.getTime()}`);
    return;
  }

  public async persistCrossChainLogCsv (name?: string): Promise<string> {
    const startTime = new Date();
    const columns = this.crossChainLog.getCrossChainLogAttributes();
    const logName = name? `${name}.csv` : `cctxviz_log_${new Date().getTime()}.csv`;
    const csvFolder = path.join(__dirname, "../" , "../", "test", "csv");
    const logPath = path.join(csvFolder , logName);
    
    stringify(
      this.crossChainLog.logEntries
    , {
      header: true,
      columns:  columns,
      delimiter: ";",
    }, (err, data) =>{
      if (err)  {
        this.log.error(err);
        throw new Error("failed to stringify log");
      }
      this.log.debug(data);
      fs.writeFileSync(logPath, data);
    });
    const finalTime = new Date();
    this.log.debug(`EVAL-${this.className}-PERSIST-LOG:${finalTime.getTime()-startTime.getTime()}`);
    return logName;
  }

  // Receives a serialized model
  public async saveModel (modelType: CrossChainModelType, model :string): Promise<void> {
    this.crossChainModel.saveModel(modelType, model);
  }

  public async getModel (modelType: CrossChainModelType): Promise<string|undefined> {
    return this.crossChainModel.getModel(modelType);
  }
}