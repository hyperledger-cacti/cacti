import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { PluginSATPGateway } from "../../../plugin-satp-gateway";
import { CommitFinalAcknowledgementReceiptResponseMessage, CommitFinalAssertionRequestMessage, CommitPreparationRequestMessage, CommitReadyResponseMessage } from "../../../generated/proto/cacti/satp/v02/stage_3_pb";
import { SATP_VERSION } from "../../constants";
import { CommonSatp, MessageType } from "../../../generated/proto/cacti/satp/v02/common/common_messages_pb";
import { SessionData, Stage3Hashes, Stage3Signatures } from "../../../generated/proto/cacti/satp/v02/common/session_pb";
import { SHA256 } from "crypto-js";

export class Stage3ServerHandler {
    public static readonly CLASS_NAME = "Stage3Handler-Server";
    private _log: Logger;
  
    constructor() {
      const level = "INFO";
      const label = Stage3ServerHandler.CLASS_NAME;
      this._log = LoggerProvider.getOrCreate({ level, label });
    }
  
    public get className(): string {
      return Stage3ServerHandler.CLASS_NAME;
    }
  
    public get log(): Logger {
      return this._log;
    }

    checkCommitPreparationRequestMessage(
        request: CommitPreparationRequestMessage,
        gateway: PluginSATPGateway,
    ): void {
        const fnTag = `${gateway.className}#checkCommitPreparationRequestMessage()`;

        if (request.common == undefined) {
            throw new Error(
                `${fnTag}, message common body is missing`,
            );
        }

        if (request.common.version != SATP_VERSION) {
            throw new Error(
                `${fnTag}, message version is not ${SATP_VERSION}`,
            );
        }

        if (request.common.messageType != MessageType.COMMIT_PREPARE) {
            throw new Error(
                `${fnTag}, message type is not COMMIT_PREPARE`,
            );
        }
        
        //const sessionData = gateway.sessions.get(request.common.sessionId);
        const sessionData = new SessionData(); //todo change 

        if (sessionData == undefined) {
            throw new Error(
                `${fnTag}, session data not found for session id ${request.common.sessionId}`,
            );
        }

        if (sessionData == undefined || 
            sessionData.hashes == undefined || 
            sessionData.hashes.stage2 == undefined || 
            sessionData.hashes.stage2.lockAssertionReceiptMessageHash == undefined || 
            sessionData.lastSequenceNumber == undefined || 
            sessionData.version == undefined || 
            sessionData.signatures == undefined 
            ) {
            throw new Error(
                `${fnTag}, session data not loaded correctly ${request.common.sessionId}`,
            );
        }

        if (sessionData.lastSequenceNumber + BigInt(1) != request.common.sequenceNumber) {
            throw new Error(
                `${fnTag}, sequenceNumber does not match`,
            );
        }
        
        if (sessionData.hashes.stage2.lockAssertionReceiptMessageHash != request.common.hashPreviousMessage) {
            throw new Error(
                `${fnTag}, hashPreviousMessage does not match`,
            );
        }

        if (sessionData.clientGatewayPubkey != request.common.clientGatewayPubkey) {
            throw new Error(
                `${fnTag}, clientGatewayPubkey does not match`,
            );
        }

        if (sessionData.serverGatewayPubkey != request.common.serverGatewayPubkey) {
            throw new Error(
                `${fnTag}, serverGatewayPubkey does not match`,
            );
        }

        if (!gateway.verifySignature(request.common, request.common.clientGatewayPubkey)) {
            throw new Error(
                `${fnTag}, message signature verification failed`,
            );
        }

        this.log.info(`CommitPreparationRequestMessage passed all checks.`);
    }

