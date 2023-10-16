import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SHA256 } from "crypto-js";
import {
  TransferInitializationV1Request,
  TransferInitializationV1Response,
  TransferCommenceV1Request,
  TransferCommenceV1Response,
  LockEvidenceV1Request,
  LockEvidenceV1Response,
  CommitPreparationV1Request,
  CommitPreparationV1Response,
  CommitFinalV1Request,
  CommitFinalV1Response,
  TransferCompleteV1Request,
} from "../../public-api";
import { OdapMessageType, PluginOdapGateway } from "../plugin-odap-gateway";

export class ClientGatewayHelper {
  public static readonly CLASS_NAME = "ClientGatewayHelper";
  private _log: Logger;

  constructor() {
    const level = "INFO";
    const label = ClientGatewayHelper.CLASS_NAME;
    this._log = LoggerProvider.getOrCreate({ level, label });
  }

  public get className(): string {
    return ClientGatewayHelper.CLASS_NAME;
  }

  public get log(): Logger {
    return this._log;
  }

  async sendTransferInitializationRequest(
    sessionID: string,
    odap: PluginOdapGateway,
    remote: boolean,
  ): Promise<void | TransferInitializationV1Request> {
    const fnTag = `${this.className}#sendTransferInitializationRequest()`;

    const sessionData = odap.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.id == undefined ||
      sessionData.step == undefined ||
      sessionData.version == undefined ||
      sessionData.maxRetries == undefined ||
      sessionData.maxTimeout == undefined ||
      sessionData.payloadProfile == undefined ||
      sessionData.loggingProfile == undefined ||
      sessionData.sourceBasePath == undefined ||
      sessionData.recipientBasePath == undefined ||
      sessionData.accessControlProfile == undefined ||
      sessionData.applicationProfile == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceLedgerAssetID == undefined ||
      sessionData.sourceGatewayDltSystem == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.recipientLedgerAssetID == undefined ||
      sessionData.recipientGatewayDltSystem == undefined ||
      sessionData.allowedSourceBackupGateways == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    if (!odap.supportedDltIDs.includes(sessionData.recipientGatewayDltSystem)) {
      throw new Error(
        `${fnTag}, recipient gateway dlt system is not supported by this gateway`,
      );
    }

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
      signature: "",
      sourceGatewayPubkey: odap.pubKey,
      sourceGatewayDltSystem: sessionData.sourceGatewayDltSystem,
      recipientGatewayPubkey: sessionData.recipientGatewayPubkey,
      recipientGatewayDltSystem: sessionData.recipientGatewayDltSystem,
      sequenceNumber: sessionData.lastSequenceNumber,
      sourceBasePath: sessionData.sourceBasePath,
      recipientBasePath: sessionData.recipientBasePath,
      // escrow type
      // expiry time (related to the escrow)
      // multiple claims allowed
      // multiple cancels allowed
      // permissions
      maxRetries: sessionData.maxRetries,
      maxTimeout: sessionData.maxTimeout,
      backupGatewaysAllowed: sessionData.allowedSourceBackupGateways,
      recipientLedgerAssetID: sessionData.recipientLedgerAssetID,
      sourceLedgerAssetID: sessionData.sourceLedgerAssetID,
    };

    const messageSignature = PluginOdapGateway.bufArray2HexStr(
      odap.sign(JSON.stringify(initializationRequestMessage)),
    );

    initializationRequestMessage.signature = messageSignature;

    sessionData.initializationRequestMessageHash = SHA256(
      JSON.stringify(initializationRequestMessage),
    ).toString();

    sessionData.clientSignatureInitializationRequestMessage = messageSignature;

    odap.sessions.set(sessionID, sessionData);

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "init",
      operation: "validate",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending TransferInitializationRequest...`);

    if (!remote) {
      return initializationRequestMessage;
    }

    await odap.makeRequest(
      sessionID,
      PluginOdapGateway.getOdapAPI(
        sessionData.recipientBasePath,
      ).phase1TransferInitiationRequestV1(initializationRequestMessage),
      "TransferInitializationRequest",
    );
  }

  async checkValidInitializationResponse(
    response: TransferInitializationV1Response,
    odap: PluginOdapGateway,
  ): Promise<void> {
    const fnTag = `${this.className}#checkValidInitializationResponse`;

