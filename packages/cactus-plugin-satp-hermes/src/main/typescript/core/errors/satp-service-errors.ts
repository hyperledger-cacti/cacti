import { SATPInternalError } from "./satp-errors";

export class SatpCommonBodyError extends SATPInternalError {
  constructor(fnTag: string, data: string) {
    super(
      `${fnTag}, message satp common body is missing or is missing required fields \n ${data}`,
      400,
    );
  }
}
export class SessionError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, session undefined`, 500);
  }
}

export class SessionDataNotLoadedCorrectlyError extends SATPInternalError {
  constructor(fnTag: string, data: string) {
    super(`${fnTag}, session data was not loaded correctly \n ${data}`, 500);
  }
}

export class SessionCompletedError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, session data already completed`, 500);
  }
}

export class SATPVersionError extends SATPInternalError {
  constructor(fnTag: string, unsupported: string, supported: string) {
    super(
      `${fnTag}, unsupported SATP version \n received: ${unsupported}, supported: ${supported}`,
      400,
    );
  }
}

export class SignatureVerificationError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, message signature verification failed`, 400);
  }
}

export class SignatureMissingError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, message signature missing`, 400);
  }
}

export class MessageTypeError extends SATPInternalError {
  constructor(fnTag: string, received: string, expected: string) {
    super(
      `${fnTag}, message type miss match \n received: ${received} \n expected: ${expected}`,
      400,
    );
  }
}

export class TransferInitClaimsError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, transferInitClaims missing or faulty`, 400);
  }
}

export class TransferInitClaimsHashError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, transferInitClaims hash missing or missmatch`, 400);
  }
}

export class NetworkCapabilitiesError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, NetworkCapabilitiesError missing or faulty`, 400);
  }
}

export class DLTNotSupportedError extends SATPInternalError {
  constructor(fnTag: string, dlt: string) {
    super(`${fnTag}, DLT not supported \n received: ${dlt}`, 400);
  }
}

export class ServerGatewayPubkeyError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, serverGatewayPubkey missing or missmatch`, 400);
  }
}

export class ClientGatewayPubkeyError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, clientGatewayPubkey missing or missmatch`, 400);
  }
}

export class SequenceNumberError extends SATPInternalError {
  constructor(fnTag: string, received: bigint, expected: bigint) {
    super(
      `${fnTag}, sequence number missmatch \n received: ${received} \n expected: ${expected}`,
      400,
    );
  }
}

export class HashError extends SATPInternalError {
  constructor(fnTag: string, received: string, expected: string) {
    super(
      `${fnTag}, hash missmatch \n received: ${received} \n expected: ${expected}`,
      400,
    );
  }
}

export class TransferContextIdError extends SATPInternalError {
  constructor(fnTag: string, received: string, expected: string) {
    super(
      `${fnTag}, transferContextId missing or missmatch \n received: ${received} \n expected: ${expected}`,
      400,
    );
  }
}

export class MissingBridgeManagerError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, bridge manager missing`, 400);
  }
}

export class LockAssertionClaimError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, lockAssertionClaim missing or faulty`, 400);
  }
}

export class LockAssertionClaimFormatError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, lockAssertionClaimFormat missing`, 400);
  }
}

export class LockAssertionExpirationError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, lockAssertionExpiration missing or faulty`, 400);
  }
}

export class BurnAssertionClaimError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, burnAssertionClaim missing or faulty`, 400);
  }
}

export class MintAssertionClaimError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, mintAssertionClaim missing or faulty`, 400);
  }
}

export class AssignmentAssertionClaimError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, assignmentAssertionClaim missing or faulty`, 400);
  }
}

export class ResourceUrlError extends SATPInternalError {
  constructor(fnTag: string) {
    super(`${fnTag}, resourceUrl missing or missmatch`, 400);
  }
}
