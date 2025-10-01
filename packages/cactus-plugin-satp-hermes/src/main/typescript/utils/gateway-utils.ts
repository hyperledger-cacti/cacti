/**
 * SATP Gateway Utilities - Core utility functions for SATP protocol operations
 *
 * @fileoverview
 * Essential utility functions supporting SATP gateway operations including cryptographic
 * operations, data format conversions, signature verification, and protocol message
 * handling. Provides foundational functionality for secure cross-chain asset transfers
 * following IETF SATP v2 specification requirements.
 *
 * **Utility Categories:**
 * - **Cryptographic Operations**: Signing, verification, and key format conversion
 * - **Data Format Conversion**: Buffer to hex string conversion for protocol compatibility
 * - **Protocol Message Handling**: SATP log key generation and message formatting
 * - **Security Verification**: Digital signature validation for message integrity
 * - **Hash Generation**: Deterministic hashing for data integrity and proof generation
 *
 * **SATP Protocol Integration:**
 * These utilities support all phases of SATP protocol execution including transfer
 * initiation, lock evidence verification, and commitment establishment with proper
 * cryptographic integrity and non-repudiation guarantees.
 *
 * @module SatpGatewayUtils
 *
 * @example
 * Cryptographic operations:
 * ```typescript
 * import { sign, verifySignature, bufArray2HexStr } from './utils/gateway-utils';
 *
 * const signer = new JsObjectSigner(signerOptions);
 * const message = 'SATP transfer request';
 * const signature = sign(signer, message);
 * const hexSignature = bufArray2HexStr(signature);
 * ```
 *
 * @example
 * SATP log key generation:
 * ```typescript
 * import { getSatpLogKey, getHash } from './utils/gateway-utils';
 *
 * const logKey = getSatpLogKey('session-123', 'transfer', 'initiate');
 * const dataHash = getHash({ transferId: 'tx-456', amount: 100 });
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @see {@link JsObjectSigner} for cryptographic signing implementation
 * @see {@link GatewayPersistence} for log management using these utilities
 * @see {@link SATPGateway} for main gateway implementation using these utilities
 *
 * @since 2.0.0
 */

import { JsObjectSigner } from "@hyperledger/cactus-common";
import { SHA256 } from "crypto-js";
import { stringify as safeStableStringify } from "safe-stable-stringify";

/**
 * Convert buffer array to hexadecimal string for SATP protocol compatibility.
 *
 * @description
 * Converts various buffer formats (Uint8Array, Buffer, string) to hexadecimal string
 * representation required by SATP protocol messages. Ensures consistent data format
 * for cryptographic keys, signatures, and protocol identifiers across gateway
 * communications.
 *
 * **SATP Protocol Usage:**
 * Used extensively for converting cryptographic keys, digital signatures, and
 * protocol identifiers to the hexadecimal format required by IETF SATP v2
 * specification for gateway-to-gateway communication.
 *
 * @param array - Buffer data in various formats to convert to hex string
 * @returns Hexadecimal string representation of the input buffer
 *
 * @example
 * Convert cryptographic key to hex format:
 * ```typescript
 * const keyPair = Secp256k1Keys.generateKeyPairsBuffer();
 * const pubKeyHex = bufArray2HexStr(keyPair.publicKey);
 * console.log('Gateway public key:', pubKeyHex);
 * ```
 *
 * @example
 * Convert signature to protocol format:
 * ```typescript
 * const signature = signer.sign(message);
 * const signatureHex = bufArray2HexStr(signature);
 * // Use in SATP protocol message
 * const satpMessage = {
 *   ...messageData,
 *   signature: signatureHex
 * };
 * ```
 *
 * @see {@link sign} for generating signatures that need hex conversion
 * @see {@link verifySignature} for verifying hex-formatted signatures
 * @see {@link JsObjectSigner} for cryptographic operations requiring format conversion
 *
 * @since 2.0.0
 */
export function bufArray2HexStr(array: Uint8Array | Buffer | string): string {
  if (typeof array === "string") {
    return Buffer.from(array, "utf8").toString("hex");
  }
  if (array instanceof Buffer) {
    return array.toString("hex");
  }
  // Handle Uint8Array
  return Buffer.from(Array.from(array)).toString("hex");
}

