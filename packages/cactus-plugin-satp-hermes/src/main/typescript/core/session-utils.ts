import {
  Asset,
  CredentialProfile,
  LockType,
  MessageType,
  SignatureAlgorithm,
} from "../generated/proto/cacti/satp/v02/common/message_pb";
import {
  MessageStagesTimestamps,
  SessionData,
} from "../generated/proto/cacti/satp/v02/common/session_pb";
import { SATPSession } from "./satp-session";

import { v4 as uuidv4 } from "uuid";
export enum TimestampType {
  PROCESSED = "PROCESSED",
  RECEIVED = "RECEIVED",
}

export enum SessionType {
  SERVER = "SERVER",
  CLIENT = "CLIENT",
}

export function populateClientSessionData(
  session: SATPSession,
  version: string,
  sourceContractAddress: string | undefined,
  destinyContractAddress: string | undefined,
  originatorPubkey: string,
  beneficiaryPubkey: string,
  senderGatewayNetworkId: string,
  recipientGatewayNetworkId: string,
  clientGatewayPubkey: string,
  serverGatewayPubkey: string,
  receiverGatewayOwnerId: string,
  senderGatewayOwnerId: string,
  signatureAlgorithm: SignatureAlgorithm,
  lockType: LockType,
  lockExpirationTime: bigint,
  credentialProfile: CredentialProfile,
  loggingProfile: string,
  accessControlProfile: string,
  senderContractOntology: string,
  receiverContractOntology: string,
  fromAmount: string,
  toAmount: string,
  sourceMspId: string,
  sourceChannelName: string,
  destinyMspId: string,
  destinyChannelName: string,
  sourceContractName: string,
  destinyContractName: string,
  sourceOwner: string,
  destinyOwner: string,
): SATPSession {
  const fn = "session_utils#populateClientSessionData";
  const sessionData = session.getClientSessionData();
  if (!sessionData) {
    throw new Error(fn + ":Session Data is undefined");
  }
  sessionData.version = version;
  sessionData.digitalAssetId = uuidv4();
  sessionData.originatorPubkey = originatorPubkey;
  sessionData.beneficiaryPubkey = beneficiaryPubkey;
  sessionData.senderGatewayNetworkId = senderGatewayNetworkId;
  sessionData.recipientGatewayNetworkId = recipientGatewayNetworkId;
  sessionData.clientGatewayPubkey = clientGatewayPubkey;
  sessionData.serverGatewayPubkey = serverGatewayPubkey;
  sessionData.receiverGatewayOwnerId = receiverGatewayOwnerId;
  sessionData.senderGatewayOwnerId = senderGatewayOwnerId;
  sessionData.signatureAlgorithm = signatureAlgorithm;
  sessionData.lockType = lockType;
  sessionData.lockExpirationTime = lockExpirationTime;
  sessionData.credentialProfile = credentialProfile;
  sessionData.loggingProfile = loggingProfile;
  sessionData.accessControlProfile = accessControlProfile;
  sessionData.senderContractOntology = senderContractOntology;
  sessionData.receiverContractOntology = receiverContractOntology;
  const senderAsset: Asset = new Asset();
  senderAsset.tokenId = uuidv4() + "-" + sessionData.transferContextId;
  senderAsset.owner = sourceOwner;
  senderAsset.ontology = senderContractOntology;
  senderAsset.contractName = sourceContractName;
  senderAsset.contractAddress = sourceContractAddress || "";
  senderAsset.amount = BigInt(fromAmount);

  senderAsset.mspId = sourceMspId;
  senderAsset.channelName = sourceChannelName;
  sessionData.senderAsset = senderAsset;

  const receiverAsset: Asset = new Asset();
  receiverAsset.tokenId = "";
  receiverAsset.owner = destinyOwner;
  receiverAsset.ontology = receiverContractOntology;
  receiverAsset.contractName = destinyContractName;
  receiverAsset.contractAddress = destinyContractAddress || "";
  receiverAsset.amount = BigInt(toAmount);

  receiverAsset.mspId = destinyMspId;
  receiverAsset.channelName = destinyChannelName;
  sessionData.receiverAsset = receiverAsset;

  //todo check THis

  sessionData.resourceUrl = "MOCK_RESOURCE_URL";

  return session;
}

