import { TransactRequest, TransactResponse } from "../../public-api";
import { SATPManager } from "../../services/gateway/satp-manager";
import {
  populateClientSessionData,
  validateTransactRequest,
} from "../../core/session-utils";
import { LockType } from "../../generated/proto/cacti/satp/v13/common/message_pb";
import { LoggerProvider, LogLevelDesc } from "@hyperledger-cacti/cactus-common";
import { GatewayOrchestrator } from "../../services/gateway/gateway-orchestrator";
import { GatewayIdentity } from "../../core/types";
import {
  DEFAULT_TLS13_CIPHER_SUITE,
  SATP_CORE_VERSION,
} from "../../core/constants";
import { getStatusService } from "../admin/get-status-handler-service";
import { ercStandardToEnum } from "../../core/satp-utils";

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

  validateTransactRequest(req, fnTag);

  const ourGateway: GatewayIdentity = orchestrator.ourGateway;

  const senderGatewayOwnerId: string = ourGateway.id;

  //This data is set in satpManager GOL
  const serverGatewayPubkey: string = "";
  const receiverGatewayOwnerId: string = "";

  //Default, make it configurable by injecting sign function
  const signatureAlgorithm = "ES256";

  //Default, TODO
  const lockType: LockType = LockType.TIME_LOCK;
  //In milliseconds (5min)
  const lockExpirationTime: bigint = BigInt(1000 * 60 * 5);

  const loggingProfile: string = "MOCK_LOGGING_PROFILE";
  const accessControlProfile: string = "MOCK_ACCESS_CONTROL_PROFILE";

  //todo verify ontologies signatures, validation, etc.

  let session = manager.getOrCreateSession(undefined, req.contextID);
  session = populateClientSessionData(
    session,
    SATP_CORE_VERSION,
    req.sourceAsset.contractAddress,
    req.receiverAsset.contractAddress,
    manager.pubKey,
    serverGatewayPubkey,
    receiverGatewayOwnerId,
    senderGatewayOwnerId,
    signatureAlgorithm,
    DEFAULT_TLS13_CIPHER_SUITE,
    lockType,
    lockExpirationTime,
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
    req.sourceAsset.uniqueDescriptor,
    req.receiverAsset.uniqueDescriptor,
    ercStandardToEnum(req.sourceAsset.ercTokenStandard),
    ercStandardToEnum(req.receiverAsset.ercTokenStandard),
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