/**
 * Sign message using SATP gateway cryptographic signer.
 *
 * @description
 * Generates digital signature for SATP protocol messages using the gateway's
 * cryptographic signer. Provides non-repudiation and message integrity for
 * cross-chain asset transfer operations following IETF SATP v2 security
 * requirements.
 *
 * **SATP Security Context:**
 * Digital signatures are essential for SATP protocol security, ensuring message
 * authenticity, non-repudiation, and preventing man-in-the-middle attacks
 * during gateway-to-gateway communication.
 *
 * @param objectSigner - Configured JsObjectSigner with gateway's private key
 * @param msg - Message content to be signed for protocol transmission
 * @returns Digital signature as Uint8Array for protocol message inclusion
 *
 * @example
 * Sign SATP transfer initiation message:
 * ```typescript
 * const transferMessage = JSON.stringify({
 *   sessionId: 'session-123',
 *   assetId: 'asset-456',
 *   amount: 100
 * });
 *
 * const signature = sign(gatewaySigner, transferMessage);
 * const hexSignature = bufArray2HexStr(signature);
 * ```
 *
 * @example
 * Sign lock evidence proof:
 * ```typescript
 * const lockEvidence = {
 *   assetId: 'locked-asset-789',
 *   lockProof: '0xabc123...',
 *   timestamp: Date.now()
 * };
 *
 * const evidenceSignature = sign(signer, JSON.stringify(lockEvidence));
 * ```
 *
 * @see {@link verifySignature} for signature verification
 * @see {@link bufArray2HexStr} for converting signature to hex format
 * @see {@link JsObjectSigner} for signer configuration and usage
 * @see {@link SATPGateway.gatewaySigner} for gateway signer instance
 *
 * @since 2.0.0
 */
export function sign(objectSigner: JsObjectSigner, msg: string): Uint8Array {
  return objectSigner.sign(msg);
}

/**
 * Verify digital signature on SATP protocol messages for authenticity.
 *
 * @description
 * Validates digital signatures on SATP protocol messages to ensure authenticity,
 * integrity, and non-repudiation. Supports both client and server signature
 * verification patterns used throughout SATP protocol phases. Essential for
 * secure gateway-to-gateway communication and preventing message tampering.
 *
 * **SATP Signature Verification Process:**
 * 1. **Message Reconstruction**: Creates signature-free copy of message object
 * 2. **Signature Extraction**: Extracts client or server signature from message
 * 3. **Public Key Preparation**: Converts hex public key to verification format
 * 4. **Cryptographic Verification**: Validates signature against message content
 * 5. **Result Validation**: Returns boolean indicating signature validity
 *
 * **Security Implications:**
 * Signature verification is critical for SATP protocol security, ensuring that
 * messages haven't been tampered with and originate from authenticated gateways.
 * Prevents replay attacks and man-in-the-middle modifications.
 *
 * @param objectSigner - Configured JsObjectSigner for cryptographic operations
 * @param obj - SATP protocol message object containing signature to verify
 * @param pubKey - Hexadecimal public key of the message sender for verification
 * @returns Boolean indicating whether the signature is valid and authentic
 *
 * @throws {Error} When no signature is found in the message object
 * @throws {Error} When signature verification fails due to cryptographic issues
 *
 * @example
 * Verify client signature on transfer request:
 * ```typescript
 * const transferRequest = {
 *   sessionId: 'session-123',
 *   assetId: 'asset-456',
 *   clientSignature: '0xabc123...'
 * };
 *
 * const isValid = verifySignature(
 *   gatewaySigner,
 *   transferRequest,
 *   clientPublicKey
 * );
 *
 * if (!isValid) {
 *   throw new Error('Invalid client signature on transfer request');
 * }
 * ```
 *
 * @example
 * Verify server signature on lock evidence:
 * ```typescript
 * const lockEvidence = {
 *   assetId: 'locked-asset-789',
 *   lockProof: '0xdef456...',
 *   serverSignature: '0x789abc...'
 * };
 *
 * try {
 *   const verified = verifySignature(signer, lockEvidence, serverPubKey);
 *   console.log('Lock evidence signature valid:', verified);
 * } catch (error) {
 *   console.error('Signature verification failed:', error);
 * }
 * ```
 *
 * @see {@link sign} for creating signatures that this function verifies
 * @see {@link bufArray2HexStr} for public key format conversion
 * @see {@link JsObjectSigner.verify} for underlying cryptographic verification
 * @see {@link SATPGateway.verifySignature} for gateway-level signature validation
 *
 * @since 2.0.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function verifySignature(
  objectSigner: JsObjectSigner,
  obj: any,
  pubKey: string,
): boolean {
  const copy = JSON.parse(safeStableStringify(obj)!);

  if (copy.clientSignature) {
    const sourceSignature = new Uint8Array(
      Buffer.from(copy.clientSignature, "hex"),
    );

    const sourcePubkey = new Uint8Array(Buffer.from(pubKey, "hex"));

    copy.clientSignature = "";
    if (
      !objectSigner.verify(
        safeStableStringify(copy),
        sourceSignature,
        sourcePubkey,
      )
    ) {
      return false;
    }
    return true;
  } else if (copy.serverSignature) {
    const sourceSignature = new Uint8Array(
      Buffer.from(copy.serverSignature, "hex"),
    );

    const sourcePubkey = new Uint8Array(Buffer.from(pubKey, "hex"));

    copy.serverSignature = "";
    if (
      !objectSigner.verify(
        safeStableStringify(copy),
        sourceSignature,
        sourcePubkey,
      )
    ) {
      return false;
    }
    return true;
  } else {
    throw new Error("No signature found in the object");
  }
}

/**
 * Generate standardized SATP log key for session tracking and recovery.
 *
 * @description
 * Creates standardized log keys for SATP protocol session tracking, crash recovery,
 * and audit trail management. Provides consistent key format for local and remote
 * log repositories supporting Hermes fault-tolerant design patterns.
 *
 * **SATP Session Tracking:**
 * Log keys enable precise tracking of protocol phase progression, crash recovery
 * checkpoints, and audit trail reconstruction. Essential for maintaining SATP
 * session state consistency across gateway restarts and failure scenarios.
 *
 * **Key Format Convention:**
 * Generated keys follow the pattern: `{sessionID}-{type}-{operation}`
 * - **sessionID**: Unique SATP session identifier
 * - **type**: Protocol phase or message type (transfer, lock, commit)
 * - **operation**: Specific operation within the phase (initiate, verify, finalize)
 *
 * @param sessionID - Unique SATP session identifier for log correlation
 * @param type - Protocol phase or message type for categorization
 * @param operation - Specific operation or sub-phase for detailed tracking
 * @returns Standardized log key for consistent session tracking
 *
 * @example
 * Generate log keys for SATP protocol phases:
 * ```typescript
 * // Transfer initiation phase
 * const initKey = getSatpLogKey('session-123', 'transfer', 'initiate');
 * // Result: 'session-123-transfer-initiate'
 *
 * // Lock evidence phase
 * const lockKey = getSatpLogKey('session-123', 'lock', 'evidence');
 * // Result: 'session-123-lock-evidence'
 *
 * // Commitment phase
 * const commitKey = getSatpLogKey('session-123', 'commit', 'finalize');
 * // Result: 'session-123-commit-finalize'
 * ```
 *
 * @example
 * Use in crash recovery scenarios:
 * ```typescript
 * // Generate recovery checkpoint key
 * const recoveryKey = getSatpLogKey(sessionId, 'recovery', 'checkpoint');
 *
 * // Store recovery state
 * await localRepository.create({
 *   key: recoveryKey,
 *   sessionId: sessionId,
 *   type: 'recovery',
 *   operation: 'checkpoint',
 *   data: JSON.stringify(sessionState)
 * });
 * ```
 *
 * @see {@link GatewayPersistence.persistLogEntry} for log entry creation using keys
 * @see {@link LocalLog} for log entry structure using these keys
 * @see {@link RemoteLog} for distributed logging with standardized keys
 * @see {@link CrashManager} for crash recovery using session keys
 *
 * @since 2.0.0
 */
