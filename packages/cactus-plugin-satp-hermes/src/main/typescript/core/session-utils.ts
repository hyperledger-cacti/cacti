import { create, isMessage } from "@bufbuild/protobuf";
import {
  AssetSchema,
  CredentialProfile,
  LockType,
  MessageType,
  SignatureAlgorithm,
} from "../generated/proto/cacti/satp/v02/common/message_pb";
import {
  MessageStagesTimestamps,
  SATPStage,
  SessionData,
  State,
} from "../generated/proto/cacti/satp/v02/common/session_pb";
import {
  NewSessionRequestMessage,
  NewSessionRequestMessageSchema,
  NewSessionResponseMessage,
  NewSessionResponseMessageSchema,
  PreSATPTransferRequestMessage,
  PreSATPTransferRequestMessageSchema,
  PreSATPTransferResponseMessage,
  PreSATPTransferResponseMessageSchema,
} from "../generated/proto/cacti/satp/v02/stage_0_pb";
import {
  TransferProposalRequestMessage,
  TransferProposalReceiptMessage,
  TransferCommenceRequestMessage,
  TransferCommenceResponseMessage,
  TransferProposalRequestMessageSchema,
  TransferProposalReceiptMessageSchema,
  TransferCommenceRequestMessageSchema,
  TransferCommenceResponseMessageSchema,
} from "../generated/proto/cacti/satp/v02/stage_1_pb";
import {
  LockAssertionRequestMessage,
  LockAssertionReceiptMessage,
  LockAssertionRequestMessageSchema,
  LockAssertionReceiptMessageSchema,
} from "../generated/proto/cacti/satp/v02/stage_2_pb";
import {
  CommitPreparationRequestMessage,
  CommitReadyResponseMessage,
  CommitFinalAssertionRequestMessage,
  TransferCompleteRequestMessage,
  TransferCompleteResponseMessage,
  CommitFinalAcknowledgementReceiptResponseMessage,
  CommitFinalAcknowledgementReceiptResponseMessageSchema,
  CommitFinalAssertionRequestMessageSchema,
  CommitPreparationRequestMessageSchema,
  CommitReadyResponseMessageSchema,
  TransferCompleteRequestMessageSchema,
  TransferCompleteResponseMessageSchema,
} from "../generated/proto/cacti/satp/v02/stage_3_pb";
import { getEnumKeyByValue } from "../utils/utils";
import { SATPInternalError } from "./errors/satp-errors";
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
  receiverContractAddress: string | undefined,
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
  receiverMspId: string,
  receiverChannelName: string,
  sourceContractName: string,
  receiverContractName: string,
  sourceOwner: string,
  receiverOwner: string,
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
  sessionData.senderAsset = create(AssetSchema, {
    tokenId: uuidv4() + "-" + sessionData.transferContextId,
    owner: sourceOwner,
    ontology: senderContractOntology,
    contractName: sourceContractName,
    contractAddress: sourceContractAddress || "",
    amount: BigInt(fromAmount),
    mspId: sourceMspId,
    channelName: sourceChannelName,
  });

  sessionData.receiverAsset = create(AssetSchema, {
    tokenId: "",
    owner: receiverOwner,
    ontology: receiverContractOntology,
    contractName: receiverContractName,
    contractAddress: receiverContractAddress || "",
    amount: BigInt(toAmount),
    mspId: receiverMspId,
    channelName: receiverChannelName,
  });

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
  destSessionData.state = srcSessionData.state;
  destSessionData.errorCode = srcSessionData.errorCode;
  destSessionData.phaseError = srcSessionData.phaseError;
  destSessionData.recoveredTried = srcSessionData.recoveredTried;
  destSessionData.satpMessages = srcSessionData.satpMessages;
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
    case MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE:
      timestamps.stage3.transferCompleteResponseMessageTimestamp = timestamp;
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
    case MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE:
      hashes.stage3.transferCompleteResponseMessageHash = hash;
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
    case MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE:
      signatures.stage3.transferCompleteResponseMessageSignature = signature;
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
    case MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE:
      return MessageType.COMMIT_TRANSFER_COMPLETE;
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

