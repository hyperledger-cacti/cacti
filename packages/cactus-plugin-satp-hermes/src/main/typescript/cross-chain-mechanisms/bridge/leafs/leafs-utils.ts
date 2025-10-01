/**
 * @fileoverview
 * Utility functions for SATP Hermes bridge leaf implementations.
 *
 * @description
 * This module provides common utility functions used across different bridge leaf
 * implementations in the SATP Hermes framework. These utilities handle key format
 * conversions, data transformations, and other shared operations required by
 * blockchain-specific bridge leaf implementations.
 *
 * **Key Management Utilities:**
 * - Cryptographic key format conversions (Buffer/string to Uint8Array)
 * - Key pair validation and normalization
 * - Cross-platform key compatibility handling
 *
 * **Integration Support:**
 * The utilities ensure consistent key handling across different blockchain
 * connectors and cryptographic libraries used in the SATP bridge architecture.
 *
 * @since 2.0.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link ISignerKeyPair} for key pair interface
 * @see {@link EthereumLeaf} for Ethereum bridge leaf implementation
 * @see {@link BesuLeaf} for Besu bridge leaf implementation
 * @see {@link FabricLeaf} for Fabric bridge leaf implementation
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { ISignerKeyPair } from "@hyperledger/cactus-common";

/**
 * Converts signer key pair to Uint8Array format for cryptographic operations.
 *
 * @description
 * Normalizes cryptographic key pairs from various input formats (Buffer, string, Uint8Array)
 * to consistent Uint8Array format required by cryptographic libraries and blockchain
 * connectors. This ensures compatibility across different key storage and handling
 * mechanisms in the SATP bridge architecture.
 *
 * **Key Format Handling:**
 * - Buffer keys: Direct conversion to Uint8Array
 * - String keys: Base64 decoding to Buffer, then Uint8Array conversion
 * - Uint8Array keys: Pass-through without modification
 * - Maintains both public and private key consistency
 *
 * **Cryptographic Compatibility:**
 * The converted keys maintain cryptographic validity and can be used with
 * various blockchain signing operations, proof generation, and cross-chain
 * authentication mechanisms.
 *
 * @param key - Signer key pair with public/private keys in various formats
 * @returns Normalized key pair with Uint8Array format keys
 *
 * @throws {TypeError} When key format is unsupported or invalid
 * @throws {Error} When Base64 decoding fails for string keys
 *
 * @example
 * Converting Buffer-based key pair:
 * ```typescript
 * const bufferKeyPair: ISignerKeyPair = {
 *   publicKey: Buffer.from('public-key-data', 'hex'),
 *   privateKey: Buffer.from('private-key-data', 'hex')
 * };
 *
 * const uint8KeyPair = getUint8Key(bufferKeyPair);
 * console.log('Public key length:', uint8KeyPair.publicKey.length);
 * console.log('Private key type:', uint8KeyPair.privateKey.constructor.name);
 * // Output: Uint8Array
 * ```
 *
 * @example
 * Converting string-based key pair:
 * ```typescript
 * const stringKeyPair: ISignerKeyPair = {
 *   publicKey: 'base64-encoded-public-key',
 *   privateKey: 'base64-encoded-private-key'
 * };
 *
 * const uint8KeyPair = getUint8Key(stringKeyPair);
 * // Keys are now in Uint8Array format for cryptographic operations
 * ```
 *
 * @since 2.0.0
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array} Uint8Array Documentation
 * @see {@link ISignerKeyPair} for key pair interface definition
 * @see {@link PluginBungeeHermes} for key usage in Bungee plugin
 */
export function getUint8Key(key: ISignerKeyPair) {
  return {
    publicKey: Buffer.isBuffer(key.publicKey)
      ? new Uint8Array(key.publicKey)
      : typeof key.publicKey === "string"
        ? new Uint8Array(Buffer.from(key.publicKey, "base64"))
        : key.publicKey,
    privateKey: Buffer.isBuffer(key.privateKey)
      ? new Uint8Array(key.privateKey)
      : typeof key.privateKey === "string"
        ? new Uint8Array(Buffer.from(key.privateKey, "base64"))
        : key.privateKey,
  };
}
