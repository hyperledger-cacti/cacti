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
} from "./pm4py-adapter/ccmodel-adapter";

export interface IWebAppOptions {
  port: number;
  hostname: string;
}
import {
  CrossChainModel,
  CrossChainModelType,
  CrossChainTransactionSchema,
  AssetState,
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
  sourceLedger: LedgerType;
  targetLedger: LedgerType;
}

export class CcModelHephaestus implements ICactusPlugin, IPluginWebService {
  private readonly log: Logger;
  private readonly instanceId: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private httpServer: Server | SecureServer | null = null;
  private crossChainLog: CrossChainEventLog;
  private unmodeledEventLog: CrossChainEventLog;
  private nonConformedCrossChainLog: CrossChainEventLog;
  private nonConformedCCTxs: string[];
  private crossChainModel: CrossChainModel;
  public readonly className = "plugin-ccmodel-hephaestus";
  private caseID: string;
  private ethTxObservable?: Observable<RunTransactionV1ExchangeEth>;
  private besuTxObservable?: Observable<RunTransactionV1ExchangeBesu>;
  private fabricTxObservable?: Observable<RunTxReqWithTxId>;
  private sourceLedger: LedgerType;
  private targetLedger: LedgerType;
  private startMonitoring: number | null = null;
  private isModeling: boolean;

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
    this.unmodeledEventLog = new CrossChainEventLog({
      name: "HEPHAESTUS_UNMODELED_LOGS",
    });
    this.nonConformedCrossChainLog = new CrossChainEventLog({
      name: "HEPHAESTUS_NON_CONFORMANCE_LOGS",
    });

    this.caseID = "UNDEFINED_CASE_ID";

    this.ethTxObservable = options.ethTxObservable;
    this.besuTxObservable = options.besuTxObservable;
    this.fabricTxObservable = options.fabricTxObservable;

    this.sourceLedger = options.sourceLedger;
    this.targetLedger = options.targetLedger;

    //todo should allow different models to be instantiated
    this.crossChainModel = new CrossChainModel();

    this.isModeling = true;

    this.nonConformedCCTxs = [];

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

  get numberEventsUnmodeledLog(): number {
    return this.unmodeledEventLog.numberEvents();
  }

  public purgeNonConformedEvents(): void {
    this.nonConformedCrossChainLog.purgeLogs();
  }