export function setError(
  session: SATPSession | undefined,
  stageMessage: MessageType,
  error: SATPInternalError,
) {
  if (session == undefined) {
    return;
  }

  let sessionData: SessionData | undefined;
  switch (stageMessage) {
    case MessageType.NEW_SESSION_REQUEST:
    case MessageType.PRE_SATP_TRANSFER_REQUEST:
    case MessageType.INIT_PROPOSAL:
    case MessageType.TRANSFER_COMMENCE_REQUEST:
    case MessageType.LOCK_ASSERT:
    case MessageType.COMMIT_PREPARE:
    case MessageType.COMMIT_FINAL:
    case MessageType.COMMIT_TRANSFER_COMPLETE:
      sessionData = session.getClientSessionData();
      break;
    case MessageType.NEW_SESSION_RESPONSE:
    case MessageType.PRE_SATP_TRANSFER_RESPONSE:
    case MessageType.INIT_RECEIPT:
    case MessageType.INIT_REJECT:
    case MessageType.TRANSFER_COMMENCE_RESPONSE:
    case MessageType.ASSERTION_RECEIPT:
    case MessageType.COMMIT_READY:
    case MessageType.ACK_COMMIT_FINAL:
    case MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE:
      sessionData = session.getServerSessionData();
      break;
    default:
      return;
  }

  sessionData.state = State.ERROR;
  sessionData.errorCode = error.getSATPErrorType();
  sessionData.phaseError = stageMessage;
}

// The same as setError but the checking iccours in the opposite gateway.
export function setErrorChecking(
  session: SATPSession | undefined,
  stageMessage: MessageType,
  error: SATPInternalError,
) {
  if (session == undefined) {
    return;
  }

  let sessionData: SessionData | undefined;
  switch (stageMessage) {
    case MessageType.NEW_SESSION_REQUEST:
    case MessageType.PRE_SATP_TRANSFER_REQUEST:
    case MessageType.INIT_PROPOSAL:
    case MessageType.TRANSFER_COMMENCE_REQUEST:
    case MessageType.LOCK_ASSERT:
    case MessageType.COMMIT_PREPARE:
    case MessageType.COMMIT_FINAL:
    case MessageType.COMMIT_TRANSFER_COMPLETE:
      sessionData = session.getServerSessionData();
      break;
    case MessageType.NEW_SESSION_RESPONSE:
    case MessageType.PRE_SATP_TRANSFER_RESPONSE:
    case MessageType.INIT_RECEIPT:
    case MessageType.INIT_REJECT:
    case MessageType.TRANSFER_COMMENCE_RESPONSE:
    case MessageType.ASSERTION_RECEIPT:
    case MessageType.COMMIT_READY:
    case MessageType.ACK_COMMIT_FINAL:
    case MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE:
      sessionData = session.getClientSessionData();
      break;
    default:
      return;
  }

  sessionData.state = State.ERROR;
  sessionData.errorCode = error.getSATPErrorType();
  sessionData.phaseError = stageMessage;
}

export function getStateName(state: State): string {
  return getEnumKeyByValue(State, state) || "Unknown";
}

export function getStageName(stage: SATPStage): string {
  return getEnumKeyByValue(SATPStage, stage) || "Unknown";
}

