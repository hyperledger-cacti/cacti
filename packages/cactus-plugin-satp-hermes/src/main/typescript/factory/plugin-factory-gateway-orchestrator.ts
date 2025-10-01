/**
 * @fileoverview SATP Gateway Plugin Factory
 *
 * This module provides a factory implementation for creating and validating SATP
 * gateway plugin instances. Extends the Hyperledger Cacti PluginFactory pattern
 * to ensure proper initialization and configuration validation of SATP gateways
 * following the IETF SATP v2 specification.
 *
 * The factory handles:
 * - SATP gateway instance creation with type safety
 * - Configuration validation using class-validator decorators
 * - Error handling and validation reporting
 * - Plugin lifecycle management integration
 *
 * @example
 * ```typescript
 * import { PluginFactorySATPGateway } from './factory/plugin-factory-gateway-orchestrator';
 *
 * const factory = new PluginFactorySATPGateway();
 * const gatewayConfig: SATPGatewayConfig = {
 *   gatewayId: 'gateway-001',
 *   keyPair: myKeyPair,
 *   localRepository: localRepo,
 *   remoteRepository: remoteRepo,
 *   loggerOptions: { level: 'info' }
 * };
 *
 * const gateway = await factory.create(gatewayConfig);
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @author Hyperledger Cacti Contributors
 * @since 2.0.0
 */

import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import { SATPGateway, SATPGatewayConfig } from "../plugin-satp-hermes-gateway";
import { validateOrReject } from "class-validator";

/**
 * Factory class for creating validated SATP gateway plugin instances.
 *
 * Extends the Hyperledger Cacti PluginFactory to provide specialized creation
 * and validation logic for SATP gateway plugins. Ensures all gateway instances
 * are properly configured and validated before use in cross-chain asset transfer
 * operations.
 *
 * This factory integrates with the Cacti plugin system and provides:
 * - Type-safe gateway creation
 * - Automatic configuration validation
 * - Error handling with detailed validation messages
 * - Consistent plugin lifecycle management
 *
 * @extends PluginFactory<SATPGateway, SATPGatewayConfig, IPluginFactoryOptions>
 * @since 2.0.0
 * @example
 * ```typescript
 * const factory = new PluginFactorySATPGateway();
 *
 * try {
 *   const gateway = await factory.create({
 *     gatewayId: 'my-gateway',
 *     keyPair: cryptoKeyPair,
 *     localRepository: localRepo,
 *     remoteRepository: remoteRepo,
 *     loggerOptions: { level: 'debug' }
 *   });
 *
 *   // Gateway is now ready for SATP operations
 *   await gateway.start();
 * } catch (error) {
 *   console.error('Gateway creation failed:', error);
 * }
 * ```
 */
export class PluginFactorySATPGateway extends PluginFactory<
  SATPGateway,
  SATPGatewayConfig,
  IPluginFactoryOptions
> {
  /**
   * Creates and validates a new SATP gateway plugin instance.
   *
   * Instantiates a new SATPGateway with the provided configuration and performs
   * comprehensive validation using class-validator decorators. This ensures the
   * gateway is properly configured for SATP protocol operations before returning
   * the instance to the caller.
   *
   * The validation process includes:
   * - Required configuration parameter verification
   * - Cryptographic key pair validation
   * - Repository connection verification
   * - Logger configuration validation
   * - SATP protocol compliance checks
   *
   * @param pluginOptions - Complete configuration for the SATP gateway
   * @returns Promise resolving to a validated SATPGateway instance
   * @throws Error when validation fails with detailed error information
   *
   * @example
   * ```typescript
   * const factory = new PluginFactorySATPGateway();
   *
   * const config: SATPGatewayConfig = {
   *   gatewayId: 'gateway-prod-001',
   *   keyPair: await generateKeyPair(),
   *   localRepository: new KnexLocalLogRepository(localDb),
   *   remoteRepository: new KnexRemoteLogRepository(remoteDb),
   *   loggerOptions: {
   *     level: 'info',
   *     label: 'satp-gateway'
   *   },
   *   validationOptions: {
   *     whitelist: true,
   *     forbidNonWhitelisted: true
   *   }
   * };
   *
   * try {
   *   const gateway = await factory.create(config);
   *   console.log('Gateway created successfully:', gateway.getGatewayId());
   * } catch (error) {
   *   console.error('Validation failed:', error.message);
   * }
   * ```
   *
   * @since 2.0.0
   */
  async create(pluginOptions: SATPGatewayConfig): Promise<SATPGateway> {
    const coordinator = new SATPGateway(pluginOptions);

    try {
      const validationOptions = pluginOptions.validationOptions;
      await validateOrReject(coordinator, validationOptions);
      return coordinator;
    } catch (errors) {
      throw new Error(
        `Caught promise rejection (validation failed). Errors: ${errors}`,
      );
    }
  }
}
