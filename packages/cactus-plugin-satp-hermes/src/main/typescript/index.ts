/**
 * SATP-Hermes Plugin Entry Point - Main TypeScript Module Export
 *
 * @fileoverview
 * Primary entry point for the SATP-Hermes plugin in Node.js and server environments.
 * Exports the complete public API for implementing fault-tolerant cross-chain asset
 * transfers using the IETF SATP v2 specification with Hermes crash recovery mechanisms.
 *
 * **Usage Context:**
 * This entry point is intended for server-side and Node.js applications requiring
 * full SATP gateway functionality including:
 * - Complete gateway server and client implementations
 * - Database persistence and crash recovery capabilities
 * - Full protocol message handling and validation
 * - Blockchain connector integrations (Fabric, Besu, etc.)
 * - Cryptographic signing and verification operations
 *
 * **SATP Protocol Implementation:**
 * - **Phase 1**: Transfer Initiation with gateway authentication
 * - **Phase 2**: Lock-Evidence Verification with cryptographic proofs
 * - **Phase 3**: Commitment Establishment with atomic finalization
 * - **Recovery**: Crash fault tolerance with rollback mechanisms
 *
 * @module SatpHermesMain
 *
 * @example
 * Server-side gateway initialization:
 * ```typescript
 * import {
 *   SATPGateway,
 *   PluginFactorySATPGateway,
 *   DEFAULT_PORT_GATEWAY_SERVER
 * } from '@hyperledger-cacti/cactus-plugin-satp-hermes';
 *
 * const factory = new PluginFactorySATPGateway();
 * const gateway = await factory.create({
 *   instanceId: 'satp-gateway-1',
 *   name: 'FabricToBesuGateway',
 *   dltIDs: ['fabric-network-1', 'besu-testnet'],
 *   serverPort: DEFAULT_PORT_GATEWAY_SERVER
 * });
 *
 * await gateway.onPluginInit();
 * ```
 *
 * @example
 * Cross-chain asset transfer execution:
 * ```typescript
 * import { SATPGateway, ClientV1Request } from '@hyperledger-cacti/cactus-plugin-satp-hermes';
 *
 * const transferRequest: ClientV1Request = {
 *   version: 'v02',
 *   sourceGatewayDltSystem: 'fabric-network-1',
 *   recipientGatewayDltSystem: 'besu-testnet',
 *   sourceLedgerAssetID: 'asset-123',
 *   recipientLedgerAssetID: 'asset-456'
 * };
 *
 * await gateway.runSatp(transferRequest);
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @see {@link https://www.sciencedirect.com/science/article/abs/pii/S0167739X21004337} Hermes Research Paper
 * @see {@link SATPGateway} for main gateway implementation
 * @see {@link PluginFactorySATPGateway} for gateway factory and configuration
 * @see {@link ./index.web} for browser/web environment entry point
 * @see {@link ./public-api} for detailed API documentation
 *
 * @since 0.0.3-beta
 */
export * from "./public-api";
