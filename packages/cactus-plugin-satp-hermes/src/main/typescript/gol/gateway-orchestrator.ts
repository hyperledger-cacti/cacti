// a helper class to manage connections to counterparty gateways
import { ILoggerOptions, JsObjectSigner, LogLevelDesc, Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { GatewayIdentity, GatewayChannel, SupportedGatewayImplementations } from "../core/types";
import { NonExistantGatewayIdentity } from "../core/errors";
import { PromiseClient as PromiseConnectClient, Transport as ConnectTransport, PromiseClient } from "@connectrpc/connect";

import { SatpStage0Service } from "../generated/proto/cacti/satp/v02/stage_0_connect";
import { SatpStage1Service } from "../generated/proto/cacti/satp/v02/stage_1_connect";
import { SatpStage2Service } from "../generated/proto/cacti/satp/v02/stage_2_connect";
import { SatpStage3Service } from "../generated/proto/cacti/satp/v02/stage_3_connect";

export interface IGatewayOrchestratorOptions {
  logLevel?: LogLevelDesc;
  ourGateway: GatewayIdentity;
  counterPartyGateways: GatewayIdentity[] | undefined;
  signer: JsObjectSigner;
}

import {
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_GRPC,
  DEFAULT_PORT_GATEWAY_SERVER,
} from "../core/constants";

import { BLODispatcher, BLODispatcherOptions } from "../blo/dispatcher";
//import { COREDispatcher, COREDispatcherOptions } from "../core/dispatcher";
import express, { Express } from "express";
import http from "http";
import { SATPSession } from "../core/satp-session";
import { SessionData } from "../generated/proto/cacti/satp/v02/common/session_pb";
import { Transport, createPromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { ISATPManagerOptions, SATPManager, SATPServiceClient } from "./protocol-manager/satp-manager";
import { log } from "console";
import { getGatewaySeeds, resolveGatewayID } from "../network-identification/resolve-gateway";
import { timingSafeEqual } from "crypto";
import { ServiceType } from "@bufbuild/protobuf";

export class GatewayOrchestrator {
  public readonly label = "GatewayOrchestrator";
  private ourGateway: GatewayIdentity;
  private counterPartyGateways: Map<string, GatewayIdentity> = new Map();
  private channels: Map<string, GatewayChannel> = new Map();
  private readonly logger: Logger;
  private signer: JsObjectSigner;

  constructor(
    options: IGatewayOrchestratorOptions,
  ) {
    // add checks
    this.ourGateway = options.ourGateway;
    const level = options.logLevel || "INFO";
    const logOptions: ILoggerOptions = {
      level: level,
      label: this.label,
    };

    this.logger = LoggerProvider.getOrCreate(logOptions);
    this.logger.info("Initializing Gateway Connection Manager");
    this.logger.info("Gateway Coordinator initialized");
    const seedGateways = getGatewaySeeds(this.logger);
    this.logger.info(
      `Initializing gateway connection manager with ${seedGateways} seed gateways`,
    );
    this.signer = options.signer;
    const allCounterPartyGateways = seedGateways.concat(options.counterPartyGateways ?? []);
    // populate counterPartyGateways
    this.counterPartyGateways = new Map(
      allCounterPartyGateways.map((gateway) => [gateway.id, gateway]),
    );

    this.logger.info(
      `Gateway Connection Manager bootstrapped with ${allCounterPartyGateways.length} gateways`,
    );


    this.addGateways(allCounterPartyGateways);
    const numberGatewayChannels = this.connectToCounterPartyGateways();
    if (numberGatewayChannels > 0) {
      this.logger.info(
        `Gateway Connection Manager connected to ${numberGatewayChannels} gateways.`,
      );
      this.logger.info("Creating SATPManager");
    }
  }

  async startupGatewayOrchestrator(): Promise<void> {
    if (this.counterPartyGateways.values.length === 0) {
      this.logger.info("No gateways to connect to");
      return;
    } else {
      this.connectToCounterPartyGateways();
    }
  }

  isSelfId(id: string): boolean {
    return id === this.ourGateway.id;
  }

  isInCounterPartyGateways(id: string): boolean {
    return this.counterPartyGateways.has(id);
  }

  isInChannels(id: string): boolean {
    return this.channels.has(id);
  }

  // Find IDs in counterPartyGateways that do not have a corresponding channel
  findUnchanneledGateways(): string[] {
    return Array.from(this.counterPartyGateways.keys()).filter(id => {
      return !this.isInChannels(id) && !this.isSelfId(id);
    });
  }

  // Filter IDs that are not present in counterPartyGateways or channels and not the self ID
  filterNewIds(ids: string[]): string[] {
    return ids.filter(id => {
      return !this.isInCounterPartyGateways(id) && 
             !this.isInChannels(id) && 
             !this.isSelfId(id);
    });
  }

  connectToCounterPartyGateways(): number {
    const fnTag = `${this.label}#connectToCounterPartyGateways()`;
    if (!this.counterPartyGateways) {
      this.logger.info(`${fnTag}, No counterparty gateways to connect to`);
      return 0;
    }

    const idsToAdd = this.filterNewIds(Array.from(this.counterPartyGateways.keys()));
    if (idsToAdd.length === 0) {
      this.logger.info(`${fnTag}, No new gateways to connect to`);
      return 0;
    }
    
    // get gateway identtiies from counterPartyGateways
    const gatewaysToAdd = idsToAdd.map(id => this.counterPartyGateways.get(id)!);

    let connected = 0;
    try {
      for (const gateway of gatewaysToAdd) {
          const channel = this.createChannel(gateway);
          this.channels.set(gateway.id, channel);
          connected++;
      }
    } catch (ex) {
      this.logger.error(`${fnTag}, Failed to connect to gateway`);
      this.logger.error(ex);
    }
    return connected;
  }

  get supportedDLTs(): SupportedGatewayImplementations[] {
     return this.ourGateway.supportedChains;
  }

  createChannel(identity: GatewayIdentity): GatewayChannel {
    const clients = this.createConnectClients(identity);

    const SATPManagerOpts: ISATPManagerOptions = {
        logLevel: "DEBUG",
        instanceId: this.ourGateway!.id,
        signer: this.signer,
        supportedDLTs: this.supportedDLTs,
        connectClients: clients,
      };

    const manager = new SATPManager(SATPManagerOpts);

    const channel: GatewayChannel = {
      fromGatewayID: this.ourGateway.id,
      toGatewayID: identity.id, 
      manager: manager,
      sessions: new Map(),
    };

    
    return channel;
  }

  private createConnectClients(identity: GatewayIdentity): PromiseConnectClient<SATPServiceClient>[] {
    let createdClients: ServiceType[] = [];
    // one function for each client type; aggregate in array
    const transport = createConnectTransport({
      baseUrl: identity.address + ":" + identity.gatewayGrpcPort,
      httpVersion: "1.1"
    });

    const stage0Client = this.createStage0ServiceClient(transport);
    const stage1Client = this.createStage1ServiceClient(transport);
    const stage2Client = this.createStage2ServiceClient(transport);
    const stage3Client = this.createStage3ServiceClient(transport);

    return [stage0Client, stage1Client, stage2Client, stage3Client];
  }

  private createStage0ServiceClient(transport: ConnectTransport): PromiseConnectClient<typeof SatpStage0Service> {
    this.logger.debug("Creating stage 0 service client, with transport: ", transport);
    const client = createPromiseClient(SatpStage0Service, transport);
    return client;
  }

  private createStage1ServiceClient(transport: ConnectTransport): PromiseConnectClient<typeof SatpStage1Service> {
    this.logger.debug("Creating stage 1 service client, with transport: ", transport);
    const client = createPromiseClient(SatpStage1Service, transport);
    return client;
  }

  private createStage2ServiceClient(transport: ConnectTransport): PromiseConnectClient<typeof SatpStage2Service> {
    this.logger.debug("Creating stage 2 service client, with transport: ", transport);
    const client = createPromiseClient(SatpStage2Service, transport);
    return client;
  }

  private createStage3ServiceClient(transport: ConnectTransport): PromiseConnectClient<typeof SatpStage3Service> {
    this.logger.debug("Creating stage 3 service client, with transport: ", transport);
    const client = createPromiseClient(SatpStage3Service, transport);
    return client;
  }

   public async resolveAndAddGateways(IDs: string[]): Promise<number> {
    const fnTag = `${this.label}#addGateways()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Connecting to gateway");
    const gatewaysToAdd: GatewayIdentity[] = [];
    const thisID = this.ourGateway!.id;
    const otherIDs = IDs.filter((id) => id !== thisID);

    for (const id of otherIDs) {
      gatewaysToAdd.push(await resolveGatewayID(this.logger, id));
    }

    this.addGateways(gatewaysToAdd);
    return gatewaysToAdd.length;
  }

   public addGateways(gateways: GatewayIdentity[]): string[] {
    const fnTag = `${this.label}#addGateways()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Connecting to gateway");
    let addedIDs: string[] = [];
    // gateways tha are not self
    const otherGateways = gateways.filter((gateway) => gateway.id !== this.ourGateway.id);

    // gateways that are not already connected
    const uniqueGateways = otherGateways.filter((gateway) => !this.counterPartyGateways.has(gateway.id));  

    for (const gateway of uniqueGateways) {
      this.counterPartyGateways.set(gateway.id, gateway);
      addedIDs.push(gateway.id);
    }
    this.logger.debug(`Added ${addedIDs.length} gateways: ${addedIDs}`);
    return addedIDs;
  }

  alreadyConnected(ID: string): boolean {
    return this.channels.has(ID);
  }

  async disconnectAll(): Promise<number> {
    const fnTag = `${this.label}#disconnectAll()`;

    let counter = 0;
    this.channels.forEach(async (channel) => {
      this.logger.info(`${fnTag}, Disconnecting from ${channel.toGatewayID}`);
      // ! todo implement disconnect
      this.logger.error("Not implemented");
      counter++;
    });
    this.channels.clear();
    return counter;
  }

  /*
  BOL TO GOL translation
  */
    async handleTransferRequest(): Promise<void> {
    // add checks
    this.logger.info("Handling transfer request");
    // ! todo implement transfer request
    this.logger.error("Not implemented");
  }

    async handleGetRoutes(): Promise<void> {
    // add checks
    this.logger.info("Handling transfer request");
    // ! todo implement transfer request
    this.logger.error("Not implemented");
  }

}
