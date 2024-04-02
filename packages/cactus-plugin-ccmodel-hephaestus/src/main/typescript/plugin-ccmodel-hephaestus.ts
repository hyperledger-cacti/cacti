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

import { RuntimeError } from "run-time-error-cjs";

import fs from "fs";
import path from "path";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { Express } from "express";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  calculateGasPriceEth,
  CarbonFootPrintConstants,
} from "./models/carbon-footprint";
import {
  CrossChainEvent,
  CrossChainEventLog,
} from "./models/cross-chain-event";
import {
  createModelPM4PY,
  checkConformancePM4PY,
  convertToProcessTreePM4PY,
} from "./pm4py-adapter/ccmodel-adapter";

export interface IWebAppOptions {
  port: number;
  hostname: string;
}
import {
  CrossChainModel,
  CrossChainModelType,
  CrossChainTransactionSchema,
} from "./models/crosschain-model";
import {
  BesuV2TxReceipt,
  EthereumTxReceipt,
  FabricV2TxReceipt,
} from "./models/transaction-receipt";
import { millisecondsLatency } from "./models/utils";
import { RunTransactionV1Exchange as RunTransactionV1ExchangeBesu } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { RunTransactionV1Exchange as RunTransactionV1ExchangeEth } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { RunTxReqWithTxId } from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import { Observable } from "rxjs";
import { filter, tap } from "rxjs/operators";

export interface IPluginCcModelHephaestusOptions extends ICactusPluginOptions {
  connectorRegistry?: PluginRegistry;
  logLevel?: LogLevelDesc;
  webAppOptions?: IWebAppOptions;
  instanceId: string;
  ethTxObservable?: Observable<RunTransactionV1ExchangeEth>;
  besuTxObservable?: Observable<RunTransactionV1ExchangeBesu>;
  fabricTxObservable?: Observable<RunTxReqWithTxId>;
}

export class CcModelHephaestus implements ICactusPlugin, IPluginWebService {
  private readonly log: Logger;
  private readonly instanceId: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private httpServer: Server | SecureServer | null = null;
  private crossChainLog: CrossChainEventLog;
  private conformanceCrossChainLog: CrossChainEventLog;
  private nonConformanceCrossChainLog: CrossChainEventLog;
  private crossChainModel: CrossChainModel;
  public readonly className = "plugin-ccmodel-hephaestus";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private txReceipts: any[];
  private caseID: string;
  private ethTxObservable?: Observable<RunTransactionV1ExchangeEth>;
  private besuTxObservable?: Observable<RunTransactionV1ExchangeBesu>;
  private fabricTxObservable?: Observable<RunTxReqWithTxId>;
  private startMonitoring: number | null = null;
  private periodicUpdate: boolean;

  constructor(public readonly options: IPluginCcModelHephaestusOptions) {
    const startTime = new Date();
    const fnTag = `PluginCcModelHephaestus#constructor()`;
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({
      label: label,
      level: level,
    });
    this.instanceId = this.options.instanceId;
    this.crossChainLog = new CrossChainEventLog({
      name: "HEPHAESTUS_EVENT_LOGS",
    });
    this.conformanceCrossChainLog = new CrossChainEventLog({
      name: "HEPHAESTUS_CONFORMANCE_LOGS",
    });
    this.nonConformanceCrossChainLog = new CrossChainEventLog({
      name: "HEPHAESTUS_NON_CONFORMANCE_LOGS",
    });
    //todo should allow different models to be instantiated
    this.crossChainModel = new CrossChainModel();
    this.txReceipts = [];

    this.caseID = "UNDEFINED_CASE_ID";

    this.ethTxObservable = options.ethTxObservable;
    this.besuTxObservable = options.besuTxObservable;
    this.fabricTxObservable = options.fabricTxObservable;

    this.periodicUpdate = false;

    const finalTime = new Date();
    this.log.debug(
      `EVAL-${this.className}-SETUP-CONSTRUCTOR:${finalTime.getTime() - startTime.getTime()}`,
    );
  }

  getOpenApiSpec(): unknown {
    throw new Error("Method not implemented.");
  }

  get ccModel(): CrossChainModel {
    return this.crossChainModel;
  }

  get numberEventsLog(): number {
    return this.crossChainLog.numberEvents();
  }