export function copySessionDataAttributes(
  srcSessionData: SessionData,
  destSessionData: SessionData,
  sessionId?: string,
  contextId?: string,
): void {
  destSessionData.id = sessionId || srcSessionData.id;
  destSessionData.version = srcSessionData.version;
  destSessionData.transferContextId =
    contextId || srcSessionData.transferContextId;
  destSessionData.hashes = srcSessionData.hashes;
  destSessionData.payloadProfile = srcSessionData.payloadProfile;
  destSessionData.signatures = srcSessionData.signatures;
  destSessionData.maxRetries = srcSessionData.maxRetries;
  destSessionData.maxTimeout = srcSessionData.maxTimeout;
  destSessionData.loggingProfile = srcSessionData.loggingProfile;
  destSessionData.recipientBasePath = srcSessionData.recipientBasePath;
  destSessionData.sourceBasePath = srcSessionData.sourceBasePath;
  destSessionData.accessControlProfile = srcSessionData.accessControlProfile;
  destSessionData.applicationProfile = srcSessionData.applicationProfile;
  destSessionData.lastSequenceNumber = srcSessionData.lastSequenceNumber;
  destSessionData.senderGatewayNetworkId =
    srcSessionData.senderGatewayNetworkId;
  destSessionData.recipientGatewayNetworkId =
    srcSessionData.recipientGatewayNetworkId;
  destSessionData.sourceLedgerAssetId = srcSessionData.sourceLedgerAssetId;
  destSessionData.recipientLedgerAssetId =
    srcSessionData.recipientLedgerAssetId;
  destSessionData.serverGatewayPubkey = srcSessionData.serverGatewayPubkey;
  destSessionData.clientGatewayPubkey = srcSessionData.clientGatewayPubkey;
  destSessionData.verifiedOriginatorEntityId =
    srcSessionData.verifiedOriginatorEntityId;
  destSessionData.verifiedBeneficiaryEntityId =
    srcSessionData.verifiedBeneficiaryEntityId;
  destSessionData.assetProfileId = srcSessionData.assetProfileId;
  destSessionData.digitalAssetId = srcSessionData.digitalAssetId;
  destSessionData.originatorPubkey = srcSessionData.originatorPubkey;
  destSessionData.beneficiaryPubkey = srcSessionData.beneficiaryPubkey;
  destSessionData.senderGatewayOwnerId = srcSessionData.senderGatewayOwnerId;
  destSessionData.receiverGatewayOwnerId =
    srcSessionData.receiverGatewayOwnerId;
  destSessionData.hashTransferInitClaims =
    srcSessionData.hashTransferInitClaims;
  destSessionData.transferInitClaims = srcSessionData.transferInitClaims;
  destSessionData.proposedTransferInitClaims =
    srcSessionData.proposedTransferInitClaims;
  destSessionData.signatureAlgorithm = srcSessionData.signatureAlgorithm;
  destSessionData.lockType = srcSessionData.lockType;
  destSessionData.lockExpirationTime = srcSessionData.lockExpirationTime;
  destSessionData.permissions = srcSessionData.permissions;
  destSessionData.developerUrn = srcSessionData.developerUrn;
  destSessionData.credentialProfile = srcSessionData.credentialProfile;
  destSessionData.subsequentCalls = srcSessionData.subsequentCalls;
  destSessionData.history = srcSessionData.history;
  destSessionData.multipleClaimsAllowed = srcSessionData.multipleClaimsAllowed;
  destSessionData.multipleCancelsAllowed =
    srcSessionData.multipleCancelsAllowed;
  destSessionData.lastMessageReceivedTimestamp =
    srcSessionData.lastMessageReceivedTimestamp;
  destSessionData.processedTimestamps = srcSessionData.processedTimestamps;
  destSessionData.receivedTimestamps = srcSessionData.receivedTimestamps;
  destSessionData.lockAssertionClaim = srcSessionData.lockAssertionClaim;
  destSessionData.lockAssertionClaimFormat =
    srcSessionData.lockAssertionClaimFormat;
  destSessionData.mintAssertionClaim = srcSessionData.mintAssertionClaim;
  destSessionData.mintAssertionClaimFormat =
    srcSessionData.mintAssertionClaimFormat;
  destSessionData.burnAssertionClaim = srcSessionData.burnAssertionClaim;
  destSessionData.burnAssertionClaimFormat =
    srcSessionData.burnAssertionClaimFormat;
  destSessionData.assignmentAssertionClaim =
    srcSessionData.assignmentAssertionClaim;
  destSessionData.assignmentAssertionClaimFormat =
    srcSessionData.assignmentAssertionClaimFormat;
  destSessionData.completed = srcSessionData.completed;
  destSessionData.acceptance = srcSessionData.acceptance;
  destSessionData.lastMessageHash = srcSessionData.lastMessageHash;
  destSessionData.transferClaimsFormat = srcSessionData.transferClaimsFormat;
  destSessionData.clientTransferNumber = srcSessionData.clientTransferNumber;
  destSessionData.serverTransferNumber = srcSessionData.serverTransferNumber;
  destSessionData.lockAssertionExpiration =
    srcSessionData.lockAssertionExpiration;
  destSessionData.assetProfile = srcSessionData.assetProfile;
  destSessionData.senderContractOntology =
    srcSessionData.senderContractOntology;
  destSessionData.receiverContractOntology =
    srcSessionData.receiverContractOntology;
  destSessionData.resourceUrl = srcSessionData.resourceUrl;
  destSessionData.senderWrapAssertionClaim =
    srcSessionData.senderWrapAssertionClaim;
  destSessionData.receiverWrapAssertionClaim =
    srcSessionData.receiverWrapAssertionClaim;
  destSessionData.senderAsset = srcSessionData.senderAsset;
  destSessionData.receiverAsset = srcSessionData.receiverAsset;
}

