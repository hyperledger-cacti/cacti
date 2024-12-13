import {
  Checks,
  IJsObjectSignerOptions,
  JsObjectSigner,
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import { stringify as safeStableStringify } from "safe-stable-stringify";

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
  MergePolicyOpts,
  MergeViewsRequest,
  MergeViewsResponse,
  PrivacyPolicyOpts,
  ProcessViewRequest,
} from "./generated/openapi/typescript-axios";
import { Snapshot } from "./view-creation/snapshot";
import { View } from "./view-creation/view";
import { IntegratedView } from "./view-merging/integrated-view";
import {
  NetworkDetails,
  ObtainLedgerStrategy,
} from "./strategy/obtain-ledger-strategy";
import { CreateViewEndpointV1 } from "./web-services/create-view-endpoint";
import { GetPublicKeyEndpointV1 } from "./web-services/get-public-key-endpoint";
import { GetAvailableStrategiesEndpointV1 } from "./web-services/get-available-strategies-endpoint";
import MerkleTree from "merkletreejs";
import { VerifyMerkleRootEndpointV1 } from "./web-services/verify-merkle-root-endpoint";
import { MergePolicies } from "./view-merging/merge-policies";
import { deserializeView } from "./utils";
import { MergeViewsEndpointV1 } from "./web-services/merge-views-endpoint";
import { ProcessViewEndpointV1 } from "./web-services/process-view-endpoint";

import { PrivacyPolicies } from "./view-creation/privacy-policies";
import { PluginRegistry } from "@hyperledger/cactus-core";

export interface IKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface IPluginBungeeHermesOptions extends ICactusPluginOptions {
  instanceId: string;
  readonly pluginRegistry: PluginRegistry;
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

  private mergePolicies: MergePolicies = new MergePolicies();

  private viewPrivacyPolicies: PrivacyPolicies = new PrivacyPolicies();

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
      throw new Error("Strategy " + strategyId + " already exists.");
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
    const verifyMerkleProofEndpoint = new VerifyMerkleRootEndpointV1({
      bungee: this,
    });
    const mergeViewsEndpoint = new MergeViewsEndpointV1({
      bungee: this,
    });
    const processViewEndpoint = new ProcessViewEndpointV1({
      bungee: this,
    });

