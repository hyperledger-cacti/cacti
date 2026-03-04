/**
 * @file price-manager.ts
 * @description This file contains the mock implementation of the PriceManager class, which is responsible for managing token prices for different ledger types.
 * It provides methods to check token prices.
 */
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { SATPLoggerProvider as LoggerProvider } from "../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../core/satp-logger";
import { MonitorService } from "../monitoring/monitor";
import { PriceNotFoundError } from "../../cross-chain-mechanisms/common/errors";

/**
 * Options for configuring the PriceManager.
 *
 * @property {LogLevelDesc} [logLevel] - The log level for the PriceManager.
 * @property {MonitorService} [monitorService] - An instance of MonitorService to be used for logging and monitoring.
 * @property {string} [configurationPath] - The path to the directory containing files with sources for token prices.
 */
export interface PriceManagerOptions {
  logLevel?: LogLevelDesc;
  configurationPath?: string;
  monitorService: MonitorService;
}

/**
 * The PriceManager class is responsible for managing token price checks.
 * WARNING: This is a mock implementation
 *
 * @class PriceManager
 */
export class PriceManager {
  public static readonly CLASS_NAME = "PriceManager";
  private readonly logLevel: LogLevelDesc;
  private readonly monitorService: MonitorService;
  private readonly logger: Logger;

  private sources: Map<string, Map<string, string>> = new Map<
    string,
    Map<string, string>
  >();

  /**
   * Creates an instance of PriceManager.
   * @constructor
   * @param {PriceManagerOptions} options - The options for configuring the PriceManager.
   */
  constructor(options: PriceManagerOptions) {
    //const fnTag = `${PriceManager.CLASS_NAME}#constructor()`;
    const label = PriceManager.CLASS_NAME;
    this.logLevel = options.logLevel || "INFO";
    this.monitorService = options.monitorService;
    this.logger = LoggerProvider.getOrCreate(
      { label, level: this.logLevel },
      this.monitorService,
    );
  }

  /**
   * Converts token amounts to USD based on the network.
   * WARNING: This is a mock implementation
   * @param {number} amount - The amount of tokens to convert.
   * @param {string} networkId - The network ID to determine the exchange rate.
   * @returns {number} - The equivalent amount in USD.
   * @throws {PriceNotFoundError} - If the price for the given networkId is not found or if the amount is invalid.
   */
  public convertTokensToUSD(amount: number, networkId: string): number {
    if (amount === undefined || isNaN(amount) || amount <= 0) {
      this.logger.error(`Invalid amount: ${amount}`);
      throw new PriceNotFoundError(`Invalid amount: ${amount}`);
    }
    const exchangeRates: { [key: string]: number } = {
      BesuLedgerTestNetwork: 2, // 1 token = 2 USD
      EthereumLedgerTestNetwork: 1.5, // 1 token = 1.5 USD
      FabricLedgerTestNetwork: 0.5, // 1 token = 0.5 USD
    };

    if (networkId.includes("EthereumLedgerTestNetwork")) {
      networkId = "EthereumLedgerTestNetwork";
    } else if (networkId.includes("BesuLedgerTestNetwork")) {
      networkId = "BesuLedgerTestNetwork";
    } else if (networkId.includes("FabricLedgerTestNetwork")) {
      networkId = "FabricLedgerTestNetwork";
    }

    const rate = exchangeRates[networkId];
    if (rate === undefined) {
      this.logger.error(`Price not found for networkId: ${networkId}`);
      throw new PriceNotFoundError(
        `Price not found for networkId: ${networkId}`,
      );
    }
    return amount * rate;
  }
}