export function saveTimestamp(
  session: SessionData | undefined,
  stageMessage: MessageType,
  type: TimestampType,
  time?: string,
) {
  if (session == undefined) {
    throw new Error("No session data provided");
  }

  let timestamps: MessageStagesTimestamps | undefined;

  let timestamp;

  if (!time) {
    timestamp = Date.now().toString();
  } else {
    timestamp = time;
  }

  switch (type) {
    case TimestampType.PROCESSED:
      timestamps = session.processedTimestamps;
      break;
    case TimestampType.RECEIVED:
      timestamps = session.receivedTimestamps;
      session.lastMessageReceivedTimestamp = timestamp;
      break;
  }

  if (
    timestamps == undefined ||
    timestamps.stage0 == undefined ||
    timestamps.stage1 == undefined ||
    timestamps.stage2 == undefined ||
    timestamps.stage3 == undefined
  ) {
    throw new Error("Timestamps are not initialized");
  }

  switch (stageMessage) {
    case MessageType.NEW_SESSION_REQUEST:
      timestamps.stage0.newSessionRequestMessageTimestamp = timestamp;
      break;
    case MessageType.NEW_SESSION_RESPONSE:
      timestamps.stage0.newSessionResponseMessageTimestamp = timestamp;
      break;
    case MessageType.PRE_SATP_TRANSFER_REQUEST:
      timestamps.stage0.preSatpTransferRequestMessageTimestamp = timestamp;
      break;
    case MessageType.PRE_SATP_TRANSFER_RESPONSE:
      timestamps.stage0.preSatpTransferResponseMessageTimestamp = timestamp;
      break;
    case MessageType.INIT_PROPOSAL:
      timestamps.stage1.transferProposalRequestMessageTimestamp = timestamp;
      break;
    case MessageType.INIT_RECEIPT:
      timestamps.stage1.transferProposalReceiptMessageTimestamp = timestamp;
      break;
    case MessageType.INIT_REJECT:
      timestamps.stage1.transferProposalRejectMessageTimestamp = timestamp;
      break;
    case MessageType.TRANSFER_COMMENCE_REQUEST:
      timestamps.stage1.transferCommenceRequestMessageTimestamp = timestamp;
      break;
    case MessageType.TRANSFER_COMMENCE_RESPONSE:
      timestamps.stage1.transferCommenceResponseMessageTimestamp = timestamp;
      break;
    case MessageType.LOCK_ASSERT:
      timestamps.stage2.lockAssertionRequestMessageTimestamp = timestamp;
      break;
    case MessageType.ASSERTION_RECEIPT:
      timestamps.stage2.lockAssertionReceiptMessageTimestamp = timestamp;
      break;
    case MessageType.COMMIT_PREPARE:
      timestamps.stage3.commitPreparationRequestMessageTimestamp = timestamp;
      break;
    case MessageType.COMMIT_READY:
      timestamps.stage3.commitReadyResponseMessageTimestamp = timestamp;
      break;
    case MessageType.COMMIT_FINAL:
      timestamps.stage3.commitFinalAssertionRequestMessageTimestamp = timestamp;
      break;
    case MessageType.ACK_COMMIT_FINAL:
      timestamps.stage3.commitFinalAcknowledgementReceiptResponseMessageTimestamp =
        timestamp;
      break;
    case MessageType.COMMIT_TRANSFER_COMPLETE:
      timestamps.stage3.transferCompleteMessageTimestamp = timestamp;
      break;
  }
}

