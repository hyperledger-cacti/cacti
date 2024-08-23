import { SATPInternalError } from "./satp-errors";

export class SatpCommonBodyError extends SATPInternalError {
  constructor(tag: string, data: string) {
    super(
      `${tag}, message satp common body is missing or is missing required fields \n ${data}`,
      400,
    );
  }
}
export class SessionError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, session undefined`, 500);
  }
}

export class SessionIdError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, session id undefined`, 500);
  }
}

export class SessionMissMatchError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, session missmatch`, 500);
  }
}

export class SessionDataNotLoadedCorrectlyError extends SATPInternalError {
  constructor(tag: string, data: string, stack?: Error) {
    super(
      `${tag}, session data was not loaded correctly \n ${data} \n stack: ${stack} `,
      500,
    );
  }
}

export class SessionDataNotAvailableError extends SATPInternalError {
  constructor(tag: string, type: string) {
    super(`${tag}, ${type} session data not available`, 500);
  }
}

export class SessionCompletedError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, session data already completed`, 500);
  }
}

export class SATPVersionError extends SATPInternalError {
  constructor(tag: string, unsupported?: string, supported?: string) {
    if (!supported) {
      super(`${tag}, SATP version is missing`, 400);
    } else {
      super(
        `${tag}, unsupported SATP version \n received: ${unsupported}, supported: ${supported}`,
        400,
      );
    }
  }
}

export class SignatureAlgorithmError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, signature algorithm is missing`, 400);
  }
}

export class SignatureVerificationError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, message signature verification failed`, 400);
  }
}

export class SignatureMissingError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, message signature missing`, 400);
  }
}

export class LockTypeError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, lock type missing`, 400);
  }
}

export class lockExpirationTimeError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, lock expiration time missing`, 400);
  }
}

export class CredentialProfileError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, credential profile missing`, 400);
  }
}

export class LoggingProfileError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, logging profile missing`, 400);
  }
}

export class AccessControlProfileError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, access control profile missing`, 400);
  }
}

export class MessageTypeError extends SATPInternalError {
  constructor(tag: string, received: string, expected: string) {
    super(
      `${tag}, message type miss match \n received: ${received} \n expected: ${expected}`,
      400,
    );
  }
}

export class TransferInitClaimsError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, transferInitClaims missing or faulty`, 400);
  }
}

export class TransferInitClaimsHashError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, transferInitClaims hash missing or missmatch`, 400);
  }
}

export class NetworkCapabilitiesError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, NetworkCapabilitiesError missing or faulty`, 400);
  }
}

export class DLTNotSupportedError extends SATPInternalError {
  constructor(tag: string, dlt: string) {
    super(`${tag}, DLT not supported \n received: ${dlt}`, 400);
  }
}

export class ServerGatewayPubkeyError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, serverGatewayPubkey missing or missmatch`, 400);
  }
}

export class ClientGatewayPubkeyError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, clientGatewayPubkey missing or missmatch`, 400);
  }
}

export class SequenceNumberError extends SATPInternalError {
  constructor(tag: string, received: bigint, expected: bigint) {
    super(
      `${tag}, sequence number missmatch \n received: ${received} \n expected: ${expected}`,
      400,
    );
  }
}

export class HashError extends SATPInternalError {
  constructor(tag: string, received: string, expected: string) {
    super(
      `${tag}, hash missmatch \n received: ${received} \n expected: ${expected}`,
      400,
    );
  }
}

export class TransferContextIdError extends SATPInternalError {
  constructor(tag: string, received?: string, expected?: string) {
    if (!received || !expected) {
      super(`${tag}, transferContextId missing or missmatch`, 400);
    } else {
      super(
        `${tag}, transferContextId missing or missmatch \n received: ${received} \n expected: ${expected}`,
        400,
      );
    }
  }
}

export class MissingBridgeManagerError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, bridge manager missing`, 400);
  }
}

export class LockAssertionClaimError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, lockAssertionClaim missing or faulty`, 400);
  }
}

export class LockAssertionClaimFormatError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, lockAssertionClaimFormat missing`, 400);
  }
}

export class LockAssertionExpirationError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, lockAssertionExpiration missing or faulty`, 400);
  }
}

export class BurnAssertionClaimError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, burnAssertionClaim missing or faulty`, 400);
  }
}

export class MintAssertionClaimError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, mintAssertionClaim missing or faulty`, 400);
  }
}

export class AssignmentAssertionClaimError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, assignmentAssertionClaim missing or faulty`, 400);
  }
}

export class ResourceUrlError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, resourceUrl missing or missmatch`, 400);
  }
}

export class GatewayNetworkIdError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, gatewayNetworkId missing or missmatch`, 400);
  }
}

export class OntologyContractError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, ontologyContract missing or has problems`, 400);
  }
}

export class LedgerAssetIdError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, ledgerAssetId missing`, 400);
  }
}

export class LedgerAssetError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, ledgerAsset missing`, 400);
  }
}

export class NetworkIdError extends SATPInternalError {
  constructor(tag: string, type: string) {
    super(`${tag}, ${type} networkId missing or missmatch`, 400);
  }
}

export class AssetMissing extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, asset missing`, 400);
  }
}

export class WrapAssertionClaimError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, Wrap Assertion Claim missing or faulty`, 400);
  }
}

export class TokenIdMissingError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, tokenId missing`, 400);
  }
}

export class MissingRecipientError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, Recipient is missing`, 400);
  }
}

export class DigitalAssetIdError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, DigitalAssetId is missing`, 400);
  }
}

export class PubKeyError extends SATPInternalError {
  constructor(tag: string) {
    super(`${tag}, PubKey is missing`, 400);
  }
}
