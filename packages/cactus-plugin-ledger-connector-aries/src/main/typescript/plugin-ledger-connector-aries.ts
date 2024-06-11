import type {
  Server as SocketIoServer,
  Socket as SocketIoSocket,
} from "socket.io";
import type { Express } from "express";
import * as path from "node:path";
import * as os from "node:os";
import { AskarModule } from "@aries-framework/askar";
import {
  Agent,
  InitConfig,
  HttpOutboundTransport,
  ConnectionsModule,
  DidsModule,
  TypedArrayEncoder,
  KeyType,
  CredentialsModule,
  V2CredentialProtocol,
  ProofsModule,
  AutoAcceptProof,
  V2ProofProtocol,
  AutoAcceptCredential,
} from "@aries-framework/core";
import { agentDependencies, HttpInboundTransport } from "@aries-framework/node";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import {
  IndyVdrAnonCredsRegistry,
  IndyVdrIndyDidRegistrar,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
  IndyVdrPoolConfig,
} from "@aries-framework/indy-vdr";
import { indyVdr } from "@hyperledger/indy-vdr-nodejs";
import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
} from "@aries-framework/anoncreds";
import { AnonCredsRsModule } from "@aries-framework/anoncreds-rs";
import { anoncreds } from "@hyperledger/anoncreds-nodejs";

import {
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
  safeStringifyException,
} from "@hyperledger/cactus-common";

import OAS from "../json/openapi.json";
import {
  AcceptInvitationV1Response,
  AgentConnectionRecordV1,
  AgentConnectionsFilterV1,
  AriesAgentConfigV1,
  AriesAgentSummaryV1,
  AriesProofExchangeRecordV1,
  CactiProofRequestAttributeV1,
  CreateNewConnectionInvitationV1Response,
  WatchConnectionStateOptionsV1,
  WatchConnectionStateV1,
  WatchProofStateOptionsV1,
  WatchProofStateV1,
} from "./generated/openapi/typescript-axios";
import {
  AnoncredAgent,
  cactiAgentConnectionsFilterToQuery,
  cactiAttributesToAnonCredsRequestedAttributes,
} from "./aries-types";

import { WatchConnectionStateV1Endpoint } from "./web-services/watch-connection-state-v1-endpoint";
import { WatchProofStateV1Endpoint } from "./web-services/watch-proof-state-v1-endpoint";
import { GetAgentsEndpoint } from "./web-services/get-agents-v1-endpoint";
import { RequestProofEndpoint } from "./web-services/request-proof-v1-endpoint";
import { GetConnectionsEndpoint } from "./web-services/get-connections-v1-endpoint";
import { CreateNewConnectionInvitationEndpoint } from "./web-services/create-new-connection-invitation-v1-endpoint";
import { AcceptInvitationEndpoint } from "./web-services/accept-invitation-v1-endpoint";

const DEFAULT_INVITATION_DOMAIN = "https://example.org";
const DEFAULT_WALLET_PATH = path.join(
  os.homedir(),
  ".cacti/cactus-plugin-ledger-connector-aries/wallet",
);

export interface IPluginLedgerConnectorAriesOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  // pluginRegistry: PluginRegistry;
  ariesAgents?: AriesAgentConfigV1[];
  invitationDomain?: string;
  walletPath?: string;
}

