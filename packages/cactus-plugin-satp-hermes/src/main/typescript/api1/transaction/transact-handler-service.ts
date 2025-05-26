import { TransactRequest, TransactResponse } from "../../public-api";
import { SATPManager } from "../../services/gateway/satp-manager";
import { populateClientSessionData } from "../../core/session-utils";
import {
  CredentialProfile,
  LockType,
  SignatureAlgorithm,
} from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { GatewayOrchestrator } from "../../services/gateway/gateway-orchestrator";
import { GatewayIdentity } from "../../core/types";
import { SATP_VERSION } from "../../core/constants";
import { getStatusService } from "../admin/get-status-handler-service";

export async function executeTransact(
  logLevel: LogLevelDesc,
  req: TransactRequest,
  manager: SATPManager,
  orchestrator: GatewayOrchestrator,
): Promise<TransactResponse> {
  const fnTag = `executeTransact()`;
  const logger = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  logger.info(`${fnTag}, executing transaction endpoint`);

  //TODO check input for valid strings...
  const ourGateway: GatewayIdentity = orchestrator.ourGateway;
  const senderGatewayOwnerId: string = ourGateway.id;

  //This data is set in satpManager GOL
  const serverGatewayPubkey: string = "";
  const receiverGatewayOwnerId: string = "";

  //Default, make it configurable by injecting sign function
  const signatureAlgorithm: SignatureAlgorithm = SignatureAlgorithm.ECDSA;

  //Default, TODO
  const lockType: LockType = LockType.DESTROYBURN;
  //In milliseconds (5min)
  const lockExpirationTime: bigint = BigInt(1000 * 60 * 5);

  const credentialProfile: CredentialProfile = CredentialProfile.UNSPECIFIED;
  const loggingProfile: string = "MOCK_LOGGING_PROFILE";
  const accessControlProfile: string = "MOCK_ACCESS_CONTROL_PROFILE";

  //todo verify ontologies signatures, validation, etc.

  let session = manager.getOrCreateSession(undefined, req.contextID);
  session = populateClientSessionData(
    session,
    SATP_VERSION,
    req.sourceAsset.contractAddress,
    req.receiverAsset.contractAddress,
    manager.pubKey,
    serverGatewayPubkey,
    receiverGatewayOwnerId,
    senderGatewayOwnerId,
    signatureAlgorithm,
    lockType,
    lockExpirationTime,
    credentialProfile,
    loggingProfile ? loggingProfile : "",
    accessControlProfile,
    req.sourceAsset.amount,
    req.receiverAsset.amount,
    req.sourceAsset.mspId ? req.sourceAsset.mspId : "",
    req.sourceAsset.channelName ? req.sourceAsset.channelName : "",
    req.receiverAsset.mspId ? req.receiverAsset.mspId : "",
    req.receiverAsset.channelName ? req.receiverAsset.channelName : "",
    req.sourceAsset.contractName,
    req.receiverAsset.contractName,
    req.sourceAsset.owner,
    req.receiverAsset.owner,
    req.sourceAsset.networkId.id,
    req.sourceAsset.referenceId,
    req.sourceAsset.networkId.ledgerType,
    req.sourceAsset.tokenType,
    req.receiverAsset.networkId.id,
    req.receiverAsset.referenceId,
    req.receiverAsset.networkId.ledgerType,
    req.receiverAsset.tokenType,
  );
  await manager.transfer(session);

  logger.info(`${fnTag}, ${req}`);

  return {
    sessionID: session.getSessionId(),
    statusResponse: await getStatusService(
      logLevel,
      { sessionID: session.getSessionId() },
      manager,
    ),
  };
}
