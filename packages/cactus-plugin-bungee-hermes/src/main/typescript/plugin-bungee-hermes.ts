import {
  Checks,
  IJsObjectSignerOptions,
  JsObjectSigner,
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import { v4 as uuidV4 } from "uuid";
import {
  ICactusPlugin,
  ICactusPluginOptions,
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { State } from "./view-creation/state";
import OAS from "../json/openapi.json";
import type { Express } from "express";
import { Optional } from "typescript-optional";

import { Server } from "http";
import { Server as SecureServer } from "https";
import {
  CreateViewRequest,
  CreateViewResponse,
} from "./generated/openapi/typescript-axios";
import { Snapshot } from "./view-creation/snapshot";
import { View } from "./view-creation/view";
import {
  NetworkDetails,
  ObtainLedgerStrategy,
} from "./strategy/obtain-ledger-strategy";
import { CreateViewEndpointV1 } from "./web-services/create-view-endpoint";
import { GetPublicKeyEndpointV1 } from "./web-services/get-public-key-endpoint";
import { GetAvailableStrategiesEndpointV1 } from "./web-services/get-available-strategies-endpoint";

export interface IKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface IPluginBungeeHermesOptions extends ICactusPluginOptions {
  instanceId: string;
  keyPair?: IKeyPair;

  logLevel?: LogLevelDesc;

  disableSignalHandlers?: true;
}

export class PluginBungeeHermes implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "PluginBungeeHermes";
  private readonly instanceId: string;

  private log: Logger;

  private keyPair: IKeyPair;
  private bungeeSigner: JsObjectSigner;
  private privKeyBungee: string;
  private pubKeyBungee: string;

  private strategies: Map<string, ObtainLedgerStrategy>;

  private level: LogLevelDesc;
  private endpoints: IWebServiceEndpoint[] | undefined;

  constructor(public readonly options: IPluginBungeeHermesOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    this.level = options.logLevel || "INFO";
    this.strategies = new Map<string, ObtainLedgerStrategy>();
    const label = this.className;
    const level = this.level;

    this.log = LoggerProvider.getOrCreate({ label, level });

    this.instanceId = options.instanceId;

    this.keyPair = options.keyPair
      ? options.keyPair
      : Secp256k1Keys.generateKeyPairsBuffer();
    this.privKeyBungee = Buffer.from(this.keyPair.privateKey).toString("hex");
    this.pubKeyBungee = Buffer.from(this.keyPair.publicKey).toString("hex");
    const bungeeSignerOptions: IJsObjectSignerOptions = {
      privateKey: this.privKeyBungee,
      logLevel: "debug",
    };
    this.bungeeSigner = new JsObjectSigner(bungeeSignerOptions);
  }

  public get className(): string {
    return PluginBungeeHermes.CLASS_NAME;
  }
  public get logger(): Logger {
    return this.log;
  }

  public getPublicKey(): string {
    return this.pubKeyBungee;
  }

  public addStrategy(strategyId: string, strategy: ObtainLedgerStrategy) {
    if (this.strategies.get(strategyId) == undefined) {
      this.strategies.set(strategyId, strategy);
    } else {
      throw Error("Strategy " + strategyId + " already exists.");
    }
  }
  public getStrategy(strategyId: string): ObtainLedgerStrategy | undefined {
    return this.strategies.get(strategyId);
  }
  public getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }
  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-bungee-hermes`;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
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

    const viewEndpoint = new CreateViewEndpointV1({
      bungee: this,
    });
    const pubKeyEndpoint = new GetPublicKeyEndpointV1({
      bungee: this,
    });
    const availableStrategiesEndpoint = new GetAvailableStrategiesEndpointV1({
      bungee: this,
    });

    this.endpoints = [
      viewEndpoint,
      pubKeyEndpoint,
      availableStrategiesEndpoint,
    ];
    return this.endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  async onCreateView(request: CreateViewRequest): Promise<CreateViewResponse> {
    //ti and tf are unix timestamps, represented as strings
    const ti: string = request.tI ? request.tI : "0";
    const tf: string = request.tF
      ? request.tF
      : Number.MAX_SAFE_INTEGER.toString();
    const stateIds: string[] = request.stateIds ? request.stateIds : [];

    const snapshot = await this.generateSnapshot(
      stateIds,
      request.strategyId,
      request.networkDetails,
    );
    this.logger.info("Generating view for request: ", request);
    const response = JSON.stringify(
      this.generateView(snapshot, ti, tf, request.viewID),
    );
    return {
      view: response,
    };
  }

  public generateView(
    snapshot: Snapshot,
    tI: string,
    tF: string,
    id: string | undefined,
  ): { view?: View; signature?: string } {
    if (
      parseInt(tI) > parseInt(snapshot.getTF()) ||
      parseInt(tF) < parseInt(snapshot.getTI()) ||
      parseInt(tI) > parseInt(tF)
    ) {
      return {};
    }
    const view = new View(tI, tF, snapshot, id);
    snapshot.pruneStates(tI, tF);

    const signature = this.sign(JSON.stringify(view));

    return { view: view, signature: signature };
  }

  sign(msg: string): string {
    return Buffer.from(this.bungeeSigner.sign(msg)).toString("hex");
  }

  public async generateSnapshot(
    stateIds: string[],
    strategyId: string,
    networkDetails: NetworkDetails,
  ): Promise<Snapshot> {
    const strategy = this.getStrategy(strategyId);
    if (strategy == undefined) {
      throw Error("Strategy " + strategyId + " is undefined/unsupported");
    }

    const ledgerStates = await strategy.generateLedgerStates(
      stateIds,
      networkDetails,
    );

    const states: State[] = [];
    for (const key of ledgerStates.keys()) {
      if (stateIds.includes(key) || stateIds.length == 0) {
        states.push(ledgerStates.get(key) as State);
      }
    }

    const snapShotId = uuidV4();
    const snapshot = new Snapshot(
      snapShotId,
      networkDetails.participant,
      states,
    );
    snapshot.update_TI_TF();

    return snapshot;
  }
}
