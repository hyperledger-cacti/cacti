export function MissingSatpCommonBody(fnTag: string): Error {
  return new Error(
    `${fnTag}, message satp common body is missing or is missing required fields`,
  );
}

export function SessionUndefined(fnTag: string): Error {
  return new Error(`${fnTag}, session undefined`);
}

export function SessionDataNotLoadedCorrectly(fnTag: string): Error {
  return new Error(`${fnTag}, session data was not load correctly`);
}

export function SATPVersionUnsupported(
  fnTag: string,
  unsupported: string,
  supported: string,
): Error {
  return new Error(
    `${fnTag}, unsupported SATP version \n received: ${unsupported}, supported: ${supported}`,
  );
}

export function SignatureVerificationFailed(fnTag: string): Error {
  return new Error(`${fnTag}, message signature verification failed`);
}

export function MessageTypeMissMatch(
  fnTag: string,
  received: string,
  expected: string,
): Error {
  return new Error(
    `${fnTag}, message type miss match \n received: ${received} \n expected: ${expected}`,
  );
}

export function MissingTransferInitClaims(fnTag: string): Error {
  return new Error(`${fnTag}, transferInitClaims missing or missmatch`);
}

export function MissingNetworkCapabilities(fnTag: string): Error {
  return new Error(
    `${fnTag}, message does not contain network capabilities and parameters`,
  );
}

export function DLTNotSupported(fnTag: string, dlt: string): Error {
  return new Error(`${fnTag}, DLT not supported \n received: ${dlt}`);
}

export function MissingServerGatewayPubkey(fnTag: string): Error {
  return new Error(`${fnTag}, serverGatewayPubkey missing or missmatch`);
}

export function MissingClientGatewayPubkey(fnTag: string): Error {
  return new Error(`${fnTag}, clientGatewayPubkey missing or missmatch`);
}

export function SequenceNumberMissMatch(
  fnTag: string,
  received: bigint,
  expected: bigint,
): Error {
  return new Error(
    `${fnTag}, sequence number missmatch \n received: ${received} \n expected: ${expected}`,
  );
}

export function HashMissMatch(
  fnTag: string,
  received: string,
  expected: string,
): Error {
  return new Error(
    `${fnTag}, hash missmatch \n received: ${received} \n expected: ${expected}`,
  );
}

export function TransferContextIdMissMatch(
  fnTag: string,
  received: string,
  expected: string,
): Error {
  return new Error(
    `${fnTag}, transferContextId missing or missmatch \n received: ${received} \n expected: ${expected}`,
  );
}

export function MissingBridgeManager(fnTag: string): Error {
  return new Error(`${fnTag}, bridge manager missing`);
}

export function MissingLockAssertionClaim(fnTag: string): Error {
  return new Error(`${fnTag}, lockAssertionClaim missing`);
}

export function MissingLockAssertionClaimFormat(fnTag: string): Error {
  return new Error(`${fnTag}, lockAssertionClaimFormat missing`);
}

export function MissingLockAssertionExpiration(fnTag: string): Error {
  return new Error(`${fnTag}, lockAssertionExpiration missing`);
}

export function MissingBurnAssertionClaim(fnTag: string): Error {
  return new Error(`${fnTag}, burnAssertionClaim missing`);
}

export function MissingMintAssertionClaim(fnTag: string): Error {
  return new Error(`${fnTag}, mintAssertionClaim missing`);
}

export function MissingAssignmentAssertionClaim(fnTag: string): Error {
  return new Error(`${fnTag}, assignmentAssertionClaim missing`);
}