export function getSessionActualStage(
  sessionData: SessionData,
): [SATPStage, MessageType] {
  let stage: SATPStage = SATPStage.STAGE_UNKNOWN;
  let messageType: MessageType = MessageType.UNSPECIFIED;

  if (!sessionData.hashes) {
    throw new Error("Session hashes are not initialized");
  }
  if (sessionData.hashes.stage0) {
    stage = SATPStage.STAGE_0;
    if (sessionData.hashes.stage0.newSessionRequestMessageHash) {
      messageType = MessageType.NEW_SESSION_REQUEST;
    }
    if (sessionData.hashes.stage0.newSessionResponseMessageHash) {
      messageType = MessageType.NEW_SESSION_RESPONSE;
    }
    if (sessionData.hashes.stage0.preSatpTransferRequestMessageHash) {
      messageType = MessageType.PRE_SATP_TRANSFER_REQUEST;
    }
    if (sessionData.hashes.stage0.preSatpTransferResponseMessageHash) {
      messageType = MessageType.PRE_SATP_TRANSFER_RESPONSE;
    }
  }
  if (sessionData.hashes.stage1) {
    stage = SATPStage.STAGE_1;
    if (sessionData.hashes.stage1.transferProposalRequestMessageHash) {
      messageType = MessageType.INIT_PROPOSAL;
    }
    if (sessionData.hashes.stage1.transferProposalReceiptMessageHash) {
      messageType = MessageType.INIT_RECEIPT;
    }
    if (sessionData.hashes.stage1.transferProposalRejectMessageHash) {
      messageType = MessageType.INIT_REJECT;
    }
    if (sessionData.hashes.stage1.transferCommenceRequestMessageHash) {
      messageType = MessageType.TRANSFER_COMMENCE_REQUEST;
    }
    if (sessionData.hashes.stage1.transferCommenceResponseMessageHash) {
      messageType = MessageType.TRANSFER_COMMENCE_RESPONSE;
    }
  }
  if (sessionData.hashes.stage2) {
    stage = SATPStage.STAGE_2;
    if (sessionData.hashes.stage2.lockAssertionRequestMessageHash) {
      messageType = MessageType.LOCK_ASSERT;
    }
    if (sessionData.hashes.stage2.lockAssertionReceiptMessageHash) {
      messageType = MessageType.ASSERTION_RECEIPT;
    }
  }
  if (sessionData.hashes.stage3) {
    stage = SATPStage.STAGE_3;
    if (sessionData.hashes.stage3.commitPreparationRequestMessageHash) {
      messageType = MessageType.COMMIT_PREPARE;
    }
    if (sessionData.hashes.stage3.commitReadyResponseMessageHash) {
      messageType = MessageType.COMMIT_READY;
    }
    if (sessionData.hashes.stage3.commitFinalAssertionRequestMessageHash) {
      messageType = MessageType.COMMIT_FINAL;
    }
    if (
      sessionData.hashes.stage3
        .commitFinalAcknowledgementReceiptResponseMessageHash
    ) {
      messageType = MessageType.ACK_COMMIT_FINAL;
    }
    if (sessionData.hashes.stage3.transferCompleteMessageHash) {
      messageType = MessageType.COMMIT_TRANSFER_COMPLETE;
    }
    if (sessionData.hashes.stage3.transferCompleteResponseMessageHash) {
      messageType = MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE;
    }
  }
  return [stage, messageType];
}

export function saveMessageInSessionData(
  sessionData: SessionData,
  message:
    | NewSessionRequestMessage
    | NewSessionResponseMessage
    | PreSATPTransferRequestMessage
    | PreSATPTransferResponseMessage
    | TransferProposalRequestMessage
    | TransferProposalReceiptMessage
    | TransferCommenceRequestMessage
    | TransferCommenceResponseMessage
    | LockAssertionRequestMessage
    | LockAssertionReceiptMessage
    | CommitPreparationRequestMessage
    | CommitReadyResponseMessage
    | CommitFinalAssertionRequestMessage
    | CommitFinalAcknowledgementReceiptResponseMessage
    | TransferCompleteRequestMessage
    | TransferCompleteResponseMessage,
): void {
  if (!sessionData) {
    throw new Error("SessionData undefined");
  }
  if (
    !sessionData.satpMessages ||
    !sessionData.satpMessages.stage0 ||
    !sessionData.satpMessages.stage1 ||
    !sessionData.satpMessages.stage2 ||
    !sessionData.satpMessages.stage3
  ) {
    throw new Error("Session messages are not initialized");
  }

  if (isMessage(message, NewSessionRequestMessageSchema)) {
    sessionData.satpMessages.stage0.newSessionRequestMessage = message;
  } else if (isMessage(message, NewSessionResponseMessageSchema)) {
    sessionData.satpMessages.stage0.newSessionResponseMessage = message;
  } else if (isMessage(message, PreSATPTransferRequestMessageSchema)) {
    sessionData.satpMessages.stage0.preSatpTransferRequestMessage = message;
  } else if (isMessage(message, PreSATPTransferResponseMessageSchema)) {
    sessionData.satpMessages.stage0.preSatpTransferResponseMessage = message;
  } else if (isMessage(message, TransferProposalRequestMessageSchema)) {
    sessionData.satpMessages.stage1.transferProposalRequestMessage = message;
  } else if (isMessage(message, TransferProposalReceiptMessageSchema)) {
    sessionData.satpMessages.stage1.transferProposalReceiptMessage = message;
  } else if (isMessage(message, TransferCommenceRequestMessageSchema)) {
    sessionData.satpMessages.stage1.transferCommenceRequestMessage = message;
  } else if (isMessage(message, TransferCommenceResponseMessageSchema)) {
    sessionData.satpMessages.stage1.transferCommenceResponseMessage = message;
  } else if (isMessage(message, LockAssertionRequestMessageSchema)) {
    sessionData.satpMessages.stage2.lockAssertionRequestMessage = message;
  } else if (isMessage(message, LockAssertionReceiptMessageSchema)) {
    sessionData.satpMessages.stage2.lockAssertionReceiptMessage = message;
  } else if (isMessage(message, CommitPreparationRequestMessageSchema)) {
    sessionData.satpMessages.stage3.commitPreparationRequestMessage = message;
  } else if (isMessage(message, CommitReadyResponseMessageSchema)) {
    sessionData.satpMessages.stage3.commitReadyResponseMessage = message;
  } else if (isMessage(message, CommitFinalAssertionRequestMessageSchema)) {
    sessionData.satpMessages.stage3.commitFinalAssertionRequestMessage =
      message;
  } else if (
    isMessage(message, CommitFinalAcknowledgementReceiptResponseMessageSchema)
  ) {
    sessionData.satpMessages.stage3.commitFinalAcknowledgementReceiptResponseMessage =
      message;
  } else if (isMessage(message, TransferCompleteRequestMessageSchema)) {
    sessionData.satpMessages.stage3.transferCompleteMessage = message;
  } else if (isMessage(message, TransferCompleteResponseMessageSchema)) {
    sessionData.satpMessages.stage3.transferCompleteResponseMessage = message;
  } else {
    throw new Error("Message type not found");
  }
}

