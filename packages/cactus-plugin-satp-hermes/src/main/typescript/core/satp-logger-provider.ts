/**
 * @fileoverview
 * SATP Logger Provider - Factory and Management for SATP-Specific Logging
 *
 * @description
 * This module provides a centralized factory and management system for SATP (Secure Asset
 * Transfer Protocol) loggers within the Hyperledger Cacti ecosystem. It implements the
 * factory pattern to create and manage SATP-specific logger instances with integrated
 * monitoring capabilities, ensuring consistent logging behavior across all SATP components.
 *
 * **Core Functionality:**
 * - **Logger Factory**: Creates and manages SATP logger instances using factory pattern
 * - **Instance Caching**: Maintains logger instance cache to prevent duplicate creation
 * - **Log Level Management**: Provides centralized log level configuration and updates
 * - **Monitoring Integration**: Ensures all loggers integrate with monitoring services
 * - **Resource Optimization**: Reuses logger instances to optimize memory and performance
 *
 * **Factory Pattern Benefits:**
 * - **Consistency**: Ensures all SATP loggers have consistent configuration
 * - **Centralization**: Single point of control for logger creation and management
 * - **Efficiency**: Prevents duplicate logger instances through intelligent caching
 * - **Maintainability**: Simplifies logger configuration updates across the system
 * - **Monitoring Integration**: Guarantees monitoring service integration for all loggers
 *
 * **Usage Patterns:**
 * This provider is used throughout the SATP implementation to create logger instances
 * for services, handlers, sessions, and other components. It ensures that all logging
 * follows consistent patterns and integrates properly with the monitoring infrastructure.
 *
 * @author SATP Development Team
 * @since 2.0.0
 * @version 2.0.0
 * @see {@link SATPLogger} for SATP logger implementation
 * @see {@link MonitorService} for monitoring integration
 * @see {@link ILoggerOptions} for logger configuration options
 */

import { ILoggerOptions, LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPLogger } from "./satp-logger";
import { MonitorService } from "../services/monitoring/monitor";

/**
 * Factory class for creating and managing SATP-specific logger instances.
 *
 * @description
 * Provides centralized factory functionality for SATP logger creation and management.
 * Implements instance caching to prevent duplicate loggers, centralized log level
 * management, and ensures consistent monitoring integration across all SATP components.
 *
 * **Key Features:**
 * - **Factory Pattern**: Creates logger instances using consistent factory methods
 * - **Instance Caching**: Maintains cache of created loggers to prevent duplicates
 * - **Global Configuration**: Manages default log levels and applies changes globally
 * - **Monitoring Integration**: Ensures all loggers integrate with monitoring services
 * - **Memory Efficiency**: Reuses existing logger instances when appropriate
 *
 * **Thread Safety:**
 * This class uses static methods and properties, making it inherently thread-safe
 * for logger creation and management operations across the SATP ecosystem.
 *
 * @public
 * @class SATPLoggerProvider
 * @since 2.0.0
 * @see {@link SATPLogger} for logger implementation details
 * @see {@link getOrCreate} for logger factory method
 * @see {@link setLogLevel} for global log level management
 */
export class SATPLoggerProvider {
  /** Cache of created logger instances indexed by label to prevent duplicates */
  private static loggers: Map<string, SATPLogger> = new Map();
  /** Default log level applied to new loggers when not specified */
  private static logLevel: LogLevelDesc = "warn";