export function saveHash(
  session: SessionData | undefined,
  stageMessage: MessageType,
  hash: string,
) {
  if (session == undefined) {
    throw new Error("No session data provided");
  }

  const hashes = session.hashes;

  if (
    hashes == undefined ||
    hashes.stage0 == undefined ||
    hashes.stage1 == undefined ||
    hashes.stage2 == undefined ||
    hashes.stage3 == undefined
  ) {
    throw new Error("Hashes are not initialized");
  }

  switch (stageMessage) {
    case MessageType.NEW_SESSION_REQUEST:
      hashes.stage0.newSessionRequestMessageHash = hash;
      break;
    case MessageType.NEW_SESSION_RESPONSE:
      hashes.stage0.newSessionResponseMessageHash = hash;
      break;
    case MessageType.PRE_SATP_TRANSFER_REQUEST:
      hashes.stage0.preSatpTransferRequestMessageHash = hash;
      break;
    case MessageType.PRE_SATP_TRANSFER_RESPONSE:
      hashes.stage0.preSatpTransferResponseMessageHash = hash;
      break;
    case MessageType.INIT_PROPOSAL:
      hashes.stage1.transferProposalRequestMessageHash = hash;
      break;
    case MessageType.INIT_RECEIPT:
      hashes.stage1.transferProposalReceiptMessageHash = hash;
      break;
    case MessageType.INIT_REJECT:
      hashes.stage1.transferProposalRejectMessageHash = hash;
      break;
    case MessageType.TRANSFER_COMMENCE_REQUEST:
      hashes.stage1.transferCommenceRequestMessageHash = hash;
      break;
    case MessageType.TRANSFER_COMMENCE_RESPONSE:
      hashes.stage1.transferCommenceResponseMessageHash = hash;
      break;
    case MessageType.LOCK_ASSERT:
      hashes.stage2.lockAssertionRequestMessageHash = hash;
      break;
    case MessageType.ASSERTION_RECEIPT:
      hashes.stage2.lockAssertionReceiptMessageHash = hash;
      break;
    case MessageType.COMMIT_PREPARE:
      hashes.stage3.commitPreparationRequestMessageHash = hash;
      break;
    case MessageType.COMMIT_READY:
      hashes.stage3.commitReadyResponseMessageHash = hash;
      break;
    case MessageType.COMMIT_FINAL:
      hashes.stage3.commitFinalAssertionRequestMessageHash = hash;
      break;
    case MessageType.ACK_COMMIT_FINAL:
      hashes.stage3.commitFinalAcknowledgementReceiptResponseMessageHash = hash;
      break;
    case MessageType.COMMIT_TRANSFER_COMPLETE:
      hashes.stage3.transferCompleteMessageHash = hash;
      break;
  }
}

export function saveSignature(
  sessionData: SessionData | undefined,
  stageMessage: MessageType,
  signature: string,
) {
  if (sessionData == undefined) {
    throw new Error("No session data provided");
  }

  const signatures = sessionData.signatures;

  if (
    signatures == undefined ||
    signatures.stage0 == undefined ||
    signatures.stage1 == undefined ||
    signatures.stage2 == undefined ||
    signatures.stage3 == undefined
  ) {
    throw new Error("Signatures are not initialized");
  }

  switch (stageMessage) {
    case MessageType.NEW_SESSION_REQUEST:
      signatures.stage0.newSessionRequestMessageSignature = signature;
      break;
    case MessageType.NEW_SESSION_RESPONSE:
      signatures.stage0.newSessionResponseMessageSignature = signature;
      break;
    case MessageType.PRE_SATP_TRANSFER_REQUEST:
      signatures.stage0.preSatpTransferRequestMessageSignature = signature;
      break;
    case MessageType.PRE_SATP_TRANSFER_RESPONSE:
      signatures.stage0.preSatpTransferResponseMessageSignature = signature;
      break;
    case MessageType.INIT_PROPOSAL:
      signatures.stage1.transferProposalRequestMessageSignature = signature;
      break;
    case MessageType.INIT_RECEIPT:
      signatures.stage1.transferProposalReceiptMessageSignature = signature;
      break;
    case MessageType.INIT_REJECT:
      signatures.stage1.transferProposalRejectMessageSignature = signature;
      break;
    case MessageType.TRANSFER_COMMENCE_REQUEST:
      signatures.stage1.transferCommenceRequestMessageSignature = signature;
      break;
    case MessageType.TRANSFER_COMMENCE_RESPONSE:
      signatures.stage1.transferCommenceResponseMessageSignature = signature;
      break;
    case MessageType.LOCK_ASSERT:
      signatures.stage2.lockAssertionRequestMessageSignature = signature;
      break;
    case MessageType.ASSERTION_RECEIPT:
      signatures.stage2.lockAssertionReceiptMessageSignature = signature;
      break;
    case MessageType.COMMIT_PREPARE:
      signatures.stage3.commitPreparationRequestMessageSignature = signature;
      break;
    case MessageType.COMMIT_READY:
      signatures.stage3.commitReadyResponseMessageSignature = signature;
      break;
    case MessageType.COMMIT_FINAL:
      signatures.stage3.commitFinalAssertionRequestMessageSignature = signature;
      break;
    case MessageType.ACK_COMMIT_FINAL:
      signatures.stage3.commitFinalAcknowledgementReceiptResponseMessageSignature =
        signature;
      break;
    case MessageType.COMMIT_TRANSFER_COMPLETE:
      signatures.stage3.transferCompleteMessageSignature = signature;
      break;
  }
}