export function getMessageInSessionData(
  sessionData: SessionData,
  messageType: MessageType,
):
  | NewSessionRequestMessage
  | NewSessionResponseMessage
  | PreSATPTransferRequestMessage
  | PreSATPTransferResponseMessage
  | TransferProposalRequestMessage
  | TransferProposalReceiptMessage
  | TransferCommenceRequestMessage
  | TransferCommenceResponseMessage
  | LockAssertionRequestMessage
  | LockAssertionReceiptMessage
  | CommitPreparationRequestMessage
  | CommitReadyResponseMessage
  | CommitFinalAssertionRequestMessage
  | CommitFinalAcknowledgementReceiptResponseMessage
  | TransferCompleteRequestMessage
  | TransferCompleteResponseMessage
  | undefined {
  if (!sessionData) {
    throw new Error("SessionData undefined");
  }
  if (
    !sessionData.satpMessages ||
    !sessionData.satpMessages.stage0 ||
    !sessionData.satpMessages.stage1 ||
    !sessionData.satpMessages.stage2 ||
    !sessionData.satpMessages.stage3
  ) {
    throw new Error("Session messages are not initialized");
  }
  switch (messageType) {
    case MessageType.NEW_SESSION_REQUEST:
      return sessionData.satpMessages.stage0.newSessionRequestMessage;
    case MessageType.NEW_SESSION_RESPONSE:
      return sessionData.satpMessages.stage0.newSessionResponseMessage;
    case MessageType.PRE_SATP_TRANSFER_REQUEST:
      return sessionData.satpMessages.stage0.preSatpTransferRequestMessage;
    case MessageType.PRE_SATP_TRANSFER_RESPONSE:
      return sessionData.satpMessages.stage0.preSatpTransferResponseMessage;
    case MessageType.INIT_PROPOSAL:
      return sessionData.satpMessages.stage1.transferProposalRequestMessage;
    case MessageType.INIT_RECEIPT:
    case MessageType.INIT_REJECT:
      return sessionData.satpMessages.stage1.transferProposalReceiptMessage;
    case MessageType.TRANSFER_COMMENCE_REQUEST:
      return sessionData.satpMessages.stage1.transferCommenceRequestMessage;
    case MessageType.TRANSFER_COMMENCE_RESPONSE:
      return sessionData.satpMessages.stage1.transferCommenceResponseMessage;
    case MessageType.LOCK_ASSERT:
      return sessionData.satpMessages.stage2.lockAssertionRequestMessage;
    case MessageType.ASSERTION_RECEIPT:
      return sessionData.satpMessages.stage2.lockAssertionReceiptMessage;
    case MessageType.COMMIT_PREPARE:
      return sessionData.satpMessages.stage3.commitPreparationRequestMessage;
    case MessageType.COMMIT_READY:
      return sessionData.satpMessages.stage3.commitReadyResponseMessage;
    case MessageType.COMMIT_FINAL:
      return sessionData.satpMessages.stage3.commitFinalAssertionRequestMessage;
    case MessageType.ACK_COMMIT_FINAL:
      return sessionData.satpMessages.stage3
        .commitFinalAcknowledgementReceiptResponseMessage;
    case MessageType.COMMIT_TRANSFER_COMPLETE:
      return sessionData.satpMessages.stage3.transferCompleteMessage;
    case MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE:
      return sessionData.satpMessages.stage3.transferCompleteResponseMessage;
    default:
      throw new Error("Message type not found");
  }
}
