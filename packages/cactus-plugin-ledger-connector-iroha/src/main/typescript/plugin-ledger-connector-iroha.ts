import { Transaction } from "iroha-helpers/lib/proto/transaction_pb";
import { TxBuilder } from "iroha-helpers/lib/chain";
import type { Server as SocketIoServer } from "socket.io";
import type { Socket as SocketIoSocket } from "socket.io";
import type { Express } from "express";

import { IrohaTransactionWrapper } from "./iroha-transaction-wrapper";

import OAS from "../json/openapi.json";

import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  PluginRegistry,
  consensusHasTransactionFinality,
} from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { RuntimeError } from "run-time-error";

import {
  IrohaCommand,
  RunTransactionRequestV1,
  RunTransactionSignedRequestV1,
  GenerateTransactionRequestV1,
  RunTransactionResponse,
  WatchBlocksV1,
  IrohaSocketIOTransactV1,
} from "./generated/openapi/typescript-axios";

import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint";
import { GenerateTransactionEndpoint } from "./web-services/generate-transaction-endpoint";
import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { IrohaSocketIOEndpoint } from "./web-services/iroha-socketio-endpoint";
import {
  GetPrometheusExporterMetricsEndpointV1,
  IGetPrometheusExporterMetricsEndpointV1Options,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";

export const E_KEYCHAIN_NOT_FOUND = "cactus.connector.iroha.keychain_not_found";

export interface IPluginLedgerConnectorIrohaOptions
  extends ICactusPluginOptions {
  rpcToriiPortHost: string; //http host:port
  rpcApiWsHost?: string;
  pluginRegistry: PluginRegistry;
  prometheusExporter?: PrometheusExporter;
  logLevel?: LogLevelDesc;
  instanceId: string;
}

export class PluginLedgerConnectorIroha
  implements
    IPluginLedgerConnector<
      never,
      never,
      RunTransactionSignedRequestV1 | RunTransactionRequestV1,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService {
  private readonly instanceId: string;
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;

  private endpoints: IWebServiceEndpoint[] | undefined;

  public static readonly CLASS_NAME = "PluginLedgerConnectorIroha";

  public get className(): string {
    return PluginLedgerConnectorIroha.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorIrohaOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(
      options.rpcToriiPortHost,
      `${fnTag} options.rpcToriiPortHost`,
    );
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );
    this.prometheusExporter.startMetricsCollection();
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  deployContract(): Promise<never> {
    throw new RuntimeError("Method not implemented.");
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }

  async registerWebServices(
    app: Express,
    wsApi?: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const { logLevel } = this.options;
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    if (wsApi) {
      wsApi.on("connection", (socket: SocketIoSocket) => {
        this.log.debug(`New Socket connected. ID=${socket.id}`);
        const irohaSocketEndpoint = new IrohaSocketIOEndpoint({
          socket,
          logLevel,
        });
        let monitorFlag: boolean;

        socket.on(WatchBlocksV1.Subscribe, (monitorOptions: any) => {
          this.log.debug(`Caught event: Subscribe`);
          monitorFlag = true;
          irohaSocketEndpoint.startMonitor(monitorOptions);
        });

        socket.on(WatchBlocksV1.Unsubscribe, () => {
          this.log.debug(`Caught event: Unsubscribe`);
          irohaSocketEndpoint.stopMonitor();
        });

        socket.on(
          IrohaSocketIOTransactV1.SendAsyncRequest,
          (asyncRequestData: any) => {
            this.log.debug(`Caught event: SendAsyncRequest`);
            socket.disconnect(true);
            irohaSocketEndpoint.sendRequest(asyncRequestData, true);
          },
        );

        socket.on(
          IrohaSocketIOTransactV1.SendSyncRequest,
          (syncRequestData: any) => {
            this.log.debug(`Caught event: SendSyncRequest`);
            irohaSocketEndpoint.sendRequest(syncRequestData, false);
          },
        );

        socket.on("disconnect", async (reason: string) => {
          this.log.info(
            `Session: ${socket.id} disconnected. Reason: ${reason}`,
          );
          if (monitorFlag) {
            irohaSocketEndpoint.stopMonitor();
            monitorFlag = false;
          }
        });
      });
    }

    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new RunTransactionEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GenerateTransactionEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }

    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-iroha`;
  }

  public async getConsensusAlgorithmFamily(): Promise<
    ConsensusAlgorithmFamily
  > {
    return ConsensusAlgorithmFamily.Authority;
  }
  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily = await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  /**
   * Create and run Iroha transaction based on input arguments.
   * Transaction is signed with a private key supplied in the input argument.
   *
   * @param req `RunTransactionSignedRequestV1`
   * @param commandService Iroha SDK `CommandService_v1Client` instance
   * @param queryService Iroha SDK `QueryService_v1Client` instance
   * @returns `Promise<RunTransactionResponse>`
   */
  private async transactRequest(
    req: RunTransactionRequestV1,
  ): Promise<RunTransactionResponse> {
    const transaction = new IrohaTransactionWrapper({
      logLevel: this.options.logLevel,
    });
    return await transaction.transact(req);
  }

  /**
   * Run Iroha transaction based on already signed transaction received from the client.
   *
   * @param req RunTransactionSignedRequestV1
   * @returns `Promise<RunTransactionResponse>`
   */
  private async transactSigned(
    req: RunTransactionSignedRequestV1,
  ): Promise<RunTransactionResponse> {
    if (!req.baseConfig || !req.baseConfig.timeoutLimit) {
      throw new RuntimeError("baseConfig.timeoutLimit is undefined");
    }

    const { commandService } = IrohaTransactionWrapper.getIrohaServices(
      req.baseConfig,
    );

    try {
      const transactionBinary = Uint8Array.from(
        Object.values(req.signedTransaction),
      );
      const signedTransaction = Transaction.deserializeBinary(
        transactionBinary,
      );
      this.log.debug("Received signed transaction:", signedTransaction);

      const sendResponse = await new TxBuilder(signedTransaction).send(
        commandService,
        req.baseConfig.timeoutLimit,
      );

      return { transactionReceipt: sendResponse };
    } catch (error) {
      throw new RuntimeError(error as any);
    }
  }

  /**
   * Entry point for transact endpoint.
   * Validate common `baseConfig` arguments and perapre command and query services.
   * Call different transaction logic depending on input arguments.
   *
   * @note TLS connections are not supported yet.
   * @param req `RunTransactionSignedRequestV1 | RunTransactionRequestV1`
   * @returns `Promise<RunTransactionResponse>`
   */
  public async transact(
    req: RunTransactionSignedRequestV1 | RunTransactionRequestV1,
  ): Promise<RunTransactionResponse> {
    if ("signedTransaction" in req) {
      return this.transactSigned(req);
    } else {
      const transaction = new IrohaTransactionWrapper({
        logLevel: this.options.logLevel,
      });
      return await transaction.transact(req);
    }
  }

  /**
   * Check if given Iroha command is supported and can be safely called on the `TxBuilder`.
   * Command must be listend in OpenAPI interface and be present on the builder object.
   * @param builder `TxBuilder` that will be used to call the command on.
   * @param command Iroha command name in string format.
   * @returns `true` if command is safe, `false` otherwise.
   */
  private isSafeIrohaCommand(builder: TxBuilder, command: string): boolean {
    // Check if command is listen in the OpenAPI interface
    if (!Object.values(IrohaCommand).includes(command as IrohaCommand)) {
      this.log.debug("Command not listed in OpenAPI interface");
      return false;
    }

    // Check if function is present in builder object
    return (
      command in builder && typeof (builder as any)[command] === "function"
    );
  }

  /**
   * Entry point for generate unsigned transaction endpoint.
   * Transaction must be deserialized and signed on the client side.
   * It can be then send to transact endpoint for futher processing.
   * @param req `GenerateTransactionRequestV1`
   * @returns `Uint8Array` of serialized transaction.
   */
  public generateTransaction(req: GenerateTransactionRequestV1): Uint8Array {
    req.quorum = req.quorum ?? 1;
    const builder = new TxBuilder();

    if (!this.isSafeIrohaCommand(builder, req.commandName)) {
      throw new RuntimeError(
        `Bad Request: Not supported Iroha command '${req.commandName}' - aborted.`,
      );
    }

    try {
      return (builder as any)
        [req.commandName](req.commandParams)
        .addMeta(req.creatorAccountId, req.quorum)
        .tx.serializeBinary();
    } catch (error) {
      throw new RuntimeError(error as any);
    }
  }
}
