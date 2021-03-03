import { Server } from "http";
import { Server as SecureServer } from "https";
import { Express } from "express";

import { ApiPromise } from "@polkadot/api";
import { WsProvider } from "@polkadot/rpc-provider/ws";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { Hash } from "@polkadot/types/interfaces";
import { CodePromise, Abi } from "@polkadot/api-contract";
import { AnyJson } from "@polkadot/types/types";
import { KeyringPair } from "@polkadot/keyring/types";
import type { SignerOptions } from "@polkadot/api/submittable/types";
import { isHex } from "@polkadot/util";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import {
  GetPrometheusExporterMetricsEndpointV1,
  IGetPrometheusExporterMetricsEndpointV1Options,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";

import "multer";
import { Optional } from "typescript-optional";

import OAS from "../json/openapi.json";

import {
  consensusHasTransactionFinality,
  PluginRegistry,
} from "@hyperledger/cactus-core";

import {
  IPluginLedgerConnector,
  ConsensusAlgorithmFamily,
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { promisify } from "util";
import {
  TransactionInfoRequest,
  TransactionInfoResponse,
} from "./generated/openapi/typescript-axios/index";
import {
  GetTransactionInfoEndpoint,
  IGetTransactionInfoEndpointOptions,
} from "./web-services/get-transaction-info-endpoint";

export interface IPluginLedgerConnectorPolkadotOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  pluginRegistry?: PluginRegistry;
  prometheusExporter?: PrometheusExporter;
  wsProviderUrl: string;
  instanceId: string;
  autoConnect?: boolean;
}

export interface RunTransactionRequest {
  transferSubmittable: SubmittableExtrinsic<"promise">;
}

interface RunTransactionResponse {
  success: boolean;
  hash: Hash | undefined;
}

export interface DeployContractInkBytecodeRequest {
  wasm: Uint8Array;
  abi: AnyJson;
  endowment: number;
  gasLimit: number;
  params: Array<unknown>;
}

interface DeployContractInkBytecodeResponse {
  success: boolean;
  contractCode: CodePromise;
  contractAbi: Abi;
}

export interface ReadStorageRequest {
  transferSubmittable: SubmittableExtrinsic<"promise">;
}

interface ReadStorageResponse {
  success: boolean;
  hash: Hash | undefined;
}

export interface WriteStorageRequest {
  transferSubmittable: SubmittableExtrinsic<"promise">;
}

interface WriteStorageResponse {
  success: boolean;
  hash: Hash | undefined;
}

export interface ResponseContainer {
  response_data: SignerOptions;
  succeeded: boolean;
  message: string;
  error: unknown;
}

export class PluginLedgerConnectorPolkadot
  implements
    IPluginLedgerConnector<
      DeployContractInkBytecodeRequest,
      DeployContractInkBytecodeResponse,
      RunTransactionRequest,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService {
  public static readonly CLASS_NAME = "PluginLedgerConnectorPolkadot";
  private readonly instanceId: string;
  private readonly log: Logger;
  public wsProvider: WsProvider | undefined;
  public api: ApiPromise | undefined;
  public prometheusExporter: PrometheusExporter;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private autoConnect: false | number | undefined;

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public get className(): string {
    return PluginLedgerConnectorPolkadot.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginLedgerConnectorPolkadotOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    if (typeof opts.logLevel !== "undefined") {
      Checks.truthy(opts.logLevel, `${fnTag} options.logLevelDesc`);
    }
    Checks.truthy(opts.wsProviderUrl, `${fnTag} options.wsProviderUrl`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);

    this.prometheusExporter =
      opts.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = opts.instanceId;
    if (opts.autoConnect) {
      this.autoConnect = 1;
    }
    this.setProvider(opts.wsProviderUrl);
    this.prometheusExporter.startMetricsCollection();
  }

  public setProvider(wsProviderUrl: string): void {
    try {
      this.wsProvider = new WsProvider(wsProviderUrl, this.autoConnect);
    } catch (e) {
      throw Error(`Could not create wsProvider. InnerException: + ${e}`);
    }
  }

  public async createAPI(): Promise<void> {
    try {
      this.api = await ApiPromise.create({ provider: this.wsProvider });
    } catch (e) {
      throw Error("Could not create API");
    }
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const { log } = this;
    log.info(`Installing web services for plugin ${this.getPackageName()}...`);

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.opts.logLevel,
      };

      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(endpoint);
    }
    {
      const opts: IGetTransactionInfoEndpointOptions = {
        connector: this,
        logLevel: this.opts.logLevel,
      };

      const endpoint = new GetTransactionInfoEndpoint(opts);
      endpoints.push(endpoint);
    }

    this.endpoints = endpoints;

    const pkg = this.getPackageName();
    log.info(`Installed web services for plugin ${pkg} OK`, { endpoints });
    return endpoints;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async shutdown(): Promise<void> {
    const serverMaybe = this.getHttpServer();
    if (serverMaybe.isPresent()) {
      const server = serverMaybe.get();
      await promisify(server.close.bind(server))();
    }
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-polkadot`;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public async getConsensusAlgorithmFamily(): Promise<
    ConsensusAlgorithmFamily
  > {
    return ConsensusAlgorithmFamily.Stake;
  }

  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily = await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  // Perform a monetary transaction to Polkadot;
  // Should be changed to using api.rpc.author.submitAndWatchExtrinsic (which receives a signed extrinsic)
  public async transact(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transact()`;
    let success = false;
    let hash: Hash | undefined;

    Checks.truthy(req, `${fnTag} req`);

    const signature = req.transferSubmittable.signature.toHex();
    if (!signature) {
      throw Error(`${fnTag} Transaction is not signed. `);
    }

    if (!isHex(signature)) {
      throw Error(`${fnTag} Transaction signature is not valid. `);
    }

    try {
      if (this.api) {
        hash = await req.transferSubmittable.send();
        success = true;
        this.prometheusExporter.addCurrentTransaction();
      }
    } catch (e) {
      throw Error(
        `${fnTag} The transaction submission failed. ` + `InnerException: ${e}`,
      );
    }

    return { success, hash };
  }

  // Deploy and instantiate a smart contract in Polkadot
  public async deployContract(
    req: DeployContractInkBytecodeRequest,
  ): Promise<DeployContractInkBytecodeResponse> {
    const fnTag = `${this.className}#deployContract()`;
    Checks.truthy(req, `${fnTag} req`);

    let success = false;

    if (this.api) {
      const contractCode = new CodePromise(this.api, req.abi, req.wasm);
      const contractAbi = new Abi(
        req.abi,
        this.api.registry.getChainProperties(),
      );

      let contract: SubmittableExtrinsic<"promise"> | null = null;

      try {
        contract =
          contractCode && contractAbi?.constructors[0]?.method && req.endowment
            ? contractCode.tx[contractAbi.constructors[0].method](
                {
                  gasLimit: req.gasLimit,
                  value: req.endowment,
                },
                ...req.params,
              )
            : null;
      } catch (e) {
        throw Error(
          `${fnTag} The contract upload and deployment failed. ` +
            `InnerException: ${e}`,
        );
      }

      if (contract) {
        success = true;
        this.prometheusExporter.addCurrentTransaction();
      }

      return {
        success: success,
        contractAbi: contractAbi,
        contractCode: contractCode,
      };
    } else {
      throw Error(
        "The operation has failed because the api is not connected to Substrate Node",
      );
    }
  }

  // Read from the smart contract's storage
  public async readStorage(
    req: ReadStorageRequest,
  ): Promise<ReadStorageResponse> {
    const fnTag = `${this.className}#readStorage()`;
    Checks.truthy(req, `${fnTag} req`);

    let success = false;
    let hash: Hash | undefined;

    Checks.truthy(req, `${fnTag} req`);

    const signature = req.transferSubmittable.signature.toHex();
    if (!signature) {
      throw Error(`${fnTag} Transaction is not signed. `);
    }

    if (!isHex(signature)) {
      throw Error(`${fnTag} Transaction signature is not valid. `);
    }

    try {
      if (this.api) {
        hash = await req.transferSubmittable.send();
        success = true;
        this.prometheusExporter.addCurrentTransaction();
      }
    } catch (e) {
      throw Error(
        `${fnTag} The read from smart contract storage operation failed. ` +
          `InnerException: ${e}`,
      );
    }

    return { success, hash };
  }

  // Write in a deployed smart contract's storage
  public async writeStorage(
    req: WriteStorageRequest,
  ): Promise<WriteStorageResponse> {
    const fnTag = `${this.className}#writeStorage()`;
    Checks.truthy(req, `${fnTag} req`);

    let success = false;
    let hash: Hash | undefined;

    Checks.truthy(req, `${fnTag} req`);

    const signature = req.transferSubmittable.signature.toHex();
    if (!signature) {
      throw Error(`${fnTag} Transaction is not signed. `);
    }

    if (!isHex(signature)) {
      throw Error(`${fnTag} Transaction signature is not valid. `);
    }

    try {
      if (this.api) {
        hash = await req.transferSubmittable.send();
        success = true;
        this.prometheusExporter.addCurrentTransaction();
      }
    } catch (e) {
      throw Error(
        `${fnTag} The write in smart contract storage operation failed. ` +
          `InnerException: ${e}`,
      );
    }

    return { success, hash };
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  // Obtains information to sign a transaction
  public async obtainTransactionInformation(
    req: TransactionInfoRequest,
  ): Promise<TransactionInfoResponse> {
    const fnTag = `${this.className}#obtainTxInformation()`;
    Checks.truthy(req, `${fnTag} req`);

    this.log.info(`getTxFee`);
    try {
      if (this.api) {
        const accountAddress = req.accountAddress as KeyringPair;
        const transactionExpiration =
          (req.transactionExpiration as number) || 50;
        const signedBlock = await this.api.rpc.chain.getBlock();

        const nonce = (
          await this.api.derive.balances.account(accountAddress.address)
        ).accountNonce;
        const blockHash = signedBlock.block.header.hash;
        const era = this.api.createType("ExtrinsicEra", {
          current: signedBlock.block.header.number,
          period: transactionExpiration,
        });

        const options = {
          nonce: nonce,
          blockHash: blockHash,
          era: era,
        };

        const responseContainer = {
          response_data: options,
          succeeded: true,
          message: "obtainTransactionInformation",
          error: null,
        };

        const response: TransactionInfoResponse = {
          responseContainer: responseContainer,
        };

        return response;
      } else {
        throw Error(
          "The operation has failed because the api is not connected to Substrate Node",
        );
      }
    } catch (e) {
      throw Error(
        `${fnTag} Obtaining info for this transaction has failed. ` +
          `InnerException: ${e}`,
      );
    }
  }

  public async shutdownConnectionToSubstrate(): Promise<void> {
    try {
      if (this.api) {
        this.log.info("Shutting down connection to substrate...");
        this.api.disconnect();
      } else {
        this.log.warn(
          "Trying to shutdown connection to substrate, but no connection is available",
        );
      }
    } catch (error) {
      this.log.error("Could not disconnect from Substrate Ledger");
      throw new Error("Could not disconnect from Substrate Ledger");
    }
  }
}
