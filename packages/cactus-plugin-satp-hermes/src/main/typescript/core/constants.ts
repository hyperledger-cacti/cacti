/**
 * @fileoverview
 * SATP Protocol Constants - Configuration Values and Protocol Definitions
 *
 * @description
 * This module defines the core constants, configuration values, and protocol
 * definitions used throughout the SATP (Secure Asset Transfer Protocol)
 * implementation. These constants ensure consistency, compliance, and proper
 * configuration across all SATP components and operations.
 *
 * **Constant Categories:**
 * - **Port Configuration**: Default port assignments for SATP gateway services
 * - **Protocol Versions**: SATP specification version identifiers
 * - **Service Endpoints**: Default endpoint configurations for gateway communication
 * - **Protocol Compliance**: Version strings for IETF SATP specification adherence
 *
 * **Configuration Standards:**
 * - **Port Management**: Systematic port allocation for different gateway services
 * - **Version Control**: Consistent version management across protocol implementations
 * - **Compliance Tracking**: Version identifiers for specification compliance
 * - **Default Values**: Sensible defaults for production deployments
 *
 * **Usage Context:**
 * These constants are used throughout the SATP implementation to ensure
 * consistent configuration, proper service addressing, and protocol version
 * compliance across all gateway instances and network deployments.
 *
 * @author SATP Development Team
 * @since 0.0.3-beta
 * @version 0.0.3-beta
 * @see {@link https://datatracker.ietf.org/doc/draft-ietf-satp-core/} IETF SATP Core Specification
 */

import { LedgerType } from "@hyperledger-cacti/cactus-core-api";

/** Default port for SATP gateway server operations */
export const DEFAULT_PORT_GATEWAY_SERVER = 3010;
/** Default port for SATP gateway client operations */
export const DEFAULT_PORT_GATEWAY_CLIENT = DEFAULT_PORT_GATEWAY_SERVER + 1;
/** Default port for SATP gateway user interface */
export const DEFAULT_PORT_GATEWAY_UI = DEFAULT_PORT_GATEWAY_SERVER + 2;
/** Default port for SATP gateway OpenAPI documentation */
export const DEFAULT_PORT_GATEWAY_OAPI = 4010;
/** Current SATP protocol version identifier */
export const SATP_VERSION = "v13";
/** SATP Core specification version */
export const SATP_CORE_VERSION = "v13";
/** SATP Architecture specification version */
export const SATP_ARCHITECTURE_VERSION = "v13";
/** SATP Crash Recovery specification version */
export const SATP_CRASH_VERSION = "v13";
/**
 * SATP protocol wire version string per v13 Section 5.3.1.
 * Carried in the `version` field of CommonSatp.
 */
export const SATP_PROTOCOL_VERSION = "1.0";
/** Mandatory-to-implement TLS 1.3 cipher suite from RFC 8446 Section 9.1. */
export const DEFAULT_TLS13_CIPHER_SUITE = "TLS_AES_128_GCM_SHA256";

/** Ledger types with bridge implementations available to SATP. */
export const SATP_IMPLEMENTED_LEDGERS = new Set<LedgerType>([
  LedgerType.Besu1X,
  LedgerType.Besu2X,
  LedgerType.Ethereum,
  LedgerType.Fabric2,
]);