export function getPreviousMessageType(
  sessionData: SessionData | undefined,
  type: MessageType,
): MessageType {
  if (sessionData == undefined) {
    throw new Error("No session data provided");
  }

  switch (type) {
    case MessageType.INIT_PROPOSAL:
      MessageType.UNSPECIFIED;
    case MessageType.INIT_RECEIPT:
      return MessageType.INIT_PROPOSAL;
    case MessageType.INIT_REJECT:
      return MessageType.INIT_PROPOSAL;
    case MessageType.TRANSFER_COMMENCE_REQUEST:
      if (sessionData.hashes?.stage1?.transferProposalRejectMessageHash) {
        return MessageType.INIT_REJECT;
      }
      return MessageType.INIT_RECEIPT;
    case MessageType.TRANSFER_COMMENCE_RESPONSE:
      return MessageType.TRANSFER_COMMENCE_REQUEST;
    case MessageType.LOCK_ASSERT:
      return MessageType.TRANSFER_COMMENCE_RESPONSE;
    case MessageType.ASSERTION_RECEIPT:
      return MessageType.LOCK_ASSERT;
    case MessageType.COMMIT_PREPARE:
      return MessageType.ASSERTION_RECEIPT;
    case MessageType.COMMIT_READY:
      return MessageType.COMMIT_PREPARE;
    case MessageType.COMMIT_FINAL:
      return MessageType.COMMIT_READY;
    case MessageType.ACK_COMMIT_FINAL:
      return MessageType.COMMIT_FINAL;
    case MessageType.COMMIT_TRANSFER_COMPLETE:
      return MessageType.ACK_COMMIT_FINAL;
    default:
      throw new Error("Message type not found");
  }
}