    const sessionID = response.sessionID;
    const sessionData = odap.sessions.get(sessionID);
    if (sessionData == undefined) {
      throw new Error(`${fnTag}, session data is undefined`);
    }

    if (response.messageType != OdapMessageType.InitializationResponse) {
      throw new Error(
        `${fnTag}, wrong message type for TransferInitializationResponse`,
      );
    }

    if (response.sequenceNumber != sessionData.lastSequenceNumber) {
      throw new Error(
        `${fnTag}, TransferInitializationResponse sequence number incorrect`,
      );
    }

    if (
      response.initialRequestMessageHash !=
      sessionData.initializationRequestMessageHash
    ) {
      throw new Error(
        `${fnTag}, TransferInitializationResponse previous message hash does not match the one that was sent`,
      );
    }

    if (response.serverIdentityPubkey != sessionData.recipientGatewayPubkey) {
      throw new Error(
        `${fnTag}, TransferInitializationResponse serverIdentity public key does not match the one that was sent`,
      );
    }

    if (!odap.verifySignature(response, sessionData.recipientGatewayPubkey)) {
      throw new Error(
        `${fnTag}, TransferInitializationResponse message signature verification failed`,
      );
    }

    sessionData.id = response.sessionID;

    sessionData.recipientGatewayPubkey = response.serverIdentityPubkey;

    sessionData.initializationResponseMessageHash = SHA256(
      JSON.stringify(response),
    ).toString();

    sessionData.serverSignatureInitializationResponseMessage =
      response.signature;

    sessionData.allowedRecipientBackupGateways = response.backupGatewaysAllowed;

    sessionData.step = 3;

