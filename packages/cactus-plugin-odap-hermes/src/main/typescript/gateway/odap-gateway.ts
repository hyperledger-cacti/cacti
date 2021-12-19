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
import secp256k1 from "secp256k1";
import { CommitFinalEndpointV1 } from "../web-services/commit-final-endpoint";
import { CommitPrepareEndpointV1 } from "../web-services/commite-prepare-endpoint";
import { LockEvidenceEndpointV1 } from "../web-services/lock-evidence-endpoint";
import { LockEvidencePrepareEndpointV1 } from "../web-services/lock-evidence-transfer-commence-endpoint";
import { TransferCompleteEndpointV1 } from "../web-services/transfer-complete";
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
import {
  lockEvidence,
  lockEvidenceTransferCommence,
} from "./common/lock-evidence-helper";
import { CommitFinal, CommitPrepare } from "./common/commit-helper";
import { TransferComplete } from "./common/transfer-complete-helper";
/*const log = LoggerProvider.getOrCreate({
  level: "INFO",
  label: "odap-logger",
});*/
export interface OdapGatewayConstructorOptions {
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
  besuAssetID?: string;
}
export interface OdapGatewayKeyPairs {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}
interface OdapHermesLog {
  phase: string;
  step: string;
  operation: string;
  nodes: string;
}
export class OdapGateway implements ICactusPlugin, IPluginWebService {
  name: string;
  sessions: Map<string, SessionData>;
  pubKey: string;
  privKey: string;
  public static readonly CLASS_NAME = "OdapGateWay";
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
  public besuAssetCreated: boolean;
  public fabricSigningCredential?: FabricSigningCredential;
  public fabricChannelName?: string;
  public fabricContractName?: string;
  public besuContractName?: string;
  public besuWeb3SigningCredential?: Web3SigningCredential;
  public besuKeychainId?: string;

