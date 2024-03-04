// a helper class to manage connections to counterparty gateways

import { Logger } from "@hyperledger/cactus-common";
import { GatewayIdentity, GatewayChannel } from "../core/types";
import { NonExistantGatewayIdentity } from "../core/errors";
interface GatewayOrchestratorOptions {
  logger: Logger;
}

export class GatewayOrchestrator {
  public readonly label = "GatewayOrchestrator";
  private gatewayIDs: string[] = [];
  private gateways: Map<string, GatewayIdentity> = new Map();
  private channels: Map<string, GatewayChannel> = new Map();
  private readonly logger: Logger;

  constructor(
    public readonly identities: GatewayIdentity[],
    options: GatewayOrchestratorOptions,
  ) {
    // add checks
    this.logger = options.logger;
    this.logger.info("Initializing Gateway Connection Manager");
    for (const identity of identities) {
      this.gatewayIDs.push(identity.id);
      this.gateways.set(identity.id, identity);
    }
    this.logger.info(
      `Gateway Connection Manager bootstrapped with ${identities.length} gateways`,
    );
  }

  async connectToCounterPartyGateways(): Promise<number> {
    const fnTag = `${this.label}#connectToCounterPartyGateways()`;
    // add checks
    this.logger.info(
      `${fnTag}, Connecting to ${this.gatewayIDs.length} gateways`,
    );
    let connected = 0;
    try {
      for (const id of this.gatewayIDs) {
        const guid = this.gateways.get(id);
        if (!guid) {
          throw new NonExistantGatewayIdentity(id);
        } else if (!this.alreadyConnected) {
          await this.createChannel(guid);
          connected++;
        }
      }
    } catch (ex) {
      this.logger.error(`${fnTag}, Failed to connect to gateway`);
      this.logger.error(ex);
    }
    return connected;
  }

  async addGateways(gateways: GatewayIdentity[]): Promise<number> {
    const fnTag = `${this.label}#addGateways()`;
    // add checks
    this.logger.info(`${fnTag}, Adding ${gateways.length} gateways`);
    for (const gateway of gateways) {
      const id = gateway.id;
      if (this.gatewayIDs.includes(id)) {
        this.logger.info(
          `${fnTag}, ${fnTag}, Gateway with id ${id} already exists, ignoring`,
        );
        continue;
      }
      this.gatewayIDs.push(id);
      this.gateways.set(id, gateway);
    }
    return this.connectToCounterPartyGateways();
  }

  alreadyConnected(ID: string): boolean {
    return this.channels.has(ID);
  }
  // make singleton
  async createChannels(): Promise<void> {
    // Add checks and the rest of your logic here
    const channels: GatewayChannel[] = [];
    this.gateways.forEach(async (identity) => {
      channels.push(await this.createChannel(identity));
    });
  }

  async createChannel(identity: GatewayIdentity): Promise<GatewayChannel> {
    // add checks
    const channel: GatewayChannel = {
      id: identity.id,
    };
    return channel;
  }

  async disconnectAll(): Promise<number> {
    const fnTag = `${this.label}#disconnectAll()`;

    let counter = 0;
    this.channels.forEach(async (channel) => {
      this.logger.info(`${fnTag}, Disconnecting from ${channel.id}`);
      this.logger.error("Not implemented");
      counter++;
    });
    return counter;
  }
}