  get numberUnprocessedReceipts(): number {
    return this.txReceipts.length;
  }

  get numberEventsConformanceLog(): number {
    return this.conformanceCrossChainLog.numberEvents();
  }

  get numberEventsNonConformanceLog(): number {
    return this.nonConformanceCrossChainLog.numberEvents();
  }

  public purgeCrossChainEvents(): void {
    this.crossChainLog.purgeLogs();
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getCaseId(): string {
    return this.caseID;
  }

  public setCaseId(id: string): void {
    this.caseID = id;
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
    return `@hyperledger/cactus-plugin-ccmodel-hephaestus`;
  }

  public createReceiptFromRunTransactionV1ExchangeEth(
    data: RunTransactionV1ExchangeEth,
    caseId: string,
  ): EthereumTxReceipt {
    return {
      caseID: caseId,
      blockchainID: LedgerType.Ethereum,
      timestamp: data.timestamp,
      transactionID: data.response.transactionReceipt.transactionHash,
      from: data.response.transactionReceipt.from,
      invocationType: data.request.invocationType,
      methodName: data.request.methodName,
      parameters: data.request.params,
      gasUsed: data.response.transactionReceipt.gasUsed,
      effectiveGasPrice: data.response.transactionReceipt.effectiveGasPrice,
    };
  }

  public pollTxReceiptsEth(data: RunTransactionV1ExchangeEth): void {
    const fnTag = `${this.className}#pollTxReceiptsEth()`;
    this.log.debug(fnTag);

    const ethReceipt = this.createReceiptFromRunTransactionV1ExchangeEth(
      data,
      this.caseID,
    );
    this.txReceipts.push(ethReceipt);
    return;
  }

  public createReceiptFromRunTransactionV1ExchangeBesu(
    data: RunTransactionV1ExchangeBesu,
    caseId: string,
  ): BesuV2TxReceipt {
    return {
      caseID: caseId,
      blockchainID: LedgerType.Besu2X,
      timestamp: data.timestamp,
      transactionID: data.response.transactionReceipt.transactionHash,
      from: data.response.transactionReceipt.from,
      invocationType: data.request.invocationType,
      methodName: data.request.methodName,
      parameters: data.request.params,
      gasUsed: data.response.transactionReceipt.gasUsed,
      gasPrice: data.request.gasPrice as number,
    };
  }

  public pollTxReceiptsBesu(data: RunTransactionV1ExchangeBesu): void {
    const fnTag = `${this.className}#pollTxReceiptsBesu()`;
    this.log.debug(fnTag);

    const besuReceipt = this.createReceiptFromRunTransactionV1ExchangeBesu(
      data,
      this.caseID,
    );
    this.txReceipts.push(besuReceipt);
    return;
  }

  public createReceiptFromRunTxReqWithTxId(
    data: RunTxReqWithTxId,
    caseId: string,
  ): FabricV2TxReceipt {
    return {
      caseID: caseId,
      blockchainID: LedgerType.Fabric2,
      timestamp: data.timestamp,
      channelName: data.request.channelName,
      transactionID: data.transactionId,
      contractName: data.request.contractName,
      signingCredentials: data.request.signingCredential,
      invocationType: data.request.invocationType,
      methodName: data.request.methodName,
      parameters: data.request.params,
    };
  }

  public pollTxReceiptsFabric(data: RunTxReqWithTxId): void {
    const fnTag = `${this.className}#pollTxReceiptsFabric()`;
    this.log.debug(fnTag);

    const fabricReceipt = this.createReceiptFromRunTxReqWithTxId(
      data,
      this.caseID,
    );
    this.txReceipts.push(fabricReceipt);
    return;
  }

  public watchRunTransactionV1ExchangeEth(duration: number = 0): void {
    const fnTag = `${this.className}#watchRunTransactionV1ExchangeEth()`;
    this.log.debug(fnTag);

    if (!this.ethTxObservable) {
      this.log.debug(
        `${fnTag}-No Ethereum transaction observable provided, monitoring skipped`,
      );
      return;
    }
    if (duration < 0) {
      this.log.debug(
        `${fnTag}-Negative duration provided (${duration}), monitoring all transactions`,
      );
    }
    !this.startMonitoring || (this.startMonitoring = Date.now());

    this.ethTxObservable
      .pipe(
        // Filter only the values emitted within the specified duration
        // if no duration provided, skip filtering
        duration > 0
          ? filter(
              (data) =>
                this.startMonitoring! - data.timestamp.getTime() <= duration,
            )
          : tap(),
      )
      .subscribe({
        next: (data: RunTransactionV1ExchangeEth) => {
          // Handle the data whenever a new value is received by the observer
          this.pollTxReceiptsEth(data);
        },
        error: (error: unknown) => {
          this.log.error(
            `${fnTag}- error`,
            error,
            `receiving RunTransactionV1ExchangeEth by Ethereum transaction observable`,
            this.ethTxObservable,
          );
          throw error;
        },
      });
  }

  public watchRunTransactionV1ExchangeBesu(duration: number = 0): void {
    const fnTag = `${this.className}#watchRunTransactionV1ExchangeBesu()`;
    this.log.debug(fnTag);

    if (!this.besuTxObservable) {
      this.log.debug(
        `${fnTag}-No Besu transaction observable provided, monitoring skipped`,
      );
      return;
    }
    if (duration < 0) {
      this.log.debug(
        `${fnTag}-Negative duration provided (${duration}), monitoring all transactions`,
      );
    }

    !this.startMonitoring || (this.startMonitoring = Date.now());

    this.besuTxObservable
      .pipe(
        // Filter only the values emitted within the specified duration
        // if no duration provided, skip filtering
        duration > 0
          ? filter(
              (data) =>
                this.startMonitoring! - data.timestamp.getTime() <= duration,
            )
          : tap(),
      )
      .subscribe({
        next: (data: RunTransactionV1ExchangeBesu) => {
          // Handle the data whenever a new value is received by the observer
          this.pollTxReceiptsBesu(data);
        },
        error: (error: unknown) => {
          this.log.error(
            `${fnTag}- error`,
            error,
            `receiving RunTransactionV1ExchangeBesu by Besu transaction observable`,
            this.besuTxObservable,
          );
          throw error;
        },
      });
  }

  public watchRunTxReqWithTxId(duration: number = 0): void {
    const fnTag = `${this.className}#watchRunTxReqWithTxId()`;
    this.log.debug(fnTag);

    if (!this.fabricTxObservable) {
      this.log.debug(
        `${fnTag}-No Fabric transaction observable provided, monitoring skipped`,
      );
      return;
    }
    if (duration < 0) {
      this.log.debug(
        `${fnTag}-Negative duration provided (${duration}), monitoring all transactions`,
      );
    }
    !this.startMonitoring || (this.startMonitoring = Date.now());

    this.fabricTxObservable
      .pipe(
        // Filter only the values emitted within the specified duration
        // if no duration provided, skip filtering
        duration > 0
          ? filter(
              (data) =>
                this.startMonitoring! - data.timestamp.getTime() <= duration,
            )
          : tap(),
      )
      .subscribe({
        next: (data: RunTxReqWithTxId) => {
          // Handle the data whenever a new value is received by the observer
          this.pollTxReceiptsFabric(data);
        },
        error: (error: unknown) => {
          this.log.error(
            `${fnTag}- error`,
            error,
            `receiving RunTxReqWithTxId by Fabric transaction observable`,
            this.fabricTxObservable,
          );
          throw error;
        },
      });
  }

  public monitorTransactions(duration: number = 0): void {
    const fnTag = `${this.className}#monitorTransactions()`;
    this.log.debug(fnTag);

    this.startMonitoring = Date.now();
    this.watchRunTxReqWithTxId(duration);
    this.watchRunTransactionV1ExchangeBesu(duration);
    this.watchRunTransactionV1ExchangeEth(duration);
    return;
  }

  private createCrossChainEventFromEthReceipt(
    ethReceipt: EthereumTxReceipt,
    checkConformance: boolean,
  ): void {
    const ccEventFromEth: CrossChainEvent = {
      caseID: ethReceipt.caseID,
      receiptID: ethReceipt.transactionID,
      blockchainID: ethReceipt.blockchainID,
      invocationType: ethReceipt.invocationType,
      methodName: ethReceipt.methodName,
      parameters: ethReceipt.parameters,
      timestamp: ethReceipt.timestamp.toISOString(),
      identity: ethReceipt.from,
      cost: calculateGasPriceEth(
        ethReceipt.gasUsed as number,
        ethReceipt.effectiveGasPrice,
      ),
      carbonFootprint: CarbonFootPrintConstants(ethReceipt.blockchainID),
      latency: millisecondsLatency(ethReceipt.timestamp),
    };

    if (checkConformance == false) {
      this.crossChainLog.addCrossChainEvent(ccEventFromEth);
      this.log.info("Added Cross Chain event from ETHEREUM");
      this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventFromEth)}`);
    } else {
      this.conformanceCrossChainLog.addCrossChainEvent(ccEventFromEth);
      this.log.info(
        "Added Cross Chain event from ETHEREUM for conformance checking",
      );
      this.log.debug(
        `Conformance Cross-chain log: ${JSON.stringify(ccEventFromEth)}`,
      );
    }
  }

  private createCrossChainEventFromBesuReceipt(
    besuReceipt: BesuV2TxReceipt,
    checkConformance: boolean,
  ): void {
    const ccEventFromBesu: CrossChainEvent = {
      caseID: besuReceipt.caseID,
      receiptID: besuReceipt.transactionID,
      blockchainID: besuReceipt.blockchainID,
      invocationType: besuReceipt.invocationType,
      methodName: besuReceipt.methodName,
      parameters: besuReceipt.parameters,
      timestamp: besuReceipt.timestamp.toISOString(),
      identity: besuReceipt.from,
      cost: besuReceipt.gasUsed,
      carbonFootprint: CarbonFootPrintConstants(besuReceipt.blockchainID),
      latency: millisecondsLatency(besuReceipt.timestamp),
    };

    if (checkConformance == false) {
      this.crossChainLog.addCrossChainEvent(ccEventFromBesu);
      this.log.info("Added Cross Chain event from BESU");
      this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventFromBesu)}`);
    } else {
      this.conformanceCrossChainLog.addCrossChainEvent(ccEventFromBesu);
      this.log.info(
        "Added Cross Chain event from BESU for conformance checking",
      );
      this.log.debug(
        `Conformance Cross-chain log: ${JSON.stringify(ccEventFromBesu)}`,
      );
    }
  }

  private createCrossChainEventFromFabricReceipt(
    fabricReceipt: FabricV2TxReceipt,
    checkConformance: boolean,
  ): void {
    const ccEventFromFabric: CrossChainEvent = {
      caseID: fabricReceipt.caseID,
      receiptID: fabricReceipt.transactionID,
      blockchainID: fabricReceipt.blockchainID,
      invocationType: fabricReceipt.invocationType,
      methodName: fabricReceipt.methodName,
      parameters: fabricReceipt.parameters,
      timestamp: fabricReceipt.timestamp.toISOString(),
      identity: fabricReceipt.signingCredentials.keychainRef,
      cost: fabricReceipt.cost || 0,
      carbonFootprint: CarbonFootPrintConstants(fabricReceipt.blockchainID),
      latency: millisecondsLatency(fabricReceipt.timestamp),
    };

    if (checkConformance == false) {
      this.crossChainLog.addCrossChainEvent(ccEventFromFabric);
      this.log.info("Added Cross Chain event from FABRIC");
      this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventFromFabric)}`);
    } else {
      this.conformanceCrossChainLog.addCrossChainEvent(ccEventFromFabric);
      this.log.info(
        "Added Cross Chain event from FABRIC for conformance checking",
      );
      this.log.debug(
        `Conformance Cross-chain log: ${JSON.stringify(ccEventFromFabric)}`,
      );
    }
  }

  private async createCrossChainEventFromReceipt(
    receipt: BesuV2TxReceipt | EthereumTxReceipt | FabricV2TxReceipt,
    checkConformance: boolean,
  ): Promise<void> {
    switch (receipt.blockchainID) {
      // Process Besu transaction receipt
      case LedgerType.Besu2X:
        this.createCrossChainEventFromBesuReceipt(
          receipt as BesuV2TxReceipt,
          checkConformance,
        );
        break;
      // Process Ethereum transaction receipt
      case LedgerType.Ethereum:
        this.createCrossChainEventFromEthReceipt(
          receipt as EthereumTxReceipt,
          checkConformance,
        );
        break;
      // Process Fabric transaction receipt
      case LedgerType.Fabric2:
        this.createCrossChainEventFromFabricReceipt(
          receipt as FabricV2TxReceipt,
          checkConformance,
        );
        break;
      default:
        this.log.warn(
          `Tx Receipt with case ID ${receipt.caseID} is not supported`,
        );
        break;
    }
  }

  public async txReceiptToCrossChainEventLogEntry(
    checkConformance: boolean = false,
  ): Promise<CrossChainEvent[] | void> {
    const startTime = new Date();
    const fnTag = `${this.className}#txReceiptToCrossChainEventLogEntry()`;
    this.log.debug(fnTag);
    // We are processing receipts to update the CrossChainLog.
    // At the end of the processing, we need to clear the transaction receipts that have been processed
    // Therefore, we need a listen method that hephaestus is always running, doing polls every X seconds, followed by receipt processing (this method)
    try {
      this.txReceipts.forEach((receipt) => {
        this.createCrossChainEventFromReceipt(receipt, checkConformance);
      });
      // Clear receipt array
      this.txReceipts = [];
      const finalTime = new Date();
      this.log.debug(
        `EVAL-${this.className}-RECEIPT2EVENT:${finalTime.getTime() - startTime.getTime()}`,
      );
      return;
    } catch (error) {
      const details = this.txReceipts.map((receipt) => {
        return {
          caseID: receipt.caseID,
          receiptID: receipt.receiptID,
          blockchainID: receipt.blockchainID,
          timestamp: receipt.timestamp,
          invocationType: receipt.invocationType,
          methodName: receipt.methodName,
          parameters: receipt.parameters,
        };
      });
      this.log.error(
        `${fnTag} Failed to create cross chain events from transaction receipts:`,
        error,
        `Receipts' details:`,
        JSON.stringify(details),
      );
      throw error;
    }
  }

  // Parses the cross chain event log to updates the cross chain model
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
    };
    const lastAggregatedTime = new Date(lastAggregated).getTime();
    const logsToAggregate = logEntries.filter(
      (log) => new Date(log.timestamp).getTime() > lastAggregatedTime,
    );
    if (logsToAggregate.length === 0) {
      const finalTime = new Date();

      this.log.debug(
        `EVAL-${this.className}-AGGREGATE-CCTX-NO_NEW_LOGS:${finalTime.getTime() - startTime.getTime()}`,
      );
      return;
    }
    logsToAggregate.forEach((eventEntry) => {
      const key = eventEntry.caseID;
      const eventID = eventEntry.receiptID;
      let latency = eventEntry.latency as number;
      let carbonFootprint = eventEntry.carbonFootprint as number;
      let cost = eventEntry.cost as number;

      if (!latency) {
        latency = 0;
      }
      if (!carbonFootprint) {
        carbonFootprint = 0;
      }
      if (!cost) {
        cost = 0;
      }
      if (ccTxSet?.has(key)) {
        const existingCCTx = ccTxSet.get(key);
        const previousEvents = existingCCTx?.processedCrossChainEvents || [];
        const numberOfCurrentEvents = previousEvents.length + 1;
        const previousLatency = existingCCTx?.latency || 0;
        const previousCarbonFootprint = existingCCTx?.carbonFootprint || 0;
        const previousCost = existingCCTx?.cost || 0;
        const currentCost = (cost + previousCost) / numberOfCurrentEvents;

        const updatedMetrics = {
          ccTxID: key,
          processedCrossChainEvents: [...previousEvents, eventID],
          latency: (latency + previousLatency) / numberOfCurrentEvents,
          carbonFootprint:
            (carbonFootprint + previousCarbonFootprint) / numberOfCurrentEvents,
          cost: currentCost,
          throughput: Number(
            latency != 0
              ? ((
                  1 /
                  ((latency + previousLatency) / numberOfCurrentEvents)
                ).toFixed(3) as unknown as number)
              : 0,
          ),
          latestUpdate: lastAggregated,
        };
        this.crossChainModel.setCCTxs(key, updatedMetrics);
      } else {
        metrics = {
          ccTxID: key,
          processedCrossChainEvents: [eventID],
          latency: latency,
          carbonFootprint: carbonFootprint,
          cost: cost,
          throughput: Number(
            (latency != 0 ? 1 / latency : 0).toFixed(3) as unknown as number,
          ),
          latestUpdate: lastAggregated,
        };
        this.crossChainModel.setCCTxs(key, metrics);
      }
    });
    this.crossChainModel.setLastAggregationDate(newAggregationDate);
    const finalTime = new Date();
    this.log.debug(
      `${this.className}-AGGREGATE-CCTX-SUCCESS:${finalTime.getTime() - startTime.getTime()}`,
    );
    return;
  }

  public async persistCrossChainLogCsv(name?: string): Promise<string> {
    const startTime = new Date();
    const columns =
      this.crossChainLog.getCrossChainLogAttributes() as (keyof CrossChainEvent)[];
    const logName = name
      ? `${name}.csv`
      : `hephaestus_log_${startTime.getTime()}.csv`;
    const csvFolder = path.join(__dirname, "../", "../", "test", "csv");
    const logPath = path.join(csvFolder, logName);
    const fnTag = `${this.className}#persistCrossChainLogCsv()`;
    const ccEvents = this.crossChainLog.logEntries;

    try {
      // Convert log entries to CSV rows
      const csvRows = ccEvents.map((entry) => {
        return columns
          .map((header) => {
            const value = entry[header];
            return typeof value === "string" && value.includes(";")
              ? `"${value}"`
              : value;
          })
          .join(";");
      });

      // Concatenate columns and rows into a single CSV string
      const data = [columns.join(";"), ...csvRows].join("\n");
      this.log.debug(data);

      // Create directory if it doesn't exist
      if (!fs.existsSync(csvFolder)) {
        fs.mkdirSync(csvFolder);
      }
      fs.writeFileSync(logPath, data);

      const finalTime = new Date();
      this.log.debug(
        `EVAL-${this.className}-PERSIST-LOG-CVS:${finalTime.getTime() - startTime.getTime()}`,
      );
      return logName;
    } catch (error) {
      const errorMessage = `${fnTag} Failed to export cross-chain event log to CSV file:`;
      throw new RuntimeError(errorMessage, error);
    }
  }

  public async persistCrossChainLogJson(name?: string): Promise<string> {
    const startTime = new Date();
    const logName = name
      ? `${name}.json`
      : `hephaestus_log_${startTime.getTime()}.json`;
    const jsonFolder = path.join(__dirname, "../", "../", "test", "json");
    const logPath = path.join(jsonFolder, logName);
    const fnTag = `${this.className}#persistCrossChainLogJson()`;

    const ccEvents = this.crossChainLog.logEntries;

    try {
      const data = JSON.stringify(ccEvents, null, 2);
      this.log.debug(data);

      // Create directory if it doesn't exist
      if (!fs.existsSync(jsonFolder)) {
        fs.mkdirSync(jsonFolder);
      }
      fs.writeFileSync(logPath, data);

      const finalTime = new Date();
      this.log.debug(
        `EVAL-${this.className}-PERSIST-LOG-JSON:${finalTime.getTime() - startTime.getTime()}`,
      );

      return logName;
    } catch (error) {
      const errorMessage = `${fnTag} Failed to export cross-chain event log to JSON file:`;
      throw new RuntimeError(errorMessage, error);
    }
  }

  private async persistConformanceCrossChainLog(): Promise<string> {
    const startTime = new Date();
    const logName = `hephaestus_log_${startTime.getTime()}`;
    const jsonFolder = path.join(__dirname, "../", "../", "test", "json");
    const logPath = path.join(jsonFolder, logName + ".json");
    const fnTag = `${this.className}#persistConformanceCrossChainLog()`;

    const ccEvents = this.conformanceCrossChainLog.logEntries;

    try {
      const data = JSON.stringify(ccEvents, null, 2);
      this.log.debug(data);

      // Create directory if it doesn't exist
      if (!fs.existsSync(jsonFolder)) {
        fs.mkdirSync(jsonFolder);
      }
      fs.writeFileSync(logPath, data);

      const finalTime = new Date();
      this.log.debug(
        `EVAL-${this.className}-PERSIST-LOG-JSON:${finalTime.getTime() - startTime.getTime()}`,
      );

      return logName;
    } catch (error) {
      const errorMessage = `${fnTag} Failed to export cross-chain event log to JSON file:`;
      throw new RuntimeError(errorMessage, error);
    }
  }

  public async stopPeriodicCCModelUpdate(fileName: string = ""): Promise<void> {
    const fnTag = `${this.className}#stopPeriodicCCModelUpdate()`;
    this.log.debug(fnTag);
    await this.txReceiptToCrossChainEventLogEntry();
    await this.createModel(fileName);
    this.periodicUpdate = false;
  }

  public async periodicCCModelUpdate(
    fileName: string = "",
    timeInterval: number,
  ): Promise<void> {
    const fnTag = `${this.className}#periodicCCModelUpdate()`;
    this.log.debug(fnTag);

    timeInterval = timeInterval < 5000 ? 5000 : timeInterval;

    this.periodicUpdate = true;
    const intervalId = setInterval(async () => {
      if (this.periodicUpdate == true) {
        await this.txReceiptToCrossChainEventLogEntry();
        if (fileName != "") {
          await this.persistCrossChainLogCsv(fileName);
          await this.persistCrossChainLogJson(fileName);
        }
        const modelPM4PY = await this.createModel(fileName);
        this.ccModel.setType(CrossChainModelType.PetriNet);
        this.saveModel(CrossChainModelType.PetriNet, modelPM4PY);
      } else {
        clearInterval(intervalId);
      }
    }, timeInterval);
  }

  // Receives a serialized model and saves it
  public saveModel(modelType: CrossChainModelType, model: string): void {
    this.crossChainModel.saveModel(modelType, model);
  }

  // Gets the saved serialized model with the specified CrossChainModelType
  public getModel(modelType: CrossChainModelType): string | undefined {
    return this.crossChainModel.getModel(modelType);
  }

  public async createModel(fileName: string = ""): Promise<string> {
    if (fileName == "") {
      fileName = await this.persistCrossChainLogCsv();
      fileName = fileName.split(".")[0];
    }
    await this.aggregateCcTx();
    const petriNet = createModelPM4PY(fileName);
    this.ccModel.setType(CrossChainModelType.PetriNet);
    this.saveModel(CrossChainModelType.PetriNet, petriNet);
    return petriNet;
  }

  // creates a file with unmodeled logs and performs a conformance check
  public async checkConformance(serializedCCModel: string): Promise<string> {
    const fileName = await this.persistConformanceCrossChainLog();
    const conformanceDetails = checkConformancePM4PY(
      fileName,
      serializedCCModel,
    );
    this.filterCrossChainLogsAndUpdateModel(fileName, conformanceDetails);
    return conformanceDetails;
  }

  private filterCrossChainLogsByConformance(
    conformanceDetails: string | undefined,
  ): boolean {
    const fnTag = `${this.className}#filterCrossChainLogsByConformance()`;
    if (!conformanceDetails) {
      throw new Error(`${fnTag} conformance details falsy.`);
    }
    let updateModel: boolean = false;
    const entries = this.conformanceCrossChainLog.logEntries;
    const details = conformanceDetails.split("\n");

    const misbehaviour = details[2];

    if (misbehaviour === "[]") {
      // if it conforms, add to ccmodel
      entries.forEach((entry) => {
        this.crossChainLog.addCrossChainEvent(entry);
      });
      // set to true to update the model
      updateModel = true;
    } else {
      // else keep it in a different log of bad behavior?
      entries.forEach((entry) => {
        this.nonConformanceCrossChainLog.addCrossChainEvent(entry);
      });
      // set to false to not update the model
      updateModel = false;
    }

    // clean conformanceCrossChainLog
    this.conformanceCrossChainLog.purgeLogs();

    return updateModel;
  }

  public async filterCrossChainLogsAndUpdateModel(
    fileName: string,
    conformanceDetails: string | undefined,
  ): Promise<void> {
    const update = this.filterCrossChainLogsByConformance(conformanceDetails);
    if (!update) {
      return;
    }
    await this.persistCrossChainLogCsv(fileName);
    await this.persistCrossChainLogJson(fileName);
    const modelPM4PY = await this.createModel(fileName);
    if (modelPM4PY) {
      this.ccModel.setType(CrossChainModelType.PetriNet);
      this.saveModel(CrossChainModelType.PetriNet, modelPM4PY);
    }
  }

  public convertModelToProcessTree(): string | undefined {
    const petriNet = this.ccModel.getModel(CrossChainModelType.PetriNet);
    if (!petriNet) {
      return;
    }
    const tree = convertToProcessTreePM4PY(petriNet);
    if (!tree) {
      return;
    }
    this.saveModel(CrossChainModelType.ProcessTree, tree);
    return tree;
  }
}
