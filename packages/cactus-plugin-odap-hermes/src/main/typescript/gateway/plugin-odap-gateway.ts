/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type { Server } from "http";
import type { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import type { Express } from "express";
import { v4 as uuidV4 } from "uuid";
import OAS from "../../json/openapi.json";
import {
  Secp256k1Keys,
  Logger,
  Checks,
  LoggerProvider,
  JsObjectSigner,
  IJsObjectSignerOptions,
} from "@hyperledger/cactus-common";
import { DefaultApi as ObjectStoreIpfsApi } from "@hyperledger/cactus-plugin-object-store-ipfs";
import {
  checkValidInitializationRequest,
  sendTransferInitializationResponse,
} from "./server/transfer-initialization";
import {
  ICactusPlugin,
  IPluginWebService,
  IWebServiceEndpoint,
  Configuration,
} from "@hyperledger/cactus-core-api";
import {
  TransferInitializationV1Response,
  DefaultApi as OdapApi,
  SessionData,
  ClientV1Request,
  TransferCommenceV1Request,
  TransferCommenceV1Response,
  LockEvidenceV1Request,
  LockEvidenceV1Response,
  CommitPreparationV1Request,
  CommitFinalV1Request,
  CommitPreparationV1Response,
  CommitFinalV1Response,
  TransferCompleteV1Request,
  TransferInitializationV1Request,
} from "../generated/openapi/typescript-axios";
import { CommitFinalRequestEndpointV1 } from "../web-services/server-side/commit-final-request-endpoint";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  DefaultApi as FabricApi,
  FabricContractInvocationType,
  FabricSigningCredential,
  RunTransactionRequest as FabricRunTransactionRequest,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  DefaultApi as BesuApi,
  Web3SigningCredential,
  EthContractInvocationType,
  InvokeContractV1Request as BesuInvokeContractV1Request,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { CommitFinalResponseEndpointV1 } from "../web-services/client-side/commit-final-response-endpoint";
import { CommitPreparationResponseEndpointV1 } from "../web-services/client-side/commite-prepare-response-endpoint";
import { LockEvidenceResponseEndpointV1 } from "../web-services/client-side/lock-evidence-response-endpoint";
import { TransferCommenceResponseEndpointV1 } from "../web-services/client-side/transfer-commence-response-endpoint";
import { TransferInitiationResponseEndpointV1 } from "../web-services/client-side/transfer-initiation-response-endpoint";
import { LockEvidenceRequestEndpointV1 } from "../web-services/server-side/lock-evidence-request-endpoint";
import { TransferCommenceRequestEndpointV1 } from "../web-services/server-side/transfer-commence-request-endpoint";
import { TransferCompleteRequestEndpointV1 } from "../web-services/server-side/transfer-complete-request-endpoint";
import { TransferInitiationRequestEndpointV1 } from "../web-services/server-side/transfer-initiation-request-endpoint";
import { CommitPreparationRequestEndpointV1 } from "../web-services/server-side/commite-prepare-request-endpoint";
import { randomInt } from "crypto";
import {
  checkValidInitializationResponse,
  sendTransferInitializationRequest,
} from "./client/transfer-initialization";
import { ClientRequestEndpointV1 } from "../web-services/client-side/client-request-endpoint";
import {
  checkValidTransferCommenceResponse,
  sendTransferCommenceRequest,
} from "./client/transfer-commence";
import {
  checkValidtransferCommenceRequest,
  sendTransferCommenceResponse,
} from "./server/transfer-commence";
import {
  checkValidLockEvidenceResponse,
  sendLockEvidenceRequest,
} from "./client/lock-evidence";
import {
  checkValidLockEvidenceRequest,
  sendLockEvidenceResponse,
} from "./server/lock-evidence";
import {
  checkValidCommitFinalResponse,
  sendCommitFinalRequest,
} from "./client/commit-final";
import {
  checkValidCommitPreparationResponse,
  sendCommitPreparationRequest,
} from "./client/commit-preparation";
import {
  checkValidCommitFinalRequest,
  sendCommitFinalResponse,
} from "./server/commit-final";
import { sendTransferCompleteRequest } from "./client/transfer-complete";
import { checkValidTransferCompleteRequest } from "./server/transfer-complete";
import {
  checkValidCommitPreparationRequest,
  sendCommitPreparationResponse,
} from "./server/commit-preparation";

export enum OdapMessageType {
  InitializationRequest = "urn:ietf:odap:msgtype:init-transfer-msg",
  InitializationResponse = "urn:ietf:odap:msgtype:init-transfer-ack-msg",
  TransferCommenceRequest = "urn:ietf:odap:msgtype:transfer-commence-msg",
  TransferCommenceResponse = "urn:ietf:odap:msgtype:transfer-commence-ack-msg",
  LockEvidenceRequest = "urn:ietf:odap:msgtype:lock-evidence-req-msg",
  LockEvidenceResponse = "urn:ietf:odap:msgtype:lock-evidence-ack-msg",
  CommitPreparationRequest = "urn:ietf:odap:msgtype:commit-prepare-msg",
  CommitPreparationResponse = "urn:ietf:odap:msgtype:commit-ack-msg",
  CommitFinalRequest = "urn:ietf:odap:msgtype:commit-final-msg",
  CommitFinalResponse = "urn:ietf:odap:msgtype:commit-ack-msg",
  TransferCompleteRequest = "urn:ietf:odap:msgtype:commit-transfer-complete-msg",
}

export interface IPluginOdapGatewayConstructorOptions {
  name: string;
  dltIDs: string[];
  instanceId: string;
  ipfsPath?: string;

  fabricPath?: string;
  besuPath?: string;
  fabricSigningCredential?: FabricSigningCredential;
  fabricChannelName?: string;
  fabricContractName?: string;
  besuContractName?: string;
  besuWeb3SigningCredential?: Web3SigningCredential;
  besuKeychainId?: string;

  fabricAssetID?: string;
  fabricAssetSize?: string;
  besuAssetID?: string;
}
export interface IOdapGatewayKeyPairs {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}
interface IOdapHermesLog {
  phase: string;
  step: string;
  type: string;
  operation: string;
  nodes: string;
}

export class PluginOdapGateway implements ICactusPlugin, IPluginWebService {
  name: string;
  sessions: Map<string, SessionData>;
  pubKey: string;
  privKey: string;
  public static readonly CLASS_NAME = "OdapGateway";
  private readonly log: Logger;
  private readonly instanceId: string;
  public ipfsApi?: ObjectStoreIpfsApi;
  public fabricApi?: FabricApi;
  public besuApi?: BesuApi;
  public pluginRegistry: PluginRegistry;

  private endpoints: IWebServiceEndpoint[] | undefined;
  //map[]object, object refer to a state
  //of a specific comminications
  public supportedDltIDs: string[];
  private odapSigner: JsObjectSigner;
  public fabricAssetLocked: boolean;
  public fabricAssetDeleted: boolean;
  public fabricAssetSize?: string;
  public besuAssetCreated: boolean;
  public fabricSigningCredential?: FabricSigningCredential;
  public fabricChannelName?: string;
  public fabricContractName?: string;
  public besuContractName?: string;
  public besuWeb3SigningCredential?: Web3SigningCredential;
  public besuKeychainId?: string;

  public fabricAssetID?: string;
  public besuAssetID?: string;
  public constructor(options: IPluginOdapGatewayConstructorOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} arg options.instanceId`);
    Checks.nonBlankString(options.instanceId, `${fnTag} options.instanceId`);

    const level = "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
    this.name = options.name;
    this.supportedDltIDs = options.dltIDs;
    this.sessions = new Map();
    const keyPairs: IOdapGatewayKeyPairs = Secp256k1Keys.generateKeyPairsBuffer();
    this.pubKey = this.bufArray2HexStr(keyPairs.publicKey);
    this.privKey = this.bufArray2HexStr(keyPairs.privateKey);
    const odapSignerOptions: IJsObjectSignerOptions = {
      privateKey: this.privKey,
      logLevel: "debug",
    };
    this.odapSigner = new JsObjectSigner(odapSignerOptions);
    this.fabricAssetDeleted = false;
    this.fabricAssetLocked = false;
    this.besuAssetCreated = false;

    this.pluginRegistry = new PluginRegistry();

    if (options.ipfsPath != undefined) this.defineIpfsConnection(options);
    if (options.fabricPath != undefined) this.defineFabricConnection(options);
    if (options.besuPath != undefined) this.defineBesuConnection(options);
  }

  private defineIpfsConnection(
    options: IPluginOdapGatewayConstructorOptions,
  ): void {
    const config = new Configuration({ basePath: options.ipfsPath });
    const apiClient = new ObjectStoreIpfsApi(config);
    this.ipfsApi = apiClient;
  }

  private defineFabricConnection(
    options: IPluginOdapGatewayConstructorOptions,
  ): void {
    const fnTag = `${this.className}#defineFabricConnection()`;

    const config = new Configuration({ basePath: options.fabricPath });
    const apiClient = new FabricApi(config);
    this.fabricApi = apiClient;
    const notEnoughFabricParams: boolean =
      options.fabricSigningCredential == undefined ||
      options.fabricChannelName == undefined ||
      options.fabricContractName == undefined ||
      options.fabricAssetID == undefined;
    if (notEnoughFabricParams) {
      throw new Error(
        `${fnTag}, fabric params missing should have: signing credentials, contract name, channel name, asset ID`,
      );
    }
    this.fabricSigningCredential = options.fabricSigningCredential;
    this.fabricChannelName = options.fabricChannelName;
    this.fabricContractName = options.fabricContractName;
    this.fabricAssetID = options.fabricAssetID;
    this.fabricAssetSize = options.fabricAssetSize
      ? options.fabricAssetSize
      : "1";
  }

  private defineBesuConnection(
    options: IPluginOdapGatewayConstructorOptions,
  ): void {
    const fnTag = `${this.className}#defineBesuConnection()`;

    const config = new Configuration({ basePath: options.besuPath });
    const apiClient = new BesuApi(config);
    this.besuApi = apiClient;
    const notEnoughBesuParams: boolean =
      options.besuContractName == undefined ||
      options.besuWeb3SigningCredential == undefined ||
      options.besuKeychainId == undefined ||
      options.besuAssetID == undefined;
    if (notEnoughBesuParams) {
      throw new Error(
        `${fnTag}, besu params missing. Should have: signing credentials, contract name, key chain ID, asset ID`,
      );
    }
    this.besuContractName = options.besuContractName;
    this.besuWeb3SigningCredential = options.besuWeb3SigningCredential;
    this.besuKeychainId = options.besuKeychainId;
    this.besuAssetID = options.besuAssetID;
  }

  public async Revert(sessionID: string): Promise<void> {
    const sessionData = this.sessions.get(sessionID);
    if (sessionData == undefined) return;
    if (
      sessionData.isFabricAssetDeleted != undefined &&
      sessionData.isFabricAssetDeleted
    ) {
      if (this.fabricApi == undefined) return;
      await this.fabricApi.runTransactionV1({
        signingCredential: this.fabricSigningCredential,
        channelName: this.fabricChannelName,
        contractName: this.fabricContractName,
        invocationType: FabricContractInvocationType.Send,
        methodName: "CreateAsset",
        params: [sessionData.fabricAssetID, sessionData.fabricAssetSize],
      } as FabricRunTransactionRequest);
    } else if (
      sessionData.isFabricAssetLocked != undefined &&
      sessionData.isFabricAssetLocked
    ) {
      if (this.fabricApi == undefined) return;
      await this.fabricApi.runTransactionV1({
        signingCredential: this.fabricSigningCredential,
        channelName: this.fabricChannelName,
        contractName: this.fabricContractName,
        invocationType: FabricContractInvocationType.Send,
        methodName: "UnLockAsset",
        params: [sessionData.fabricAssetID],
      } as FabricRunTransactionRequest);
    } else if (
      sessionData.isFabricAssetCreated != undefined &&
      sessionData.isFabricAssetCreated
    ) {
      if (this.fabricApi == undefined) return;
      await this.fabricApi.runTransactionV1({
        signingCredential: this.fabricSigningCredential,
        channelName: this.fabricChannelName,
        contractName: this.fabricContractName,
        invocationType: FabricContractInvocationType.Send,
        methodName: "CreateAsset",
        params: [sessionData.fabricAssetID],
      } as FabricRunTransactionRequest);
    } else if (
      sessionData.isBesuAssetCreated != undefined &&
      sessionData.isBesuAssetCreated
    ) {
      if (this.besuApi == undefined) return;
      await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "deleteAsset",
        gas: 1000000,
        params: [this.besuAssetID],
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);
    } else if (
      sessionData.isBesuAssetDeleted != undefined &&
      sessionData.isBesuAssetDeleted
    ) {
      if (this.besuApi == undefined) return;
      await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "createAsset",
        gas: 1000000,
        params: [this.besuAssetID],
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);
    } else if (
      sessionData.isBesuAssetLocked != undefined &&
      sessionData.isBesuAssetLocked
    ) {
      if (this.besuApi == undefined) return;
      await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "unLockAsset",
        gas: 1000000,
        params: [this.besuAssetID],
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);
    }
    return;
  }

  public get className(): string {
    return PluginOdapGateway.CLASS_NAME;
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  /*public getAspect(): PluginAspect {
    return PluginAspect.WEB_SERVICE;
  }*/

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

    // Server endpoints
    const transferInitiationRequestEndpoint = new TransferInitiationRequestEndpointV1(
      {
        gateway: this,
      },
    );
    const transferCommenceRequestEndpoint = new TransferCommenceRequestEndpointV1(
      {
        gateway: this,
      },
    );
    const lockEvidenceRequestEndpoint = new LockEvidenceRequestEndpointV1({
      gateway: this,
    });
    const commitPreparationRequestEndpoint = new CommitPreparationRequestEndpointV1(
      {
        gateway: this,
      },
    );
    const commitFinalRequestEndpoint = new CommitFinalRequestEndpointV1({
      gateway: this,
    });
    const transferCompleteRequestEndpoint = new TransferCompleteRequestEndpointV1(
      {
        gateway: this,
      },
    );

    // Client endpoints
    const clientRequestEndpoint = new ClientRequestEndpointV1({
      gateway: this,
    });
    const transferInitiationResponseEndpoint = new TransferInitiationResponseEndpointV1(
      {
        gateway: this,
      },
    );
    const transferCommenceResponseEndpoint = new TransferCommenceResponseEndpointV1(
      {
        gateway: this,
      },
    );
    const lockEvidenceResponseEndpoint = new LockEvidenceResponseEndpointV1({
      gateway: this,
    });
    const commitPreparationResponseEndpoint = new CommitPreparationResponseEndpointV1(
      {
        gateway: this,
      },
    );
    const commitFinalResponseEndpoint = new CommitFinalResponseEndpointV1({
      gateway: this,
    });

    this.endpoints = [
      transferInitiationRequestEndpoint,
      transferCommenceRequestEndpoint,
      lockEvidenceRequestEndpoint,
      commitPreparationRequestEndpoint,
      commitFinalRequestEndpoint,
      transferCompleteRequestEndpoint,
      clientRequestEndpoint,
      transferInitiationResponseEndpoint,
      transferCommenceResponseEndpoint,
      lockEvidenceResponseEndpoint,
      commitPreparationResponseEndpoint,
      commitFinalResponseEndpoint,
    ];
    return this.endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return "@hyperledger/cactus-odap-odap-gateway-business-logic-plugin";
  }

  public sign(msg: string): Uint8Array {
    return this.odapSigner.sign(msg);
  }

  public verifySignature(
    msg: string,
    signature: Uint8Array,
    pubKey: Uint8Array,
  ): boolean {
    return this.odapSigner.verify(msg, signature, pubKey);
  }

  public bufArray2HexStr(array: Uint8Array): string {
    return Buffer.from(array).toString("hex");
  }

  public async publishOdapProof(ID: string, proof: string): Promise<void> {
    if (this.ipfsApi == undefined) return;
    const res = await this.ipfsApi.setObjectV1({
      key: ID,
      value: proof,
    });
    const resStatusOk = res.status > 199 && res.status < 300;
    if (!resStatusOk) {
      throw new Error("${fnTag}, error when logging to ipfs");
    }
  }

  public async storeOdapLog(
    odapHermesLog: IOdapHermesLog,
    ID: string,
  ): Promise<void> {
    this.log.info(
      `<${odapHermesLog.phase}, ${odapHermesLog.step}, ${odapHermesLog.type}-${odapHermesLog.operation}, ${odapHermesLog.nodes}>`,
    );
    if (this.ipfsApi == undefined) return;
    const res = await this.ipfsApi.setObjectV1({
      key: ID,
      value: `${odapHermesLog.phase}, ${odapHermesLog.step}, ${odapHermesLog.type}-${odapHermesLog.operation}, ${odapHermesLog.nodes}`,
    });
    const resStatusOk = res.status > 199 && res.status < 300;
    if (!resStatusOk) {
      throw new Error("${fnTag}, error when logging to ipfs");
    }
  }

  public getOdapAPI(basePath: string): OdapApi {
    const odapServerApiConfig = new Configuration({
      basePath: basePath,
    });

    return new OdapApi(odapServerApiConfig);
  }

  //Server-side
  public async onTransferInitiationRequestReceived(
    request: TransferInitializationV1Request,
  ): Promise<void> {
    const fnTag = `${this.className}#onTransferInitiationRequestReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `server gateway received TransferInitializationRequest: ${JSON.stringify(
        request,
      )}`,
    );

    await checkValidInitializationRequest(request, this);
    await sendTransferInitializationResponse(request.sessionID, this);
  }

  public async onTransferCommenceRequestReceived(
    request: TransferCommenceV1Request,
  ): Promise<void> {
    const fnTag = `${this.className}#onTransferCommenceRequestReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `server gateway received TransferCommenceRequest: ${JSON.stringify(
        request,
      )}`,
    );

    await checkValidtransferCommenceRequest(request, this);
    await sendTransferCommenceResponse(request.sessionID, this);
  }

  public async onLockEvidenceRequestReceived(
    request: LockEvidenceV1Request,
  ): Promise<void> {
    const fnTag = `${this.className}#onLockEvidenceRequestReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `server gateway received LockEvidenceRequest: ${JSON.stringify(request)}`,
    );

    await checkValidLockEvidenceRequest(request, this);
    await sendLockEvidenceResponse(request.sessionID, this);
  }

  public async onCommitPrepareRequestReceived(
    request: CommitPreparationV1Request,
  ): Promise<void> {
    const fnTag = `${this.className}#onCommitPrepareRequestReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `server gateway received CommitPrepareRequest: ${JSON.stringify(
        request,
      )}`,
    );

    await checkValidCommitPreparationRequest(request, this);
    await sendCommitPreparationResponse(request.sessionID, this);
  }

  public async onCommitFinalRequestReceived(
    request: CommitFinalV1Request,
  ): Promise<void> {
    const fnTag = `${this.className}#onCommitFinalRequestReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `server gateway received CommitFinalRequest: ${JSON.stringify(request)}`,
    );

    await checkValidCommitFinalRequest(request, this);
    await sendCommitFinalResponse(request.sessionID, this);
  }

  public async onTransferCompleteRequestReceived(
    request: TransferCompleteV1Request,
  ): Promise<void> {
    const fnTag = `${this.className}#onTransferCompleteRequestReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `server gateway received TransferCompleteRequest: ${JSON.stringify(
        request,
      )}`,
    );

    await checkValidTransferCompleteRequest(request, this);
  }

  //Client-side
  public async onTransferInitiationResponseReceived(
    request: TransferInitializationV1Response,
  ): Promise<void> {
    const fnTag = `${this.className}#onTransferInitiationResponseReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `client gateway received TransferInitiationResponse: ${JSON.stringify(
        request,
      )}`,
    );

    await checkValidInitializationResponse(request, this);
    await sendTransferCommenceRequest(request.sessionID, this);
  }

  public async onTransferCommenceResponseReceived(
    request: TransferCommenceV1Response,
  ): Promise<void> {
    const fnTag = `${this.className}#onTransferCommenceResponseReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `client gateway received TransferCommenceResponse: ${JSON.stringify(
        request,
      )}`,
    );

    await checkValidTransferCommenceResponse(request, this);
    await sendLockEvidenceRequest(request.sessionID, this);
  }

  public async onLockEvidenceResponseReceived(
    request: LockEvidenceV1Response,
  ): Promise<void> {
    const fnTag = `${this.className}#onLockEvidenceResponseReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `client gateway received LockEvidenceResponse: ${JSON.stringify(
        request,
      )}`,
    );

    await checkValidLockEvidenceResponse(request, this);
    await sendCommitPreparationRequest(request.sessionID, this);
  }

  public async onCommitPrepareResponseReceived(
    request: CommitPreparationV1Response,
  ): Promise<void> {
    const fnTag = `${this.className}#onCommitPrepareResponseReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);

    await checkValidCommitPreparationResponse(request, this);
    await sendCommitFinalRequest(request.sessionID, this);
  }

  public async onCommitFinalResponseReceived(
    request: CommitFinalV1Response,
  ): Promise<void> {
    const fnTag = `${this.className}#onCommitFinalResponseReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `client gateway received CommitFinalResponse: ${JSON.stringify(request)}`,
    );

    await checkValidCommitFinalResponse(request, this);
    await sendTransferCompleteRequest(request.sessionID, this);
  }

  public async runOdap(request: ClientV1Request): Promise<void> {
    const fnTag = `${this.className}#runOdap()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `client gateway received ClientRequest: ${JSON.stringify(request)}`,
    );

    const sessionID = this.configureOdapSession(request);

    if (sessionID == undefined) {
      throw new Error(
        `${fnTag}, session id undefined after session configuration`,
      );
    }

    await sendTransferInitializationRequest(sessionID, this);
  }

  private configureOdapSession(request: ClientV1Request) {
    const sessionData: SessionData = {};

    const sessionID = uuidV4();

    sessionData.id = sessionID;
    sessionData.step = 1;
    sessionData.version = request.version;
    sessionData.lastSequenceNumber = randomInt(4294967295);
    sessionData.sourceBasePath = request.clientGatewayConfiguration.apiHost;
    sessionData.recipientBasePath = request.serverGatewayConfiguration.apiHost;

    sessionData.payloadProfile = request.payloadProfile;
    sessionData.loggingProfile = request.loggingProfile;
    sessionData.accessControlProfile = request.accessControlProfile;
    sessionData.applicationProfile = request.applicationProfile;
    sessionData.assetProfile = request.payloadProfile.assetProfile;
    sessionData.originatorPubkey = request.originatorPubkey;
    sessionData.beneficiaryPubkey = request.beneficiaryPubkey;
    sessionData.sourceGatewayPubkey = this.pubKey;
    sessionData.sourceGatewayDltSystem = request.sourceGatewayDltSystem;
    sessionData.recipientGatewayPubkey = request.recipientGatewayPubkey;
    sessionData.recipientGatewayDltSystem = request.recipientGatewayDltSystem;

    this.sessions.set(sessionID, sessionData);

    return sessionID;
  }

  public async lockFabricAsset(sessionID: string) {
    const fnTag = `${this.className}#lockFabricAsset()`;

    const sessionData = this.sessions.get(sessionID);

    if (sessionData == undefined) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    if (this.fabricApi == undefined) {
      //throw new Error(`${fnTag}, connection to Fabric is not defined`);
      return "";
    }

    const lockRes = await this.fabricApi.runTransactionV1({
      signingCredential: this.fabricSigningCredential,
      channelName: this.fabricChannelName,
      contractName: this.fabricContractName,
      invocationType: FabricContractInvocationType.Send,
      methodName: "LockAsset",
      params: [this.fabricAssetID],
    } as FabricRunTransactionRequest);

    const receiptLockRes = await this.fabricApi.getTransactionReceiptByTxIDV1({
      signingCredential: this.fabricSigningCredential,
      channelName: this.fabricChannelName,
      contractName: "qscc",
      invocationType: FabricContractInvocationType.Call,
      methodName: "GetBlockByTxID",
      params: [this.fabricChannelName, lockRes.data.transactionId],
    } as FabricRunTransactionRequest);

    this.log.warn(receiptLockRes.data);
    const fabricLockAssetProof = JSON.stringify(receiptLockRes.data);

    sessionData.isFabricAssetLocked = true;

    return fabricLockAssetProof;
  }

  public async createBesuAsset(sessionID: string) {
    const fnTag = `${this.className}#createBesuAsset()`;

    const sessionData = this.sessions.get(sessionID);

    if (sessionData == undefined) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    if (this.besuApi == undefined) {
      //throw new Error(`${fnTag}, connection to Fabric is not defined`);
      return "";
    }

    let besuCreateAssetProof = "";

    if (this.besuApi != undefined) {
      const besuCreateRes = await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "createAsset",
        gas: 1000000,
        params: [this.besuAssetID, 100], //the second is size, may need to pass this from client?
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);

      if (besuCreateRes.status != 200) {
        //await this.Revert(sessionID);
        throw new Error(`${fnTag}, besu create asset error`);
      }

      const besuCreateResDataJson = JSON.parse(
        JSON.stringify(besuCreateRes.data),
      );

      if (besuCreateResDataJson.out == undefined) {
        throw new Error(`${fnTag}, besu res data out undefined`);
      }

      if (besuCreateResDataJson.out.transactionReceipt == undefined) {
        throw new Error(`${fnTag}, undefined besu transact receipt`);
      }

      const besuCreateAssetReceipt =
        besuCreateResDataJson.out.transactionReceipt;
      besuCreateAssetProof = JSON.stringify(besuCreateAssetReceipt);
      const besuCreateProofID = `${sessionID}-proof-of-create`;

      await this.publishOdapProof(
        besuCreateProofID,
        JSON.stringify(besuCreateAssetReceipt),
      );

      sessionData.isBesuAssetCreated = true;
    }
    return besuCreateAssetProof;
  }

  public async deleteFabricAsset(sessionID: string) {
    const fnTag = `${this.className}#deleteFabricAsset()`;

    const sessionData = this.sessions.get(sessionID);

    if (sessionData == undefined) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    if (this.fabricApi == undefined) {
      //throw new Error(`${fnTag}, connection to Fabric is not defined`);
      return "";
    }

    const deleteRes = await this.fabricApi.runTransactionV1({
      signingCredential: this.fabricSigningCredential,
      channelName: this.fabricChannelName,
      contractName: this.fabricContractName,
      invocationType: FabricContractInvocationType.Send,
      methodName: "DeleteAsset",
      params: [this.fabricAssetID],
    } as FabricRunTransactionRequest);

    const receiptDeleteRes = await this.fabricApi.getTransactionReceiptByTxIDV1(
      {
        signingCredential: this.fabricSigningCredential,
        channelName: this.fabricChannelName,
        contractName: "qscc",
        invocationType: FabricContractInvocationType.Call,
        methodName: "GetBlockByTxID",
        params: [this.fabricChannelName, deleteRes.data.transactionId],
      } as FabricRunTransactionRequest,
    );

    this.log.warn(receiptDeleteRes.data);
    const fabricDeleteAssetProof = JSON.stringify(receiptDeleteRes.data);

    sessionData.isFabricAssetDeleted = true;

    return fabricDeleteAssetProof;
  }
}
