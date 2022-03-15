/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type { Server } from "http";
import type { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import type { Express } from "express";
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
import { initiateTransfer } from "./common/initiate-transfer-helper";
import {
  ICactusPlugin,
  IPluginWebService,
  IWebServiceEndpoint,
  Configuration,
} from "@hyperledger/cactus-core-api";
import {
  CommitFinalV1Request,
  CommitFinalV1Response,
  CommitPreparationV1Request,
  CommitPreparationV1Response,
  TransferInitializationV1Request,
  TransferInitializationV1Response,
  LockEvidenceV1Request,
  LockEvidenceV1Response,
  SendClientV1Request,
  TransferCommenceV1Request,
  TransferCommenceV1Response,
  TransferCompleteV1Request,
  DefaultApi as OdapApi,
  SessionData,
  TransferCompleteV1Response,
} from "../generated/openapi/typescript-axios";
import { SHA256 } from "crypto-js";
import { CommitFinalEndpointV1 } from "../web-services/commit-final-endpoint";
import { CommitPrepareEndpointV1 } from "../web-services/commite-prepare-endpoint";
import { LockEvidenceEndpointV1 } from "../web-services/lock-evidence-endpoint";
import { TransferCommenceEndpointV1 } from "../web-services/transfer-commence-endpoint";
import { TransferCompleteEndpointV1 } from "../web-services/transfer-complete-endpoint";
import { TransferInitiationEndpointV1 } from "../web-services/transfer-initiation-endpoint";
import { SendClientRequestEndpointV1 } from "../web-services/send-client-request";
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
import { lockEvidence } from "./common/lock-evidence-helper";
import { commitFinal } from "./common/commit-final-helper";
import { transferComplete } from "./common/transfer-complete-helper";
import { v4 as uuidV4 } from "uuid";
import { transferCommence } from "./common/transfer-commence-helper";
import { commitPrepare } from "./common/commit-prepare-helper";
import { randomInt } from "crypto";

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

    const transferinitiation = new TransferInitiationEndpointV1({
      gateway: this,
    });
    const lockEvidencePreparation = new TransferCommenceEndpointV1({
      gateway: this,
    });
    const lockEvidence = new LockEvidenceEndpointV1({ gateway: this });
    const commitPreparation = new CommitPrepareEndpointV1({
      gateway: this,
    });
    const commitFinal = new CommitFinalEndpointV1({ gateway: this });
    const transferComplete = new TransferCompleteEndpointV1({
      gateway: this,
    });
    const sendClientrequest = new SendClientRequestEndpointV1({
      gateway: this,
    });
    this.endpoints = [
      transferinitiation,
      lockEvidencePreparation,
      lockEvidence,
      commitPreparation,
      commitFinal,
      transferComplete,
      sendClientrequest,
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

  public async initiateTransferReceived(
    request: TransferInitializationV1Request,
  ): Promise<TransferInitializationV1Response> {
    const fnTag = `${this.className}#initiateTransferReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    const initiateTransferResponse = await initiateTransfer(request, this);
    this.log.info(`${fnTag}, complete processing, time: ${Date.now()}`);
    return initiateTransferResponse;
  }

  public async transferCommenceReceived(
    request: TransferCommenceV1Request,
  ): Promise<TransferCommenceV1Response> {
    const fnTag = `${this.className}#transferCommenceReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    const TransferCommenceResponse = await transferCommence(request, this);
    this.log.info(`${fnTag}, complete processing, time: ${Date.now()}`);
    return TransferCommenceResponse;
  }

  public async lockEvidenceReceived(
    request: LockEvidenceV1Request,
  ): Promise<LockEvidenceV1Response> {
    const fnTag = `${this.className}#LockEvidence()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    const lockEvidenceResponse = await lockEvidence(request, this);
    this.log.info(`${fnTag}, complete processing, time: ${Date.now()}`);
    return lockEvidenceResponse;
  }

  public async commitPrepareReceived(
    request: CommitPreparationV1Request,
  ): Promise<CommitPreparationV1Response> {
    const fnTag = `${this.className}#CommitPrepare()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    const commitPrepareResponse = await commitPrepare(request, this);
    this.log.info(`${fnTag}, complete processing, time: ${Date.now()}`);
    return commitPrepareResponse;
  }

  public async commitFinalReceived(
    request: CommitFinalV1Request,
  ): Promise<CommitFinalV1Response> {
    const fnTag = `${this.className}#CommitFinal()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    const commitFinalResponse = await commitFinal(request, this);
    this.log.info(`${fnTag}, complete processing, time: ${Date.now()}`);
    return commitFinalResponse;
  }

  public async transferCompleteReceived(
    request: TransferCompleteV1Request,
  ): Promise<TransferCompleteV1Response> {
    const fnTag = `${this.className}#transferCompleteRequest()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    const transferCompleteResponse = await transferComplete(request, this);
    this.log.info(`${fnTag}, complete processing, time: ${Date.now()}`);
    return transferCompleteResponse;
  }

  public async runOdap(request: SendClientV1Request): Promise<void> {
    const fnTag = `${this.className}#runOdap()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);

    const { sessionID, odapServerApiClient } = this.configureOdapSession(
      request,
    );

    if (sessionID == undefined) {
      throw new Error(
        `${fnTag}, session id undefined after TransferInitiationMessages`,
      );
    }

    // Phase 1
    await this.sendInitiationRequestMessage(sessionID, odapServerApiClient);

    // Phase 2
    await this.sendTransferCommenceRequestMessage(
      sessionID,
      odapServerApiClient,
    );

    await this.sendLockEvidenceRequestMessage(sessionID, odapServerApiClient);

    // Phase 3
    await this.sendCommitPreparationRequestMessage(
      sessionID,
      odapServerApiClient,
    );

    await this.sendCommitFinalRequestMessage(sessionID, odapServerApiClient);

    await this.sendTransferCompleteRequestMessage(
      sessionID,
      odapServerApiClient,
    );
  }

  private configureOdapSession(request: SendClientV1Request) {
    const odapServerApiConfig = new Configuration({
      basePath: request.serverGatewayConfiguration.apiHost,
    });

    const odapServerApiClient = new OdapApi(odapServerApiConfig);
    const sessionData: SessionData = {};

    const sessionID = uuidV4();

    sessionData.id = sessionID;
    sessionData.step = 1;
    sessionData.version = request.version;
    sessionData.lastSequenceNumber = randomInt(4294967295);

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

    return { sessionID, odapServerApiClient };
  }

  private async sendInitiationRequestMessage(
    sessionID: string,
    odapServerApiClient: OdapApi,
  ): Promise<void> {
    const fnTag = `${this.className}#sendInitiationRequestMessage()`;

    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.id == undefined ||
      sessionData.step == undefined ||
      sessionData.version == undefined ||
      sessionData.payloadProfile == undefined ||
      sessionData.loggingProfile == undefined ||
      sessionData.accessControlProfile == undefined ||
      sessionData.applicationProfile == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayDltSystem == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.recipientGatewayDltSystem == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    await this.storeOdapLog(
      {
        phase: "p1",
        step: sessionData.step.toString(),
        type: "init",
        operation: "validate",
        nodes: `${this.pubKey}->${sessionData.recipientGatewayPubkey}`,
      },
      `${sessionData.id}-${sessionData.step.toString()}`,
    );

    const initializationRequestMessage: TransferInitializationV1Request = {
      messageType: OdapMessageType.InitializationRequest,
      sessionID: sessionData.id,
      version: sessionData.version,
      // developer urn
      // credential profile
      payloadProfile: sessionData.payloadProfile,
      applicationProfile: sessionData.applicationProfile,
      loggingProfile: sessionData.loggingProfile,
      accessControlProfile: sessionData.accessControlProfile,
      clientSignature: "",
      sourceGatewayPubkey: this.pubKey,
      sourceGatewayDltSystem: sessionData.sourceGatewayDltSystem,
      recipientGatewayPubkey: sessionData.recipientGatewayPubkey,
      recipientGatewayDltSystem: sessionData.recipientGatewayDltSystem,
      sequenceNumber: sessionData.lastSequenceNumber,
      // escrow type
      // expiry time (related to the escrow)
      // multiple claims allowed
      // multiple cancels allowed
      // permissions
    };

    if (!this.supportedDltIDs.includes(sessionData.recipientGatewayDltSystem)) {
      throw new Error(
        `${fnTag}, recipient gateway dlt system is not supported by this gateway`,
      );
    }

    this.log.info(
      `${fnTag}, creating TransferInitializationRequest message signature`,
    );

    const messageSignature = this.bufArray2HexStr(
      this.sign(JSON.stringify(initializationRequestMessage)),
    );

    this.log.info(
      `${fnTag}, created TransferInitializationRequest message signature with value: ${messageSignature}`,
    );

    initializationRequestMessage.clientSignature = messageSignature;

    this.log.info(
      `${fnTag}, TransferInitializationRequest message sent, time: ${Date.now()}`,
    );

    const transferInitiationResponse = await odapServerApiClient.phase1TransferInitiationV1(
      initializationRequestMessage,
    );

    this.log.info(
      `${fnTag}, TransferInitializationResponse message received, time: ${Date.now()}`,
    );

    if (transferInitiationResponse.status != 200) {
      throw new Error(
        `${fnTag}, TransferInitializationResponse message failed`,
      );
    }

    const transferInitiationResponseData: TransferInitializationV1Response =
      transferInitiationResponse.data;

    if (
      transferInitiationResponseData.messageType !=
      OdapMessageType.InitializationResponse
    ) {
      throw new Error(
        `${fnTag}, wrong message type for TransferInitializationResponse`,
      );
    }

    const sentMessageHash = SHA256(
      JSON.stringify(initializationRequestMessage),
    ).toString();

    if (
      transferInitiationResponseData.sequenceNumber !=
      initializationRequestMessage.sequenceNumber
    ) {
      throw new Error(
        `${fnTag}, TransferInitializationResponse sequence number incorrect`,
      );
    }

    if (
      transferInitiationResponseData.initialRequestMessageHash !=
      sentMessageHash
    ) {
      throw new Error(
        `${fnTag}, TransferInitializationResponse previous message hash does not match the one that was sent`,
      );
    }

    if (
      transferInitiationResponseData.serverIdentityPubkey !=
      initializationRequestMessage.recipientGatewayPubkey
    ) {
      throw new Error(
        `${fnTag}, TransferInitializationResponse serverIdentity public key does not match the one that was sent`,
      );
    }

    const transferInitiationResponseDataSignature =
      transferInitiationResponseData.serverSignature;

    const sourceServerSignature = new Uint8Array(
      Buffer.from(transferInitiationResponseDataSignature, "hex"),
    );

    const sourceServerPubkey = new Uint8Array(
      Buffer.from(initializationRequestMessage.recipientGatewayPubkey, "hex"),
    );

    transferInitiationResponseData.serverSignature = "";

    if (
      !this.verifySignature(
        JSON.stringify(transferInitiationResponseData),
        sourceServerSignature,
        sourceServerPubkey,
      )
    ) {
      throw new Error(
        `${fnTag}, TransferInitializationResponse message signature verification failed`,
      );
    }

    const serverIdentityPubkey =
      transferInitiationResponseData.serverIdentityPubkey;

    sessionData.step++;

    sessionData.id = transferInitiationResponseData.sessionID;

    sessionData.recipientGatewayPubkey = serverIdentityPubkey;

    sessionData.initializationRequestMessageHash = sentMessageHash;

    sessionData.initializationResponseMessageHash = SHA256(
      JSON.stringify(transferInitiationResponseData),
    ).toString();

    sessionData.clientSignatureInitializationRequestMessage =
      initializationRequestMessage.clientSignature;

    sessionData.serverSignatureInitializationResponseMessage =
      transferInitiationResponseData.serverSignature;

    sessionData.fabricAssetSize = "1";

    this.sessions.set(sessionData.id, sessionData);
  }

  private async sendTransferCommenceRequestMessage(
    sessionID: string,
    odapServerApiClient: OdapApi,
  ): Promise<void> {
    const fnTag = `${this.className}#sendTransferCommenceMessage()`;

    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.assetProfile == undefined ||
      sessionData.originatorPubkey == undefined ||
      sessionData.beneficiaryPubkey == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.sourceGatewayDltSystem == undefined ||
      sessionData.recipientGatewayDltSystem == undefined ||
      sessionData.initializationRequestMessageHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    await this.storeOdapLog(
      {
        phase: "p2",
        step: sessionData.step.toString(),
        type: "init",
        operation: "commence",
        nodes: `${this.pubKey}->${sessionData.recipientGatewayPubkey}`,
      },
      `${sessionData.id}-${sessionData.step.toString()}`,
    );

    const hashAssetProfile = SHA256(
      JSON.stringify(sessionData.assetProfile),
    ).toString();

    const transferCommenceRequestMessage: TransferCommenceV1Request = {
      messageType: OdapMessageType.TransferCommenceRequest,
      originatorPubkey: sessionData.originatorPubkey,
      beneficiaryPubkey: sessionData.beneficiaryPubkey,
      senderDltSystem: sessionData.sourceGatewayDltSystem,
      recipientDltSystem: sessionData.recipientGatewayDltSystem,
      sessionID: sessionID,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      hashAssetProfile: hashAssetProfile,
      hashPrevMessage: sessionData.initializationRequestMessageHash,
      // clientTransferNumber
      clientSignature: "",
      sequenceNumber: sessionData.lastSequenceNumber,
    };

    const messageSignature = this.bufArray2HexStr(
      this.sign(JSON.stringify(transferCommenceRequestMessage)),
    );

    this.log.info(
      `${fnTag}, created TransferCommenceRequest message signature with value: ${messageSignature}`,
    );

    transferCommenceRequestMessage.clientSignature = messageSignature;

    this.log.info(
      `${fnTag}, TransferCommenceRequest message sent, time: ${Date.now()}`,
    );

    const transferCommenceResponse = await odapServerApiClient.phase2TransferCommenceV1(
      transferCommenceRequestMessage,
    );

    this.log.info(
      `${fnTag}, TransferCommenceResponse message received, time: ${Date.now()}`,
    );

    if (transferCommenceResponse.status != 200) {
      await this.Revert(sessionID);
      throw new Error(`${fnTag}, TransferCommenceResponse message failed`);
    }

    const transferCommenceResponseData: TransferCommenceV1Response =
      transferCommenceResponse.data;

    if (
      transferCommenceResponseData.messageType !=
      OdapMessageType.TransferCommenceResponse
    ) {
      throw new Error(
        `${fnTag}, wrong message type for TransferCommenceResponse`,
      );
    }

    const sentMessageHash = SHA256(
      JSON.stringify(transferCommenceRequestMessage),
    ).toString();

    if (
      transferCommenceResponseData.sequenceNumber !=
      transferCommenceRequestMessage.sequenceNumber
    ) {
      throw new Error(
        `${fnTag}, TransferInitializationResponse sequence number incorrect`,
      );
    }

    if (sentMessageHash != transferCommenceResponseData.hashCommenceRequest) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, TransferCommenceResponse previous message hash does not match the one that was sent`,
      );
    }

    if (
      transferCommenceRequestMessage.serverIdentityPubkey !=
      transferCommenceResponseData.serverIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, TransferCommenceResponse serverIdentity public key does not match the one that was sent`,
      );
    }

    if (
      transferCommenceRequestMessage.clientIdentityPubkey !=
      transferCommenceResponseData.clientIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, TransferCommenceResponse clientIdentity public key does not match the one that was sent`,
      );
    }

    const transferCommenceResponseDataSignature =
      transferCommenceResponseData.serverSignature;

    const sourceServerSignature = new Uint8Array(
      Buffer.from(transferCommenceResponseDataSignature, "hex"),
    );

    const sourceServerPubkey = new Uint8Array(
      Buffer.from(sessionData.recipientGatewayPubkey, "hex"),
    );

    transferCommenceResponseData.serverSignature = "";

    if (
      !this.verifySignature(
        JSON.stringify(transferCommenceResponseData),
        sourceServerSignature,
        sourceServerPubkey,
      )
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, TransferCommenceResponse message signature verification failed`,
      );
    }

    transferCommenceResponseData.serverSignature = transferCommenceResponseDataSignature;

    sessionData.step++;

    sessionData.transferCommenceMessageRequestHash = sentMessageHash;

    sessionData.transferCommenceMessageResponseHash = SHA256(
      JSON.stringify(transferCommenceResponseData),
    ).toString();

    sessionData.clientSignatureTransferCommenceRequestMessage =
      transferCommenceRequestMessage.clientSignature;

    sessionData.serverSignatureTransferCommenceResponseMessage =
      transferCommenceResponseData.serverSignature;

    this.sessions.set(sessionID, sessionData);
  }

  private async sendLockEvidenceRequestMessage(
    sessionID: string,
    odapServerApiClient: OdapApi,
  ) {
    const fnTag = `${this.className}#sendLockEvidenceRequestMessage()`;

    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.transferCommenceMessageResponseHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    await this.storeOdapLog(
      {
        phase: "p2",
        step: sessionData.step.toString(),
        type: "init",
        operation: "lock",
        nodes: `${this.pubKey}->${sessionData.recipientGatewayPubkey}`,
      },
      `${sessionData.id}-${sessionData.step.toString()}`,
    );

    const fabricLockAssetProof = await this.lockFabricAsset(sessionID);

    this.log.info(`${fnTag}, proof of the asset lock: ${fabricLockAssetProof}`);

    const lockEvidenceRequestMessage: LockEvidenceV1Request = {
      sessionID: sessionID,
      messageType: OdapMessageType.LockEvidenceRequest,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      lockEvidenceClaim: fabricLockAssetProof,
      // lock claim format
      lockEvidenceExpiration: new Date()
        .setDate(new Date().getDate() + 1)
        .toString(), // a day from now
      hashCommenceAckRequest: sessionData.transferCommenceMessageResponseHash,
      clientSignature: "",
      sequenceNumber: sessionData.lastSequenceNumber,
    };

    const messageSignature = this.bufArray2HexStr(
      this.sign(JSON.stringify(lockEvidenceRequestMessage)),
    );

    this.log.info(
      `${fnTag}, created LockEvidenceRequest message signature with value: ${messageSignature}`,
    );

    lockEvidenceRequestMessage.clientSignature = messageSignature;

    this.log.info(
      `${fnTag}, LockEvidenceRequest message sent, time: ${Date.now()}`,
    );

    const lockEvidenceResponseMesssage = await odapServerApiClient.phase2LockEvidenceV1(
      lockEvidenceRequestMessage,
    );

    this.log.info(
      `${fnTag}, LockEvidenceRequest message received, time: ${Date.now()}`,
    );

    if (lockEvidenceResponseMesssage.status != 200) {
      await this.Revert(sessionID);
      throw new Error(`${fnTag}, LockEvidenceResponse message failed`);
    }

    const lockEvidenceResponseMesssageData: LockEvidenceV1Response =
      lockEvidenceResponseMesssage.data;

    if (
      lockEvidenceResponseMesssageData.messageType !=
      OdapMessageType.LockEvidenceResponse
    ) {
      throw new Error(`${fnTag}, wrong message type for LockEvidenceResponse`);
    }

    const sentMessageHash = SHA256(
      JSON.stringify(lockEvidenceRequestMessage),
    ).toString();

    if (
      lockEvidenceResponseMesssageData.sequenceNumber !=
      lockEvidenceRequestMessage.sequenceNumber
    ) {
      throw new Error(
        `${fnTag}, TransferInitializationResponse sequence number incorrect`,
      );
    }

    if (
      sentMessageHash !=
      lockEvidenceResponseMesssageData.hashLockEvidenceRequest
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, LockEvidenceResponse previous message hash does not match the one that was sent`,
      );
    }

    if (
      lockEvidenceRequestMessage.serverIdentityPubkey !=
      lockEvidenceResponseMesssageData.serverIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, LockEvidenceResponse serverIdentity public key does not match the one that was sent`,
      );
    }

    if (
      lockEvidenceRequestMessage.clientIdentityPubkey !=
      lockEvidenceResponseMesssageData.clientIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, LockEvidenceResponse clientIdentity public key does not match the one that was sent`,
      );
    }

    const lockEvidenceResponseMesssageDataSignature =
      lockEvidenceResponseMesssageData.serverSignature;

    const sourceServerSignature = new Uint8Array(
      Buffer.from(lockEvidenceResponseMesssageDataSignature, "hex"),
    );

    const sourceServerPubkey = new Uint8Array(
      Buffer.from(sessionData.recipientGatewayPubkey, "hex"),
    );

    lockEvidenceResponseMesssageData.serverSignature = "";

    if (
      !this.verifySignature(
        JSON.stringify(lockEvidenceResponseMesssageData),
        sourceServerSignature,
        sourceServerPubkey,
      )
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, LockEvidenceResponse message signature verification failed`,
      );
    }

    lockEvidenceResponseMesssageData.serverSignature = lockEvidenceResponseMesssageDataSignature;

    sessionData.step++;

    sessionData.lockEvidenceRequestMessageHash = sentMessageHash;

    sessionData.lockEvidenceResponseMessageHash = SHA256(
      JSON.stringify(lockEvidenceResponseMesssageData),
    ).toString();

    sessionData.clientSignatureLockEvidenceRequestMessage =
      lockEvidenceRequestMessage.clientSignature;

    sessionData.serverSignatureLockEvidenceResponseMessage =
      lockEvidenceResponseMesssageData.serverSignature;

    sessionData.lockEvidenceClaim = fabricLockAssetProof;

    this.sessions.set(sessionID, sessionData);
  }

  private async sendCommitPreparationRequestMessage(
    sessionID: string,
    odapServerApiClient: OdapApi,
  ) {
    const fnTag = `${this.className}#sendCommitPreparationRequestMessage()`;

    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.lockEvidenceResponseMessageHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    await this.storeOdapLog(
      {
        phase: "p3",
        step: sessionData.step.toString(),
        type: "init",
        operation: "commit-prepare",
        nodes: `${this.pubKey}->${sessionData.recipientGatewayPubkey}`,
      },
      `${sessionData.id}-${sessionData.step.toString()}`,
    );

    const commitPrepareRequestMessage: CommitPreparationV1Request = {
      sessionID: sessionID,
      messageType: OdapMessageType.CommitPreparationRequest,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      hashLockEvidenceAck: sessionData.lockEvidenceResponseMessageHash,
      clientSignature: "",
      sequenceNumber: sessionData.lastSequenceNumber,
    };

    const messageSignature = this.bufArray2HexStr(
      this.sign(JSON.stringify(commitPrepareRequestMessage)),
    );

    this.log.info(
      `${fnTag}, created CommitPreparationRequest message signature with value: ${messageSignature}`,
    );

    commitPrepareRequestMessage.clientSignature = messageSignature;

    this.log.info(
      `${fnTag}, CommitPreparationRequest message sent, time: ${Date.now()}`,
    );

    const commitPrepareResponseMessage = await odapServerApiClient.phase3CommitPreparationV1(
      commitPrepareRequestMessage,
    );

    this.log.info(
      `${fnTag}, CommitPreparationRequest message received, time: ${Date.now()}`,
    );

    if (commitPrepareResponseMessage.status != 200) {
      await this.Revert(sessionID);
      throw new Error(`${fnTag}, CommitPreparationRequest message failed`);
    }

    const commitPrepareResponseMessageData: CommitPreparationV1Response =
      commitPrepareResponseMessage.data;

    if (
      commitPrepareResponseMessageData.messageType !=
      OdapMessageType.CommitPreparationResponse
    ) {
      throw new Error(
        `${fnTag}, wrong message type for CommitPreparationResponse`,
      );
    }

    const sentMessageHash = SHA256(
      JSON.stringify(commitPrepareRequestMessage),
    ).toString();

    if (
      commitPrepareResponseMessageData.sequenceNumber !=
      commitPrepareRequestMessage.sequenceNumber
    ) {
      throw new Error(
        `${fnTag}, TransferInitializationResponse sequence number incorrect`,
      );
    }

    if (sentMessageHash != commitPrepareResponseMessageData.hashCommitPrep) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, CommitPreparationResponse previous message hash does not match the one that was sent`,
      );
    }

    if (
      commitPrepareRequestMessage.serverIdentityPubkey !=
      commitPrepareResponseMessageData.serverIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, CommitPreparationResponse serverIdentity public key does not match the one that was sent`,
      );
    }

    if (
      commitPrepareRequestMessage.clientIdentityPubkey !=
      commitPrepareResponseMessageData.clientIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, CommitPreparationResponse clientIdentity public key does not match the one that was sent`,
      );
    }

    const commitPrepareResponseMessageDataSignature =
      commitPrepareResponseMessageData.serverSignature;

    const sourceServerSignature = new Uint8Array(
      Buffer.from(commitPrepareResponseMessageDataSignature, "hex"),
    );

    const sourceServerPubkey = new Uint8Array(
      Buffer.from(sessionData.recipientGatewayPubkey, "hex"),
    );

    commitPrepareResponseMessageData.serverSignature = "";

    if (
      !this.verifySignature(
        JSON.stringify(commitPrepareResponseMessageData),
        sourceServerSignature,
        sourceServerPubkey,
      )
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, LockEvidenceResponse message signature verification failed`,
      );
    }

    commitPrepareResponseMessageData.serverSignature = commitPrepareResponseMessageDataSignature;

    sessionData.step++;

    sessionData.commitPrepareRequestMessageHash = sentMessageHash;

    sessionData.commitPrepareResponseMessageHash = SHA256(
      JSON.stringify(commitPrepareResponseMessageData),
    ).toString();

    sessionData.clientSignatureCommitPreparationRequestMessage =
      commitPrepareRequestMessage.clientSignature;

    sessionData.serverSignatureCommitPreparationResponseMessage =
      commitPrepareResponseMessageData.serverSignature;

    this.sessions.set(sessionID, sessionData);
  }

  private async sendCommitFinalRequestMessage(
    sessionID: string,
    odapServerApiClient: OdapApi,
  ) {
    const fnTag = `${this.className}#sendCommitFinalRequestMessage()`;

    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.commitPrepareResponseMessageHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    await this.storeOdapLog(
      {
        phase: "p3",
        step: sessionData.step.toString(),
        type: "init",
        operation: "commit-final",
        nodes: `${this.pubKey}->${sessionData.recipientGatewayPubkey}`,
      },
      `${sessionData.id}-${sessionData.step.toString()}`,
    );

    const fabricDeleteAssetProof = await this.deleteFabricAsset(sessionID);

    const commitFinalRequestMessage: CommitFinalV1Request = {
      sessionID: sessionID,
      messageType: OdapMessageType.CommitFinalRequest,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      commitFinalClaim: fabricDeleteAssetProof,
      // commit final claim format
      hashCommitPrepareAck: sessionData.commitPrepareResponseMessageHash,
      clientSignature: "",
      sequenceNumber: sessionData.lastSequenceNumber,
    };

    const messageSignature = this.bufArray2HexStr(
      this.sign(JSON.stringify(commitFinalRequestMessage)),
    );

    this.log.info(
      `${fnTag}, created CommitFinalRequest message signature with value: ${messageSignature}`,
    );

    commitFinalRequestMessage.clientSignature = messageSignature;

    this.log.info(
      `${fnTag}, CommitFinalRequest message sent, time: ${Date.now()}`,
    );

    const commitFinalResponseMessage = await odapServerApiClient.phase3CommitFinalV1(
      commitFinalRequestMessage,
    );

    this.log.info(
      `${fnTag}, CommitFinalRequest message received, time: ${Date.now()}`,
    );

    if (commitFinalResponseMessage.status != 200) {
      await this.Revert(sessionID);
      throw new Error(`${fnTag}, CommitFinalRequest message failed`);
    }

    const commitFinalResponseMessageData: CommitFinalV1Response =
      commitFinalResponseMessage.data;

    if (
      commitFinalResponseMessageData.messageType !=
      OdapMessageType.CommitFinalResponse
    ) {
      throw new Error(`${fnTag}, wrong message type for CommitFinalResponse`);
    }

    const sentMessageHash = SHA256(
      JSON.stringify(commitFinalRequestMessage),
    ).toString();

    if (
      commitFinalResponseMessageData.sequenceNumber !=
      commitFinalRequestMessage.sequenceNumber
    ) {
      throw new Error(
        `${fnTag}, TransferInitializationResponse sequence number incorrect`,
      );
    }

    if (sentMessageHash != commitFinalResponseMessageData.hashCommitFinal) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, CommitFinalResponse previous message hash does not match the one that was sent`,
      );
    }

    if (
      commitFinalRequestMessage.serverIdentityPubkey !=
      commitFinalResponseMessageData.serverIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, CommitFinalResponse serverIdentity public key does not match the one that was sent`,
      );
    }

    if (
      commitFinalRequestMessage.clientIdentityPubkey !=
      commitFinalResponseMessageData.clientIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, CommitFinalResponse clientIdentity public key does not match the one that was sent`,
      );
    }

    const commitFinalResponseMessageDataSignature =
      commitFinalResponseMessageData.serverSignature;

    const sourceServerSignature = new Uint8Array(
      Buffer.from(commitFinalResponseMessageDataSignature, "hex"),
    );

    const sourceServerPubkey = new Uint8Array(
      Buffer.from(sessionData.recipientGatewayPubkey, "hex"),
    );

    commitFinalResponseMessageData.serverSignature = "";

    if (
      !this.verifySignature(
        JSON.stringify(commitFinalResponseMessageData),
        sourceServerSignature,
        sourceServerPubkey,
      )
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, CommitFinalResponse message signature verification failed`,
      );
    }

    commitFinalResponseMessageData.serverSignature = commitFinalResponseMessageDataSignature;

    sessionData.step++;

    sessionData.commitFinalRequestMessageHash = sentMessageHash;

    sessionData.commitFinalResponseMessageHash = SHA256(
      JSON.stringify(commitFinalResponseMessageData),
    ).toString();

    sessionData.clientSignatureCommitFinalRequestMessage =
      commitFinalRequestMessage.clientSignature;

    sessionData.serverSignatureCommitFinalResponseMessage =
      commitFinalResponseMessageData.serverSignature;

    this.sessions.set(sessionID, sessionData);
  }

  private async sendTransferCompleteRequestMessage(
    sessionID: string,
    odapServerApiClient: OdapApi,
  ) {
    const fnTag = `${this.className}#sendTransferCompleteRequestMessage()`;

    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.commitFinalResponseMessageHash == undefined ||
      sessionData.transferCommenceMessageRequestHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    await this.storeOdapLog(
      {
        phase: "p3",
        step: sessionData.step.toString(),
        type: "init",
        operation: "transfer-complete",
        nodes: `${this.pubKey}`,
      },
      `${sessionData.id}-${sessionData.step.toString()}`,
    );

    const transferCompleteRequestMessage: TransferCompleteV1Request = {
      sessionID: sessionID,
      messageType: OdapMessageType.TransferCompleteRequest,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      hashCommitFinalAck: sessionData.commitFinalResponseMessageHash,
      hashTransferCommence: sessionData.transferCommenceMessageRequestHash,
      clientSignature: "",
      sequenceNumber: sessionData.lastSequenceNumber,
    };

    const messageSignature = this.bufArray2HexStr(
      this.sign(JSON.stringify(transferCompleteRequestMessage)),
    );

    this.log.info(
      `${fnTag}, created TransferCompleteRequest message signature with value: ${messageSignature}`,
    );

    transferCompleteRequestMessage.clientSignature = messageSignature;

    this.log.info(
      `${fnTag}, TransferCompleteRequest message sent, time: ${Date.now()}`,
    );

    const transferCompleteResponseMessage = await odapServerApiClient.phase3TransferCompleteV1(
      transferCompleteRequestMessage,
    );

    this.log.info(
      `${fnTag}, TransferCompleteRequest message received, time: ${Date.now()}`,
    );

    if (transferCompleteResponseMessage.status != 200) {
      throw new Error(`${fnTag}, TransferCompleteRequest message failed`);
    }

    sessionData.step++;

    sessionData.transferCompleteMessageHash = SHA256(
      JSON.stringify(transferCompleteRequestMessage),
    ).toString();

    sessionData.clientSignatureCommitFinalRequestMessage =
      transferCompleteRequestMessage.clientSignature;

    this.sessions.set(sessionID, sessionData);
  }

  private async lockFabricAsset(sessionID: string) {
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

  private async deleteFabricAsset(sessionID: string) {
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