export function getMessageHash(
  sessionData: SessionData | undefined,
  messageType: MessageType,
): string {
  if (sessionData == undefined) {
    throw new Error("No session data provided");
  }

  if (
    sessionData.hashes == undefined ||
    sessionData.hashes.stage0 == undefined ||
    sessionData.hashes.stage1 == undefined ||
    sessionData.hashes.stage2 == undefined ||
    sessionData.hashes.stage3 == undefined
  ) {
    throw new Error("sessionData.hashes are not initialized");
  }

  switch (messageType) {
    case MessageType.NEW_SESSION_REQUEST:
      return sessionData.hashes.stage0.newSessionRequestMessageHash;
    case MessageType.NEW_SESSION_RESPONSE:
      return sessionData.hashes.stage0.newSessionResponseMessageHash;
    case MessageType.PRE_SATP_TRANSFER_REQUEST:
      return sessionData.hashes.stage0.preSatpTransferRequestMessageHash;
    case MessageType.PRE_SATP_TRANSFER_RESPONSE:
      return sessionData.hashes.stage0.preSatpTransferResponseMessageHash;
    case MessageType.INIT_PROPOSAL:
      return sessionData.hashes.stage1.transferProposalRequestMessageHash;
    case MessageType.INIT_RECEIPT:
      return sessionData.hashes.stage1.transferProposalReceiptMessageHash;
    case MessageType.INIT_REJECT:
      return sessionData.hashes.stage1.transferProposalRejectMessageHash;
    case MessageType.TRANSFER_COMMENCE_REQUEST:
      return sessionData.hashes.stage1.transferCommenceRequestMessageHash;
    case MessageType.TRANSFER_COMMENCE_RESPONSE:
      return sessionData.hashes.stage1.transferCommenceResponseMessageHash;
    case MessageType.LOCK_ASSERT:
      return sessionData.hashes.stage2.lockAssertionRequestMessageHash;
    case MessageType.ASSERTION_RECEIPT:
      return sessionData.hashes.stage2.lockAssertionReceiptMessageHash;
    case MessageType.COMMIT_PREPARE:
      return sessionData.hashes.stage3.commitPreparationRequestMessageHash;
    case MessageType.COMMIT_READY:
      return sessionData.hashes.stage3.commitReadyResponseMessageHash;
    case MessageType.COMMIT_FINAL:
      return sessionData.hashes.stage3.commitFinalAssertionRequestMessageHash;
    case MessageType.ACK_COMMIT_FINAL:
      return sessionData.hashes.stage3
        .commitFinalAcknowledgementReceiptResponseMessageHash;
    case MessageType.COMMIT_TRANSFER_COMPLETE:
      return sessionData.hashes.stage3.transferCompleteMessageHash;
    default:
      throw new Error("Message type not found");
  }
}

export function getMessageTimestamp(
  sessionData: SessionData | undefined,
  stageMessage: MessageType,
  type: TimestampType,
): string {
  if (sessionData == undefined) {
    throw new Error("No session data provided");
  }

  let timestamps: MessageStagesTimestamps | undefined;

  switch (type) {
    case TimestampType.PROCESSED:
      timestamps = sessionData.processedTimestamps;
      break;
    case TimestampType.RECEIVED:
      timestamps = sessionData.receivedTimestamps;
      break;
  }

  if (
    timestamps == undefined ||
    timestamps.stage0 == undefined ||
    timestamps.stage1 == undefined ||
    timestamps.stage2 == undefined ||
    timestamps.stage3 == undefined
  ) {
    throw new Error("Timestamps are not initialized");
  }

  switch (stageMessage) {
    case MessageType.NEW_SESSION_REQUEST:
      return timestamps.stage0.newSessionRequestMessageTimestamp;
    case MessageType.NEW_SESSION_RESPONSE:
      return timestamps.stage0.newSessionResponseMessageTimestamp;
    case MessageType.PRE_SATP_TRANSFER_REQUEST:
      return timestamps.stage0.preSatpTransferRequestMessageTimestamp;
    case MessageType.PRE_SATP_TRANSFER_RESPONSE:
      return timestamps.stage0.preSatpTransferResponseMessageTimestamp;
    case MessageType.INIT_PROPOSAL:
      return timestamps.stage1.transferProposalRequestMessageTimestamp;
    case MessageType.INIT_RECEIPT:
      return timestamps.stage1.transferProposalReceiptMessageTimestamp;
    case MessageType.INIT_REJECT:
      return timestamps.stage1.transferProposalRejectMessageTimestamp;
    case MessageType.TRANSFER_COMMENCE_REQUEST:
      return timestamps.stage1.transferCommenceRequestMessageTimestamp;
    case MessageType.TRANSFER_COMMENCE_RESPONSE:
      return timestamps.stage1.transferCommenceResponseMessageTimestamp;
    case MessageType.LOCK_ASSERT:
      return timestamps.stage2.lockAssertionRequestMessageTimestamp;
    case MessageType.ASSERTION_RECEIPT:
      return timestamps.stage2.lockAssertionReceiptMessageTimestamp;
    case MessageType.COMMIT_PREPARE:
      return timestamps.stage3.commitPreparationRequestMessageTimestamp;
    case MessageType.COMMIT_READY:
      return timestamps.stage3.commitReadyResponseMessageTimestamp;
    case MessageType.COMMIT_FINAL:
      return timestamps.stage3.commitFinalAssertionRequestMessageTimestamp;
    case MessageType.ACK_COMMIT_FINAL:
      return timestamps.stage3
        .commitFinalAcknowledgementReceiptResponseMessageTimestamp;
    case MessageType.COMMIT_TRANSFER_COMPLETE:
      return timestamps.stage3.transferCompleteMessageTimestamp;
    default:
      throw new Error("Message hash not found");
  }
}
