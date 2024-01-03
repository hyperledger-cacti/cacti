/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type { Server } from "http";
import type { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import type { Express } from "express";
import { v4 as uuidV4 } from "uuid";
import knex, { Knex } from "knex";
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
  OdapLocalLog,
  RecoverV1Message,
  RecoverUpdateV1Message,
  RecoverUpdateAckV1Message,
  RollbackV1Message,
  RollbackAckV1Message,
} from "../generated/openapi/typescript-axios";
import { CommitFinalRequestEndpointV1 } from "../web-services/server-side/commit-final-request-endpoint";
import { CommitFinalResponseEndpointV1 } from "../web-services/client-side/commit-final-response-endpoint";
import { CommitPreparationResponseEndpointV1 } from "../web-services/client-side/commit-prepare-response-endpoint";
import { LockEvidenceResponseEndpointV1 } from "../web-services/client-side/lock-evidence-response-endpoint";
import { TransferCommenceResponseEndpointV1 } from "../web-services/client-side/transfer-commence-response-endpoint";
import { TransferInitiationResponseEndpointV1 } from "../web-services/client-side/transfer-initiation-response-endpoint";
import { LockEvidenceRequestEndpointV1 } from "../web-services/server-side/lock-evidence-request-endpoint";
import { TransferCommenceRequestEndpointV1 } from "../web-services/server-side/transfer-commence-request-endpoint";
import { TransferCompleteRequestEndpointV1 } from "../web-services/server-side/transfer-complete-request-endpoint";
import { TransferInitiationRequestEndpointV1 } from "../web-services/server-side/transfer-initiation-request-endpoint";
import { CommitPreparationRequestEndpointV1 } from "../web-services/server-side/commite-prepare-request-endpoint";
import { randomInt } from "crypto";
import { ClientGatewayHelper } from "./client/client-helper";
import { ServerGatewayHelper } from "./server/server-helper";
import {
  checkValidRecoverMessage,
  sendRecoverMessage,
} from "./recovery/recover";
import {
  checkValidRecoverUpdateMessage,
  sendRecoverUpdateMessage,
} from "./recovery/recover-update";
import {
  checkValidRecoverUpdateAckMessage,
  sendRecoverUpdateAckMessage,
} from "./recovery/recover-update-ack";
import {
  checkValidRecoverSuccessMessage,
  sendRecoverSuccessMessage,
} from "./recovery/recover-success";
import { SHA256 } from "crypto-js";
import { RecoverMessageEndpointV1 } from "../web-services/recovery/recover-message-endpoint";
import { RecoverUpdateMessageEndpointV1 } from "../web-services/recovery/recover-update-message-endpoint";
import { RecoverUpdateAckMessageEndpointV1 } from "../web-services/recovery/recover-update-ack-message-endpoint";
import { RecoverSuccessMessageEndpointV1 } from "../web-services/recovery/recover-success-message-endpoint";
import { RollbackMessageEndpointV1 } from "../web-services/recovery/rollback-message-endpoint";
import {
  checkValidRollbackMessage,
  sendRollbackMessage,
} from "./recovery/rollback";
import { AxiosResponse } from "axios";
import {
  checkValidRollbackAckMessage,
  sendRollbackAckMessage,
} from "./recovery/rollback-ack";
import { ClientRequestEndpointV1 } from "../web-services/client-side/client-request-endpoint";
import { RollbackAckMessageEndpointV1 } from "../web-services/recovery/rollback-ack-message-endpoint";

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
  CommitFinalResponse = "urn:ietf:odap:msgtype:commit-final-ack-msg",
  TransferCompleteRequest = "urn:ietf:odap:msgtype:commit-transfer-complete-msg",
}

export interface IPluginOdapGatewayConstructorOptions {
  name: string;
  dltIDs: string[];
  instanceId: string;
  keyPair?: IOdapPluginKeyPair;
  backupGatewaysAllowed?: string[];
  ipfsPath?: string;
  clientHelper: ClientGatewayHelper;
  serverHelper: ServerGatewayHelper;
  knexConfig?: Knex.Config;
}
export interface IOdapPluginKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface IOdapLogIPFS {
  key: string;
  hash: string;
  signature: string;
  signerPubKey: string;
}

