import { SATPInternalError } from "./satp-errors";
import { Error as SATPErrorType } from "../../generated/proto/cacti/satp/v02/common/message_pb";
export class SatpCommonBodyError extends SATPInternalError {
  constructor(tag: string, data: string, cause?: string | Error | null) {
    super(
      `${tag}, message satp common body is missing or is missing required fields \n ${data}`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.COMMON_BODY_BADLY_FORMATED;
  }
}
export class SessionError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, session undefined`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_NOT_FOUND;
  }
}

export class SessionIdError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, session id undefined`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_ID_NOT_FOUND;
  }
}

export class SessionMissMatchError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, session missmatch`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_MISS_MATCH;
  }
}

export class SessionDataNotLoadedCorrectlyError extends SATPInternalError {
  constructor(tag: string, data: string, cause?: string | Error | null) {
    super(
      `${tag}, session data was not loaded correctly \n ${data} \n stack: ${cause} `,
      cause ?? null,
      500,
    );
    this.errorType = SATPErrorType.SESSION_DATA_LOADED_INCORRECTLY;
  }
}

export class SessionDataNotAvailableError extends SATPInternalError {
  constructor(tag: string, type: string, cause?: string | Error | null) {
    super(`${tag}, ${type} session data not available`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_DATA_NOT_FOUND;
  }
}

export class SessionCompletedError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, session data already completed`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_COMPLETED;
  }
}

export class SATPVersionError extends SATPInternalError {
  constructor(
    tag: string,
    cause?: string | Error | null,
    unsupported?: string,
    supported?: string,
  ) {
    if (!supported) {
      super(`${tag}, SATP version is missing`, cause ?? null, 400);
      this.errorType = SATPErrorType.MISSING_PARAMETER;
    } else {
      super(
        `${tag}, unsupported SATP version \n received: ${unsupported}, supported: ${supported}`,
        cause ?? null,
        400,
      );
      this.errorType = SATPErrorType.SATP_VERSION_NOT_SUPPORTED;
    }
  }
}

export class SignatureAlgorithmError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, signature algorithm is missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class SignatureVerificationError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, message signature verification failed`, cause ?? null, 400);
    this.errorType = SATPErrorType.SIGNATURE_VERIFICATION_FAILED;
  }
}

export class SignatureMissingError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, message signature missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class LockTypeError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, lock type missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class lockExpirationTimeError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, lock expiration time missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class CredentialProfileError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, credential profile missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class LoggingProfileError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, logging profile missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class AccessControlProfileError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, access control profile missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class MessageTypeError extends SATPInternalError {
  constructor(
    tag: string,
    received: string,
    expected1: string,
    expected2?: string,
    cause?: string | Error | null,
  ) {
    if (expected2) {
      super(
        `${tag}, message type miss match \n received: ${received} \n expected: ${expected1} or ${expected2}`,
        cause ?? null,
        400,
      );
    } else {
      super(
        `${tag}, message type miss match \n received: ${received} \n expected: ${expected1}`,
        cause ?? null,
        400,
      );
    }
    this.errorType = SATPErrorType.MESSAGE_OUT_OF_SEQUENCE;
  }
}

export class TransferInitClaimsError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, transferInitClaims missing or faulty`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class TransferInitClaimsHashError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, transferInitClaims hash missing or missmatch`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class NetworkCapabilitiesError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, NetworkCapabilitiesError missing or faulty`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class DLTNotSupportedError extends SATPInternalError {
  constructor(tag: string, dlt: string, cause?: string | Error | null) {
    super(`${tag}, DLT not supported \n received: ${dlt}`, cause ?? null, 400);
    this.errorType = SATPErrorType.DLT_NOT_SUPPORTED;
  }
}

export class ServerGatewayPubkeyError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, serverGatewayPubkey missing or missmatch`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class ClientGatewayPubkeyError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, clientGatewayPubkey missing or missmatch`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class SequenceNumberError extends SATPInternalError {
  constructor(
    tag: string,
    received: bigint,
    expected: bigint,
    cause?: string | Error | null,
  ) {
    super(
      `${tag}, sequence number missmatch \n received: ${received} \n expected: ${expected}`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.MESSAGE_OUT_OF_SEQUENCE;
  }
}

export class HashError extends SATPInternalError {
  constructor(
    tag: string,
    received: string,
    expected: string,
    cause?: string | Error | null,
  ) {
    super(
      `${tag}, hash missmatch \n received: ${received} \n expected: ${expected}`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.HASH_MISS_MATCH;
  }
}

export class TransferContextIdError extends SATPInternalError {
  constructor(
    tag: string,
    cause?: string | Error | null,
    received?: string,
    expected?: string,
  ) {
    if (!received || !expected) {
      super(
        `${tag}, transferContextId missing or missmatch`,
        cause ?? null,
        400,
      );
      this.errorType = SATPErrorType.MISSING_PARAMETER;
    } else {
      super(
        `${tag}, transferContextId missing or missmatch \n received: ${received} \n expected: ${expected}`,
        cause ?? null,
        400,
      );
      this.errorType = SATPErrorType.CONTEXT_ID_MISS_MATCH;
    }
  }
}

export class MissingBridgeManagerError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, bridge manager missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.BRIDGE_PROBLEM;
  }
}

export class LockAssertionClaimError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, lockAssertionClaim missing or faulty`, cause ?? null, 400);
    this.errorType = SATPErrorType.LOCK_ASSERTION_BADLY_FORMATED;
  }
}

export class LockAssertionClaimFormatError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, lockAssertionClaimFormat missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.LOCK_ASSERTION_CLAIM_FORMAT_MISSING;
  }
}

export class LockAssertionExpirationError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, lockAssertionExpiration missing or faulty`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.LOCK_ASSERTION_EXPIRATION_ERROR;
  }
}

export class BurnAssertionClaimError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, burnAssertionClaim missing or faulty`, cause ?? null, 400);
    this.errorType = SATPErrorType.BURN_ASSERTION_BADLY_FORMATED;
  }
}

export class MintAssertionClaimError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, mintAssertionClaim missing or faulty`, cause ?? null, 400);
    this.errorType = SATPErrorType.MINT_ASSERTION_BADLY_FORMATED;
  }
}

export class AssignmentAssertionClaimError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, assignmentAssertionClaim missing or faulty`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.ASSIGNMENT_ASSERTION_BADLY_FORMATED;
  }
}

export class ResourceUrlError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, resourceUrl missing or missmatch`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class GatewayNetworkIdError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, gatewayNetworkId missing or missmatch`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class OntologyContractError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, ontologyContract missing or has problems`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.ONTOLOGY_BADLY_FORMATED;
  }
}

export class LedgerAssetIdError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, ledgerAssetId missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class LedgerAssetError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, ledgerAsset missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class NetworkIdError extends SATPInternalError {
  constructor(tag: string, type: string, cause?: string | Error | null) {
    super(`${tag}, ${type} networkId missing or missmatch`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class AssetMissing extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, asset missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class WrapAssertionClaimError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, Wrap Assertion Claim missing or faulty`, cause ?? null, 400);
    this.errorType = SATPErrorType.WRAP_ASSERTION_BADLY_FORMATED;
  }
}

export class TokenIdMissingError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, tokenId missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}
export class AmountMissingError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, Amount missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}
export class MissingRecipientError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, Recipient is missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class DigitalAssetIdError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, DigitalAssetId is missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class PubKeyError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, PubKey is missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.PUBLIC_KEY_NOT_FOUND;
  }
}
