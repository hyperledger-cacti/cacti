//// filepath: /Users/rafaelapb/Projects/blockchain-integration-framework/packages/cactus-plugin-satp-hermes/src/main/typescript/cross-chain-mechanisms/oracle/oracle-abstract.ts
import type { LogLevelDesc } from "@hyperledger/cactus-common";
import type { PluginBungeeHermes } from "@hyperledger/cactus-plugin-bungee-hermes";
import { OracleResponse } from "./oracle-types";

/**
 * Common interface options for all Oracles.
 */
export interface OracleAbstractOptions {
  bungee: PluginBungeeHermes;
  logLevel?: LogLevelDesc;
}

/**
 * Data structure for updating the ledger with some payload.
 */
export interface UpdateOracleEntryBase {
  header: {
    targetChainId: string;
    sequenceNumber: number;
  };
  payload: string;
}

/**
 * Data structure for reading from the ledger (method name, contract, etc.).
 */
export interface ReadEntryArgsBase {
  chainId: string;
  contractId: string;
  methodName: string;
  params?: any[];
}

export abstract class OracleAbstract {
  protected readonly config: any;
  public network: string;
  private options: OracleAbstractOptions;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: OracleAbstractOptions) {
    this.network = this.config?.network?.id || "";
    this.options = options;
  }

  /**
   * Method to update the ledger with some payload.
   * Must be implemented by subclass (Fabric/EVM, etc.).
   */
  public abstract updateEntry(
    entry: UpdateOracleEntryBase,
  ): Promise<{ transactionResponse: OracleResponse; proof: any }>;

  /**
   * Method to read from the ledger (e.g., query a method).
   * Must be implemented by subclass.
   */
  public abstract readEntry(
    args: ReadEntryArgsBase,
  ): Promise<{ callOutput: any; proof: any }>;

  public getOptions(): OracleAbstractOptions {
    return this.options;
  }
}