    odap.sessions.set(sessionData.id, sessionData);
    this.log.info(`TransferInitializationResponse passed all checks.`);
  }

  async sendTransferCommenceRequest(
    sessionID: string,
    odap: PluginOdapGateway,
    remote: boolean,
  ): Promise<void | TransferCommenceV1Request> {
    const fnTag = `${odap.className}#sendTransferCommenceRequest()`;

    const sessionData = odap.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.maxTimeout == undefined ||
      sessionData.maxRetries == undefined ||
      sessionData.assetProfile == undefined ||
      sessionData.recipientBasePath == undefined ||
      // sessionData.originatorPubkey == undefined ||
      // sessionData.beneficiaryPubkey == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.sourceGatewayDltSystem == undefined ||
      sessionData.recipientGatewayDltSystem == undefined ||
      sessionData.initializationResponseMessageHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    const hashAssetProfile = SHA256(
      JSON.stringify(sessionData.assetProfile),
    ).toString();

    const transferCommenceRequestMessage: TransferCommenceV1Request = {
      messageType: OdapMessageType.TransferCommenceRequest,
      // originatorPubkey: sessionData.originatorPubkey,
      // beneficiaryPubkey: sessionData.beneficiaryPubkey,
      originatorPubkey: "sessionData.originatorPubkey",
      beneficiaryPubkey: "sessionData.beneficiaryPubkey",
      senderDltSystem: sessionData.sourceGatewayDltSystem,
      recipientDltSystem: sessionData.recipientGatewayDltSystem,
      sessionID: sessionID,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      hashAssetProfile: hashAssetProfile,
      hashPrevMessage: sessionData.initializationResponseMessageHash,
      // clientTransferNumber
      signature: "",
      sequenceNumber: ++sessionData.lastSequenceNumber,
    };

    const messageSignature = PluginOdapGateway.bufArray2HexStr(
      odap.sign(JSON.stringify(transferCommenceRequestMessage)),
    );

    transferCommenceRequestMessage.signature = messageSignature;

    sessionData.transferCommenceMessageRequestHash = SHA256(
      JSON.stringify(transferCommenceRequestMessage),
    ).toString();

    sessionData.clientSignatureTransferCommenceRequestMessage =
      messageSignature;

    odap.sessions.set(sessionID, sessionData);

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "init",
      operation: "commence",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending TransferCommenceRequest...`);

    if (!remote) {
      return transferCommenceRequestMessage;
    }

    await odap.makeRequest(
      sessionID,
      PluginOdapGateway.getOdapAPI(
        sessionData.recipientBasePath,
      ).phase2TransferCommenceRequestV1(transferCommenceRequestMessage),
      "TransferCommenceRequest",
    );
  }

  async checkValidTransferCommenceResponse(
    response: TransferCommenceV1Response,
    odap: PluginOdapGateway,
  ): Promise<void> {
    const fnTag = `${odap.className}#checkValidTransferCommenceResponse`;

    const sessionID = response.sessionID;
    const sessionData = odap.sessions.get(sessionID);
    if (sessionData == undefined) {
      throw new Error(`${fnTag}, session data is undefined`);
    }

    if (response.messageType != OdapMessageType.TransferCommenceResponse) {
      throw new Error(
        `${fnTag}, wrong message type for TransferCommenceResponse`,
      );
    }

    if (response.sequenceNumber != sessionData.lastSequenceNumber) {
      throw new Error(
        `${fnTag}, TransferCommenceResponse sequence number incorrect`,
      );
    }

    if (
      sessionData.transferCommenceMessageRequestHash !=
      response.hashCommenceRequest
    ) {
      throw new Error(
        `${fnTag}, TransferCommenceResponse previous message hash does not match the one that was sent`,
      );
    }

    if (sessionData.recipientGatewayPubkey != response.serverIdentityPubkey) {
      throw new Error(
        `${fnTag}, TransferCommenceResponse serverIdentity public key does not match the one that was sent`,
      );
    }

    if (sessionData.sourceGatewayPubkey != response.clientIdentityPubkey) {
      throw new Error(
        `${fnTag}, TransferCommenceResponse clientIdentity public key does not match the one that was sent`,
      );
    }

    if (!odap.verifySignature(response, sessionData.recipientGatewayPubkey)) {
      throw new Error(
        `${fnTag}, TransferCommenceResponse message signature verification failed`,
      );
    }

    sessionData.transferCommenceMessageResponseHash = SHA256(
      JSON.stringify(response),
    ).toString();

    sessionData.serverSignatureTransferCommenceResponseMessage =
      response.signature;

    sessionData.step = 5;

    odap.sessions.set(sessionID, sessionData);

    this.log.info(`TransferCommenceResponse passed all checks.`);
  }

  async sendLockEvidenceRequest(
    sessionID: string,
    odap: PluginOdapGateway,
    remote: boolean,
  ): Promise<void | LockEvidenceV1Request> {
    const fnTag = `${odap.className}#sendLockEvidenceRequest()`;

    const sessionData = odap.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.maxTimeout == undefined ||
      sessionData.maxRetries == undefined ||
      sessionData.lockEvidenceClaim == undefined ||
      sessionData.recipientBasePath == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.transferCommenceMessageResponseHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    const lockEvidenceRequestMessage: LockEvidenceV1Request = {
      sessionID: sessionID,
      messageType: OdapMessageType.LockEvidenceRequest,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      lockEvidenceClaim: sessionData.lockEvidenceClaim,
      // lock claim format
      lockEvidenceExpiration: new Date()
        .setDate(new Date().getDate() + 1)
        .toString(), // a day from now
      hashCommenceAckRequest: sessionData.transferCommenceMessageResponseHash,
      signature: "",
      sequenceNumber: ++sessionData.lastSequenceNumber,
    };

    const messageSignature = PluginOdapGateway.bufArray2HexStr(
      odap.sign(JSON.stringify(lockEvidenceRequestMessage)),
    );

    lockEvidenceRequestMessage.signature = messageSignature;

    sessionData.lockEvidenceRequestMessageHash = SHA256(
      JSON.stringify(lockEvidenceRequestMessage),
    ).toString();

    sessionData.clientSignatureLockEvidenceRequestMessage = messageSignature;

    odap.sessions.set(sessionID, sessionData);

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "init",
      operation: "lock",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending LockEvidenceRequest...`);

    if (!remote) {
      return lockEvidenceRequestMessage;
    }

    await odap.makeRequest(
      sessionID,
      PluginOdapGateway.getOdapAPI(
        sessionData.recipientBasePath,
      ).phase2LockEvidenceRequestV1(lockEvidenceRequestMessage),
      "LockEvidenceRequest",
    );
  }

  async checkValidLockEvidenceResponse(
    response: LockEvidenceV1Response,
    odap: PluginOdapGateway,
  ): Promise<void> {
    const fnTag = `${odap.className}#checkValidLockEvidenceResponse`;

    const sessionID = response.sessionID;
    const sessionData = odap.sessions.get(sessionID);
    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, reverting transfer because session data is undefined`,
      );
    }

    if (response.messageType != OdapMessageType.LockEvidenceResponse) {
      throw new Error(`${fnTag}, wrong message type for LockEvidenceResponse`);
    }

    if (response.sequenceNumber != sessionData.lastSequenceNumber) {
      throw new Error(
        `${fnTag}, LockEvidenceResponse sequence number incorrect`,
      );
    }

    if (
      sessionData.lockEvidenceRequestMessageHash !=
      response.hashLockEvidenceRequest
    ) {
      throw new Error(
        `${fnTag}, LockEvidenceResponse previous message hash does not match the one that was sent`,
      );
    }

    if (sessionData.recipientGatewayPubkey != response.serverIdentityPubkey) {
      throw new Error(
        `${fnTag}, LockEvidenceResponse serverIdentity public key does not match the one that was sent`,
      );
    }

    if (sessionData.sourceGatewayPubkey != response.clientIdentityPubkey) {
      throw new Error(
        `${fnTag}, LockEvidenceResponse clientIdentity public key does not match the one that was sent`,
      );
    }

    if (!odap.verifySignature(response, sessionData.recipientGatewayPubkey)) {
      throw new Error(
        `${fnTag}, LockEvidenceResponse message signature verification failed`,
      );
    }

    sessionData.lockEvidenceResponseMessageHash = SHA256(
      JSON.stringify(response),
    ).toString();

    sessionData.serverSignatureLockEvidenceResponseMessage = response.signature;

    sessionData.step = 7;

    odap.sessions.set(sessionID, sessionData);

    this.log.info(`LockEvidenceResponse passed all checks.`);
  }

  async sendCommitPreparationRequest(
    sessionID: string,
    odap: PluginOdapGateway,
    remote: boolean,
  ): Promise<void | CommitPreparationV1Request> {
    const fnTag = `${odap.className}#sendCommitPreparationRequest()`;

    const sessionData = odap.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.maxTimeout == undefined ||
      sessionData.maxRetries == undefined ||
      sessionData.recipientBasePath == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.lockEvidenceResponseMessageHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    const commitPrepareRequestMessage: CommitPreparationV1Request = {
      sessionID: sessionID,
      messageType: OdapMessageType.CommitPreparationRequest,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      hashLockEvidenceAck: sessionData.lockEvidenceResponseMessageHash,
      signature: "",
      sequenceNumber: ++sessionData.lastSequenceNumber,
    };

    const messageSignature = PluginOdapGateway.bufArray2HexStr(
      odap.sign(JSON.stringify(commitPrepareRequestMessage)),
    );

    commitPrepareRequestMessage.signature = messageSignature;

    sessionData.commitPrepareRequestMessageHash = SHA256(
      JSON.stringify(commitPrepareRequestMessage),
    ).toString();

    sessionData.clientSignatureCommitPreparationRequestMessage =
      messageSignature;

    odap.sessions.set(sessionID, sessionData);

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "init",
      operation: "prepare",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending CommitPreparationRequest...`);

    if (!remote) {
      return commitPrepareRequestMessage;
    }

    await odap.makeRequest(
      sessionID,
      PluginOdapGateway.getOdapAPI(
        sessionData.recipientBasePath,
      ).phase3CommitPreparationRequestV1(commitPrepareRequestMessage),
      "CommitPreparationRequest",
    );
  }

  async checkValidCommitPreparationResponse(
    response: CommitPreparationV1Response,
    odap: PluginOdapGateway,
  ): Promise<void> {
    const fnTag = `${odap.className}#checkValidCommitPreparationResponse`;

    const sessionID = response.sessionID;
    const sessionData = odap.sessions.get(sessionID);
    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, reverting transfer because session data is undefined`,
      );
    }

    if (response.messageType != OdapMessageType.CommitPreparationResponse) {
      throw new Error(
        `${fnTag}, wrong message type for CommitPreparationResponse`,
      );
    }

    if (response.sequenceNumber != sessionData.lastSequenceNumber) {
      throw new Error(
        `${fnTag}, CommitPreparationResponse sequence number incorrect`,
      );
    }

    if (
      sessionData.commitPrepareRequestMessageHash != response.hashCommitPrep
    ) {
      throw new Error(
        `${fnTag}, CommitPreparationResponse previous message hash does not match the one that was sent`,
      );
    }

    if (sessionData.recipientGatewayPubkey != response.serverIdentityPubkey) {
      throw new Error(
        `${fnTag}, CommitPreparationResponse serverIdentity public key does not match the one that was sent`,
      );
    }

    if (sessionData.sourceGatewayPubkey != response.clientIdentityPubkey) {
      throw new Error(
        `${fnTag}, CommitPreparationResponse clientIdentity public key does not match the one that was sent`,
      );
    }

    if (!odap.verifySignature(response, sessionData.recipientGatewayPubkey)) {
      throw new Error(
        `${fnTag}, CommitPreparationResponse message signature verification failed`,
      );
    }

    sessionData.commitPrepareResponseMessageHash = SHA256(
      JSON.stringify(response),
    ).toString();

    sessionData.serverSignatureCommitPreparationResponseMessage =
      response.signature;

    sessionData.step = 9;

    odap.sessions.set(sessionID, sessionData);

    this.log.info(`CommitPreparationResponse passed all checks.`);
  }

  async sendCommitFinalRequest(
    sessionID: string,
    odap: PluginOdapGateway,
    remote: boolean,
  ): Promise<void | CommitFinalV1Request> {
    const fnTag = `${odap.className}#sendCommitFinalRequest()`;

    const sessionData = odap.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.maxTimeout == undefined ||
      sessionData.maxRetries == undefined ||
      sessionData.commitFinalClaim == undefined ||
      sessionData.recipientBasePath == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.commitPrepareResponseMessageHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    const commitFinalRequestMessage: CommitFinalV1Request = {
      sessionID: sessionID,
      messageType: OdapMessageType.CommitFinalRequest,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      commitFinalClaim: sessionData.commitFinalClaim,
      // commit final claim format
      hashCommitPrepareAck: sessionData.commitPrepareResponseMessageHash,
      signature: "",
      sequenceNumber: ++sessionData.lastSequenceNumber,
    };

    const messageSignature = PluginOdapGateway.bufArray2HexStr(
      odap.sign(JSON.stringify(commitFinalRequestMessage)),
    );

    commitFinalRequestMessage.signature = messageSignature;

    sessionData.commitFinalRequestMessageHash = SHA256(
      JSON.stringify(commitFinalRequestMessage),
    ).toString();

    sessionData.clientSignatureCommitFinalRequestMessage = messageSignature;

    odap.sessions.set(sessionID, sessionData);

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "init",
      operation: "final",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending CommitFinalRequest...`);

    if (!remote) {
      return commitFinalRequestMessage;
    }

    await odap.makeRequest(
      sessionID,
      PluginOdapGateway.getOdapAPI(
        sessionData.recipientBasePath,
      ).phase3CommitFinalRequestV1(commitFinalRequestMessage),
      "CommitFinalRequest",
    );
  }

  async checkValidCommitFinalResponse(
    response: CommitFinalV1Response,
    odap: PluginOdapGateway,
  ): Promise<void> {
    const fnTag = `${odap.className}#checkValidCommitFinalResponse`;

    const sessionID = response.sessionID;
    const sessionData = odap.sessions.get(sessionID);
    if (sessionData == undefined) {
      throw new Error(
        `${fnTag}, reverting transfer because session data is undefined`,
      );
    }

    if (response.messageType != OdapMessageType.CommitFinalResponse) {
      throw new Error(`${fnTag}, wrong message type for CommitFinalResponse`);
    }

    if (response.sequenceNumber != sessionData.lastSequenceNumber) {
      throw new Error(
        `${fnTag}, CommitFinalResponse sequence number incorrect`,
      );
    }

    if (response.commitAcknowledgementClaim == undefined) {
      throw new Error(`${fnTag}, the claim provided is not valid`);
    }

    if (sessionData.commitFinalRequestMessageHash != response.hashCommitFinal) {
      throw new Error(
        `${fnTag}, CommitFinalResponse previous message hash does not match the one that was sent`,
      );
    }

    if (sessionData.recipientGatewayPubkey != response.serverIdentityPubkey) {
      throw new Error(
        `${fnTag}, CommitFinalResponse serverIdentity public key does not match the one that was sent`,
      );
    }

    if (sessionData.sourceGatewayPubkey != response.clientIdentityPubkey) {
      throw new Error(
        `${fnTag}, CommitFinalResponse clientIdentity public key does not match the one that was sent`,
      );
    }

    if (!odap.verifySignature(response, sessionData.recipientGatewayPubkey)) {
      throw new Error(
        `${fnTag}, CommitFinalResponse message signature verification failed`,
      );
    }

    const claimHash = SHA256(response.commitAcknowledgementClaim).toString();
    const retrievedClaim = await odap.getLogFromIPFS(
      PluginOdapGateway.getOdapLogKey(sessionID, "proof", "create"),
    );

    if (claimHash != retrievedClaim.hash) {
      throw new Error(
        `${fnTag}, Commit Acknowledgement Claim hash does not match the one stored in IPFS`,
      );
    }

    if (!odap.verifySignature(retrievedClaim, response.serverIdentityPubkey)) {
      throw new Error(
        `${fnTag}, Commit Acknowledgement Claim signature verification failed`,
      );
    }

    sessionData.commitAcknowledgementClaim =
      response.commitAcknowledgementClaim;

    sessionData.commitFinalResponseMessageHash = SHA256(
      JSON.stringify(response),
    ).toString();

    sessionData.serverSignatureCommitFinalResponseMessage = response.signature;

    sessionData.step = 11;

    odap.sessions.set(sessionID, sessionData);

    this.log.info(`CommitFinalResponse passed all checks.`);
  }

  async sendTransferCompleteRequest(
    sessionID: string,
    odap: PluginOdapGateway,
    remote: boolean,
  ): Promise<void | TransferCompleteV1Request> {
    const fnTag = `${odap.className}#sendTransferCompleteRequest()`;

    const sessionData = odap.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.maxTimeout == undefined ||
      sessionData.maxRetries == undefined ||
      sessionData.recipientBasePath == undefined ||
      sessionData.lastSequenceNumber == undefined ||
      sessionData.sourceGatewayPubkey == undefined ||
      sessionData.recipientGatewayPubkey == undefined ||
      sessionData.commitFinalResponseMessageHash == undefined ||
      sessionData.transferCommenceMessageRequestHash == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    const transferCompleteRequestMessage: TransferCompleteV1Request = {
      sessionID: sessionID,
      messageType: OdapMessageType.TransferCompleteRequest,
      clientIdentityPubkey: sessionData.sourceGatewayPubkey,
      serverIdentityPubkey: sessionData.recipientGatewayPubkey,
      hashCommitFinalAck: sessionData.commitFinalResponseMessageHash,
      hashTransferCommence: sessionData.transferCommenceMessageRequestHash,
      signature: "",
      sequenceNumber: ++sessionData.lastSequenceNumber,
    };

    const messageSignature = PluginOdapGateway.bufArray2HexStr(
      odap.sign(JSON.stringify(transferCompleteRequestMessage)),
    );

    transferCompleteRequestMessage.signature = messageSignature;

    sessionData.transferCompleteMessageHash = SHA256(
      JSON.stringify(transferCompleteRequestMessage),
    ).toString();

    sessionData.clientSignatureTransferCompleteMessage = messageSignature;

    odap.sessions.set(sessionID, sessionData);

    await odap.storeOdapLog({
      sessionID: sessionID,
      type: "init",
      operation: "complete",
      data: JSON.stringify(sessionData),
    });

    this.log.info(`${fnTag}, sending TransferCompleteRequest...`);

    if (!remote) {
      return transferCompleteRequestMessage;
    }

    await odap.makeRequest(
      sessionID,
      PluginOdapGateway.getOdapAPI(
        sessionData.recipientBasePath,
      ).phase3TransferCompleteRequestV1(transferCompleteRequestMessage),
      "TransferCompleteRequest",
    );
  }
}
