/**
 * @fileoverview
 * SATP Logger - Specialized Logging Implementation with Monitoring Integration
 *
 * @description
 * This module provides a specialized logger implementation for SATP (Secure Asset Transfer
 * Protocol) operations within the Hyperledger Cacti ecosystem. It extends standard logging
 * capabilities with integrated monitoring services, ensuring comprehensive observability
 * and debugging support throughout the SATP protocol lifecycle.
 *
 * **Core Features:**
 * - **Dual Logging**: Simultaneously logs to standard backend and monitoring service
 * - **Level Management**: Supports dynamic log level configuration and updates
 * - **Monitoring Integration**: Seamlessly integrates with SATP monitoring infrastructure
 * - **Protocol Context**: Optimized for SATP protocol operations and debugging
 * - **Structured Logging**: Provides consistent log formatting across SATP components
 *
 * **Monitoring Benefits:**
 * - **Centralized Observability**: All SATP logs are captured by monitoring service
 * - **Real-time Tracking**: Enables real-time monitoring of SATP operations
 * - **Debug Support**: Facilitates comprehensive debugging and troubleshooting
 * - **Audit Trail**: Maintains detailed audit trails for compliance and analysis
 * - **Performance Monitoring**: Supports performance analysis and optimization
 *
 * **Usage Context:**
 * This logger is specifically designed for SATP protocol components including
 * services, handlers, sessions, and utilities. It ensures consistent logging
 * behavior while providing enhanced monitoring capabilities essential for
 * production SATP deployments.
 *
 * @author SATP Development Team
 * @since 0.0.3-beta
 * @version 0.0.3-beta
 * @see {@link Logger} for base logging functionality
 * @see {@link MonitorService} for monitoring integration
 * @see {@link SATPLoggerProvider} for logger factory
 */

import {
  ILoggerOptions,
  LogLevelDesc,
  Logger,
} from "@hyperledger-cacti/cactus-common";
import { MonitorService } from "../services/monitoring/monitor";

/**
 * SATP-specific logger implementation with integrated monitoring capabilities.
 *
 * @description
 * Provides specialized logging functionality for SATP protocol operations with
 * dual output to both standard logging backend and monitoring service. This
 * ensures comprehensive observability and debugging support throughout the
 * SATP protocol lifecycle.
 *
 * **Key Capabilities:**
 * - **Dual Output**: Logs to both standard backend and monitoring service
 * - **Dynamic Configuration**: Supports runtime log level changes
 * - **Structured Logging**: Consistent formatting for SATP operations
 * - **Monitoring Integration**: Seamless integration with monitoring infrastructure
 * - **Resource Management**: Proper lifecycle management and cleanup
 *
 * **Logging Levels:**
 * - **trace**: Detailed execution flow and internal state information
 * - **debug**: Detailed debugging information for development and troubleshooting
 * - **info**: General informational messages about normal operations
 * - **warn**: Warning messages about potential issues or unusual conditions
 * - **error**: Error messages about failures and exception conditions
 *
 * @public
 * @class SATPLogger
 * @since 0.0.3-beta
 * @see {@link Logger} for underlying logging implementation
 * @see {@link MonitorService} for monitoring service integration
 * @see {@link ILoggerOptions} for configuration options
 */
export class SATPLogger {
  /** Underlying logger backend for standard logging operations */
  private readonly backend: Logger;
  /** Monitoring service for centralized log collection and observability */
  private readonly monitorService: MonitorService;