    this.endpoints = [
      viewEndpoint,
      pubKeyEndpoint,
      availableStrategiesEndpoint,
      verifyMerkleProofEndpoint,
      mergeViewsEndpoint,
      processViewEndpoint,
    ];
    return this.endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
  }

  public getInstanceId(): string {
    return this.instanceId;
  }
  onProcessView(request: ProcessViewRequest): CreateViewResponse {
    const view = deserializeView(request.serializedView);
    const signature = JSON.parse(request.serializedView).signature;
    if (signature == undefined) {
      throw Error("Provided view does not include signature.");
    }
    const parsed = JSON.parse(request.serializedView);
    if (
      !this.verifyViewSignature(
        signature,
        parsed.view,
        JSON.parse(parsed.view).creator,
      )
    ) {
      this.log.info("Some signature was deemed invalid");
      throw Error("The provided view does not include a valid signature");
    }
    const prevVersionMetadata = {
      viewId: view.getKey(),
      creator: view.getCreator(),
      viewProof: view.getViewProof(),
      signature,
      policy: view.getPolicy(),
    };
    this.processView(view, request.policyId, request.policyArguments);
    view.addPrevVersionMetadata(prevVersionMetadata);
    view.setCreator(this.pubKeyBungee);
    view.setKey(uuidV4());
    return {
      view: safeStableStringify(view),
      signature: this.sign(safeStableStringify(view)),
    };
  }
  onMergeViews(request: MergeViewsRequest): MergeViewsResponse {
    const policy = request.mergePolicy;
    const views: View[] = [];
    const signatures: string[] = [];
    if (request.serializedViews.length <= 1) {
      this.log.info("less than 2 views were provided");
      throw Error("Must provide more than 1 view");
    }
    request.serializedViews.forEach((view) => {
      const parsed = JSON.parse(view);
      if (
        !this.verifyViewSignature(
          parsed.signature,
          parsed.view,
          JSON.parse(parsed.view).creator,
        )
      ) {
        this.log.info("Some signature was deemed invalid");
        throw Error(
          "At least one of they views does not include a valid signature",
        );
      }
      signatures.push(parsed.signature);
      views.push(deserializeView(view));
    });
    const integratedView = this.mergeViews(
      views,
      signatures,
      policy,
      request.policyArguments ? request.policyArguments : [],
    );
    return {
      integratedView: safeStableStringify(integratedView),
      signature: integratedView.signature,
    };
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
    const response = this.generateView(snapshot, ti, tf, request.viewID);
    return {
      view: safeStableStringify(response.view),
      signature: response.signature,
    };
  }

  public generateView(
    snapshot: Snapshot,
    tI: string,
    tF: string,
    id: string | undefined,
  ): { view?: View; signature?: string } {
    if (
      BigInt(tI) > BigInt(snapshot.getTF()) ||
      BigInt(tF) < BigInt(snapshot.getTI()) ||
      BigInt(tI) > BigInt(tF)
    ) {
      return {};
    }
    const view = new View(this.pubKeyBungee, tI, tF, snapshot, id);
    snapshot.pruneStates(tI, tF);

    const signature = this.sign(safeStableStringify(view));

    return { view: view, signature: signature };
  }

  sign(msg: string): string {
    this.logger.info(this.bungeeSigner.dataHash(msg));
    return Buffer.from(this.bungeeSigner.sign(msg)).toString("hex");
  }

  public async generateSnapshot(
    stateIds: string[],
    strategyId: string,
    networkDetails: NetworkDetails,
  ): Promise<Snapshot> {
    const strategy = this.getStrategy(strategyId);
    if (strategy == undefined) {
      throw new Error("Strategy " + strategyId + " is undefined/unsupported");
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

  public verifyMerkleProof(input: string[], root: string): boolean {
    const tree = new MerkleTree(input, undefined, {
      sort: true,
      hashLeaves: true,
    });
    return tree.getRoot().toString("hex") == root;
  }

  public mergeViews(
    views: View[],
    signatures: string[],
    privacyPolicy: MergePolicyOpts,
    args: string[],
  ): { integratedView: IntegratedView; signature: string } {
    const policy = this.mergePolicies.getMergePolicy(privacyPolicy);

    let integratedView = new IntegratedView(
      privacyPolicy,
      policy,
      this.bungeeSigner,
    );
    for (const view of views) {
      if (!integratedView.isParticipant(view.getParticipant())) {
        integratedView.addParticipant(view.getParticipant());
      }
      integratedView.addIncludedViewMetadata({
        viewId: view.getKey(),
        creator: view.getCreator(),
        viewProof: view.getViewProof(),
        signature: signatures[views.indexOf(view)],
        policy: view.getPolicy(),
      });
      for (const state of view.getSnapshot().getStateBins()) {
        if (integratedView.getExtendedState(state.getId()) == undefined) {
          integratedView.createExtendedState(state.getId());
        }
        integratedView.addStateInExtendedState(
          state.getId(),
          view.getKey(),
          state,
        );
        if (
          BigInt(state.getInitialTime()) < BigInt(integratedView.getTI()) ||
          BigInt(state.getInitialTime()) < 0
        ) {
          integratedView.setTI(state.getInitialTime());
        }

        if (
          BigInt(state.getFinalTime()) > BigInt(integratedView.getTF()) ||
          BigInt(state.getFinalTime()) < 0
        ) {
          integratedView.setTF(state.getFinalTime());
        }
      }
    }
    if (policy) {
      integratedView = policy(integratedView, ...args);
    }
    integratedView.setIntegratedViewProof();
    return {
      integratedView: integratedView,
      //The paper specs suggest the integratedView should be jointly signed by all participants.
      //That process is left to be addressed in the future
      signature: this.sign(safeStableStringify(integratedView)),
    };
  }

  public processView(
    view: View,
    policy: PrivacyPolicyOpts,
    args: string[],
  ): View {
    const policyF = this.viewPrivacyPolicies.getPrivacyPolicy(policy);
    if (policyF) {
      view = policyF(view, ...args);
      view.setPrivacyPolicy(policy, policyF, this.bungeeSigner);
      view.updateViewProof();
    }
    return view;
  }

  verifyViewSignature(
    signature: string,
    view: string,
    pubKey: string,
  ): boolean {
    this.logger.info(this.bungeeSigner.dataHash(view));
    const sourceSignature = new Uint8Array(Buffer.from(signature, "hex"));
    const sourcePubkey = new Uint8Array(Buffer.from(pubKey, "hex"));

    return this.bungeeSigner.verify(view, sourceSignature, sourcePubkey);
  }

  public isSafeToCallObjectMethod(
    object: Record<string, unknown>,
    name: string,
  ): boolean {
    Checks.truthy(
      object,
      `${this.className}#isSafeToCallObjectMethod():contract`,
    );
    Checks.nonBlankString(
      name,
      `${this.className}#isSafeToCallObjectMethod():name`,
    );

    return (
      Object.prototype.hasOwnProperty.call(object, name) &&
      typeof object[name] === "function"
    );
  }
}