    checkCommitFinalAssertionRequestMessage(
        request: CommitFinalAssertionRequestMessage,
        gateway: PluginSATPGateway,
    ): void {
        const fnTag = `${gateway.className}#checkCommitFinalAssertionRequestMessage()`;

        if (request.common == undefined) {
            throw new Error(
                `${fnTag}, message common body is missing`,
            );
        }

        if (request.common.version != SATP_VERSION) {
            throw new Error(
                `${fnTag}, message version is not ${SATP_VERSION}`,
            );
        }

        if (request.common.messageType != MessageType.COMMIT_FINAL) {
            throw new Error(
                `${fnTag}, message type is not COMMIT_FINAL`,
            );
        }

       //const sessionData = gateway.sessions.get(request.common.sessionId);
        const sessionData = new SessionData(); //todo change 

        if (sessionData == undefined) {
            throw new Error(
                `${fnTag}, session data not found for session id ${request.common.sessionId}`,
            );
        }

        if (
            sessionData.hashes == undefined || 
            sessionData.hashes.stage3 == undefined || 
            sessionData.hashes.stage3.commitReadyResponseMessageHash == undefined || 
            sessionData.lastSequenceNumber == undefined || 
            sessionData.version == undefined || 
            sessionData.signatures == undefined 
            ) {
            throw new Error(
                `${fnTag}, session data not loaded correctly ${request.common.sessionId}`,
            );
        }

        if (sessionData.lastSequenceNumber + BigInt(1) != request.common.sequenceNumber) {
            throw new Error(
                `${fnTag}, sequenceNumber does not match`,
            );
        }

        if (sessionData.hashes.stage3.commitReadyResponseMessageHash != request.common.hashPreviousMessage) {
            throw new Error(
                `${fnTag}, hashPreviousMessage does not match`,
            );
        }

        if (sessionData.clientGatewayPubkey != request.common.clientGatewayPubkey) {
            throw new Error(
                `${fnTag}, clientGatewayPubkey does not match`,
            );
        }

        if (sessionData.serverGatewayPubkey != request.common.serverGatewayPubkey) {
            throw new Error(
                `${fnTag}, serverGatewayPubkey does not match`,
            );
        }

        if (!gateway.verifySignature(request.common, request.common.clientGatewayPubkey)) {
            throw new Error(
                `${fnTag}, message signature verification failed`,
            );
        }

        if (request.burnAssertionClaim == undefined) {
            throw new Error(
                `${fnTag}, mintAssertionClaims is missing`,
            );
        }

        this.log.info(`CommitFinalAssertionRequestMessage passed all checks.`);
    }

    async commitReady(
        request: CommitPreparationRequestMessage,
        gateway: PluginSATPGateway,
    ): Promise<void | CommitReadyResponseMessage> {
        const fnTag = `${gateway.className}#commitReady()`;

        if (request.common == undefined) {
            throw new Error(
                `${fnTag}, message common body is missing`,
            );
        }

        

        //const sessionData = gateway.sessions.get(request.common.sessionId);
        const sessionData = new SessionData(); //todo change 

        if (sessionData == undefined) {
            throw new Error(
                `${fnTag}, session data not found for session id ${request.common.sessionId}`,
            );
        }

        if (sessionData == undefined || 
            sessionData.hashes == undefined || 
            sessionData.lastSequenceNumber == undefined || 
            sessionData.version == undefined || 
            sessionData.signatures == undefined 
            ) {
            throw new Error(
                `${fnTag}, session data not loaded correctly ${request.common.sessionId}`,
            );
        }

        sessionData.hashes.stage3 = new Stage3Hashes();
        
        sessionData.hashes.stage3.commitPreparationRequestMessageHash = SHA256(
            JSON.stringify(request),
        ).toString();

        const commonBody = new CommonSatp();
        commonBody.version = SATP_VERSION;
        commonBody.messageType = MessageType.COMMIT_READY;
        commonBody.sequenceNumber = request.common.sequenceNumber + BigInt(1);
        commonBody.hashPreviousMessage = sessionData.hashes.stage3.commitPreparationRequestMessageHash;
        commonBody.sessionId = request.common.sessionId;
        commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
        commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

        sessionData.lastSequenceNumber = commonBody.sequenceNumber;

        const commitReadyMessage = new CommitReadyResponseMessage();
        commitReadyMessage.common = commonBody;

        commitReadyMessage.mintAssertionClaims = sessionData.mintAssertionClaims;
        commitReadyMessage.mintAssertionClaimsFormat = sessionData.mintAssertionClaimsFormat;

        const messageSignature = PluginSATPGateway.bufArray2HexStr(
            gateway.sign(JSON.stringify(commitReadyMessage)),
        );

        commitReadyMessage.common.signature = messageSignature;

        sessionData.signatures.stage3 = new Stage3Signatures();
        sessionData.signatures.stage3.commitReadyResponseMessageServerSignature = messageSignature;
        
        sessionData.hashes.stage3.commitReadyResponseMessageHash = SHA256(
            JSON.stringify(commitReadyMessage),
        ).toString();

        return commitReadyMessage;
    }