export abstract class PluginOdapGateway
  implements ICactusPlugin, IPluginWebService
{
  public static readonly CLASS_NAME = "OdapGateway";
  private readonly instanceId: string;
  private readonly _log: Logger;

  private _sessions: Map<string, SessionData>;
  private _pubKey: string;
  private _privKey: string;

  public ipfsApi?: ObjectStoreIpfsApi;

  public database?: Knex;

  private endpoints: IWebServiceEndpoint[] | undefined;
  //map[]object, object refer to a state
  //of a specific comminications
  private _supportedDltIDs: string[];
  private _backupGatewaysAllowed: string[];

  private odapSigner: JsObjectSigner;

  private _clientHelper: ClientGatewayHelper;
  private _serverHelper: ServerGatewayHelper;

  public constructor(options: IPluginOdapGatewayConstructorOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} arg options.instanceId`);
    Checks.nonBlankString(options.instanceId, `${fnTag} options.instanceId`);

    const level = "INFO";
    const label = this.className;
    this._log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = options.instanceId;

    this._supportedDltIDs = options.dltIDs;
    this._sessions = new Map();

    this._backupGatewaysAllowed = options.backupGatewaysAllowed || [];
    const keyPairs = options.keyPair
      ? options.keyPair
      : Secp256k1Keys.generateKeyPairsBuffer();
    this._pubKey = PluginOdapGateway.bufArray2HexStr(keyPairs.publicKey);
    this._privKey = PluginOdapGateway.bufArray2HexStr(keyPairs.privateKey);

    const odapSignerOptions: IJsObjectSignerOptions = {
      privateKey: this._privKey,
      logLevel: "debug",
    };
    this.odapSigner = new JsObjectSigner(odapSignerOptions);

    this._clientHelper = options.clientHelper;
    this._serverHelper = options.serverHelper;

    if (options.ipfsPath != undefined) this.defineIpfsConnection(options);

    this.defineKnexConnection(options.knexConfig);
  }

  public defineKnexConnection(config: Knex.Config | undefined): void {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const configFile = require("../../../../knex/knexfile.ts")[
      process.env.ENVIRONMENT || "development"
    ];

    this.database = knex(config || configFile);
  }

  private defineIpfsConnection(
    options: IPluginOdapGatewayConstructorOptions,
  ): void {
    const config = new Configuration({ basePath: options.ipfsPath });
    const apiClient = new ObjectStoreIpfsApi(config);
    this.ipfsApi = apiClient;
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
    const transferInitiationRequestEndpoint =
      new TransferInitiationRequestEndpointV1({
        gateway: this,
      });
    const transferCommenceRequestEndpoint =
      new TransferCommenceRequestEndpointV1({
        gateway: this,
      });
    const lockEvidenceRequestEndpoint = new LockEvidenceRequestEndpointV1({
      gateway: this,
    });
    const commitPreparationRequestEndpoint =
      new CommitPreparationRequestEndpointV1({
        gateway: this,
      });
    const commitFinalRequestEndpoint = new CommitFinalRequestEndpointV1({
      gateway: this,
    });
    const transferCompleteRequestEndpoint =
      new TransferCompleteRequestEndpointV1({
        gateway: this,
      });

    // Client endpoints
    const clientRequestEndpoint = new ClientRequestEndpointV1({
      gateway: this,
    });
    const transferInitiationResponseEndpoint =
      new TransferInitiationResponseEndpointV1({
        gateway: this,
      });
    const transferCommenceResponseEndpoint =
      new TransferCommenceResponseEndpointV1({
        gateway: this,
      });
    const lockEvidenceResponseEndpoint = new LockEvidenceResponseEndpointV1({
      gateway: this,
    });
    const commitPreparationResponseEndpoint =
      new CommitPreparationResponseEndpointV1({
        gateway: this,
      });
    const commitFinalResponseEndpoint = new CommitFinalResponseEndpointV1({
      gateway: this,
    });

    // Recovery endpoints
    const recoverEndpoint = new RecoverMessageEndpointV1({
      gateway: this,
    });

    const recoverUpdateEndpoint = new RecoverUpdateMessageEndpointV1({
      gateway: this,
    });

    const recoverUpdateAckEndpoint = new RecoverUpdateAckMessageEndpointV1({
      gateway: this,
    });

    const recoverSuccessEndpoint = new RecoverSuccessMessageEndpointV1({
      gateway: this,
    });

    const rollbackEndpoint = new RollbackMessageEndpointV1({
      gateway: this,
    });

    const rollbackAckEndpoint = new RollbackAckMessageEndpointV1({
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
      recoverEndpoint,
      recoverUpdateEndpoint,
      recoverUpdateAckEndpoint,
      recoverSuccessEndpoint,
      rollbackEndpoint,
      rollbackAckEndpoint,
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
    return "@hyperledger/cactus-odap-gateway-business-logic-plugin";
  }

  public get sessions(): Map<string, SessionData> {
    return this._sessions;
  }

  public get privKey(): string {
    return this._privKey;
  }

  public get pubKey(): string {
    return this._pubKey;
  }

  public get supportedDltIDs(): string[] {
    return this._supportedDltIDs;
  }

  public get backupGatewaysAllowed(): string[] {
    return this._backupGatewaysAllowed;
  }

  public get clientHelper(): ClientGatewayHelper {
    return this._clientHelper;
  }

  public get serverHelper(): ServerGatewayHelper {
    return this._serverHelper;
  }

  public get log(): Logger {
    return this._log;
  }

  getDatabaseInstance(): Knex.QueryBuilder {
    const fnTag = `${this.className}#getDatabaseInstance()`;

    if (this.database == undefined) {
      throw new Error(`${fnTag}, database is undefined`);
    }

    return this.database("logs");
  }

  isClientGateway(sessionID: string): boolean {
    const fnTag = `${this.className}#isClientGateway()`;

    const sessionData = this.sessions.get(sessionID);

    if (sessionData == undefined) {
      throw new Error(`${fnTag}, session data is undefined`);
    }

    return sessionData.sourceGatewayPubkey == this.pubKey;
  }

  sign(msg: string): Uint8Array {
    return this.odapSigner.sign(msg);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verifySignature(obj: any, pubKey: string): boolean {
    const sourceSignature = new Uint8Array(Buffer.from(obj.signature, "hex"));
    const sourcePubkey = new Uint8Array(Buffer.from(pubKey, "hex"));

    const signature = obj.signature;
    obj.signature = "";
    if (
      !this.odapSigner.verify(
        JSON.stringify(obj),
        sourceSignature,
        sourcePubkey,
      )
    ) {
      return false;
    }

    obj.signature = signature;
    return true;
  }

  static bufArray2HexStr(array: Uint8Array): string {
    return Buffer.from(array).toString("hex");
  }

  static getOdapLogKey(
    sessionID: string,
    type: string,
    operation: string,
  ): string {
    return `${sessionID}-${type}-${operation}`;
  }

  async recoverOpenSessions(remote: boolean) {
    const fnTag = `${this.className}#recoverOpenSessions()`;

    this.log.info(`${fnTag}, recovering open sessions...`);

    if (this.database == undefined) {
      throw new Error(`${fnTag}, database is undefined`);
    }

    const logs: OdapLocalLog[] = await this.getDatabaseInstance()
      .select(
        this.database.raw(
          "sessionId, key, data, type, operation, MAX(timestamp) as timestamp",
        ),
      )
      .whereNot({ type: "proof" })
      .groupBy("sessionID");

    for (const log of logs) {
      const sessionID = log.sessionID;
      this.log.info(`${fnTag}, recovering session ${sessionID}...`);

      if (log == undefined || log.data == undefined) {
        throw new Error(`${fnTag}, invalid log}`);
      }

      const sessionData: SessionData = JSON.parse(log.data);

      sessionData.lastLogEntryTimestamp = log.timestamp;

      let amIBackup = false;
      if (
        this.pubKey != sessionData.sourceGatewayPubkey &&
        this.pubKey != sessionData.recipientGatewayPubkey
      ) {
        // this is a backup gateway -> for now we assume backup gateways only on the client side
        sessionData.sourceGatewayPubkey = this.pubKey;
        amIBackup = true;
      }

      this.sessions.set(sessionID, sessionData);
      if (remote) await sendRecoverMessage(sessionID, this, amIBackup, true);
    }
  }

  async storeInDatabase(odapLocalLog: OdapLocalLog) {
    const fnTag = `${this.className}#storeInDatabase()`;
    this.log.info(
      `${fnTag}, Storing locally log: ${JSON.stringify(odapLocalLog)}`,
    );

    await this.getDatabaseInstance().insert(odapLocalLog);
  }

  async storeInIPFS(key: string, hash: string) {
    const fnTag = `${this.className}#storeInIPFS()`;

    if (this.ipfsApi == undefined) return;

    const ipfsLog: IOdapLogIPFS = {
      key: key,
      hash: hash,
      signature: "",
      signerPubKey: this.pubKey,
    };

    ipfsLog.signature = PluginOdapGateway.bufArray2HexStr(
      await this.sign(JSON.stringify(ipfsLog)),
    );

    const logBase64 = Buffer.from(JSON.stringify(ipfsLog)).toString("base64");

    this.log.info(`${fnTag}, Storing in ipfs log: ${JSON.stringify(ipfsLog)}`);

    const response = await this.ipfsApi.setObjectV1({
      key: key,
      value: logBase64,
    });

    if (response.status < 200 && response.status > 299) {
      throw new Error(`${fnTag}, error when logging to ipfs`);
    }
  }

  async storeOdapLog(odapLocalLog: OdapLocalLog): Promise<void> {
    if (this.ipfsApi == undefined) return;

    odapLocalLog.key = PluginOdapGateway.getOdapLogKey(
      odapLocalLog.sessionID,
      odapLocalLog.type,
      odapLocalLog.operation,
    );
    odapLocalLog.timestamp = Date.now().toString();

    await this.storeInDatabase(odapLocalLog);

    // Keep the order consistent with the order of the fields in the table
    // so that the hash matches when retrieving from the database
    const hash = SHA256(
      JSON.stringify(odapLocalLog, [
        "sessionID",
        "type",
        "key",
        "operation",
        "timestamp",
        "data",
      ]),
    ).toString();

    await this.storeInIPFS(odapLocalLog.key, hash);
  }

  async storeOdapProof(odapLocalLog: OdapLocalLog): Promise<void> {
    if (this.ipfsApi == undefined || odapLocalLog.data == undefined) return;

    odapLocalLog.key = PluginOdapGateway.getOdapLogKey(
      odapLocalLog.sessionID,
      odapLocalLog.type,
      odapLocalLog.operation,
    );
    odapLocalLog.timestamp = Date.now().toString();

    await this.storeInDatabase(odapLocalLog);

    const hash = SHA256(odapLocalLog.data).toString();

    await this.storeInIPFS(odapLocalLog.key, hash);
  }

  async getLogFromDatabase(logKey: string): Promise<OdapLocalLog | undefined> {
    const fnTag = `${this.className}#getLogFromDatabase()`;
    this.log.info(`${fnTag}, retrieving log with key ${logKey}`);

    return await this.getDatabaseInstance()
      .where({ key: logKey })
      .first()
      .then((row) => {
        this.log.info(`${fnTag}, retrieved log ${JSON.stringify(row)}`);

        return row;
      });
  }

  async getLastLogFromDatabase(
    sessionID: string,
  ): Promise<OdapLocalLog | undefined> {
    const fnTag = `${this.className}#getLastLog()`;
    this.log.info(`${fnTag}, retrieving last log from sessionID ${sessionID}`);

    return await this.getDatabaseInstance()
      .orderBy("timestamp", "desc")
      .where({ sessionID: sessionID })
      .first()
      .then((row) => {
        this.log.info(`${fnTag}, retrieved log ${JSON.stringify(row)}`);

        return row;
      });
  }

  async getLogsMoreRecentThanTimestamp(
    timestamp: string,
  ): Promise<OdapLocalLog[]> {
    const fnTag = `${this.className}#getLogsMoreRecentThanTimestamp()`;
    this.log.info(`${fnTag}, retrieving logs more recent than ${timestamp}`);

    const logs: OdapLocalLog[] = await this.getDatabaseInstance()
      .where("timestamp", ">", timestamp)
      .whereNot("type", "like", "%proof%");

    if (logs == undefined) {
      throw new Error(`${fnTag}, error when retrieving log from database`);
    }

    this.log.info(`${fnTag}, there are ${logs.length} more recent logs`);

    return logs;
  }

  async getLogFromIPFS(logKey: string): Promise<IOdapLogIPFS> {
    const fnTag = `${this.className}#getOdapLogFromIPFS()`;
    this.log.info(`Retrieving log with key: <${logKey}>`);

    if (this.ipfsApi == undefined) {
      throw new Error(`${fnTag}, ipfs is not defined`);
    }

    const response = await this.ipfsApi.getObjectV1({
      key: logKey,
    });

    if (response.status < 200 && response.status > 299) {
      throw new Error(`${fnTag}, error when logging to ipfs`);
    }

    const log: IOdapLogIPFS = JSON.parse(
      Buffer.from(response.data.value, "base64").toString(),
    );

    if (log == undefined || log.signature == undefined) {
      throw new Error(`${fnTag}, the log or its signature is not defined`);
    }

    if (!this.verifySignature(log, log.signerPubKey)) {
      throw new Error(`${fnTag}, received log with invalid signature`);
    }

    return log;
  }

  static getOdapAPI(basePath: string): OdapApi {
    const odapServerApiConfig = new Configuration({
      basePath: basePath,
    });

    return new OdapApi(odapServerApiConfig);
  }

  async deleteDatabaseEntries(sessionID: string) {
    this.log.info(
      `deleting logs from database associated with sessionID: ${sessionID}`,
    );

    await this.getDatabaseInstance().where({ sessionID: sessionID }).del();
  }

  async resumeOdapSession(sessionID: string, remote: boolean) {
    const fnTag = `${this.className}#continueOdapSession()`;
    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.lastSequenceNumber == undefined
    ) {
      throw new Error(`${fnTag}, session data is undefined`);
    }

    // if the other gateway made the rollback, we will do it as well
    if (sessionData.rollback) {
      await this.rollback(sessionID);
      await sendRollbackAckMessage(sessionID, this, true);
      return;
    }

    this.log.info(
      `${fnTag}, recovering session ${sessionID} that was in step ${sessionData.step}`,
    );

    // If step is even then the last log was inserted by the server
    // so we need to increase the step
    if (this.isClientGateway(sessionID) && sessionData.step % 2 == 0) {
      sessionData.step++;
    }

    this.sessions.set(sessionID, sessionData);

    switch (sessionData.step) {
      case 1:
        return await this.clientHelper.sendTransferInitializationRequest(
          sessionID,
          this,
          remote,
        );

      case 2:
        return await this.serverHelper.sendTransferInitializationResponse(
          sessionID,
          this,
          remote,
        );

      case 3:
        return await this.clientHelper.sendTransferCommenceRequest(
          sessionID,
          this,
          remote,
        );

      case 4:
        return await this.serverHelper.sendTransferCommenceResponse(
          sessionID,
          this,
          remote,
        );

      case 5:
        return await this.clientHelper.sendLockEvidenceRequest(
          sessionID,
          this,
          remote,
        );

      case 6:
        return await this.serverHelper.sendLockEvidenceResponse(
          sessionID,
          this,
          remote,
        );

      case 7:
        return await this.clientHelper.sendCommitPreparationRequest(
          sessionID,
          this,
          remote,
        );

      case 8:
        return await this.serverHelper.sendCommitPreparationResponse(
          sessionID,
          this,
          remote,
        );

      case 9:
        return await this.clientHelper.sendCommitFinalRequest(
          sessionID,
          this,
          remote,
        );

      case 10:
        return await this.serverHelper.sendCommitFinalResponse(
          sessionID,
          this,
          remote,
        );

      case 11:
        return await this.clientHelper.sendTransferCompleteRequest(
          sessionID,
          this,
          remote,
        );

      default:
        this.sessions.delete(sessionID);
        throw new Error(
          `${fnTag}, invalid session data step. A new session should be initiated by the client gateway.`,
        );
    }
  }

  private updateLastMessageReceivedTimestamp(sessionID: string) {
    const fnTag = `${this.className}#updateLastMessageReceivedTimestamp()`;
    const sessionData = this.sessions.get(sessionID);

    if (sessionData == undefined) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    sessionData.lastMessageReceivedTimestamp = new Date().toString();
    this.sessions.set(sessionID, sessionData);
  }

  /********************************/
  /*         Server-side          */
  /********************************/

  async onTransferInitiationRequestReceived(
    request: TransferInitializationV1Request,
  ): Promise<void> {
    const fnTag = `${this.className}#onTransferInitiationRequestReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `server gateway received TransferInitializationRequest: ${JSON.stringify(
        request,
      )}`,
    );

    await this.serverHelper.checkValidInitializationRequest(request, this);
    await this.serverHelper.sendTransferInitializationResponse(
      request.sessionID,
      this,
      true,
    );
  }

  async onTransferCommenceRequestReceived(
    request: TransferCommenceV1Request,
  ): Promise<void> {
    const fnTag = `${this.className}#onTransferCommenceRequestReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `server gateway received TransferCommenceRequest: ${JSON.stringify(
        request,
      )}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await this.serverHelper.checkValidtransferCommenceRequest(request, this);
    await this.serverHelper.sendTransferCommenceResponse(
      request.sessionID,
      this,
      true,
    );
  }

  async onLockEvidenceRequestReceived(
    request: LockEvidenceV1Request,
  ): Promise<void> {
    const fnTag = `${this.className}#onLockEvidenceRequestReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `server gateway received LockEvidenceRequest: ${JSON.stringify(request)}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await this.serverHelper.checkValidLockEvidenceRequest(request, this);
    await this.serverHelper.sendLockEvidenceResponse(
      request.sessionID,
      this,
      true,
    );
  }

  async onCommitPrepareRequestReceived(
    request: CommitPreparationV1Request,
  ): Promise<void> {
    const fnTag = `${this.className}#onCommitPrepareRequestReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `server gateway received CommitPrepareRequest: ${JSON.stringify(
        request,
      )}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await this.serverHelper.checkValidCommitPreparationRequest(request, this);
    await this.serverHelper.sendCommitPreparationResponse(
      request.sessionID,
      this,
      true,
    );
  }

  async onCommitFinalRequestReceived(
    request: CommitFinalV1Request,
  ): Promise<void> {
    const fnTag = `${this.className}#onCommitFinalRequestReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `server gateway received CommitFinalRequest: ${JSON.stringify(request)}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await this.serverHelper.checkValidCommitFinalRequest(request, this);
    await this.createAsset(request.sessionID);
    await this.serverHelper.sendCommitFinalResponse(
      request.sessionID,
      this,
      true,
    );
  }

  async onTransferCompleteRequestReceived(
    request: TransferCompleteV1Request,
  ): Promise<void> {
    const fnTag = `${this.className}#onTransferCompleteRequestReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `server gateway received TransferCompleteRequest: ${JSON.stringify(
        request,
      )}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await this.serverHelper.checkValidTransferCompleteRequest(request, this);
    //this.deleteDatabaseEntries(request.sessionID);
  }

  /********************************/
  /*         Client-side          */
  /********************************/

  async onTransferInitiationResponseReceived(
    request: TransferInitializationV1Response,
  ): Promise<void> {
    const fnTag = `${this.className}#onTransferInitiationResponseReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `client gateway received TransferInitiationResponse: ${JSON.stringify(
        request,
      )}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await this.clientHelper.checkValidInitializationResponse(request, this);
    await this.clientHelper.sendTransferCommenceRequest(
      request.sessionID,
      this,
      true,
    );
  }

  async onTransferCommenceResponseReceived(
    request: TransferCommenceV1Response,
  ): Promise<void> {
    const fnTag = `${this.className}#onTransferCommenceResponseReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `client gateway received TransferCommenceResponse: ${JSON.stringify(
        request,
      )}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await this.clientHelper.checkValidTransferCommenceResponse(request, this);
    await this.lockAsset(request.sessionID);
    await this.clientHelper.sendLockEvidenceRequest(
      request.sessionID,
      this,
      true,
    );
  }

  async onLockEvidenceResponseReceived(
    request: LockEvidenceV1Response,
  ): Promise<void> {
    const fnTag = `${this.className}#onLockEvidenceResponseReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `client gateway received LockEvidenceResponse: ${JSON.stringify(
        request,
      )}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await this.clientHelper.checkValidLockEvidenceResponse(request, this);
    await this.clientHelper.sendCommitPreparationRequest(
      request.sessionID,
      this,
      true,
    );
  }

  async onCommitPrepareResponseReceived(
    request: CommitPreparationV1Response,
  ): Promise<void> {
    const fnTag = `${this.className}#onCommitPrepareResponseReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await this.clientHelper.checkValidCommitPreparationResponse(request, this);
    await this.deleteAsset(request.sessionID);
    await this.clientHelper.sendCommitFinalRequest(
      request.sessionID,
      this,
      true,
    );
  }

  async onCommitFinalResponseReceived(
    request: CommitFinalV1Response,
  ): Promise<void> {
    const fnTag = `${this.className}#onCommitFinalResponseReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `client gateway received CommitFinalResponse: ${JSON.stringify(request)}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await this.clientHelper.checkValidCommitFinalResponse(request, this);
    await this.clientHelper.sendTransferCompleteRequest(
      request.sessionID,
      this,
      true,
    );
  }

  /********************************/
  /*           Recovery           */
  /********************************/

  async onRecoverMessageReceived(request: RecoverV1Message): Promise<void> {
    const fnTag = `${this.className}#onRecoverMessageReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `gateway received Recover message: ${JSON.stringify(request)}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await checkValidRecoverMessage(request, this);
    await sendRecoverUpdateMessage(request.sessionID, this, true);
  }

  async onRecoverUpdateMessageReceived(
    request: RecoverUpdateV1Message,
  ): Promise<void> {
    const fnTag = `${this.className}#onRecoverUpdateMessageReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `gateway received RecoverUpdate message: ${JSON.stringify(request)}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await checkValidRecoverUpdateMessage(request, this);
    await sendRecoverUpdateAckMessage(request.sessionID, this, true);
  }

  async onRecoverUpdateAckMessageReceived(
    request: RecoverUpdateAckV1Message,
  ): Promise<void> {
    const fnTag = `${this.className}#onRecoverUpdateAckMessageReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `gateway received RecoverUpdateAck message: ${JSON.stringify(request)}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await checkValidRecoverUpdateAckMessage(request, this);
    await sendRecoverSuccessMessage(request.sessionID, this, true);
  }

  async onRecoverSuccessMessageReceived(
    request: RecoverUpdateAckV1Message,
  ): Promise<void> {
    const fnTag = `${this.className}#onRecoverSuccessMessageReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `gateway received RecoverSuccess message: ${JSON.stringify(request)}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await checkValidRecoverSuccessMessage(request, this);
    await this.resumeOdapSession(request.sessionID, true);
  }

  async onRollbackMessageReceived(request: RollbackV1Message): Promise<void> {
    const fnTag = `${this.className}#onRollbackMessageReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `gateway received Rollback message: ${JSON.stringify(request)}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await checkValidRollbackMessage(request, this);
    await this.rollback(request.sessionID);
    await sendRollbackAckMessage(request.sessionID, this, true);
  }

  async onRollbackAckMessageReceived(
    request: RollbackAckV1Message,
  ): Promise<void> {
    const fnTag = `${this.className}#onRollbackAckMessageReceived()`;
    this.log.info(`${fnTag}, start processing, time: ${Date.now()}`);
    this.log.info(
      `gateway received Rollback Ack message: ${JSON.stringify(request)}`,
    );

    this.updateLastMessageReceivedTimestamp(request.sessionID);
    await checkValidRollbackAckMessage(request, this);
    //this.deleteDatabaseEntries(request.sessionID);
  }

  async runOdap(request: ClientV1Request): Promise<void> {
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

    await this.clientHelper.sendTransferInitializationRequest(
      sessionID,
      this,
      true,
    );
  }

  configureOdapSession(request: ClientV1Request) {
    const sessionData: SessionData = {};

    const sessionID = uuidV4();

    sessionData.id = sessionID;
    sessionData.step = 1;
    sessionData.version = request.version;
    sessionData.lastSequenceNumber = randomInt(4294967295);

    sessionData.sourceBasePath = request.clientGatewayConfiguration.apiHost;
    sessionData.recipientBasePath = request.serverGatewayConfiguration.apiHost;

    sessionData.allowedSourceBackupGateways = this.backupGatewaysAllowed;
    sessionData.allowedRecipientBackupGateways = [];

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
    sessionData.rollbackActionsPerformed = [];
    sessionData.rollbackProofs = [];
    sessionData.lastMessageReceivedTimestamp = Date.now().toString();

    sessionData.sourceLedgerAssetID = request.sourceLedgerAssetID;
    sessionData.recipientLedgerAssetID = request.recipientLedgerAssetID;

    sessionData.maxRetries = request.maxRetries;
    sessionData.maxTimeout = request.maxTimeout;

    this.sessions.set(sessionID, sessionData);

    return sessionID;
  }

  // we don't need a `lockAssetToRollback` method because we would never call
  // that function in a rollback
  abstract lockAsset(sessionID: string, assetID?: string): Promise<string>;

  // we don't need a `unlockAssetToRollback` method because we only call this
  // function to rollback, thus the implementation would be the same
  abstract unlockAsset(sessionID: string, assetID?: string): Promise<string>;

  abstract createAsset(sessionID: string, assetID?: string): Promise<string>;
  abstract createAssetToRollback(
    sessionID: string,
    assetID?: string,
  ): Promise<string>;
  abstract deleteAsset(sessionID: string, assetID?: string): Promise<string>;
  abstract deleteAssetToRollback(
    sessionID: string,
    assetID?: string,
  ): Promise<string>;

  async Revert(sessionID: string): Promise<void> {
    await this.rollback(sessionID);
    await sendRollbackMessage(sessionID, this, true);
  }

  abstract rollback(sessionID: string): Promise<void>;

  async makeRequest(
    sessionID: string,
    request: Promise<AxiosResponse>,
    message: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const fnTag = `${this.className}#makeRequest()`;

    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.maxTimeout == undefined ||
      sessionData.maxRetries == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    let numberOfTries = 0;
    let response = undefined;

    while (numberOfTries < sessionData.maxRetries) {
      response = await request.catch(async (err) => {
        if (err.response == undefined || err.response.status == 500) {
          if (!message.match("Rollback")) {
            await this.Revert(sessionID);
            throw new Error(`${fnTag}, ${message} message failed. ${err}`);
          }
        }
        this.log.info(`${fnTag}, ${message} message failed. Trying again...`);
        numberOfTries++;
      });

      if (response != void 0) break;
    }

    if (response != void 0 && response.status == 200) {
      return;
    }

    // When rolling back there is no problem of not receiving an answer
    if (!message.match("Rollback")) {
      this.log.info(
        `${fnTag}, ${message} message was not sent. Initiating time...`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, sessionData.maxTimeout),
      ).then(async () => {
        // we check if a message was received, otherwise we have a timeout and rollback
        const sessionData = this.sessions.get(sessionID);

        if (
          sessionData == undefined ||
          sessionData.lastMessageReceivedTimestamp == undefined ||
          sessionData.maxTimeout == undefined
        ) {
          throw new Error(
            `${fnTag}, session data is not correctly initialized`,
          );
        }

        const now = new Date().getTime();
        const last = parseInt(sessionData.lastMessageReceivedTimestamp);
        const differenceOfTime = now - last;

        if (differenceOfTime > sessionData.maxTimeout) {
          this.log.info(`${fnTag}, no response received, rolling back`);
          await this.Revert(sessionID);
          throw new Error(
            `${fnTag}, ${message} message failed. Timeout exceeded. Check connection with server gateway.`,
          );
        }

        this.log.info(`${fnTag}, a response was received`);
        return;
      });
    }

    return response;
  }
}
