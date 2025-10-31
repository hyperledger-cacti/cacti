import {
  ILoggerOptions,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { Client, ConnectRouter, createClient } from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";
import {
  DriverCommunication,
  WriteExternalStateMessage,
} from "../generated/protos/driver/driver_pb";
import { Query } from "../generated/protos/common/query_pb";
import {
  Meta_Protocol,
  MetaSchema,
  ViewPayload,
  ViewPayloadSchema,
} from "../generated/protos/common/state_pb";
import { QuerySchema } from "../generated/protos/common/query_pb";
import { create, toBinary } from "@bufbuild/protobuf";
import { FabricViewSchema } from "../generated/protos/fabric/view_data_pb";
import { DataTransfer } from "../generated/protos/relay/datatransfer_pb";
import { fromBinary } from "@bufbuild/protobuf";
import { PluginLedgerConnectorFabric } from "../plugin-ledger-connector-fabric";
import { FabricSigningCredential, GatewayOptions } from "../public-api";
import { Ack, Ack_STATUS, AckSchema } from "../generated/protos/common/ack_pb";
import {
  delay,
  handlePromise,
  parseAddress,
  relayCallback,
  transformToFabricView,
} from "./utils";
import { Events } from "./events";
import {
  EventPublish,
  EventSubscribe,
} from "../generated/protos/relay/events_pb";
import { Listener } from "./listener";
import {
  EventSubOperation,
  EventSubscription,
} from "../generated/protos/common/events_pb";
import { dbConnectionTest, eventSubscriptionTest } from "./tests";
import path from "path";
import { getDriverKeyCert, walletSetup } from "./walletSetup";
import { IKeyValueAttribute } from "fabric-ca-client";
import { DiscoveryOptions, Wallet } from "fabric-network";

export interface DriverConfig {
  admin?: {
    name?: string;
    secret?: string;
  };
  relay?: {
    name?: string;
    affiliation?: string;
    role?: string;
    attrs?: IKeyValueAttribute[];
  };
  mspId?: string;
  caUrl?: string;
}

export interface FabricDriverServerOptions {
  logLevel?: LogLevelDesc;
  mock?: boolean;
  networkName?: string;
  monitorSyncPeriod?: string;
  monitorEnabled?: boolean;
  driverConfig: DriverConfig;
  connector: PluginLedgerConnectorFabric;
  relayEndpoint: string;
  tls?: boolean;
  walletPath?: string;
  interopChainCode?: string;
  discoveryOptions?: DiscoveryOptions;
  certificate: any;
  gatewayOptions: GatewayOptions;
}

const mockedB64Data =
  "CkIIyAEaPRI7bG9jYWxob3N0OjkwODAvbmV0d29yazEvbXljaGFubmVsOnNpbXBsZXN0YXRlOlJlYWQ6QXJjdHVydXMa/AIKIFhDpf9CYfrxPkEtSWR8Kf+K5pBkSbx7VNYsAzijB+pnEtcCCoICEmYKCl9saWZlY3ljbGUSWAooCiJuYW1lc3BhY2VzL2ZpZWxkcy9pbnRlcm9wL1NlcXVlbmNlEgIIAwosCiZuYW1lc3BhY2VzL2ZpZWxkcy9zaW1wbGVzdGF0ZS9TZXF1ZW5jZRICCAYSYwoHaW50ZXJvcBJYCh4KGABhY2Nlc3NDb250cm9sAG5ldHdvcmsxABICCAsKHgoYAHNlY3VyaXR5R3JvdXAAbmV0d29yazEAEgIIDQoWChAA9I+/v2luaXRpYWxpemVkEgIIBBIzCgtzaW1wbGVzdGF0ZRIkChYKEAD0j7+/aW5pdGlhbGl6ZWQSAggHCgoKCEFyY3R1cnVzGkIIyAEaPRI7bG9jYWxob3N0OjkwODAvbmV0d29yazEvbXljaGFubmVsOnNpbXBsZXN0YXRlOlJlYWQ6QXJjdHVydXMiDBIHaW50ZXJvcBoBMSK1CArpBwoHT3JnMU1TUBLdBy0tLS0tQkVHSU4gQ0VSVElGSUNBVEUtLS0tLQpNSUlDckRDQ0FsT2dBd0lCQWdJVVdNUkUyTEJwdnY1TkdSRi9hMy82cWZTcE9TNHdDZ1lJS29aSXpqMEVBd0l3CmNqRUxNQWtHQTFVRUJoTUNWVk14RnpBVkJnTlZCQWdURGs1dmNuUm9JRU5oY205c2FXNWhNUTh3RFFZRFZRUUgKRXdaRWRYSm9ZVzB4R2pBWUJnTlZCQW9URVc5eVp6RXVibVYwZDI5eWF6RXVZMjl0TVIwd0d3WURWUVFERXhSagpZUzV2Y21jeExtNWxkSGR2Y21zeExtTnZiVEFlRncweU1EQTNNamt3TkRNMk1EQmFGdzB5TVRBM01qa3dORFF4Ck1EQmFNRnN4Q3pBSkJnTlZCQVlUQWxWVE1SY3dGUVlEVlFRSUV3NU9iM0owYUNCRFlYSnZiR2x1WVRFVU1CSUcKQTFVRUNoTUxTSGx3WlhKc1pXUm5aWEl4RFRBTEJnTlZCQXNUQkhCbFpYSXhEakFNQmdOVkJBTVRCWEJsWlhJdwpNRmt3RXdZSEtvWkl6ajBDQVFZSUtvWkl6ajBEQVFjRFFnQUU1RlFrSDgzRVdnYW9DZ2U5azhISU1Jd0NUVGVZCnFCR25xNFAzWHJCUGZQSFdXeE1oWGhBaDNvUHNUOXdna1dHcFVmYWlybkd0bmRBQ3ZrSitNQi9nMUtPQjNUQ0IKMmpBT0JnTlZIUThCQWY4RUJBTUNCNEF3REFZRFZSMFRBUUgvQkFJd0FEQWRCZ05WSFE0RUZnUVVLMkFuM3RCTAprMVQyRGord0hHZ1RIQ3NiYmlZd0h3WURWUjBqQkJnd0ZvQVUxZyt0UG5naDJ3OGc5OXoxbXdzVmJrS2pBS2t3CklnWURWUjBSQkJzd0dZSVhjR1ZsY2pBdWIzSm5NUzV1WlhSM2IzSnJNUzVqYjIwd1ZnWUlLZ01FQlFZSENBRUUKU25zaVlYUjBjbk1pT25zaWFHWXVRV1ptYVd4cFlYUnBiMjRpT2lJaUxDSm9aaTVGYm5KdmJHeHRaVzUwU1VRaQpPaUp3WldWeU1DSXNJbWhtTGxSNWNHVWlPaUp3WldWeUluMTlNQW9HQ0NxR1NNNDlCQU1DQTBjQU1FUUNJQmFRCjhoTmRXd2xYeUhxY2htQzdzVUpWaER6Mkg2enh3M1BQS1I5M3lCL3NBaUJKMnpnQlhzL1lsMGZubnJNUXVCQUQKcDFBS1RKTkpsMVYwWUVHMFhiNXFwZz09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KEkcwRQIhAMyyvrcjHVc1oQmCNqZpH6nc0O+8wssXjwRcfmgxlhQAAiAqa0C8pSFNZNXiSVJHe948dJ0NU/y+7i5A55O0Frkz2Q==";

export class FabricDriverServer {
  public static readonly className = "FabricDriverServer";
  private readonly logger: Logger;
  private readonly loglevel: LogLevelDesc;
  private readonly relayEndpoint: string;
  private readonly mock: boolean;
  private readonly events: Events;
  private readonly listner: Listener;

  private networkName: string = "network1";
  private monitorSyncPeriod: number = 30; // in seconds
  private monitorEnabled: boolean = false;
  private driverConfig: DriverConfig;

  private connector: PluginLedgerConnectorFabric;

  private interopChainCode: string = "interop";

  private tls: boolean = false;

  private walletPath: string = path.join(
    process.cwd(),
    `wallet-${this.networkName}`,
  );

  private certificate: any;

  private wallet: Wallet | undefined;

  private discoveryOptions: DiscoveryOptions = {
    enabled: true,
    asLocalhost: true,
  };

  private gatewayOptions: GatewayOptions;

  constructor(options: FabricDriverServerOptions) {
    this.loglevel = options.logLevel || "INFO";
    const logOptions: ILoggerOptions = {
      level: this.loglevel,
      label: FabricDriverServer.className,
    };
    this.logger = LoggerProvider.getOrCreate(logOptions);

    if (options.mock === undefined) {
      this.mock = false;
    } else this.mock = options.mock;

    if (options.walletPath) {
      this.walletPath = options.walletPath;
    }

    if (options.discoveryOptions) {
      this.discoveryOptions = options.discoveryOptions;
    }

    this.gatewayOptions = options.gatewayOptions;

    if (options.interopChainCode) {
      this.interopChainCode = options.interopChainCode;
    }

    this.certificate = options.certificate;

    this.events = new Events({
      logLevel: this.loglevel,
      driver: this,
      certificate: this.certificate,
    });

    this.listner = new Listener({
      logLevel: this.loglevel,
      driver: this,
      chainCodeId: this.interopChainCode,
    });

    if (options.networkName) {
      this.networkName = options.networkName;
    }

    if (options.monitorSyncPeriod) {
      this.monitorSyncPeriod = Number(options.monitorSyncPeriod);
    }

    if (options.monitorEnabled !== undefined) {
      this.monitorEnabled = options.monitorEnabled;
    }

    this.relayEndpoint = options.relayEndpoint;

    this.driverConfig = options.driverConfig;

    this.connector = options.connector;

    if (options.tls) {
      this.tls = options.tls;
    }
  }

  public getListenerInstance(): Listener {
    return this.listner;
  }

  public getEventsInstance(): Events {
    return this.events;
  }

  public getConnectorInstance(): PluginLedgerConnectorFabric {
    return this.connector;
  }

  public setupRouter(router: ConnectRouter): void {
    router.service(DriverCommunication, {
      requestDriverState: async (request: Query) => {
        this.logger.info(
          `Received requestDriverState with request: ${JSON.stringify(request)}`,
        );
        return await this.driverState(request);
      },
      writeExternalState: async (request: WriteExternalStateMessage) => {
        this.logger.info(
          `Received writeExternalState with request: ${JSON.stringify(request)}`,
        );
        return await this.writeExternalState(request);
      },
      subscribeEvent: async (request: EventSubscription) => {
        this.logger.info(
          `Received subscribeEvent with request: ${JSON.stringify(request)}`,
        );
        return await this.subscribeEvent(request);
      },
      requestSignedEventSubscriptionQuery: async (
        request: EventSubscription,
      ) => {
        this.logger.info(
          `Received requestSignedEventSubscriptionQuery with request: ${JSON.stringify(
            request,
          )}`,
        );
        return await this.requestSignedEventSubscriptionQuery(request);
      },
    });
  }

  async requestSignedEventSubscriptionQuery(
    request: EventSubscription,
  ): Promise<Query> {
    this.events;
    try {
      const signedQuery: Query = await this.events.signEventSubscriptionQuery(
        request.query!,
      );
      this.logger.info(
        `Responding to caller with signedQuery: ${JSON.stringify(signedQuery)}`,
      );
      return signedQuery;
    } catch (error) {
      const errorString: string = error.toString();
      this.logger.error(`error: ${errorString}`);
      const emptyQuery: Query = create(QuerySchema, {
        requestorSignature: errorString,
      });
      // gRPC response.
      this.logger.info(
        `Responding to caller with emptyQuery: ${JSON.stringify(emptyQuery)}`,
      );
      return emptyQuery;
    }
  }

  async subscribeEvent(request: EventSubscription): Promise<Ack> {
    const newRequestId: string = request.query!.requestId;
    this.logger.info(`newRequestId: ${newRequestId}`);
    try {
      if (this.mock) {
        dbConnectionTest().then((dbConnectTestStatus) => {
          if (dbConnectTestStatus == true) {
            eventSubscriptionTest({
              eventSub: request,
              events: this.events,
              loglevel: this.loglevel,
            }).then((eventSubscribeTestStatus) => {
              if (eventSubscribeTestStatus == false) {
                this.logger.error(`Failed eventSubscriptionTest()`);
              }
              // add code to support more functionalities here
            });
          } else {
            this.logger.error(`Failed dbConnectionTest()`);
          }
        });
        return create(AckSchema, {
          requestId: newRequestId,
          message: "Mock Procesing addEventSubscription",
          status: Ack_STATUS.OK,
        });
      } else {
        this.spawnSubscribeEventHelper(request, newRequestId);
        const ackResponse = create(AckSchema, {
          requestId: newRequestId,
          message: "Procesing addEventSubscription",
          status: Ack_STATUS.OK,
        });
        // gRPC response.
        this.logger.info(
          `Responding to caller with Ack: ${JSON.stringify(ackResponse)}`,
        );
        return ackResponse;
      }
    } catch (error) {
      this.logger.error(`error: ${error.toString()}`);
      const ackErrorResponse = create(AckSchema, {
        requestId: newRequestId,
        message: `Error: ${error.toString()}`,
        status: Ack_STATUS.ERROR,
      });
      // gRPC response.
      this.logger.error(
        `Responding to caller with Ack: ${JSON.stringify(ackErrorResponse)}`,
      );
      return ackErrorResponse;
    }
  }

  async driverState(request: Query): Promise<Ack> {
    try {
      if (this.mock) {
        this.mockCommunication(request);
      } else {
        await this.fabricCommunication(request, this.gatewayOptions);
      }
      const ack = create(AckSchema, {
        message: "",
        status: Ack_STATUS.OK,
        requestId: request.requestId,
      });
      this.logger.info("Responding to caller");
      return ack;
    } catch (error) {
      this.logger.error(error);
      const ack = create(AckSchema, {
        message: `Error: ${error}`,
        status: Ack_STATUS.ERROR,
        requestId: request.requestId,
      });
      this.logger.info("Responding to caller");
      return ack;
    }
  }

  async writeExternalState(request: WriteExternalStateMessage): Promise<Ack> {
    if (!request.viewPayload) {
      throw new Error("No viewPayload provided in WriteExternalStateMessage");
    }

    const viewPayload: ViewPayload = request.viewPayload;
    const requestId: string = viewPayload.requestId;

    try {
      this.events.writeExternalStateHelper(
        request,
        {} as FabricSigningCredential,
      );

      const ackResponse = create(AckSchema, {
        message: "Successfully written to the ledger",
        status: Ack_STATUS.OK,
        requestId: requestId,
      });
      return ackResponse;
    } catch (error) {
      const ackErrorResponse = create(AckSchema, {
        message: error.toString(),
        status: Ack_STATUS.ERROR,
        requestId: requestId,
      });
      // gRPC response.
      this.logger.info(
        `Responding to caller with error Ack: ${JSON.stringify(ackErrorResponse)}`,
      );
      return ackErrorResponse;
    }
  }

  // Mocked fabric communication function
  mockCommunication(query: Query) {
    this.logger.info("Mock Communication");
    // Query object from requestor
    this.logger.info(`query ${query.requestId}`);
    setTimeout(() => {
      const meta = create(MetaSchema, {
        timestamp: new Date().toISOString(),
        proofType: "Notarization",
        serializationFormat: "STRING",
        protocol: Meta_Protocol.FABRIC,
      });

      const mockedB64DataBytes = Uint8Array.from(
        Buffer.from(mockedB64Data, "base64"),
      );
      const viewDataBinary = toBinary(
        FabricViewSchema,
        fromBinary(FabricViewSchema, mockedB64DataBytes),
      );
      this.logger.info(`viewData ${viewDataBinary}`);

      const viewPayload = create(ViewPayloadSchema, {
        requestId: query.requestId,
        state: {
          case: "view",
          value: {
            meta: meta,
            data: viewDataBinary,
          },
        },
      });

      if (!this.relayEndpoint) {
        throw new Error("Relay Endpoint is not set.");
      }

      const transport = createGrpcTransport({
        baseUrl: "http://" + this.relayEndpoint,
      });

      const client = createClient(DataTransfer, transport);

      client
        .sendDriverState(viewPayload)
        .then((response) => relayCallback({ response }))
        .catch((error) => relayCallback({ error }));
    }, 3000);
  }

  // Handles communication with fabric network and sends resulting data to the relay
  async fabricCommunication(query: Query, gatewayOptions: GatewayOptions) {
    // Query object from requestor
    this.logger.info(`query ${query.requestId}`);

    // Client created using the relay_endpoint in the env.
    // TODO: need credentials here to ensure the local relay is only communicating with local drivers
    if (!this.relayEndpoint) {
      throw new Error("Relay Endpoint is not set.");
    }
    // Invokes the fabric network
    const parsedAddress = parseAddress(query.address);

    const [result, invokeError] = await handlePromise(
      this.connector.invoke({
        channelName: parsedAddress.channel,
        contractName: this.interopChainCode,
        methodName: "HandleExternalRequest",
        params: [Buffer.from(toBinary(QuerySchema, query)).toString("base64")],
        gatewayOptions: gatewayOptions,
        policies: query.policy,
      }),
    );
    const client = this.getRelayClientForQueryResponse();
    let viewPayload: ViewPayload;
    if (invokeError) {
      this.logger.error("Invoke Error");
      viewPayload = create(ViewPayloadSchema, {
        requestId: query.requestId,
        state: {
          case: "error",
          value: `Error: ${invokeError.toString()}`,
        },
      });
    } else {
      // Process response from invoke to send to relay
      this.logger.info(`Result of fabric invoke ${JSON.stringify(result)}`);
      if (!result) {
        throw new Error("No result from fabric invoke");
      }

      viewPayload = create(ViewPayloadSchema, {
        requestId: query.requestId,
        state: {
          case: "view",
          value: {
            meta: {
              timestamp: new Date().toISOString(),
              proofType: "Notarization",
              serializationFormat: "STRING",
              protocol: Meta_Protocol.FABRIC,
            },
            data: result.view
              ? toBinary(
                  FabricViewSchema,
                  create(FabricViewSchema, transformToFabricView(result.view)),
                )
              : Uint8Array.from(Buffer.from("")),
          },
        },
      });
    }
    this.logger.info("Sending state");
    client
      .sendDriverState(viewPayload)
      .then((response) => relayCallback({ response }))
      .catch((error) => relayCallback({ error }));
  }

  async spawnSubscribeEventHelper(
    request: EventSubscription,
    newRequestId: string,
  ) {
    const subscriptionOp: EventSubOperation = request.operation;
    const client = this.getRelayClientForEventSubscription();
    if (subscriptionOp == EventSubOperation.SUBSCRIBE) {
      this.events.subscribeEventHelper(request, client, this.gatewayOptions);
    } else if (subscriptionOp == EventSubOperation.UNSUBSCRIBE) {
      this.events.unsubscribeEventHelper(request, client, this.gatewayOptions);
    } else {
      const errorString: string = `Error: subscribe operation ${subscriptionOp.toString()} not supported`;
      this.logger.error(errorString);
      const ackSendError = create(AckSchema, {
        requestId: newRequestId,
        message: errorString,
        status: Ack_STATUS.ERROR,
      });
      // gRPC response.
      this.logger.info(
        `Sending to the relay the eventSubscription error Ack: ${JSON.stringify(ackSendError)}`,
      );
      // Sending the fabric state to the relay.
      client
        .sendDriverSubscriptionStatus(ackSendError)
        .then((response) => relayCallback({ response }))
        .catch((error) => relayCallback({ error }));
    }
  }
  getRelayClientForQueryResponse(): Client<typeof DataTransfer> {
    let transport;
    this.logger.info(
      `getRelayClientForQueryResponse: endpoint ${this.relayEndpoint} tls ${this.tls}`,
    );

    if (this.tls && this.certificate) {
      transport = createGrpcTransport({
        baseUrl: "https://" + this.relayEndpoint,
        nodeOptions: {
          ca: this.certificate,
        },
      });
    } else {
      transport = createGrpcTransport({
        baseUrl: "http://" + this.relayEndpoint,
      });
    }
    return createClient(DataTransfer, transport);
  }

  getRelayClientForEventPublish(): Client<typeof EventPublish> {
    let transport;
    this.logger.info(
      `getRelayClientForEventPublish: endpoint ${this.relayEndpoint} tls ${this.tls}`,
    );

    if (this.tls && this.certificate) {
      transport = createGrpcTransport({
        baseUrl: "https://" + this.relayEndpoint,
        nodeOptions: {
          ca: this.certificate,
        },
      });
    } else {
      transport = createGrpcTransport({
        baseUrl: "http://" + this.relayEndpoint,
      });
    }
    return createClient(EventPublish, transport);
  }

  getRelayClientForEventSubscription(): Client<typeof EventSubscribe> {
    let transport;
    this.logger.info(
      `getRelayClientForEventSubscription: endpoint ${this.relayEndpoint} tls ${this.tls}}`,
    );

    if (this.tls && this.certificate) {
      transport = createGrpcTransport({
        baseUrl: "https://" + this.relayEndpoint,
        nodeOptions: {
          ca: this.certificate,
        },
      });
    } else {
      transport = createGrpcTransport({
        baseUrl: "http://" + this.relayEndpoint,
      });
    }
    return createClient(EventSubscribe, transport);
  }

  async monitorService(): Promise<void> {
    if (!this.monitorEnabled) {
      this.logger.info("Monitor disabled.");
      return;
    }

    this.logger.info("Starting monitor...");
    this.logger.info(`Monitor sync period: ${this.monitorSyncPeriod}`);
    while (true) {
      await this.listner.monitorBlockForMissedEvents(this.gatewayOptions);
      await delay(this.monitorSyncPeriod * 1000);
    }
  }

  // Prepares required crypto material for communication with the fabric network
  public async configSetup(): Promise<void> {
    if (this.connector.getConnectionProfile()) {
      this.wallet = await walletSetup(
        this.walletPath,
        this.connector.getConnectionProfile(),
        this.driverConfig,
      );
      this.certificate = await getDriverKeyCert(
        this.wallet!,
        this.driverConfig,
      );
    } else {
      this.logger.error("No CONNECTION_PROFILE provided in the .env");
    }

    // Register all listeners again
    const status = await this.listner.loadEventSubscriptionsFromStorage(
      this.gatewayOptions,
    );
    this.logger.info(`Load Event Subscriptions Status: ${status}`);
  }
}