  get numberEventsNonConformedLog(): number {
    return this.nonConformedCrossChainLog.numberEvents();
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

  public setIsModeling(bool: boolean): void {
    this.isModeling = bool;
  }

  public setCaseId(id: string): void {
    this.unmodeledEventLog.purgeLogs();
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

  private createReceiptFromRunTransactionV1ExchangeBesu(
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

  private pollTxReceiptsBesu(
    data: RunTransactionV1ExchangeBesu,
  ): BesuV2TxReceipt {
    const fnTag = `${this.className}#pollTxReceiptsBesu()`;
    this.log.debug(fnTag);

    const besuReceipt = this.createReceiptFromRunTransactionV1ExchangeBesu(
      data,
      this.caseID,
    );
    return besuReceipt;
  }

  private createReceiptFromRunTransactionV1ExchangeEth(
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

  private pollTxReceiptsEth(
    data: RunTransactionV1ExchangeEth,
  ): EthereumTxReceipt {
    const fnTag = `${this.className}#pollTxReceiptsEth()`;
    this.log.debug(fnTag);

    const ethReceipt = this.createReceiptFromRunTransactionV1ExchangeEth(
      data,
      this.caseID,
    );
    return ethReceipt;
  }

  private createReceiptFromRunTxReqWithTxId(
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

  private pollTxReceiptsFabric(data: RunTxReqWithTxId): FabricV2TxReceipt {
    const fnTag = `${this.className}#pollTxReceiptsFabric()`;
    this.log.debug(fnTag);

    const fabricReceipt = this.createReceiptFromRunTxReqWithTxId(
      data,
      this.caseID,
    );
    return fabricReceipt;
  }

  private watchRunTransactionV1ExchangeBesu(duration: number = 0): void {
    const fnTag = `${this.className}#watchRunTransactionV1ExchangeBesu()`;
    this.log.debug(fnTag);

    if (!this.besuTxObservable) {
      this.log.debug(
        `${fnTag}-No Besu transaction observable provided, monitoring skipped`,
      );
      return;
    }

    this.besuTxObservable
      .pipe(
        // Filter only the values emitted within the specified duration
        // if no duration provided, skip filtering
        duration >= 0
          ? filter(
              (data) =>
                this.startMonitoring! - data.timestamp.getTime() <= duration,
            )
          : tap(),
      )
      .subscribe({
        next: async (data: RunTransactionV1ExchangeBesu) => {
          // Handle the data whenever a new value is received by the observer:
          // this includes creating the receipt, then the cross-chain event
          // and check its conformance to the model, if the model is already defined
          const receipt = this.pollTxReceiptsBesu(data);
          const ccEvent = this.createCrossChainEventFromBesuReceipt(
            receipt,
            this.isModeling,
          );
          const model = this.ccModel.getModel(CrossChainModelType.PetriNet);

          if (!this.isModeling && model && this.numberEventsUnmodeledLog != 0) {
            this.updateCcStateAndCheckConformance(ccEvent, model);
          }
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

  private watchRunTransactionV1ExchangeEth(duration: number = 0): void {
    const fnTag = `${this.className}#watchRunTransactionV1ExchangeEth()`;
    this.log.debug(fnTag);

    if (!this.ethTxObservable) {
      this.log.debug(
        `${fnTag}-No Ethereum transaction observable provided, monitoring skipped`,
      );
      return;
    }

    this.ethTxObservable
      .pipe(
        // Filter only the values emitted within the specified duration
        // if no duration provided, skip filtering
        duration >= 0
          ? filter(
              (data) =>
                this.startMonitoring! - data.timestamp.getTime() <= duration,
            )
          : tap(),
      )
      .subscribe({
        next: async (data: RunTransactionV1ExchangeEth) => {
          // Handle the data whenever a new value is received by the observer
          // this includes creating the receipt, then the cross-chain event
          // and check its conformance to the model, if the model is already defined
          const receipt = this.pollTxReceiptsEth(data);
          const ccEvent = this.createCrossChainEventFromEthReceipt(
            receipt,
            this.isModeling,
          );
          const model = this.ccModel.getModel(CrossChainModelType.PetriNet);
          if (!this.isModeling && model && this.numberEventsUnmodeledLog != 0) {
            this.updateCcStateAndCheckConformance(ccEvent, model);
          }
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

  private watchRunTxReqWithTxId(duration: number = 0): void {
    const fnTag = `${this.className}#watchRunTxReqWithTxId()`;
    this.log.debug(fnTag);

    if (!this.fabricTxObservable) {
      this.log.debug(
        `${fnTag}-No Fabric transaction observable provided, monitoring skipped`,
      );
      return;
    }

    this.fabricTxObservable
      .pipe(
        // Filter only the values emitted within the specified duration
        // if no duration provided, skip filtering
        duration >= 0
          ? filter(
              (data) =>
                this.startMonitoring! - data.timestamp.getTime() <= duration,
            )
          : tap(),
      )
      .subscribe({
        next: async (data: RunTxReqWithTxId) => {
          // Handle the data whenever a new value is received by the observer
          // this includes creating the receipt, then the cross-chain event
          // and check its conformance to the model, if the model is already defined
          const receipt = this.pollTxReceiptsFabric(data);
          const ccEvent = this.createCrossChainEventFromFabricReceipt(
            receipt,
            this.isModeling,
          );
          const model = this.ccModel.getModel(CrossChainModelType.PetriNet);
          if (!this.isModeling && model && this.numberEventsUnmodeledLog != 0) {
            this.updateCcStateAndCheckConformance(ccEvent, model);
          }
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

  public monitorTransactions(duration: number = -1): void {
    const fnTag = `${this.className}#monitorTransactions()`;
    this.log.debug(fnTag);

    this.startMonitoring = Date.now();
    this.watchRunTransactionV1ExchangeBesu(duration);
    this.watchRunTransactionV1ExchangeEth(duration);
    this.watchRunTxReqWithTxId(duration);
    return;
  }

  private async updateCcStateAndCheckConformance(
    ccEvent: CrossChainEvent,
    model: string,
  ): Promise<void> {
    const assetState: AssetState = {
      assetID: ccEvent.parameters[0],
      assetState: ccEvent.methodName,
      ledger: ccEvent.blockchainID,
      lastStateUpdate: new Date(),
    };
    const ledgerHasMethod = this.addAssetToCcState(ccEvent, assetState);
    await this.checkConformance(model, ledgerHasMethod);
  }

  private addAssetToCcState(
    ccEvent: CrossChainEvent,
    assetState: AssetState,
  ): boolean {
    if (
      this.sourceLedger == ccEvent.blockchainID &&
      this.ccModel.sourceLedgerIncludesMethod(ccEvent.methodName)
    ) {
      this.ccModel.setAssetStateSourceLedger(this.caseID, assetState);
      return true;
    } else if (
      this.targetLedger == ccEvent.blockchainID &&
      this.ccModel.targetLedgerIncludesMethod(ccEvent.methodName)
    ) {
      this.ccModel.setAssetStateTargetLedger(this.caseID, assetState);
      return true;
    }
    return false;
  }

  private createCrossChainEventFromBesuReceipt(
    besuReceipt: BesuV2TxReceipt,
    updatingCCModel: boolean,
  ): CrossChainEvent {
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

    if (this.isModeling == false && updatingCCModel == false) {
      this.unmodeledEventLog.addCrossChainEvent(ccEventFromBesu);

      this.log.info(
        "Added Cross Chain event from BESU for conformance checking",
      );
      this.log.debug(
        `Conformance Cross-chain log: ${JSON.stringify(ccEventFromBesu)}`,
      );
    } else {
      this.crossChainLog.addCrossChainEvent(ccEventFromBesu);
      this.log.info("Added Cross Chain event from BESU");
      this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventFromBesu)}`);
    }
    return ccEventFromBesu;
  }

  private createCrossChainEventFromEthReceipt(
    ethReceipt: EthereumTxReceipt,
    updatingCCModel: boolean,
  ): CrossChainEvent {
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

    if (this.isModeling == false && updatingCCModel == false) {
      this.unmodeledEventLog.addCrossChainEvent(ccEventFromEth);

      this.log.info(
        "Added Cross Chain event from ETHEREUM for conformance checking",
      );
      this.log.debug(
        `Conformance Cross-chain log: ${JSON.stringify(ccEventFromEth)}`,
      );
    } else {
      this.crossChainLog.addCrossChainEvent(ccEventFromEth);
      this.log.info("Added Cross Chain event from ETHEREUM");
      this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventFromEth)}`);
    }
    return ccEventFromEth;
  }

  private createCrossChainEventFromFabricReceipt(
    fabricReceipt: FabricV2TxReceipt,
    updatingCCModel: boolean,
  ): CrossChainEvent {
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

    if (this.isModeling == false && updatingCCModel == false) {
      this.unmodeledEventLog.addCrossChainEvent(ccEventFromFabric);

      this.log.info(
        "Added Cross Chain event from FABRIC for conformance checking",
      );
      this.log.debug(
        `Conformance Cross-chain log: ${JSON.stringify(ccEventFromFabric)}`,
      );
    } else {
      this.crossChainLog.addCrossChainEvent(ccEventFromFabric);
      this.log.info("Added Cross Chain event from FABRIC");
      this.log.debug(`Cross-chain log: ${JSON.stringify(ccEventFromFabric)}`);
    }
    return ccEventFromFabric;
  }

  // Parses the cross chain event log to update the cross chain model
  // This is part of the cc model; have a set that maps case id to data structure; this data structure are the consolidated metrics for a cctx, stores each txid
  // run over cc log; if case id is unique create new entry, otherwise add tx to cctx, update metrics, update last update; this is an updatable model
  private async aggregateCcTx(): Promise<void> {
    const startTime = new Date();
    const lastAggregated = this.crossChainModel.lastAggregation;
    const newAggregationDate = new Date();
    const ccTxSet = this.crossChainModel.getCCTxs();
    const logEntries = this.crossChainLog.logEntries;
    // If entries are more recent than aggregation
    let metrics: CrossChainTransactionSchema = {
      processedCrossChainEvents: [],
      latency: 0,
      carbonFootprint: 0,
      cost: 0,
      throughput: 0,
      latestUpdate: newAggregationDate,
    };
    const lastAggregatedTime = new Date(lastAggregated).getTime();
    console.log(logEntries);
    const logsToAggregate = logEntries.filter(
      (log) => new Date(log.timestamp).getTime() > lastAggregatedTime,
    );
    console.log(logsToAggregate);

    if (logsToAggregate.length === 0) {
      const finalTime = new Date();

      this.log.debug(
        `EVAL-${this.className}-AGGREGATE-CCTX-NO_NEW_LOGS:${finalTime.getTime() - startTime.getTime()}`,
      );
      return;
    }
    logsToAggregate.forEach((eventEntry) => {
      const ccTxID = eventEntry.caseID;
      const eventID = eventEntry.receiptID;
      const latency = (eventEntry.latency as number) || 0;
      const carbonFootprint = (eventEntry.carbonFootprint as number) || 0;
      const cost = (eventEntry.cost as number) || 0;

      if (ccTxSet?.has(ccTxID)) {
        const existingCCTx = ccTxSet.get(ccTxID);
        const previousEvents = existingCCTx?.processedCrossChainEvents || [];
        const numberOfCurrentEvents = previousEvents.length + 1;
        const previousLatency = existingCCTx?.latency || 0;
        const previousCarbonFootprint = existingCCTx?.carbonFootprint || 0;
        const previousCost = existingCCTx?.cost || 0;
        const currentCost = (cost + previousCost) / numberOfCurrentEvents;

        const updatedMetrics = {
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
        this.crossChainModel.setCCTxs(ccTxID, updatedMetrics);
      } else {
        metrics = {
          processedCrossChainEvents: [eventID],
          latency: latency,
          carbonFootprint: carbonFootprint,
          cost: cost,
          throughput: Number(
            (latency != 0 ? 1 / latency : 0).toFixed(3) as unknown as number,
          ),
          latestUpdate: lastAggregated,
        };
        this.crossChainModel.setCCTxs(ccTxID, metrics);
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

  private async persistUnmodeledEventLog(): Promise<string> {
    const startTime = new Date();
    const logName = `hephaestus_log_${startTime.getTime()}`;
    const jsonFolder = path.join(__dirname, "../", "../", "test", "json");
    const logPath = path.join(jsonFolder, logName + ".json");
    const fnTag = `${this.className}#persistUnmodeledEventLog()`;

    const ccLogEvents = this.unmodeledEventLog.logEntries;

    try {
      const data = JSON.stringify(ccLogEvents, null, 2);
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

  // Receives a serialized model and saves it
  public saveModel(modelType: CrossChainModelType, model: string): void {
    this.crossChainModel.saveModel(modelType, model);
  }

  // Gets the saved serialized model with the specified CrossChainModelType
  public getModel(modelType: CrossChainModelType): string | undefined {
    return this.crossChainModel.getModel(modelType);
  }

  public setLedgerMethods(): void {
    const logEntries = this.crossChainLog.logEntries;
    logEntries.forEach((event) => {
      if (this.sourceLedger == event.blockchainID) {
        this.ccModel.setSourceLedgerMethod(event.methodName);
      }
      if (this.targetLedger == event.blockchainID) {
        this.ccModel.setTargetLedgerMethod(event.methodName);
      }
    });
  }

  public async createModel(): Promise<string> {
    let fileName = await this.persistCrossChainLogJson();
    fileName = fileName.split(".")[0];
    await this.aggregateCcTx();
    const petriNet = createModelPM4PY(fileName);
    this.ccModel.setType(CrossChainModelType.PetriNet);
    this.saveModel(CrossChainModelType.PetriNet, petriNet);
    this.setLedgerMethods();
    return petriNet;
  }

  // creates a file with unmodeled logs and performs a conformance check
  private async checkConformance(
    serializedCCModel: string,
    ledgerHasMethod: boolean,
  ): Promise<string> {
    const fileName = await this.persistUnmodeledEventLog();
    const conformanceDetails = checkConformancePM4PY(
      fileName,
      serializedCCModel,
    );
    return this.filterLogsByConformance(conformanceDetails, ledgerHasMethod);
  }

  private filterLogsByConformance(
    conformanceDetails: string | undefined,
    ledgerHasMethod: boolean,
  ): string {
    const fnTag = `${this.className}#filterLogsByConformance()`;
    if (!conformanceDetails) {
      throw new Error(`${fnTag} conformance details falsy.`);
    }

    const details = conformanceDetails.split("\n");
    const diagnosis = details[0];

    if (
      diagnosis.includes("NON-CONFORMANCE") ||
      diagnosis.includes("SKIPPED ACTIVITY") ||
      !ledgerHasMethod
    ) {
      this.nonConformedCCTxs.push(this.caseID);
      this.unmodeledEventLog.logEntries.forEach((event) => {
        this.nonConformedCrossChainLog.addCrossChainEvent(event);
      });
      this.unmodeledEventLog.purgeLogs();
    } else if (diagnosis.includes("PARTIAL CONFORMANCE")) {
      if (this.nonConformedCCTxs.includes(this.caseID)) {
        this.unmodeledEventLog.logEntries.forEach((event) => {
          this.nonConformedCrossChainLog.addCrossChainEvent(event);
        });
        this.unmodeledEventLog.purgeLogs();
      }
    } else if (diagnosis.includes("FULL CONFORMANCE")) {
      this.unmodeledEventLog.logEntries.forEach((event) => {
        this.crossChainLog.addCrossChainEvent(event);
      });
      this.unmodeledEventLog.purgeLogs();
      this.createModel();
    }
    console.log(details);
    return diagnosis;
  }
}
