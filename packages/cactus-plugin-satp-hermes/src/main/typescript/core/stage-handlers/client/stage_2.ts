import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { TransferCommenceResponseMessage } from "../../../generated/proto/cacti/satp/v02/stage_1_pb";
import { PluginSATPGateway } from "../../../plugin-satp-gateway";
import { SATP_VERSION } from "../../constants";
import { CommonSatp, MessageType } from "../../../generated/proto/cacti/satp/v02/common/common_messages_pb";
import { LockAssertionRequestMessage } from "../../../generated/proto/cacti/satp/v02/stage_2_pb";
import { SHA256 } from "crypto-js";
import { SessionData, Stage2Hashes, Stage2Signatures } from "../../../generated/proto/cacti/satp/v02/common/session_pb";

export class Stage2ClientHandler {
    public static readonly CLASS_NAME = "Stage2Handler-Client";
    private _log: Logger;
  
    constructor() {
      const level = "INFO";
      const label = Stage2ClientHandler.CLASS_NAME;
      this._log = LoggerProvider.getOrCreate({ level, label });
    }
  
    public get className(): string {
      return Stage2ClientHandler.CLASS_NAME;
    }
  
    public get log(): Logger {
      return this._log;
    }

    async lockAssertionRequest( 
        response: TransferCommenceResponseMessage,
        gateway: PluginSATPGateway,
      ): Promise<void | LockAssertionRequestMessage> {
        const fnTag = `${gateway.className}#lockAssertionRequest()`;
        if (response.common == undefined) {
            throw new Error(
                `${fnTag}, message common body is missing`,
            );
        }
        //const sessionData = gateway.sessions.get(response.common.sessionId);
        const sessionData = new SessionData(); //todo change 

        if (sessionData == undefined) {
            throw new Error(
                `${fnTag}, session data not found for session id ${response.common.sessionId}`,
            );
        }
        if (sessionData == undefined || 
            sessionData.hashes == undefined || 
            sessionData.hashes.stage1 == undefined || 
            sessionData.hashes.stage1.transferCommenceRequestMessageHash == undefined || 
            sessionData.lastSequenceNumber == undefined || 
            sessionData.version == undefined || 
            sessionData.signatures == undefined 
            ) {
            throw new Error(
              `${fnTag}, session data not loaded correctly ${response.common.sessionId}`,
            );
        }

        sessionData.hashes.stage1.transferCommenceResponseMessageHash = SHA256(
            JSON.stringify(response),
          ).toString();

          
        const commonBody = new CommonSatp();
        commonBody.version = sessionData.version;
        commonBody.messageType = MessageType.LOCK_ASSERT;
        commonBody.sequenceNumber = sessionData.lastSequenceNumber + BigInt(1);
        commonBody.hashPreviousMessage = sessionData.hashes.stage1.transferCommenceResponseMessageHash;
        commonBody.sessionId = response.common.sessionId;
        commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
        commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;

        sessionData.lastSequenceNumber = commonBody.sequenceNumber;

        const lockAssertionRequestMessage = new LockAssertionRequestMessage();
        lockAssertionRequestMessage.common = commonBody;

        lockAssertionRequestMessage.lockAssertionClaim = sessionData.lockAssertionClaim;
        lockAssertionRequestMessage.lockAssertionFormat = sessionData.lockAssertionFormat; //todo change this
        
        const messageSignature = PluginSATPGateway.bufArray2HexStr(
            gateway.sign(JSON.stringify(lockAssertionRequestMessage)),
          );
    
        lockAssertionRequestMessage.common.signature = messageSignature;


        sessionData.signatures.stage2 = new Stage2Signatures();
        sessionData.signatures.stage2.lockAssertionRequestMessageClientSignature = messageSignature;

        sessionData.hashes.stage2 = new Stage2Hashes();
        sessionData.hashes.stage2.lockAssertionRequestMessageHash = SHA256(
          JSON.stringify(lockAssertionRequestMessage),
        ).toString();
        
        return lockAssertionRequestMessage;
    }

    checkTransferCommenceResponseMessage(
        response: TransferCommenceResponseMessage,
        gateway: PluginSATPGateway,
      ): void{
        const fnTag = `${gateway.className}#checkTransferCommenceResponseMessage()`;

        if(response.common == undefined ||
            response.common.version == undefined ||
            response.common.messageType == undefined ||
            response.common.sessionId == undefined ||
            // request.common.transferContextId == undefined ||
            response.common.sequenceNumber == undefined ||
            response.common.resourceUrl == undefined ||
            // request.common.actionResponse == undefined ||
            // request.common.payloadProfile == undefined ||
            // request.common.applicationProfile == undefined ||
            response.common.signature == undefined ||
            response.common.clientGatewayPubkey == undefined ||
            response.common.serverGatewayPubkey == undefined 
            ){
            throw new Error(
              `${fnTag}, message satp common body is missing or is missing required fields`,
            );
        }
        
    
        if (response.common.version != SATP_VERSION) {
            throw new Error(
                `${fnTag}, unsupported SATP version`,
            );
        }

       //const sessionData = gateway.sessions.get(response.common.sessionId);
        const sessionData = new SessionData(); //todo change 
        
        if (sessionData == undefined) {
            throw new Error(
                `${fnTag}, session data not found for session id ${response.common.sessionId}`,
            );
        }

        if (
            sessionData.serverGatewayPubkey == undefined ||
            sessionData.hashes == undefined ||
            sessionData.hashes.stage1 == undefined ||
            sessionData.hashes.stage1.transferProposalRequestMessageHash == undefined ||
            sessionData.lastSequenceNumber == undefined
            ) {
            throw new Error(
                `${fnTag}, session data was not load correctly`,
            );
        }
        
        if (response.common.serverGatewayPubkey != sessionData.serverGatewayPubkey) {
            throw new Error(
                `${fnTag}, TransferCommenceResponse serverIdentity public key does not match the one that was sent`,
            );
        }
    
        if (response.common.clientGatewayPubkey != sessionData.clientGatewayPubkey) {
            throw new Error(
                `${fnTag}, TransferCommenceResponse clientIdentity public key does not match the one that was sent`,
            );
        }

        if (!gateway.verifySignature(response.common, response.common.serverGatewayPubkey)) {
            throw new Error(
                `${fnTag}, TransferCommenceResponse message signature verification failed`,
            );
        }
    
        if (response.common.messageType != MessageType.TRANSFER_COMMENCE_RESPONSE) {
            throw new Error(
                `${fnTag}, wrong message type for TransferCommenceResponse `,
            );
        }

        if (response.common.sequenceNumber != sessionData.lastSequenceNumber + BigInt(1)) {
            throw new Error(
                `${fnTag}, TransferCommenceResponse sequence number is wrong`,
            );
        }

        if (
            response.common.hashPreviousMessage != sessionData.hashes.stage1.transferCommenceResponseMessageHash //todo 
          ) {
            throw new Error(
              `${fnTag}, TransferCommenceResponse previous message hash does not match the one that was sent`,
            );
          }

          this.log.info(`TransferCommenceResponse passed all checks.`);
    }
}