export class PluginLedgerConnectorAries
  implements ICactusPlugin, IPluginWebService
{
  // private readonly pluginRegistry: PluginRegistry;
  private readonly instanceId: string;
  private readonly invitationDomain: string;
  private readonly walletPath: string;
  private readonly log: Logger;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private ariesAgentConfigs: AriesAgentConfigV1[] | undefined;
  private ariesAgents = new Map<string, AnoncredAgent>();
  private connectedSockets = new Map<string, SocketIoSocket>();

  public get className(): string {
    return "PluginLedgerConnectorAries";
  }

  constructor(public readonly options: IPluginLedgerConnectorAriesOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    // Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;
    this.invitationDomain =
      options.invitationDomain ?? DEFAULT_INVITATION_DOMAIN;
    this.walletPath = options.walletPath ?? DEFAULT_WALLET_PATH;
    this.ariesAgentConfigs = options.ariesAgents;
    // this.pluginRegistry = options.pluginRegistry as PluginRegistry;
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Closes all socketio connections and shutdowns every agent configured in this connector.
   */
  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);

    this.log.debug("Disconnect all the sockets");
    this.connectedSockets.forEach((socket) => socket.disconnect());

    for (const [agentName, agent] of this.ariesAgents) {
      this.log.debug("Shutdown agent", agentName);
      await agent.shutdown();
    }

    this.ariesAgents.clear();
  }

  /**
   * Creates Aries agent instances defined in connector constructor.
   */
  public async onPluginInit(): Promise<void> {
    if (this.ariesAgentConfigs) {
      this.log.info("Create aries agent instances");
      for (const agentConfig of this.ariesAgentConfigs) {
        await this.addAriesAgent(agentConfig);
      }
    }
  }

  async registerWebServices(
    app: Express,
    wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const { logLevel } = this.options;

    // Register OpenAPI
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    // Register SocketIO (on new connection from the client)
    wsApi.on("connection", (socket: SocketIoSocket) => {
      this.log.info(`New Socket connected. ID=${socket.id}`);
      this.connectedSockets.set(socket.id, socket);

      // WatchConnectionStateV1
      socket.on(
        WatchConnectionStateV1.Subscribe,
        async (options: WatchConnectionStateOptionsV1) => {
          try {
            const agent = await this.getAriesAgentOrThrow(options.agentName);
            new WatchConnectionStateV1Endpoint({
              socket,
              logLevel,
              agent,
            }).subscribe();
          } catch (error) {
            this.log.warn(WatchConnectionStateV1.Error, error);
            socket.emit(
              WatchConnectionStateV1.Error,
              safeStringifyException(error),
            );
            socket.disconnect();
          }
        },
      );

      // WatchProofStateV1Endpoint
      socket.on(
        WatchProofStateV1.Subscribe,
        async (options: WatchProofStateOptionsV1) => {
          try {
            const agent = await this.getAriesAgentOrThrow(options.agentName);
            new WatchProofStateV1Endpoint({
              socket,
              logLevel,
              agent,
            }).subscribe();
          } catch (error) {
            this.log.warn(WatchProofStateV1.Error, error);
            socket.emit(WatchProofStateV1.Error, safeStringifyException(error));
            socket.disconnect();
          }
        },
      );

      // Disconnect
      socket.on("disconnect", () => {
        this.connectedSockets.delete(socket.id);
      });
    });

    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new GetAgentsEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new RequestProofEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetConnectionsEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new CreateNewConnectionInvitationEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new AcceptInvitationEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }

    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-aries`;
  }

  /**
   * Get summary of Aries agents managed by this connector.
   *
   * @returns Summary of Aries agents.
   */
  public async getAgents(): Promise<AriesAgentSummaryV1[]> {
    const allAgents = new Array(...this.ariesAgents.values());
    return allAgents.map((agent) => {
      if (!agent.config.walletConfig) {
        this.log.error(
          `Agent ${agent.config.label} doesn't have a wallet configured!`,
        );
      }

      return {
        name: agent.config.label,
        isAgentInitialized: agent.isInitialized,
        isWalletInitialized: agent.wallet.isInitialized,
        isWalletProvisioned: agent.wallet.isProvisioned,
        walletConfig: {
          id: agent.config?.walletConfig?.id ?? "unknown",
          type: agent.config?.walletConfig?.storage?.type ?? "unknown",
        },
        endpoints: agent.config.endpoints,
      };
    });
  }

  /**
   * Get Aries agent with provided name from this connector or throw error.
   * @param agentName agent name to get.
   *
   * @returns `AnoncredAgent`
   */
  public async getAriesAgentOrThrow(agentName: string): Promise<AnoncredAgent> {
    const agent = this.ariesAgents.get(agentName);
    if (!agent) {
      throw new Error(`No agent with a name ${agentName}`);
    }
    return agent;
  }

  /**
   * Get Aries agent modules that matches current default configuration for this connector.
   * Right now only Anoncreds on Indy is supported.
   *
   * @param agentConfig Agent configuration.
   * @returns Modules that can be used to create new Aries agent.
   */
  private getAskarAnonCredsIndyModules(agentConfig: AriesAgentConfigV1) {
    if (!agentConfig.indyNetworks || agentConfig.indyNetworks.length === 0) {
      throw new Error(
        `Agent ${agentConfig.name} must have at least one Indy network defined!`,
      );
    }

    // For now we assume default accept policies but in the future we can use the user input:
    // const autoAcceptConnections = agentConfig.autoAcceptConnections ?? false;
    // this.log.debug(
    //   `Agent ${agentConfig.name} autoAcceptConnections:`,
    //   autoAcceptConnections,
    // );
    // const autoAcceptCredentials = agentConfig.autoAcceptCredentials
    //   ? cactiAcceptPolicyToAutoAcceptCredential(
    //       agentConfig.autoAcceptCredentials,
    //     )
    //   : AutoAcceptCredential.Never;
    // this.log.debug(
    //   `Agent ${agentConfig.name} autoAcceptCredentials:`,
    //   autoAcceptCredentials,
    // );
    // const autoAcceptProofs = agentConfig.autoAcceptProofs
    //   ? cactiAcceptPolicyToAutoAcceptProof(agentConfig.autoAcceptProofs)
    //   : AutoAcceptProof.Never;
    // this.log.debug(
    //   `Agent ${agentConfig.name} autoAcceptProofs:`,
    //   autoAcceptProofs,
    // );

    const autoAcceptConnections = true;
    this.log.debug(
      `Agent ${agentConfig.name} autoAcceptConnections:`,
      autoAcceptConnections,
    );
    const autoAcceptCredentials = AutoAcceptCredential.ContentApproved;
    this.log.debug(
      `Agent ${agentConfig.name} autoAcceptCredentials:`,
      autoAcceptCredentials,
    );
    const autoAcceptProofs = AutoAcceptProof.ContentApproved;
    this.log.debug(
      `Agent ${agentConfig.name} autoAcceptProofs:`,
      autoAcceptProofs,
    );

    return {
      connections: new ConnectionsModule({
        autoAcceptConnections,
      }),

      credentials: new CredentialsModule({
        autoAcceptCredentials,
        credentialProtocols: [
          new V2CredentialProtocol({
            credentialFormats: [new AnonCredsCredentialFormatService()],
          }),
        ],
      }),

      proofs: new ProofsModule({
        autoAcceptProofs,
        proofProtocols: [
          new V2ProofProtocol({
            proofFormats: [new AnonCredsProofFormatService()],
          }),
        ],
      }),

      anoncreds: new AnonCredsModule({
        registries: [new IndyVdrAnonCredsRegistry()],
      }),

      anoncredsRs: new AnonCredsRsModule({
        anoncreds,
      }),

      indyVdr: new IndyVdrModule({
        indyVdr,
        networks: agentConfig.indyNetworks as [
          IndyVdrPoolConfig,
          ...IndyVdrPoolConfig[],
        ],
      }),

      dids: new DidsModule({
        registrars: [new IndyVdrIndyDidRegistrar()],
        resolvers: [new IndyVdrIndyDidResolver()],
      }),

      askar: new AskarModule({ ariesAskar }),
    } as const;
  }

  /**
   * Create and add new Aries agent to this connector.
   * Agent can later be used to interact with other Aries agent and Indy VDR.
   * Wallet ID and agent label will be the same as provided agent name.
   *
   * @param agentConfig Agent configuration.
   * @returns newly created Aries agent.
   */
  public async addAriesAgent(
    agentConfig: AriesAgentConfigV1,
  ): Promise<AnoncredAgent> {
    Checks.truthy(agentConfig, `addAriesAgent arg agentConfig`);
    Checks.truthy(agentConfig.name, `addAriesAgent arg agentConfig.name`);
    Checks.truthy(
      !this.ariesAgents.has(agentConfig.name),
      `addAriesAgent arg agentConfig.name already used`,
    );
    Checks.truthy(
      agentConfig.walletKey,
      `addAriesAgent arg agentConfig.walletKey`,
    );
    Checks.truthy(
      agentConfig.indyNetworks,
      `addAriesAgent arg agentConfig.indyNetworks`,
    );

    let walletPath = path.join(this.walletPath, `${agentConfig.name}.sqlite`);
    if (agentConfig.walletPath) {
      walletPath = agentConfig.walletPath;
    }
    const config: InitConfig = {
      label: agentConfig.name,
      walletConfig: {
        id: agentConfig.name,
        key: agentConfig.walletKey,
        storage: {
          type: "sqlite",
          path: walletPath,
        },
      },
      endpoints: agentConfig.inboundUrl ? [agentConfig.inboundUrl] : undefined,
    };

    const agent = new Agent({
      config,
      modules: this.getAskarAnonCredsIndyModules(agentConfig),
      dependencies: agentDependencies,
    });

    if (agentConfig.inboundUrl) {
      const port = parseInt(new URL(agentConfig.inboundUrl).port, 10);
      if (!port) {
        throw new Error(
          `inboundUrl (${agentConfig.inboundUrl}) for agent ${agentConfig.name} must contain port`,
        );
      }
      agent.registerInboundTransport(new HttpInboundTransport({ port }));
    }
    agent.registerOutboundTransport(new HttpOutboundTransport());

    await agent.initialize();
    this.ariesAgents.set(agentConfig.name, agent);
    this.log.info("addAriesAgent(): New agent", agentConfig.name);

    return agent;
  }

  /**
   * Remove Aries agent with provided name from this connector.
   *
   * @param agentName agent name to remove
   */
  public async removeAriesAgent(agentName: string): Promise<void> {
    Checks.truthy(agentName, `removeAriesAgent arg agentName`);
    const agent = this.ariesAgents.get(agentName);

    if (agent) {
      await agent.shutdown();
      this.ariesAgents.delete(agentName);
      this.log.info("removeAriesAgent(): Agent removed:", agentName);
    } else {
      this.log.warn(
        "removeAriesAgent(): No agent to remove with a name",
        agentName,
      );
    }
  }

  /**
   * Import existing DID using private key.
   *
   * @param agentName Name of an agent that should own the DID.
   * @param seed private seed to recreate DID.
   * @param indyNamespace VDR namespace.
   * @returns newly created DID string.
   */
  public async importExistingIndyDidFromPrivateKey(
    agentName: string,
    seed: string,
    indyNamespace: string,
  ): Promise<string> {
    Checks.truthy(
      agentName,
      `importExistingIndyDidFromPrivateKey arg agentName`,
    );
    Checks.truthy(seed, `importExistingIndyDidFromPrivateKey arg seed`);
    Checks.truthy(
      indyNamespace,
      `importExistingIndyDidFromPrivateKey arg indyNamespace`,
    );
    const agent = await this.getAriesAgentOrThrow(agentName);

    const seedBuffer = TypedArrayEncoder.fromString(seed);
    const key = await agent.wallet.createKey({
      keyType: KeyType.Ed25519,
      privateKey: seedBuffer,
    });

    // did is first 16 bytes of public key encoded as base58
    const unqualifiedIndyDid = TypedArrayEncoder.toBase58(
      key.publicKey.slice(0, 16),
    );

    const did = `did:indy:${indyNamespace}:${unqualifiedIndyDid}`;

    await agent.dids.import({
      did,
    });

    return did;
  }

  /**
   * Get connections established by an agent (both completed and in progress).
   * List can be filtered.
   *
   * @param agentName get connections for specific agent
   * @param filter fields to filter connections by
   * @returns list of matching connection records
   */
  public async getConnections(
    agentName: string,
    filter: AgentConnectionsFilterV1 = {},
  ): Promise<AgentConnectionRecordV1[]> {
    Checks.truthy(agentName, "getConnections agentName options");
    const agent = await this.getAriesAgentOrThrow(agentName);
    const allRecords = await agent.connections.findAllByQuery(
      cactiAgentConnectionsFilterToQuery(filter),
    );
    return allRecords.map((c) => {
      return {
        ...c,
        isReady: c.isReady,
      };
    });
  }

  /**
   * Create Aries agent invitation URL that other agents can use to connect to this one.
   *
   * @param agentName agent name that should create invitation.
   * @param invitationDomain URL domain to use (will use connector default if not specified)
   * @returns `invitationURL` and connection `outOfBandId`
   */
  public async createNewConnectionInvitation(
    agentName: string,
    invitationDomain?: string,
  ): Promise<CreateNewConnectionInvitationV1Response> {
    Checks.truthy(agentName, `createNewConnectionInvitation arg agentName`);
    const agent = await this.getAriesAgentOrThrow(agentName);
    const outOfBandRecord = await agent.oob.createInvitation();

    return {
      invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({
        domain: invitationDomain ?? this.invitationDomain,
      }),
      outOfBandId: outOfBandRecord.id,
    };
  }

  /**
   * Accept invitation from another agent using invitation URL.
   *
   * @param agentName agent name that should accept invitation.
   * @param invitationUrl aries agent invitation URL.
   * @returns established connection `outOfBandId`
   */
  public async acceptInvitation(
    agentName: string,
    invitationUrl: string,
  ): Promise<AcceptInvitationV1Response> {
    Checks.truthy(agentName, `acceptInvitation arg agentName`);
    Checks.truthy(invitationUrl, `acceptInvitation arg invitationUrl`);
    const agent = await this.getAriesAgentOrThrow(agentName);

    const { outOfBandRecord } =
      await agent.oob.receiveInvitationFromUrl(invitationUrl);

    return {
      outOfBandId: outOfBandRecord.id,
    };
  }

  /**
   * Request credential proof from connected agent.
   *
   * @param agentName agent name requesting the proof.
   * @param connectionId peer agent connection ID that must provide the proof.
   * @param proofAttributes credential attributes to verify.
   * @returns proof record
   */
  public async requestProof(
    agentName: string,
    connectionId: string,
    proofAttributes: CactiProofRequestAttributeV1[],
  ): Promise<AriesProofExchangeRecordV1> {
    Checks.truthy(agentName, "requestProof agentName options");
    Checks.truthy(connectionId, "requestProof connectionId options");
    Checks.truthy(proofAttributes, "requestProof proofAttributes options");
    Checks.truthy(
      proofAttributes.length > 0,
      "requestProof proofAttributes - must be at least one",
    );
    const agent = await this.getAriesAgentOrThrow(agentName);

    const proof = await agent.proofs.requestProof({
      protocolVersion: "v2",
      connectionId,
      proofFormats: {
        anoncreds: {
          name: "proof-request",
          version: "1.0",
          requested_attributes:
            await cactiAttributesToAnonCredsRequestedAttributes(
              proofAttributes,
            ),
        },
      },
    });

    return proof;
  }
}
