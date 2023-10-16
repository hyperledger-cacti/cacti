import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SHA256 } from "crypto-js";
import {
  TransferInitializationV1Response,
  TransferInitializationV1Request,
  SessionData,
  TransferCommenceV1Response,
  TransferCommenceV1Request,
  LockEvidenceV1Response,
  LockEvidenceV1Request,
  CommitPreparationV1Response,
  CommitPreparationV1Request,
  CommitFinalV1Response,
  CommitFinalV1Request,
  TransferCompleteV1Request,
} from "../../public-api";
import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";

export class ServerGatewayHelper {
  public static readonly CLASS_NAME: string = "ServerGatewayHelper";
  private _log: Logger;

  constructor() {
    const level = "INFO";
    const label = ServerGatewayHelper.CLASS_NAME;
    this._log = LoggerProvider.getOrCreate({ level, label });
  }

  public static get className(): string {
    return ServerGatewayHelper.CLASS_NAME;
  }

  public get log(): Logger {
    return this._log;
  }

  async sendTransferInitializationResponse(
    sessionID: string,
    odap: PluginOdapGateway,
    remote: boolean,
  ): Promise<void | TransferInitializationV1Response> {
    const fnTag = `${odap.className}#sendTransferInitiationResponse()`;

    const sessionData = odap.sessions.get(sessionID);
    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.maxTimeout == undefined ||
      sessionData.maxRetries == undefined ||
      sessionData.sourceBasePath == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.initializationRequestMessageHash == undefined ||
      sessionData.initializationRequestMessageRcvTimeStamp == undefined ||
      sessionData.initializationRequestMessageProcessedTimeStamp == undefined
    ) {
      throw new Error(`${fnTag}, session data is undefined`);
    }

    const transferInitializationResponse: TransferInitializationV1Response = {
      messageType: OdapMessageType.InitializationResponse,
      sessionID: sessionID,
      initialRequestMessageHash: sessionData.initializationRequestMessageHash,
      timeStamp: sessionData.initializationRequestMessageRcvTimeStamp,
      processedTimeStamp:
        sessionData.initializationRequestMessageProcessedTimeStamp,
      serverIdentityPubkey: odap.pubKey,
      sequenceNumber: sessionData.lastSequenceNumber,
      signature: "",
      backupGatewaysAllowed: odap.backupGatewaysAllowed,
    };

    transferInitializationResponse.signature =
      PluginOdapGateway.bufArray2HexStr(
        odap.sign(JSON.stringify(transferInitializationResponse)),
      );

    sessionData.initializationResponseMessageHash = SHA256(
      JSON.stringify(transferInitializationResponse),
    ).toString();