export function getSatpLogKey(
  sessionID: string,
  type: string,
  operation: string,
): string {
  return `${sessionID}-${type}-${operation}`;
}

/**
 * Generate deterministic hash for data integrity and proof verification.
 *
 * @description
 * Creates SHA-256 hash of object data for integrity verification, proof generation,
 * and tamper detection in SATP protocol operations. Uses safe stable stringification
 * to ensure consistent hash generation across different JavaScript environments
 * and object property ordering.
 *
 * **SATP Integrity Context:**
 * Hash generation is essential for SATP protocol integrity, enabling verification
 * of asset transfer data, lock evidence proofs, and commitment confirmations.
 * Provides cryptographic integrity for cross-chain transaction data.
 *
 * **Deterministic Hashing:**
 * Uses safe-stable-stringify to ensure consistent object serialization and
 * hash generation regardless of JavaScript engine property ordering differences.
 * Critical for cross-gateway hash verification and proof validation.
 *
 * @param object - Data object to hash for integrity verification
 * @returns SHA-256 hash string for integrity checks and proof generation
 *
 * @example
 * Generate hash for asset transfer data:
 * ```typescript
 * const transferData = {
 *   sessionId: 'session-123',
 *   assetId: 'asset-456',
 *   amount: 100,
 *   sourceNetwork: 'fabric-mainnet',
 *   targetNetwork: 'ethereum-mainnet'
 * };
 *
 * const dataHash = getHash(transferData);
 * console.log('Transfer data hash:', dataHash);
 * ```
 *
 * @example
 * Create integrity proof for lock evidence:
 * ```typescript
 * const lockEvidence = {
 *   assetId: 'locked-asset-789',
 *   lockTransactionId: '0xabc123...',
 *   timestamp: Date.now(),
 *   blockNumber: 12345
 * };
 *
 * const evidenceHash = getHash(lockEvidence);
 *
 * // Store hash for later verification
 * const proof = {
 *   evidence: lockEvidence,
 *   hash: evidenceHash,
 *   signature: sign(signer, evidenceHash)
 * };
 * ```
 *
 * @example
 * Verify data integrity:
 * ```typescript
 * // Original data hash
 * const originalHash = getHash(originalData);
 *
 * // Received data hash
 * const receivedHash = getHash(receivedData);
 *
 * if (originalHash !== receivedHash) {
 *   throw new Error('Data integrity violation detected');
 * }
 * ```
 *
 * @see {@link GatewayPersistence.getHash} for persistence-specific hashing
 * @see {@link sign} for signing hash values for non-repudiation
 * @see {@link SHA256} for underlying hash algorithm
 * @see {@link safeStableStringify} for deterministic object serialization
 *
 * @since 2.0.0
 */
export function getHash(object: unknown): string {
  return SHA256(safeStableStringify(object) ?? "").toString();
}