  public fabricAssetID?: string;
  public besuAssetID?: string;
  public constructor(options: OdapGatewayConstructorOptions) {
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
    const keyPairs: OdapGatewayKeyPairs = Secp256k1Keys.generateKeyPairsBuffer();
    this.pubKey = this.bufArray2HexStr(keyPairs.publicKey);
    this.privKey = this.bufArray2HexStr(keyPairs.privateKey);
    const odapSignerOptions: IJsObjectSignerOptions = {
      privateKey: this.privKey,
      signatureFunc: this.odapSignatureFunc,
      logLevel: "debug",
    };
    this.odapSigner = new JsObjectSigner(odapSignerOptions);
    this.fabricAssetDeleted = false;
    this.fabricAssetLocked = false;
    this.besuAssetCreated = false;

    this.pluginRegistry = new PluginRegistry();
    if (options.ipfsPath != undefined) {
      {
        const config = new Configuration({ basePath: options.ipfsPath });
        const apiClient = new ObjectStoreIpfsApi(config);
        this.ipfsApi = apiClient;
      }
    }
    if (options.fabricPath != undefined) {
      {
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
      }
    }
    if (options.besuPath != undefined) {
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
          `${fnTag}, besu params missing should have: signing credentials, contract name, key chain ID, asset ID`,
        );
      }
      this.besuContractName = options.besuContractName;
      this.besuWeb3SigningCredential = options.besuWeb3SigningCredential;
      this.besuKeychainId = options.besuKeychainId;
      this.besuAssetID = options.besuAssetID;
    }
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
    return OdapGateway.CLASS_NAME;
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
    const lockEvidencePreparation = new LockEvidencePrepareEndpointV1({
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

  public async odapGatewaySign(msg: string): Promise<Uint8Array> {
    return this.odapSigner.sign(msg);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public odapSignatureFunc(msg: any, pkey: any): any {
    const signature = secp256k1.ecdsaSign(
      new Uint8Array(Buffer.from(SHA256(msg).toString(), `hex`)),
      Buffer.from(pkey, `hex`),
    ).signature;
    return signature;
  }
  public async sign(msg: string, privKey: string): Promise<string> {
    const signature = secp256k1.ecdsaSign(
      new Uint8Array(Buffer.from(SHA256(msg).toString(), `hex`)),
      Buffer.from(privKey, `hex`),
    ).signature;
    return this.bufArray2HexStr(signature);
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
  public async odapLog(
    odapHermesLog: OdapHermesLog,
    ID: string,
  ): Promise<void> {
    this.log.info(
      `<${odapHermesLog.phase}, ${odapHermesLog.step}, ${odapHermesLog.operation}, ${odapHermesLog.nodes}>`,
    );
    if (this.ipfsApi == undefined) return;
    const res = await this.ipfsApi.setObjectV1({
      key: ID,
      value: `${odapHermesLog.phase}, ${odapHermesLog.phase}, ${odapHermesLog.operation}, ${odapHermesLog.nodes}`,
    });
    const resStatusOk = res.status > 199 && res.status < 300;
    if (!resStatusOk) {
      throw new Error("${fnTag}, error when logging to ipfs");
    }
  }
  public async initiateTransfer(
    req: TransferInitializationV1Request,
  ): Promise<TransferInitializationV1Response> {
    const fnTag = `${this.className}#InitiateTransfer()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    const initiateTransferResponse = await initiateTransfer(req, this);
    this.log.info(`${fnTag}, complete processing, time: ${Date.now()}`);
    return initiateTransferResponse;
  }
  public async lockEvidenceTransferCommence(
    req: TransferCommenceV1Request,
  ): Promise<TransferCommenceV1Response> {
    const fnTag = `${this.className}#TransferCommence()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    const TransferCommenceResponse = await lockEvidenceTransferCommence(
      req,
      this,
    );
    this.log.info(`${fnTag}, complete processing, time: ${Date.now()}`);
    return TransferCommenceResponse;
  }
  public async lockEvidence(
    req: LockEvidenceV1Request,
  ): Promise<LockEvidenceV1Response> {
    const fnTag = `${this.className}#LockEvidence()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    const lockEvidenceResponse = await lockEvidence(req, this);
    this.log.info(`${fnTag}, complete processing, time: ${Date.now()}`);
    return lockEvidenceResponse;
  }
  public async CommitPrepare(
    req: CommitPreparationV1Request,
  ): Promise<CommitPreparationV1Response> {
    const fnTag = `${this.className}#CommitPrepare()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    const commitPrepare = await CommitPrepare(req, this);
    this.log.info(`${fnTag}, complete processing, time: ${Date.now()}`);
    return commitPrepare;
  }

  public async CommitFinal(
    req: CommitFinalV1Request,
  ): Promise<CommitFinalV1Response> {
    const fnTag = `${this.className}#CommitFinal()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    const commitFinal = await CommitFinal(req, this);
    this.log.info(`${fnTag}, complete processing, time: ${Date.now()}`);
    return commitFinal;
  }

  public async TransferComplete(
    req: TransferCompleteV1Request,
  ): Promise<TransferCompleteV1Response> {
    const fnTag = `${this.className}#transferCompleteRequest()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    const transferComplete = await TransferComplete(req, this);
    this.log.info(`${fnTag}, complete processing, time: ${Date.now()}`);
    return transferComplete;
  }
  public async SendClientRequest(req: SendClientV1Request): Promise<void> {
    const fnTag = `${this.className}#sendClientRequest()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    const odapServerApiConfig = new Configuration({
      basePath: req.serverGatewayConfiguration.apiHost,
    });
    const odapServerApiClient = new OdapApi(odapServerApiConfig);
    const initializationRequestMessage: TransferInitializationV1Request = {
      version: req.version,
      loggingProfile: req.loggingProfile,
      accessControlProfile: req.accessControlProfile,
      applicationProfile: req.applicationProfile,
      payloadProfile: req.payLoadProfile,
      initializationRequestMessageSignature: "",
      sourceGatewayPubkey: this.pubKey,
      sourceGateWayDltSystem: req.sourceGateWayDltSystem,
      recipientGateWayPubkey: req.recipientGateWayPubkey,
      recipientGateWayDltSystem: req.recipientGateWayDltSystem,
    };
    initializationRequestMessage.initializationRequestMessageSignature = "";
    this.log.info("trying to create signature");
    const initializeReqSignature = await this.odapGatewaySign(
      JSON.stringify(initializationRequestMessage),
    );
    this.log.info("finish to create signature");

    initializationRequestMessage.initializationRequestMessageSignature = this.bufArray2HexStr(
      initializeReqSignature,
    );
    this.log.info(`${fnTag}, send initial transfer req, time: ${Date.now()}`);
    const transferInitiationRes = await odapServerApiClient.phase1TransferInitiationV1(
      initializationRequestMessage,
    );
    this.log.info(
      `${fnTag},  receive initial transfer ack, time: ${Date.now()}`,
    );
    const initializeReqAck: TransferInitializationV1Response =
      transferInitiationRes.data;
    if (transferInitiationRes.status != 200) {
      throw new Error(`${fnTag}, send transfer initiation failed`);
    }
    const serverIdentityPubkey =
      transferInitiationRes.data.serverIdentityPubkey;
    initializationRequestMessage.initializationRequestMessageSignature = this.bufArray2HexStr(
      initializeReqSignature,
    );
    const initializationMsgHash = SHA256(
      JSON.stringify(initializationRequestMessage),
    ).toString();
    if (initializeReqAck.initialRequestMessageHash != initializationMsgHash) {
      throw new Error(
        `${fnTag}, initial message hash not match from initial message ack`,
      );
    }
    const sessionID = initializeReqAck.sessionID;
    const sessionData: SessionData = {};
    sessionData.step = 0;
    await this.odapLog(
      {
        phase: "initiateTransfer",
        operation: "receive-ack",
        step: sessionData.step.toString(),
        nodes: `${serverIdentityPubkey}->${this.pubKey}`,
      },
      `${sessionID}-${sessionData.step.toString()}`,
    );
    sessionData.step++;
    const hashAssetProfile = SHA256(
      JSON.stringify(req.assetProfile),
    ).toString();

    const transferCommenceReq: TransferCommenceV1Request = {
      sessionID: sessionID,
      messageType: "urn:ietf:odap:msgtype:transfer-commence-msg",
      originatorPubkey: req.originatorPubkey,
      beneficiaryPubkey: req.beneficiaryPubkey,
      clientIdentityPubkey: this.pubKey,
      serverIdentityPubkey: serverIdentityPubkey,
      hashPrevMessage: initializationMsgHash,
      hashAssetProfile: hashAssetProfile,
      senderDltSystem: req.clientDltSystem,
      recipientDltSystem: req.recipientGateWayDltSystem,
      clientSignature: "",
    };
    const transferCommenceReqSignature = await this.odapGatewaySign(
      JSON.stringify(transferCommenceReq),
    );
    transferCommenceReq.clientSignature = this.bufArray2HexStr(
      transferCommenceReqSignature,
    );

    const transferCommenceReqHash = SHA256(
      JSON.stringify(transferCommenceReq),
    ).toString();
    await this.odapLog(
      {
        phase: "transfer-commence",
        operation: "send-req",
        step: sessionData.step.toString(),
        nodes: `${this.pubKey}->${serverIdentityPubkey}`,
      },
      `${sessionID}-${sessionData.step.toString()}`,
    );
    sessionData.step++;
    this.log.info(`${fnTag}, send transfer commence req, time: ${Date.now()}`);
    const transferCommenceRes = await odapServerApiClient.phase2TransferCommenceV1(
      transferCommenceReq,
    );
    this.log.info(
      `${fnTag}, receive transfer commence ack, time: ${Date.now()}`,
    );

    if (transferCommenceRes.status != 200) {
      await this.Revert(sessionID);
      throw new Error(`${fnTag}, send transfer commence failed`);
    }
    const transferCommenceAck: TransferCommenceV1Response =
      transferCommenceRes.data;
    if (transferCommenceReqHash != transferCommenceAck.hashCommenceRequest) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, transfer commence req hash not match from transfer commence ack`,
      );
    }
    if (
      transferCommenceReq.serverIdentityPubkey !=
      transferCommenceAck.serverIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, serverIdentity pub key not match from transfer commence ack`,
      );
    }
    if (
      transferCommenceReq.clientIdentityPubkey !=
      transferCommenceAck.clientIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, clientIdentity pub key not match from transfer commence ack`,
      );
    }

    const transferCommenceAckSignature = transferCommenceAck.serverSignature;

    const transferCommenceAckSignatureHex = new Uint8Array(
      Buffer.from(transferCommenceAckSignature, "hex"),
    );
    const sourcePubkey = new Uint8Array(
      Buffer.from(serverIdentityPubkey, "hex"),
    );
    transferCommenceAck.serverSignature = "";
    if (
      !secp256k1.ecdsaVerify(
        transferCommenceAckSignatureHex,
        Buffer.from(
          SHA256(JSON.stringify(transferCommenceAck)).toString(),
          "hex",
        ),
        sourcePubkey,
      )
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, transfer commence ack signature verify failed`,
      );
    }
    transferCommenceAck.serverSignature = transferCommenceAckSignature;
    await this.odapLog(
      {
        phase: "transfer-commence",
        operation: "receive-ack",
        step: sessionData.step.toString(),
        nodes: `${serverIdentityPubkey}->${this.pubKey}`,
      },
      `${sessionID}-${sessionData.step.toString()}`,
    );
    sessionData.step++;
    const commenceAckHash = SHA256(
      JSON.stringify(transferCommenceAck),
    ).toString();
    this.sessions.set(sessionID, sessionData);
    let fabricLockAssetProof = "";
    if (this.fabricApi != undefined) {
      const lockRes = await this.fabricApi.runTransactionV1({
        signingCredential: this.fabricSigningCredential,
        channelName: this.fabricChannelName,
        contractName: this.fabricContractName,
        invocationType: FabricContractInvocationType.Send,
        methodName: "LockAsset",
        params: [this.fabricAssetID],
      } as FabricRunTransactionRequest);
      const receiptLockRes = await this.fabricApi.getTransactionReceiptByTxIDV1(
        {
          signingCredential: this.fabricSigningCredential,
          channelName: this.fabricChannelName,
          contractName: "qscc",
          invocationType: FabricContractInvocationType.Call,
          methodName: "GetBlockByTxID",
          params: [this.fabricChannelName, lockRes.data.transactionId],
        } as FabricRunTransactionRequest,
      );
      this.log.warn(receiptLockRes.data);
      fabricLockAssetProof = JSON.stringify(receiptLockRes.data);
      if (sessionData == undefined) {
        await this.Revert(sessionID);
        throw new Error(`${fnTag}, session data undefined`);
      }
      sessionData.isFabricAssetLocked = true;
    }
    const lockEvidenceReq: LockEvidenceV1Request = {
      sessionID: sessionID,
      messageType: "urn:ietf:odap:msgtype:lock-evidence-req-msg",
      clientIdentityPubkey: req.clientIdentityPubkey,
      serverIdentityPubkey: req.serverIdentityPubkey,
      clientSignature: "",
      hashCommenceAckRequest: commenceAckHash,
      lockEvidenceClaim: fabricLockAssetProof,
      lockEvidenceExpiration: " ",
    };
    const lockEvidenceReqSignature = await this.odapGatewaySign(
      JSON.stringify(lockEvidenceReq),
    );
    lockEvidenceReq.clientSignature = this.bufArray2HexStr(
      lockEvidenceReqSignature,
    );
    const lockEvidenceReqHash = SHA256(
      JSON.stringify(lockEvidenceReq),
    ).toString();
    await this.odapLog(
      {
        phase: "lock-evidence-req",
        operation: "send-req",
        step: sessionData.step.toString(),
        nodes: `${this.pubKey}->${serverIdentityPubkey}`,
      },
      `${sessionID}-${sessionData.step.toString()}`,
    );
    sessionData.step++;
    this.log.info(`${fnTag}, send lock evidence req, time: ${Date.now()}`);
    const lockEvidenceRes = await odapServerApiClient.phase2LockEvidenceV1(
      lockEvidenceReq,
    );
    this.log.info(`${fnTag}, receive lock evidence ack, time: ${Date.now()}`);
    if (lockEvidenceRes.status != 200) {
      await this.Revert(sessionID);
      throw new Error(`${fnTag}, send lock evidence failed`);
    }
    const lockEvidenceAck: LockEvidenceV1Response = lockEvidenceRes.data;
    const lockEvidenceAckHash = SHA256(
      JSON.stringify(lockEvidenceAck),
    ).toString();

    if (lockEvidenceReqHash != lockEvidenceAck.hashLockEvidenceRequest) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, lock evidence req hash not match from lock evidence ack`,
      );
    }
    if (
      lockEvidenceReq.serverIdentityPubkey !=
      lockEvidenceAck.serverIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, lock evidence serverIdentity pub key not match from lock evidence ack`,
      );
    }

    if (
      lockEvidenceReq.clientIdentityPubkey !=
      lockEvidenceAck.clientIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, lock evidence clientIdentity pub key not match from lock evidence ack`,
      );
    }
    const lockEvidenceAckSignature = lockEvidenceAck.serverSignature;

    const lockEvidenceAckSignatureHex = new Uint8Array(
      Buffer.from(lockEvidenceAckSignature, "hex"),
    );
    lockEvidenceAck.serverSignature = "";
    if (
      !secp256k1.ecdsaVerify(
        lockEvidenceAckSignatureHex,
        Buffer.from(SHA256(JSON.stringify(lockEvidenceAck)).toString(), "hex"),
        sourcePubkey,
      )
    ) {
      await this.Revert(sessionID);
      throw new Error(`${fnTag}, lock evidence ack signature verify failed`);
    }
    lockEvidenceAck.serverSignature = transferCommenceAckSignature;
    await this.odapLog(
      {
        phase: "lock-evidence-req",
        operation: "receive-ack",
        step: sessionData.step.toString(),
        nodes: `${serverIdentityPubkey}->${this.pubKey}`,
      },
      `${sessionID}-${sessionData.step.toString()}`,
    );
    sessionData.step++;
    const commitPrepareReq: CommitPreparationV1Request = {
      sessionID: sessionID,
      messageType: "urn:ietf:odap:msgtype:commit-prepare-msg",
      clientIdentityPubkey: req.clientIdentityPubkey,
      serverIdentityPubkey: req.serverIdentityPubkey,
      clientSignature: "",
      hashLockEvidenceAck: lockEvidenceAckHash,
    };
    const commitPrepareReqSignature = await this.odapGatewaySign(
      JSON.stringify(commitPrepareReq),
    );
    commitPrepareReq.clientSignature = this.bufArray2HexStr(
      commitPrepareReqSignature,
    );
    const commitPrepareHash = SHA256(
      JSON.stringify(commitPrepareReq),
    ).toString();
    await this.odapLog(
      {
        phase: "commit-prepare",
        operation: "send-req",
        step: sessionData.step.toString(),
        nodes: `${this.pubKey}->${serverIdentityPubkey}`,
      },
      `${sessionID}-${sessionData.step.toString()}`,
    );
    sessionData.step++;
    this.log.info(`${fnTag}, send commit prepare req, time: ${Date.now()}`);
    const commitPrepareRes = await odapServerApiClient.phase3CommitPreparationV1(
      commitPrepareReq,
    );
    this.log.info(`${fnTag}, receive commit prepare ack, time: ${Date.now()}`);
    if (commitPrepareRes.status != 200) {
      await this.Revert(sessionID);
      throw new Error(`${fnTag}, send commit prepare failed`);
    }
    const commitPrepareAck: CommitPreparationV1Response = commitPrepareRes.data;
    const commitPrepareAckHash = SHA256(
      JSON.stringify(commitPrepareAck),
    ).toString();
    if (commitPrepareHash != commitPrepareAck.hashCommitPrep) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, commit prepare hash not match from commit prepare ack`,
      );
    }
    if (
      commitPrepareReq.serverIdentityPubkey !=
      commitPrepareAck.serverIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, commit prepare serverIdentity pub key not match from commit prepare ack`,
      );
    }
    if (
      commitPrepareReq.clientIdentityPubkey !=
      commitPrepareAck.clientIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, commit prepare clientIdentity pub key not match from commit prepare ack`,
      );
    }

    const commitPrepareAckSignature = commitPrepareAck.serverSignature;

    const commitPrepareAckSignatureHex = new Uint8Array(
      Buffer.from(commitPrepareAckSignature, "hex"),
    );
    commitPrepareAck.serverSignature = "";
    if (
      !secp256k1.ecdsaVerify(
        commitPrepareAckSignatureHex,
        Buffer.from(SHA256(JSON.stringify(commitPrepareAck)).toString(), "hex"),
        sourcePubkey,
      )
    ) {
      await this.Revert(sessionID);
      throw new Error(`${fnTag}, commit prepare ack signature verify failed`);
    }
    commitPrepareAck.serverSignature = commitPrepareAckSignature;
    await this.odapLog(
      {
        phase: "commit-prepare",
        operation: "receive-ack",
        step: sessionData.step.toString(),
        nodes: `${serverIdentityPubkey}->${this.pubKey}`,
      },
      `${sessionID}-${sessionData.step.toString()}`,
    );
    sessionData.step++;
    let fabricDeleteAssetProof = "";
    if (this.fabricApi != undefined) {
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
      fabricDeleteAssetProof = JSON.stringify(receiptDeleteRes.data);
      sessionData.isFabricAssetDeleted = true;
    }
    const commitFinalReq: CommitFinalV1Request = {
      sessionID: sessionID,
      messageType: "urn:ietf:odap:msgtype:commit-final-msg",
      clientIdentityPubkey: req.clientIdentityPubkey,
      serverIdentityPubkey: req.serverIdentityPubkey,
      clientSignature: "",
      hashCommitPrepareAck: commitPrepareAckHash,
      commitFinalClaim: fabricDeleteAssetProof,
    };
    const commitFinalReqSignature = await this.odapGatewaySign(
      JSON.stringify(commitFinalReq),
    );
    commitFinalReq.clientSignature = this.bufArray2HexStr(
      commitFinalReqSignature,
    );
    const commitFinalReqHash = SHA256(
      JSON.stringify(commitFinalReq),
    ).toString();
    await this.odapLog(
      {
        phase: "commit-final",
        operation: "send-req",
        step: sessionData.step.toString(),
        nodes: `${this.pubKey}->${serverIdentityPubkey}`,
      },
      `${sessionID}-${sessionData.step.toString()}`,
    );
    sessionData.step++;
    this.log.info(`${fnTag}, send commit final req, time: ${Date.now()}`);
    const commitFinalRes = await odapServerApiClient.phase3CommitFinalV1(
      commitFinalReq,
    );
    this.log.info(`${fnTag}, receive commit final ack, time: ${Date.now()}`);
    if (commitFinalRes.status != 200) {
      await this.Revert(sessionID);
      throw new Error(`${fnTag}, send commit final failed`);
    }
    const commitFinalAck: CommitFinalV1Response = commitFinalRes.data;
    const commitFinalAckHash = SHA256(
      JSON.stringify(commitFinalAck),
    ).toString();
    if (commitFinalReqHash != commitFinalAck.hashCommitFinal) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, commit final req hash not match from commit final ack`,
      );
    }
    if (
      commitFinalReq.serverIdentityPubkey != commitFinalAck.serverIdentityPubkey
    ) {
      await this.Revert(sessionID);
      throw new Error(
        `${fnTag}, commit final serverIdentity pub key not match from commit final ack`,
      );
    }
    const commitFinalAckSignature = commitFinalAck.serverSignature;

    const commitFinalAckSignatureHex = new Uint8Array(
      Buffer.from(commitFinalAckSignature, "hex"),
    );
    commitFinalAck.serverSignature = "";
    if (
      !secp256k1.ecdsaVerify(
        commitFinalAckSignatureHex,
        Buffer.from(SHA256(JSON.stringify(commitFinalAck)).toString(), "hex"),
        sourcePubkey,
      )
    ) {
      await this.Revert(sessionID);
      throw new Error(`${fnTag}, commit final ack signature verify failed`);
    }
    commitFinalAck.serverSignature = commitFinalAckSignature;
    await this.odapLog(
      {
        phase: "commit-final",
        operation: "receive-ack",
        step: sessionData.step.toString(),
        nodes: `${serverIdentityPubkey}->${this.pubKey}`,
      },
      `${sessionID}-${sessionData.step.toString()}`,
    );
    sessionData.step++;
    const transferCompleteReq: TransferCompleteV1Request = {
      sessionID: sessionID,
      messageType: "urn:ietf:odap:msgtype:commit-transfer-complete-msg",
      clientIdentityPubkey: req.clientIdentityPubkey,
      serverIdentityPubkey: req.serverIdentityPubkey,
      clientSignature: "",
      hashTransferCommence: transferCommenceReqHash,
      hashCommitFinalAck: commitFinalAckHash,
    };
    const transferCompleteReqSignature = await this.odapGatewaySign(
      JSON.stringify(transferCompleteReq),
    );
    transferCompleteReq.clientSignature = this.bufArray2HexStr(
      transferCompleteReqSignature,
    );
    await this.odapLog(
      {
        phase: "transfer-complete",
        operation: "send-req",
        step: sessionData.step.toString(),
        nodes: `${this.pubKey}`,
      },
      `${sessionID}-${sessionData.step.toString()}`,
    );
    sessionData.step++;
    this.sessions.set(sessionID, sessionData);
    this.log.info(`${fnTag}, send transfer complete req, time: ${Date.now()}`);
    await odapServerApiClient.phase3TransferCompleteV1(transferCompleteReq);
    this.log.info(`${fnTag}, receive transfer complete, time: ${Date.now()}`);
    this.log.info(`${fnTag}, complete processing, time: ${Date.now()}`);
  }
}
