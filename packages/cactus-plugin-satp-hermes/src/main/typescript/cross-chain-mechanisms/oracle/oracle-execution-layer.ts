// this file contains a class that encapsulates the logic for managing the Oracle (read and write).
// should inject satp gateway session data (having parameters/chains for transactions), and processes smart contract output

import { LogLevelDesc } from "@hyperledger/cactus-common";
import { SatpLoggerProvider as LoggerProvider } from "../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../core/satp-logger";
import { ClaimFormat } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { ClaimFormatError, TransactionError } from "../common/errors";
import { OracleAbstract } from "./oracle-abstract";
import { IOracleEntryBase } from "./oracle-types";
import { OracleResponse, OracleOperation } from "../../public-api";
import { MonitorService } from "../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";

/**
 * Options for configuring the IOracleExecutionLayer.
 *
 * @property {OracleAbstract} oracleImpl - The bridge leaf instance used for the execution layer.
 * @property {ClaimFormat} [claimType] - Optional claim format type.
 * @property {LogLevelDesc} [logLevel] - Optional log level description for logging purposes.
 */
export interface IOracleExecutionLayerOptions {
  oracleImpl: OracleAbstract;
  claimType?: ClaimFormat;
  logLevel?: LogLevelDesc;
  monitorService: MonitorService;
}

/**
 * @class OracleExecutionLayer
 * @implements OracleExecutionLayer
 * @description Provides methods to read and write data across different blockchain networks.
 */

export class OracleExecutionLayer implements OracleExecutionLayer {
  public static readonly CLASS_NAME = "OracleExecutionLayer";

  private readonly log: Logger;
  private readonly logLevel: LogLevelDesc;
  private readonly oracleImpl: OracleAbstract;
  private readonly claimType: ClaimFormat;
  private readonly monitorService: MonitorService;

  /**
   * Constructs an instance of OracleExecutionLayer.
   *
   * @param options - The options for configuring the OracleExecutionLayer instance.
   *
   * @throws {ClaimFormatError} If the provided claim type is not supported by the bridge.
   */
  constructor(public readonly options: IOracleExecutionLayerOptions) {
    const label = OracleExecutionLayer.CLASS_NAME;
    this.logLevel = this.options.logLevel || "INFO";
    this.monitorService = this.options.monitorService;
    this.log = LoggerProvider.getOrCreate(
      { label, level: this.logLevel },
      this.monitorService,
    );

    this.claimType = options.claimType || ClaimFormat.DEFAULT;

    if (!(this.claimType in options.oracleImpl.getSupportedClaimFormats())) {
      throw new ClaimFormatError("Claim not supported by the bridge");
    }
    this.oracleImpl = options.oracleImpl;
  }

  /**
   * Reads an entry from the oracle implementation.
   *
   * @param args - The arguments for reading the entry.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset locking.
   */
  public async readEntry(args: IOracleEntryBase): Promise<OracleResponse> {
    const fnTag = `${OracleExecutionLayer.CLASS_NAME}#read()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        try {
          return await this.oracleImpl.readEntry(args);
        } catch (error) {
          this.log.error(
            `${fnTag} - Error reading entry from oracle implementation`,
            error,
          );
          throw new TransactionError(fnTag, error);
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Reads an entry from the oracle implementation.
   *
   * @param args - The arguments for reading the entry.
   * @returns A promise that resolves to a transaction receipt containing the receipt and proof of the asset locking.
   */
  public async updateEntry(args: IOracleEntryBase): Promise<OracleResponse> {
    const fnTag = `${OracleExecutionLayer.CLASS_NAME}#read()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        try {
          return await this.oracleImpl.updateEntry(args);
        } catch (error) {
          this.log.error(
            `${fnTag} - Error writing entry to oracle implementation`,
            error,
          );
          throw new TransactionError(fnTag, error);
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Converts an operation to an oracle entry.
   *
   * @param operation - The operation to be converted.
   * @returns The converted oracle entry.
   */
  public convertOperationToEntry(operation: OracleOperation): IOracleEntryBase {
    const fnTag = `${OracleExecutionLayer.CLASS_NAME}#convertOperationToEntry`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.log.debug(`${fnTag} - Converting operation to entry`, operation);

        try {
          return this.oracleImpl.convertOperationToEntry(operation);
        } catch (error) {
          this.log.error(
            `${fnTag} - Conversion from Operation to blockchain transaction failed`,
            error,
          );
          throw error;
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