    sessionData.serverSignatureInitializationResponseMessage =
      transferInitializationResponse.signature;

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "ack",
      operation: "validate",
      data: JSON.stringify(sessionData),
    });

    odap.sessions.set(sessionID, sessionData);

    this.log.info(`${fnTag}, sending TransferInitializationResponse...`);

    if (!remote) {
      return transferInitializationResponse;
    }

    await odap.makeRequest(
      sessionID,
      PluginOdapGateway.getOdapAPI(
        sessionData.sourceBasePath,
      ).phase1TransferInitiationResponseV1(transferInitializationResponse),
      "TransferInitializationResponse",
    );
  }

  async checkValidInitializationRequest(
    request: TransferInitializationV1Request,
    odap: PluginOdapGateway,
  ): Promise<void> {
    const fnTag = `${odap.className}#checkValidInitializationRequest()`;

    const sessionData: SessionData = {};
    const recvTimestamp: string = Date.now().toString();
    const sessionID = request.sessionID;

    sessionData.id = sessionID;
    sessionData.step = 2;
    sessionData.initializationRequestMessageRcvTimeStamp = recvTimestamp;

    odap.sessions.set(sessionID, sessionData);

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "exec",
      operation: "validate",
      data: JSON.stringify(sessionData),
    });

    if (request.messageType != OdapMessageType.InitializationRequest) {
      throw new Error(
        `${fnTag}, wrong message type for TransferInitializationRequest`,
      );
    }

    if (!odap.verifySignature(request, request.sourceGatewayPubkey)) {
      throw new Error(
        `${fnTag}, TransferInitializationRequest message signature verification failed`,
      );
    }

    if (!odap.supportedDltIDs.includes(request.sourceGatewayDltSystem)) {
      throw new Error(
        `${fnTag}, source gateway dlt system is not supported by this gateway`,
      );
    }

    const expiryDate: string =
      request.payloadProfile.assetProfile.expirationDate;
    const isDataExpired: boolean = new Date() >= new Date(expiryDate);
    if (isDataExpired) {
      throw new Error(`${fnTag}, asset has expired`);
    }

    sessionData.version = request.version;
    sessionData.maxRetries = request.maxRetries;
    sessionData.maxTimeout = request.maxTimeout;

    sessionData.allowedSourceBackupGateways = request.backupGatewaysAllowed;
    sessionData.allowedRecipientBackupGateways = odap.backupGatewaysAllowed;

    sessionData.sourceBasePath = request.sourceBasePath;
    sessionData.recipientBasePath = request.recipientBasePath;
    sessionData.lastSequenceNumber = request.sequenceNumber;
    sessionData.loggingProfile = request.loggingProfile;
    sessionData.accessControlProfile = request.accessControlProfile;
    sessionData.payloadProfile = request.payloadProfile;
    sessionData.applicationProfile = request.applicationProfile;
    sessionData.assetProfile = request.payloadProfile.assetProfile;
    sessionData.sourceGatewayPubkey = request.sourceGatewayPubkey;
    sessionData.sourceGatewayDltSystem = request.sourceGatewayDltSystem;
    sessionData.recipientGatewayPubkey = request.recipientGatewayPubkey;
    sessionData.recipientGatewayDltSystem = request.recipientGatewayDltSystem;
    sessionData.rollbackActionsPerformed = [];
    sessionData.rollbackProofs = [];
    sessionData.lastMessageReceivedTimestamp = new Date().toString();
    sessionData.recipientLedgerAssetID = request.recipientLedgerAssetID;
    sessionData.sourceLedgerAssetID = request.sourceLedgerAssetID;

    sessionData.initializationRequestMessageHash = SHA256(
      JSON.stringify(request),
    ).toString();

    sessionData.clientSignatureInitializationRequestMessage = request.signature;

    sessionData.initializationRequestMessageProcessedTimeStamp =
      Date.now().toString();

    odap.sessions.set(request.sessionID, sessionData);

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "done",
      operation: "validate",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`TransferInitializationRequest passed all checks.`);
  }

  async sendTransferCommenceResponse(
    sessionID: string,
    odap: PluginOdapGateway,
    remote: boolean,
  ): Promise<void | TransferCommenceV1Response> {
    const fnTag = `${odap.className}#sendTransferCommenceResponse()`;

    const sessionData = odap.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.maxTimeout == undefined ||
      sessionData.maxRetries == undefined ||
      sessionData.sourceBasePath == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.transferCommenceMessageRequestHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is undefined`);
    }

    const transferCommenceResponse: TransferCommenceV1Response = {
      sessionID: sessionID,
      messageType: OdapMessageType.TransferCommenceResponse,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      hashCommenceRequest: sessionData.transferCommenceMessageRequestHash,
      // serverTransferNumber??
      signature: "",
      sequenceNumber: ++sessionData.lastSequenceNumber,
    };

    transferCommenceResponse.signature = PluginOdapGateway.bufArray2HexStr(
      odap.sign(JSON.stringify(transferCommenceResponse)),
    );

    sessionData.transferCommenceMessageResponseHash = SHA256(
      JSON.stringify(transferCommenceResponse),
    ).toString();

    sessionData.serverSignatureTransferCommenceResponseMessage =
      transferCommenceResponse.signature;

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "ack",
      operation: "commence",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending TransferCommenceResponse...`);

    if (!remote) {
      return transferCommenceResponse;
    }

    await odap.makeRequest(
      sessionID,
      PluginOdapGateway.getOdapAPI(
        sessionData.sourceBasePath,
      ).phase2TransferCommenceResponseV1(transferCommenceResponse),
      "TransferCommenceResponse",
    );
  }

  async checkValidtransferCommenceRequest(
    request: TransferCommenceV1Request,
    odap: PluginOdapGateway,
  ): Promise<void> {
    const fnTag = `${odap.className}#checkValidtransferCommenceRequest()`;

    const sessionID = request.sessionID;
    const sessionData = odap.sessions.get(sessionID);
    if (
      sessionData == undefined ||
      sessionData.lastSequenceNumber == undefined
    ) {
      throw new Error(
        `${fnTag}, session Id does not correspond to any open session`,
      );
    }

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "exec",
      operation: "commence",
      data: JSON.stringify(sessionData),
    });

    if (request.messageType != OdapMessageType.TransferCommenceRequest) {
      throw new Error(
        `${fnTag}, wrong message type for TransferCommenceRequest`,
      );
    }

    if (request.sequenceNumber != sessionData.lastSequenceNumber + 1) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest sequence number incorrect`,
      );
    }

    if (
      sessionData.initializationResponseMessageHash != request.hashPrevMessage
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest previous message hash does not match the one that was sent`,
      );
    }

    if (sessionData.recipientGatewayPubkey != request.serverIdentityPubkey) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest serverIdentity public key does not match the one that was sent`,
      );
    }

    if (sessionData.sourceGatewayPubkey != request.clientIdentityPubkey) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest clientIdentity public key does not match the one that was sent`,
      );
    }

    const assetProfileHash = SHA256(
      JSON.stringify(sessionData.assetProfile),
    ).toString();
    if (assetProfileHash !== request.hashAssetProfile) {
      throw new Error(`${fnTag}, assetProfile hash not match`);
    }

    if (!odap.verifySignature(request, request.clientIdentityPubkey)) {
      throw new Error(
        `${fnTag}, TransferCommenceRequest message signature verification failed`,
      );
    }

    sessionData.transferCommenceMessageRequestHash = SHA256(
      JSON.stringify(request),
    ).toString();

    sessionData.clientSignatureTransferCommenceRequestMessage =
      request.signature;

    sessionData.originatorPubkey = request.originatorPubkey;
    sessionData.beneficiaryPubkey = request.beneficiaryPubkey;

    odap.sessions.set(request.sessionID, sessionData);

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "done",
      operation: "commence",
      data: JSON.stringify(sessionData),
    });

    sessionData.step = 4;
    odap.sessions.set(sessionID, sessionData);

    this.log.info(`TransferCommenceRequest passed all checks.`);
  }

  async sendLockEvidenceResponse(
    sessionID: string,
    odap: PluginOdapGateway,
    remote: boolean,
  ): Promise<void | LockEvidenceV1Response> {
    const fnTag = `${odap.className}#sendLockEvidenceResponse()`;

    const sessionData = odap.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.maxTimeout == undefined ||
      sessionData.maxRetries == undefined ||
      sessionData.sourceBasePath == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.lockEvidenceRequestMessageHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is undefined`);
    }

    const lockEvidenceResponseMessage: LockEvidenceV1Response = {
      sessionID: sessionID,
      messageType: OdapMessageType.LockEvidenceResponse,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      hashLockEvidenceRequest: sessionData.lockEvidenceRequestMessageHash,
      // server transfer number
      signature: "",
      sequenceNumber: ++sessionData.lastSequenceNumber,
    };

    lockEvidenceResponseMessage.signature = PluginOdapGateway.bufArray2HexStr(
      await odap.sign(JSON.stringify(lockEvidenceResponseMessage)),
    );

    sessionData.lockEvidenceResponseMessageHash = SHA256(
      JSON.stringify(lockEvidenceResponseMessage),
    ).toString();

    sessionData.serverSignatureLockEvidenceResponseMessage =
      lockEvidenceResponseMessage.signature;

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "ack",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending LockEvidenceResponse...`);

    if (!remote) {
      return lockEvidenceResponseMessage;
    }

    await odap.makeRequest(
      sessionID,
      PluginOdapGateway.getOdapAPI(
        sessionData.sourceBasePath,
      ).phase2LockEvidenceResponseV1(lockEvidenceResponseMessage),
      "LockEvidenceResponse",
    );
  }

  async checkValidLockEvidenceRequest(
    request: LockEvidenceV1Request,
    odap: PluginOdapGateway,
  ): Promise<void> {
    const fnTag = `${odap.className}#checkValidLockEvidenceRequest()`;

    const sessionID = request.sessionID;
    const sessionData = odap.sessions.get(sessionID);
    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.lastSequenceNumber == undefined
    ) {
      throw new Error(
        `${fnTag}, session Id does not correspond to any open session`,
      );
    }

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "exec",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });

    if (request.messageType != OdapMessageType.LockEvidenceRequest) {
      throw new Error(`${fnTag}, wrong message type for LockEvidenceRequest`);
    }

    if (request.sequenceNumber != sessionData.lastSequenceNumber + 1) {
      throw new Error(
        `${fnTag}, LockEvidenceRequestMessage sequence number incorrect`,
      );
    }

    if (
      sessionData.transferCommenceMessageResponseHash !=
      request.hashCommenceAckRequest
    ) {
      throw new Error(
        `${fnTag}, previous message hash does not match the one that was sent`,
      );
    }

    if (sessionData.recipientGatewayPubkey != request.serverIdentityPubkey) {
      throw new Error(
        `${fnTag}, LockEvidenceRequest serverIdentity public key does not match the one that was sent`,
      );
    }

    if (sessionData.sourceGatewayPubkey != request.clientIdentityPubkey) {
      throw new Error(
        `${fnTag}, LockEvidenceRequest clientIdentity public key does not match the one that was sent`,
      );
    }

    if (
      request.lockEvidenceClaim == undefined ||
      new Date() > new Date(request.lockEvidenceExpiration)
    ) {
      throw new Error(`${fnTag}, invalid or expired lock evidence claim`);
    }

    if (!odap.verifySignature(request, request.clientIdentityPubkey)) {
      throw new Error(
        `${fnTag}, LockEvidenceRequest message signature verification failed`,
      );
    }

    const claimHash = SHA256(request.lockEvidenceClaim).toString();
    const retrievedClaim = await odap.getLogFromIPFS(
      PluginOdapGateway.getOdapLogKey(sessionID, "proof", "lock"),
    );

    if (claimHash != retrievedClaim.hash) {
      throw new Error(
        `${fnTag}, LockEvidence Claim hash does not match the one stored in IPFS`,
      );
    }

    if (!odap.verifySignature(retrievedClaim, request.clientIdentityPubkey)) {
      throw new Error(
        `${fnTag}, LockEvidence Claim message signature verification failed`,
      );
    }

    sessionData.lockEvidenceRequestMessageHash = SHA256(
      JSON.stringify(request),
    ).toString();

    sessionData.clientSignatureLockEvidenceRequestMessage = request.signature;

    sessionData.lockEvidenceClaim = request.lockEvidenceClaim;

    odap.sessions.set(request.sessionID, sessionData);

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "done",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });

    sessionData.step = 6;
    odap.sessions.set(sessionID, sessionData);

    this.log.info(`LockEvidenceRequest passed all checks.`);
  }

  async sendCommitPreparationResponse(
    sessionID: string,
    odap: PluginOdapGateway,
    remote: boolean,
  ): Promise<void | CommitPreparationV1Response> {
    const fnTag = `${odap.className}#sendCommitPrepareResponse()`;

    const sessionData = odap.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.maxTimeout == undefined ||
      sessionData.maxRetries == undefined ||
      sessionData.sourceBasePath == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.commitPrepareRequestMessageHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is undefined`);
    }

    const commitPreparationResponseMessage: CommitPreparationV1Response = {
      sessionID: sessionID,
      messageType: OdapMessageType.CommitPreparationResponse,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      hashCommitPrep: sessionData.commitPrepareRequestMessageHash,
      signature: "",
      sequenceNumber: ++sessionData.lastSequenceNumber,
    };

    commitPreparationResponseMessage.signature =
      PluginOdapGateway.bufArray2HexStr(
        await odap.sign(JSON.stringify(commitPreparationResponseMessage)),
      );

    sessionData.commitPrepareResponseMessageHash = SHA256(
      JSON.stringify(commitPreparationResponseMessage),
    ).toString();

    sessionData.serverSignatureCommitPreparationResponseMessage =
      commitPreparationResponseMessage.signature;

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "ack",
      operation: "prepare",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending CommitPreparationResponse...`);

    if (!remote) {
      return commitPreparationResponseMessage;
    }

    await odap.makeRequest(
      sessionID,
      PluginOdapGateway.getOdapAPI(
        sessionData.sourceBasePath,
      ).phase3CommitPreparationResponseV1(commitPreparationResponseMessage),
      "CommitPreparationResponse",
    );
  }

  async checkValidCommitPreparationRequest(
    request: CommitPreparationV1Request,
    odap: PluginOdapGateway,
  ): Promise<void> {
    const fnTag = `${odap.className}#checkValidCommitPrepareRequest()`;

    const sessionID = request.sessionID;
    const sessionData = odap.sessions.get(sessionID);
    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.lastSequenceNumber == undefined
    ) {
      throw new Error(
        `${fnTag}, session Id does not correspond to any open session`,
      );
    }

    // We need to check somewhere if this phase is completed within the asset-lock duration.

    if (request.messageType != OdapMessageType.CommitPreparationRequest) {
      throw new Error(
        `${fnTag}, wrong message type for CommitPreparationRequest`,
      );
    }

    if (request.sequenceNumber != sessionData.lastSequenceNumber + 1) {
      throw new Error(
        `${fnTag}, CommitPreparationRequest sequence number incorrect`,
      );
    }

    if (
      sessionData.lockEvidenceResponseMessageHash != request.hashLockEvidenceAck
    ) {
      throw new Error(`${fnTag}, previous message hash does not match`);
    }

    if (sessionData.recipientGatewayPubkey != request.serverIdentityPubkey) {
      throw new Error(
        `${fnTag}, CommitPreparationRequest serverIdentity public key does not match the one that was sent`,
      );
    }

    if (sessionData.sourceGatewayPubkey != request.clientIdentityPubkey) {
      throw new Error(
        `${fnTag}, CommitPreparationRequest clientIdentity public key does not match the one that was sent`,
      );
    }

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "exec",
      operation: "prepare",
      data: JSON.stringify(sessionData),
    });

    if (!odap.verifySignature(request, request.clientIdentityPubkey)) {
      throw new Error(
        `${fnTag}, CommitPreparationRequest message signature verification failed`,
      );
    }

    sessionData.commitPrepareRequestMessageHash = SHA256(
      JSON.stringify(request),
    ).toString();

    sessionData.clientSignatureCommitPreparationRequestMessage =
      request.signature;

    odap.sessions.set(request.sessionID, sessionData);

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "done",
      operation: "prepare",
      data: JSON.stringify(sessionData),
    });

    sessionData.step = 8;
    odap.sessions.set(sessionID, sessionData);

    this.log.info(`CommitPreparationRequest passed all checks.`);
  }

  async sendCommitFinalResponse(
    sessionID: string,
    odap: PluginOdapGateway,
    remote: boolean,
  ): Promise<void | CommitFinalV1Response> {
    const fnTag = `${odap.className}#sendCommitFinalResponse()`;

    const sessionData = odap.sessions.get(sessionID);
    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.maxTimeout == undefined ||
      sessionData.maxRetries == undefined ||
      sessionData.sourceBasePath == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.commitAcknowledgementClaim == undefined ||
      sessionData.commitFinalRequestMessageHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is undefined`);
    }

    const commitFinalResponseMessage: CommitFinalV1Response = {
      sessionID: sessionID,
      messageType: OdapMessageType.CommitFinalResponse,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      commitAcknowledgementClaim: sessionData.commitAcknowledgementClaim,
      hashCommitFinal: sessionData.commitFinalRequestMessageHash,
      signature: "",
      sequenceNumber: ++sessionData.lastSequenceNumber,
    };

    commitFinalResponseMessage.signature = PluginOdapGateway.bufArray2HexStr(
      await odap.sign(JSON.stringify(commitFinalResponseMessage)),
    );

    sessionData.commitFinalResponseMessageHash = SHA256(
      JSON.stringify(commitFinalResponseMessage),
    ).toString();

    sessionData.serverSignatureCommitFinalResponseMessage =
      commitFinalResponseMessage.signature;

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "ack",
      operation: "final",
      data: JSON.stringify(sessionData),
    });

    odap.sessions.set(sessionID, sessionData);

    this.log.info(`${fnTag}, sending CommitFinalResponse...`);

    if (!remote) {
      return commitFinalResponseMessage;
    }

    await odap.makeRequest(
      sessionID,
      PluginOdapGateway.getOdapAPI(
        sessionData.sourceBasePath,
      ).phase3CommitFinalResponseV1(commitFinalResponseMessage),
      "CommitFinalResponse",
    );
  }

  async checkValidCommitFinalRequest(
    request: CommitFinalV1Request,
    odap: PluginOdapGateway,
  ): Promise<void> {
    const fnTag = `${odap.className}#checkValidCommitFinalRequest()`;

    const sessionID = request.sessionID;
    const sessionData = odap.sessions.get(sessionID);
    if (
      sessionData == undefined ||
      sessionData.id == undefined ||
      sessionData.step == undefined ||
      sessionData.lastSequenceNumber == undefined
    ) {
      throw new Error(
        `${fnTag}, session Id does not correspond to any open session`,
      );
    }

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "exec",
      operation: "final",
      data: JSON.stringify(sessionData),
    });

    if (request.messageType != OdapMessageType.CommitFinalRequest) {
      throw new Error(`${fnTag}, wrong message type for CommitFinalRequest`);
    }

    if (request.sequenceNumber != sessionData.lastSequenceNumber + 1) {
      throw new Error(`${fnTag}, CommitFinalRequest sequence number incorrect`);
    }

    if (request.commitFinalClaim == undefined) {
      throw new Error(`${fnTag}, claim presented by client is invalid`);
    }

    if (sessionData.recipientGatewayPubkey != request.serverIdentityPubkey) {
      throw new Error(
        `${fnTag}, CommitFinalRequest serverIdentity public key does not match the one that was sent`,
      );
    }

    if (sessionData.sourceGatewayPubkey != request.clientIdentityPubkey) {
      throw new Error(
        `${fnTag}, CommitFinalRequest clientIdentity public key does not match the one that was sent`,
      );
    }

    if (
      sessionData.commitPrepareResponseMessageHash !=
      request.hashCommitPrepareAck
    ) {
      throw new Error(`${fnTag}, previous message hash does not match`);
    }

    if (!odap.verifySignature(request, request.clientIdentityPubkey)) {
      throw new Error(
        `${fnTag}, CommitFinalRequest message signature verification failed`,
      );
    }

    // We need to check somewhere if this phase is completed within the asset-lock duration.
    const claimHash = SHA256(request.commitFinalClaim).toString();
    const retrievedClaim = await odap.getLogFromIPFS(
      PluginOdapGateway.getOdapLogKey(sessionID, "proof", "delete"),
    );

    if (claimHash != retrievedClaim.hash) {
      throw new Error(
        `${fnTag}, Commit Final Claim hash does not match the one stored in IPFS`,
      );
    }

    if (!odap.verifySignature(retrievedClaim, request.clientIdentityPubkey)) {
      throw new Error(
        `${fnTag}, Commit Final Claim signature verification failed`,
      );
    }

    sessionData.commitFinalClaim = request.commitFinalClaim;

    sessionData.commitFinalRequestMessageHash = SHA256(
      JSON.stringify(request),
    ).toString();

    sessionData.clientSignatureCommitFinalRequestMessage = request.signature;

    odap.sessions.set(request.sessionID, sessionData);
    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "done",
      operation: "final",
      data: JSON.stringify(sessionData),
    });

    sessionData.step = 10;
    odap.sessions.set(sessionID, sessionData);

    this.log.info(`CommitFinalRequest passed all checks.`);
  }

  async checkValidTransferCompleteRequest(
    request: TransferCompleteV1Request,
    odap: PluginOdapGateway,
  ): Promise<void> {
    const fnTag = `${odap.className}#checkValidTransferCompleteRequest()`;

    const sessionID = request.sessionID;
    const sessionData = odap.sessions.get(sessionID);
    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.lastSequenceNumber == undefined
    ) {
      throw new Error(
        `${fnTag}, session Id does not correspond to any open session`,
      );
    }

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "exec",
      operation: "complete",
      data: JSON.stringify(sessionData),
    });

    if (request.messageType != OdapMessageType.TransferCompleteRequest) {
      throw new Error(
        `${fnTag}, wrong message type for TransferCompleteRequest`,
      );
    }

    if (request.sequenceNumber != sessionData.lastSequenceNumber + 1) {
      throw new Error(
        `${fnTag}, TransferCompleteRequest sequence number incorrect`,
      );
    }

    if (
      request.hashCommitFinalAck != sessionData.commitFinalResponseMessageHash
    ) {
      throw new Error(`${fnTag}, previous message hash not match`);
    }

    if (!odap.verifySignature(request, request.clientIdentityPubkey)) {
      throw new Error(
        `${fnTag}, TransferCompleteRequest message signature verification failed`,
      );
    }

    sessionData.transferCompleteMessageHash = SHA256(
      JSON.stringify(request),
    ).toString();

    sessionData.clientSignatureTransferCompleteMessage = request.signature;

    odap.sessions.set(request.sessionID, sessionData);

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "done",
      operation: "complete",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`TransferCompleteRequest passed all checks.`);
  }
}