  /**
   * Creates or retrieves an existing SATP logger instance.
   *
   * @description
   * Factory method that creates new SATP logger instances or returns existing
   * cached instances based on the logger label. This ensures efficient resource
   * utilization and consistent logger behavior across the SATP ecosystem.
   *
   * **Factory Process:**
   * 1. **Log Level Assignment**: Applies default log level if not specified
   * 2. **Cache Lookup**: Checks existing logger cache using label as key
   * 3. **Instance Creation**: Creates new logger if not found in cache
   * 4. **Cache Storage**: Stores newly created logger in instance cache
   * 5. **Instance Return**: Returns cached or newly created logger instance
   *
   * **Caching Strategy:**
   * Loggers are cached by their label to prevent duplicate instances and
   * ensure consistent behavior. This optimizes memory usage and provides
   * a single point of control for each labeled logger.
   *
   * @public
   * @static
   * @method getOrCreate
   * @param {ILoggerOptions} loggerOptions - Logger configuration options including label and level
   * @param {MonitorService} monitorService - Monitoring service for logger integration
   * @returns {SATPLogger} Cached or newly created SATP logger instance
   *
   * @example
   * Create or get logger for a service:
   * ```typescript
   * const logger = SATPLoggerProvider.getOrCreate(
   *   {
   *     label: 'Stage0ClientService',
   *     level: 'debug'
   *   },
   *   monitoringService
   * );
   * logger.info('Service initialized successfully');
   * ```
   *
   * @example
   * Using default log level:
   * ```typescript
   * const logger = SATPLoggerProvider.getOrCreate(
   *   { label: 'SATPSession' }, // level will default to provider's logLevel
   *   monitoringService
   * );
   * ```
   *
   * @since 2.0.0
   * @see {@link SATPLogger} for logger implementation
   * @see {@link ILoggerOptions} for configuration options
   */
  public static getOrCreate(
    loggerOptions: ILoggerOptions,
    monitorService: MonitorService,
  ): SATPLogger {
    // make sure log level is set to global default if otherwise wasn't provided
    loggerOptions.level = loggerOptions.level || SATPLoggerProvider.logLevel;

    let logger: SATPLogger | undefined = SATPLoggerProvider.loggers.get(
      loggerOptions.label,
    );
    if (!logger) {
      logger = new SATPLogger(loggerOptions, monitorService);
      SATPLoggerProvider.loggers.set(loggerOptions.label, logger);
    }
    return logger;
  }

  /**
   * Sets the global log level for the SATP logger provider.
   *
   * @description
   * Updates the default log level for new logger instances and optionally
   * applies the new level to all existing cached logger instances. This
   * provides centralized log level management across the entire SATP ecosystem.
   *
   * **Level Update Process:**
   * 1. **Default Update**: Updates the provider's default log level
   * 2. **Cache Iteration**: Iterates through all cached logger instances
   * 3. **Level Application**: Applies new log level to each cached logger
   * 4. **Immediate Effect**: Changes take effect immediately for all loggers
   *
   * **Use Cases:**
   * - **Runtime Configuration**: Change logging verbosity during operation
   * - **Debug Mode**: Enable debug logging across all SATP components
   * - **Production Optimization**: Reduce logging overhead in production
   * - **Troubleshooting**: Increase logging detail for issue investigation
   *
   * @public
   * @static
   * @method setLogLevel
   * @param {LogLevelDesc} logLevel - New log level to apply (trace, debug, info, warn, error, fatal)
   * @param {boolean} [applyToCachedLoggers=true] - Whether to apply level to existing loggers
   * @returns {void}
   *
   * @example
   * Enable debug logging globally:
   * ```typescript
   * SATPLoggerProvider.setLogLevel('debug');
   * // All existing and new loggers will use debug level
   * ```
   *
   * @example
   * Set production logging without affecting existing loggers:
   * ```typescript
   * SATPLoggerProvider.setLogLevel('error', false);
   * // Only new loggers will use error level
   * ```
   *
   * @example
   * Runtime troubleshooting:
   * ```typescript
   * // Enable detailed logging for troubleshooting
   * SATPLoggerProvider.setLogLevel('trace');
   *
   * // Perform operations that need detailed logging
   * // ...
   *
   * // Return to normal logging
   * SATPLoggerProvider.setLogLevel('warn');
   * ```
   *
   * @since 2.0.0
   * @see {@link LogLevelDesc} for available log levels
   * @see {@link SATPLogger.setLogLevel} for individual logger level setting
   */
  public static setLogLevel(
    logLevel: LogLevelDesc,
    applyToCachedLoggers = true,
  ): void {
    SATPLoggerProvider.logLevel = logLevel;
    if (applyToCachedLoggers) {
      SATPLoggerProvider.loggers.forEach((logger: SATPLogger) =>
        logger.setLogLevel(logLevel as LogLevelDesc),
      );
    }
  }
}
