// a helper class to manage connections to counterparty gateways
import {
  ILoggerOptions,
  JsObjectSigner,
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  GatewayIdentity,
  GatewayChannel,
  SupportedChain,
  SATPServiceInstance,
} from "../core/types";
import {
  PromiseClient as PromiseConnectClient,
  Transport as ConnectTransport,
} from "@connectrpc/connect";

import { Express } from "express";

import { expressConnectMiddleware } from "@connectrpc/connect-express";

import { SatpStage0Service } from "../generated/proto/cacti/satp/v02/stage_0_connect";
import { SatpStage1Service } from "../generated/proto/cacti/satp/v02/stage_1_connect";
import { SatpStage2Service } from "../generated/proto/cacti/satp/v02/stage_2_connect";
import { SatpStage3Service } from "../generated/proto/cacti/satp/v02/stage_3_connect";

export interface IGatewayOrchestratorOptions {
  logLevel?: LogLevelDesc;
  localGateway: GatewayIdentity;
  counterPartyGateways?: GatewayIdentity[];
  signer: JsObjectSigner;
}

//import { COREDispatcher, COREDispatcherOptions } from "../core/dispatcher";
import { createPromiseClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-node";
import {
  getGatewaySeeds,
  resolveGatewayID,
} from "../network-identification/resolve-gateway";
import { SATPHandler, Stage } from "../types/satp-protocol";

export class GatewayOrchestrator {
  public readonly label = "GatewayOrchestrator";
  private expressServer: Express | undefined;
  protected localGateway: GatewayIdentity;
  private counterPartyGateways: Map<string, GatewayIdentity> = new Map();
  private handlers: Map<string, SATPHandler> = new Map();

  // TODO!: add logic to manage sessions (parallelization, user input, freeze, unfreeze, rollback, recovery)
  private channels: Map<string, GatewayChannel> = new Map();
  private readonly logger: Logger;

  constructor(options: IGatewayOrchestratorOptions) {
    // add checks
    this.localGateway = options.localGateway;
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

    const allCounterPartyGateways = seedGateways.concat(
      options.counterPartyGateways ?? [],
    );

    // populate counterPartyGateways
    this.counterPartyGateways = new Map(
      allCounterPartyGateways.map((gateway) => [gateway.id, gateway]),
    );

    this.logger.info(
      `Gateway Connection Manager bootstrapped with ${allCounterPartyGateways.length} gateways`,
    );

    this.channels.set(
      this.localGateway.id,
      this.createChannel(this.localGateway),
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

  public get ourGateway(): GatewayIdentity {
    return this.localGateway;
  }

  public addGOLServer(server: Express): void {
    this.expressServer = server;
  }

  public startServices(): void {
    for (const stage of this.handlers.keys()) {
      this.logger.info(
        `Setting up routes for stage ${`/${this.handlers.get(stage)!.getStage()}`}`,
      );
      this.expressServer!.use(
        `/${this.handlers.get(stage)!.getStage()}`,
        expressConnectMiddleware({
          routes: this.handlers
            .get(stage)!
            .setupRouter.bind(this.handlers.get(stage)!),
        }),
      );
    }
  }

  public addHandlers(handlers: Map<string, SATPHandler>): void {
    this.handlers = handlers;
  }

  async startupGatewayOrchestrator(): Promise<void> {
    if (this.counterPartyGateways.values.length === 0) {
      this.logger.info("No gateways to connect to");
      return;
    } else {
      this.connectToCounterPartyGateways();
    }
  }

  public getGatewayIdentity(id: string): GatewayIdentity | undefined {
    if (this.localGateway.id === id) {
      return this.localGateway;
    } else {
      return this.counterPartyGateways.get(id);
    }
  }

  public getCounterPartyGateway(id: string): GatewayIdentity | undefined {
    return this.counterPartyGateways.get(id);
  }

  public getChannel(dlt: SupportedChain): GatewayChannel {
    const channels = Array.from(this.channels.values());
    const channel = channels.find((channel) => {
      return channel.supportedDLTs.includes(dlt);
    });
    if (!channel) {
      throw new Error(
        `No channel found for DLT ${dlt} \n available channels: ${JSON.stringify(channels)}`,
      );
    }
    return channel;
  }

  public getChannels(): Map<string, GatewayChannel> {
    return this.channels;
  }
  isSelfId(id: string): boolean {
    return id === this.localGateway.id;
  }
  getSelfId(): string {
    return this.localGateway.id;
  }

  isInCounterPartyGateways(id: string): boolean {
    return this.counterPartyGateways.has(id);
  }

  getCounterPartyGateways(): Map<string, GatewayIdentity> {
    return this.counterPartyGateways;
  }

  isInChannels(id: string): boolean {
    return this.channels.has(id);
  }

  // Find IDs in counterPartyGateways that do not have a corresponding channel
  findUnchanneledGateways(): string[] {
    return Array.from(this.counterPartyGateways.keys()).filter((id) => {
      return !this.isInChannels(id) && !this.isSelfId(id);
    });
  }

  // Filter IDs that are not present in counterPartyGateways or channels and not the self ID
  filterNewIds(ids: string[]): string[] {
    return ids.filter((id) => {
      return (
        // !this.isInCounterPartyGateways(id) &&
        !this.isInChannels(id) && !this.isSelfId(id)
      );
    });
  }

  connectToCounterPartyGateways(): number {
    const fnTag = `${this.label}#connectToCounterPartyGateways()`;
    if (!this.counterPartyGateways) {
      this.logger.info(`${fnTag}, No counterparty gateways to connect to`);
      return 0;
    }

    const idsToAdd = this.filterNewIds(
      Array.from(this.counterPartyGateways.keys()),
    );
    if (idsToAdd.length === 0) {
      this.logger.info(`${fnTag}, No new gateways to connect to`);
      return 0;
    }

    // get gateway identities from counterPartyGateways
    const gatewaysToAdd = idsToAdd.map(
      (id) => this.counterPartyGateways.get(id)!,
    );

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

  get supportedDLTs(): SupportedChain[] {
    return this.localGateway.supportedDLTs;
  }

  createChannel(identity: GatewayIdentity): GatewayChannel {
    const clients = this.createConnectClients(identity);

    const channel: GatewayChannel = {
      fromGatewayID: this.localGateway.id,
      toGatewayID: identity.id,
      sessions: new Map(),
      clients: clients,
      supportedDLTs: identity.supportedDLTs,
    };
    this.logger.info(
      `Created channel to gateway ${identity.id} \n supported DLTs: ${identity.supportedDLTs}`,
    );
    return channel;
  }

  protected getTargetChannel(id: string): GatewayChannel {
    const channel = this.channels.get(id);
    if (!channel) {
      throw new Error(`Channel with gateway id ${id} does not exist`);
    } else {
      return channel;
    }
  }

  private createConnectClients(
    identity: GatewayIdentity,
  ): Map<string, PromiseConnectClient<SATPServiceInstance>> {
    // one function for each client type; aggregate in array
    this.logger.debug(
      `Creating clients for gateway ${JSON.stringify(identity)}`,
    );
    const transport0 = createGrpcWebTransport({
      baseUrl:
        identity.address +
        ":" +
        identity.gatewayServerPort +
        `/${Stage.STAGE0}`,
      httpVersion: "1.1",
    });

    this.logger.debug(
      "Transport:" +
        identity.address +
        ":" +
        identity.gatewayServerPort +
        `/${Stage.STAGE0}`,
    );

    const transport1 = createGrpcWebTransport({
      baseUrl:
        identity.address +
        ":" +
        identity.gatewayServerPort +
        `/${Stage.STAGE1}`,
      httpVersion: "1.1",
    });

    const transport2 = createGrpcWebTransport({
      baseUrl:
        identity.address +
        ":" +
        identity.gatewayServerPort +
        `/${Stage.STAGE2}`,
      httpVersion: "1.1",
    });

    const transport3 = createGrpcWebTransport({
      baseUrl:
        identity.address +
        ":" +
        identity.gatewayServerPort +
        `/${Stage.STAGE3}`,
      httpVersion: "1.1",
    });

    const clients: Map<
      string,
      PromiseConnectClient<SATPServiceInstance>
    > = new Map();

    clients.set("0", this.createStage0ServiceClient(transport0));
    clients.set("1", this.createStage1ServiceClient(transport1));
    clients.set("2", this.createStage2ServiceClient(transport2));
    clients.set("3", this.createStage3ServiceClient(transport3));

    // todo perform healthcheck on startup; should be in stage 0
    return clients;
  }

  private createStage0ServiceClient(
    transport: ConnectTransport,
  ): PromiseConnectClient<typeof SatpStage0Service> {
    this.logger.debug(
      "Creating stage 0 service client, with transport: ",
      transport,
    );
    const client = createPromiseClient(SatpStage0Service, transport);
    return client;
  }

  private createStage1ServiceClient(
    transport: ConnectTransport,
  ): PromiseConnectClient<typeof SatpStage1Service> {
    this.logger.debug(
      "Creating stage 1 service client, with transport: ",
      transport,
    );
    const client = createPromiseClient(SatpStage1Service, transport);
    return client;
  }

  private createStage2ServiceClient(
    transport: ConnectTransport,
  ): PromiseConnectClient<typeof SatpStage2Service> {
    this.logger.debug(
      "Creating stage 2 service client, with transport: ",
      transport,
    );
    const client = createPromiseClient(SatpStage2Service, transport);
    return client;
  }

  private createStage3ServiceClient(
    transport: ConnectTransport,
  ): PromiseConnectClient<typeof SatpStage3Service> {
    this.logger.debug(
      "Creating stage 3 service client, with transport: ",
      transport,
    );
    const client = createPromiseClient(SatpStage3Service, transport);
    return client;
  }

  public async resolveAndAddGateways(IDs: string[]): Promise<number> {
    const fnTag = `${this.label}#addGateways()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Connecting to gateway");
    const gatewaysToAdd: GatewayIdentity[] = [];
    const thisID = this.localGateway!.id;
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
    const addedIDs: string[] = [];
    // gateways tha are not self
    const otherGateways = gateways.filter(
      (gateway) => gateway.id !== this.localGateway.id,
    );

    // gateways that are not already connected
    const uniqueGateways = otherGateways.filter(
      (gateway) => !this.counterPartyGateways.has(gateway.id),
    );

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