    async commitFinalAcknowledgementReceiptResponse(
        request: CommitFinalAssertionRequestMessage,
        gateway: PluginSATPGateway,
    ): Promise<void | CommitFinalAcknowledgementReceiptResponseMessage> {
        const fnTag = `${gateway.className}#commitFinalAcknowledgementReceiptResponse()`;

        if (request.common == undefined) {
            throw new Error(
                `${fnTag}, message common body is missing`,
            );
        }

        //const sessionData = gateway.sessions.get(request.common.sessionId);
        const sessionData = new SessionData(); //todo change 

        if (sessionData == undefined) {
            throw new Error(
                `${fnTag}, session data not loaded correctly ${request.common.sessionId}`,
            );
        }

        if (
            sessionData.hashes == undefined || 
            sessionData.hashes.stage3 == undefined || 
            sessionData.hashes.stage3.commitReadyResponseMessageHash == undefined || 
            sessionData.signatures == undefined ||
            sessionData.signatures.stage3 == undefined ||
            sessionData.lastSequenceNumber == undefined || 
            sessionData.version == undefined || 
            sessionData.signatures == undefined 
            ) {
            throw new Error(
                `${fnTag}, session data not loaded correctly ${request.common.sessionId}`,
            );
        }

        sessionData.hashes.stage3.commitFinalAssertionRequestMessageHash = SHA256(
            JSON.stringify(request),
        ).toString();

        const commonBody = new CommonSatp();
        commonBody.version = SATP_VERSION;
        commonBody.messageType = MessageType.ACK_COMMIT_FINAL;
        commonBody.sequenceNumber = request.common.sequenceNumber + BigInt(1);
        commonBody.hashPreviousMessage = sessionData.hashes.stage3.commitFinalAssertionRequestMessageHash;
        commonBody.sessionId = request.common.sessionId;
        commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
        commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

        sessionData.lastSequenceNumber = commonBody.sequenceNumber;

        const commitFinalAcknowledgementReceiptResponseMessage = new CommitFinalAcknowledgementReceiptResponseMessage();
        commitFinalAcknowledgementReceiptResponseMessage.common = commonBody;
        
        commitFinalAcknowledgementReceiptResponseMessage.assignmentAssertionClaim = sessionData.assignmentAssertionClaim;
        commitFinalAcknowledgementReceiptResponseMessage.assignmentAssertionClaimFormat = sessionData.assignmentAssertionClaimFormat;
            
        const messageSignature = PluginSATPGateway.bufArray2HexStr(
            gateway.sign(JSON.stringify(commitFinalAcknowledgementReceiptResponseMessage)),
        );

        commitFinalAcknowledgementReceiptResponseMessage.common.signature = messageSignature;

        sessionData.signatures.stage3.commitFinalAcknowledgementReceiptResponseMessageServerSignature = messageSignature;

        sessionData.hashes.stage3.commitFinalAssertionRequestMessageHash = SHA256(
            JSON.stringify(commitFinalAcknowledgementReceiptResponseMessage),
        ).toString();

        return commitFinalAcknowledgementReceiptResponseMessage;
    }
}