  /**
   * Constructs a new SATP logger instance with monitoring integration.
   *
   * @description
   * Initializes the SATP logger with both standard logging backend and
   * monitoring service integration. Sets up consistent logging configuration
   * and ensures dual output for comprehensive observability.
   *
   * **Initialization Process:**
   * 1. **Level Configuration**: Sets log level from options or defaults to 'warn'
   * 2. **Backend Setup**: Creates standard logger backend with label and level
   * 3. **Monitor Integration**: Configures monitoring service integration
   * 4. **Dual Output**: Enables simultaneous logging to both outputs
   *
   * @param options - Logger configuration options
   * @param monitorService - Monitoring service for log collection
   * @since 0.0.3-beta
   */
  constructor(
    public readonly options: ILoggerOptions,
    monitorService: MonitorService,
  ) {
    const level: LogLevelDesc = options.level || "warn";
    this.backend = new Logger({ label: options.label, level });
    this.monitorService = monitorService;
  }

  /**
   * Updates the log level for this logger instance.
   *
   * @description
   * Dynamically changes the logging level for this specific logger instance.
   * This allows runtime configuration of logging verbosity without requiring
   * logger recreation or system restart.
   *
   * @param logLevel - New log level to apply
   * @since 0.0.3-beta
   */
  public setLogLevel(logLevel: LogLevelDesc): void {
    this.backend.setLogLevel(logLevel);
  }

  /**
   * Gracefully shuts down the logger and releases resources.
   *
   * @description
   * Performs cleanup operations for the logger instance, ensuring proper
   * resource release and final log message delivery. Logs shutdown status
   * to both backend and monitoring service for audit purposes.
   *
   * @returns Promise that resolves when shutdown is complete
   * @since 0.0.3-beta
   */
  public async shutdown(): Promise<void> {
    this.backend.info("Shut down logger OK.");
    if (this.monitorService)
      this.monitorService.createLog("info", "Shut down logger OK.");
  }

  /**
   * Logs error-level messages with dual output.
   *
   * @description
   * Records error messages to both standard logging backend and monitoring
   * service. Used for logging serious errors, exceptions, and failure conditions
   * that require immediate attention.
   *
   * @param msg - Error messages and data to log
   * @since 0.0.3-beta
   */
  public error(...msg: unknown[]): void {
    this.backend.error(...msg);
    if (this.monitorService) this.monitorService.createLog("error", ...msg);
  }

  /**
   * Logs warning-level messages with dual output.
   *
   * @description
   * Records warning messages to both standard logging backend and monitoring
   * service. Used for logging potential issues, unusual conditions, or
   * recoverable problems that should be monitored.
   *
   * @param msg - Warning messages and data to log
   * @since 0.0.3-beta
   */
  public warn(...msg: unknown[]): void {
    this.backend.warn(...msg);
    if (this.monitorService) this.monitorService.createLog("warn", ...msg);
  }

  /**
   * Logs informational messages with dual output.
   *
   * @description
   * Records informational messages to both standard logging backend and
   * monitoring service. Used for logging normal operations, status updates,
   * and general information about system behavior.
   *
   * @param msg - Informational messages and data to log
   * @since 0.0.3-beta
   */
  public info(...msg: unknown[]): void {
    this.backend.info(...msg);
    if (this.monitorService) this.monitorService.createLog("info", ...msg);
  }

  /**
   * Logs debug-level messages with dual output.
   *
   * @description
   * Records debug messages to both standard logging backend and monitoring
   * service. Used for detailed debugging information, development diagnostics,
   * and troubleshooting support.
   *
   * @param msg - Debug messages and data to log
   * @since 0.0.3-beta
   */
  public debug(...msg: unknown[]): void {
    this.backend.debug(...msg);
    if (this.monitorService) this.monitorService.createLog("debug", ...msg);
  }

  /**
   * Logs trace-level messages with dual output.
   *
   * @description
   * Records trace messages to both standard logging backend and monitoring
   * service. Used for the most detailed logging including execution flow,
   * internal state information, and fine-grained debugging data.
   *
   * @param msg - Trace messages and data to log
   * @since 0.0.3-beta
   */
  public trace(...msg: unknown[]): void {
    this.backend.trace(...msg);
    if (this.monitorService) this.monitorService.createLog("trace", ...msg);
  }
}
