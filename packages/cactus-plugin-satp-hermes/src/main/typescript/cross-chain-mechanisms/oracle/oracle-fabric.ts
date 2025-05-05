import {
  FabricContractInvocationType,
  type FabricSigningCredential,
  type IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import {
  type Logger,
  LoggerProvider,
  type LogLevelDesc,
} from "@hyperledger/cactus-common";
import type {
  IPluginBungeeHermesOptions,
  PluginBungeeHermes,
} from "@hyperledger/cactus-plugin-bungee-hermes";
import {
  OracleAbstract,
  type OracleAbstractOptions,
  type ReadEntryArgsBase,
  type UpdateOracleEntryBase,
} from "./oracle-abstract";
import { OracleResponse } from "./oracle-types";

export interface UpdateFabricOracleTransactionConfig {
  contractName: string;
  channelName: string;
  keychainId: string;
  signingCredential: FabricSigningCredential;
  gas?: number;
  network: {
    id: string;
    ledgerType: string;
  };
  options: any; // IPluginLedgerConnectorFabricOptions
  bungeeOptions: IPluginBungeeHermesOptions;
}

export interface UpdateFabricOracleEntry extends UpdateOracleEntryBase {
  // Override to include Fabric-specific fields if necessary.
  channelName: string;
}

export interface ReadEntryArgs extends ReadEntryArgsBase {}

export interface OracleFabricOptions extends OracleAbstractOptions {
  oracleConfig: UpdateFabricOracleTransactionConfig;
  connectorConfig: IPluginLedgerConnectorFabricOptions;
}

export class OracleFabric extends OracleAbstract {
  public static readonly CLASS_NAME = "OracleFabric";
  private connector: PluginLedgerConnectorFabric;
  private connectorConfig: IPluginLedgerConnectorFabricOptions;
  protected readonly config: UpdateFabricOracleTransactionConfig;
  private readonly logger: Logger;
  private readonly bungee: PluginBungeeHermes;

  // Updated constructor to call super() with the abstract's options.
  constructor(options: OracleFabricOptions, level?: LogLevelDesc) {
    super({
      bungee: options.bungee,
      logLevel: level || options.logLevel,
    });
    this.connectorConfig = options.connectorConfig;
    const label = OracleFabric.CLASS_NAME;
    this.logger = LoggerProvider.getOrCreate({ label, level: level || "INFO" });
    this.config = options.oracleConfig;
    this.connector = new PluginLedgerConnectorFabric(this.connectorConfig);
    this.network = this.config.network.id;
    this.bungee = options.bungee;
  }

  /**
   * Executes an update transaction on Fabric.
   */
  public async updateEntry(
    entry: UpdateFabricOracleEntry,
  ): Promise<{ transactionResponse: OracleResponse; proof: any }> {
    const fnTag = `${OracleFabric.CLASS_NAME}#updateEntry`;
    this.logger.debug(
      `${fnTag}: Updating entry with header: ${safeStableStringify(entry.header)}`,
    );

    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: entry.channelName,
      methodName: "UpdateFabricOracleEntry",
      params: [
        entry.header.targetChainId,
        entry.header.sequenceNumber.toString(),
        entry.payload,
      ],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    if (!response || !response.transactionId) {
      throw new Error(`${fnTag}: Transaction failed`);
    }

    const transactionResponse: OracleResponse = {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };

    const networkDetails = {
      signingCredential: this.config.signingCredential,
      contractName: this.config.contractName,
      connectorApiPath: this.network,
      keychainId: this.config.keychainId,
      channelName: this.config.channelName,
      contractAddress: "",
      participant: "",
    };

    const snapshot = await this.bungee.generateSnapshot(
      [],
      "ORACLE_FABRIC",
      networkDetails,
    );
    const proof = this.bungee.generateView(
      snapshot,
      "0",
      Number.MAX_SAFE_INTEGER.toString(),
      undefined,
    );

    return { transactionResponse, proof };
  }

  public async readEntry(
    args: ReadEntryArgs,
  ): Promise<{ callOutput: any; proof: any }> {
    const fnTag = `${OracleFabric.CLASS_NAME}#readEntry`;
    this.logger.debug(
      `${fnTag}: Reading entry with args: ${safeStableStringify(args)}`,
    );

    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: args.methodName,
      params: args.params || [],
      contractName: args.contractId,
      invocationType: FabricContractInvocationType.Call,
    });

    if (!response) {
      throw new Error(`${fnTag}: Read transaction failed`);
    }

    const networkDetails = {
      signingCredential: this.config.signingCredential,
      contractName: this.config.contractName,
      connectorApiPath: this.network,
      keychainId: this.config.keychainId,
      channelName: this.config.channelName,
      contractAddress: "",
      participant: "",
    };

    const snapshot = await this.bungee.generateSnapshot(
      [],
      "ORACLE_FABRIC",
      networkDetails,
    );
    const proof = this.bungee.generateView(
      snapshot,
      "0",
      Number.MAX_SAFE_INTEGER.toString(),
      undefined,
    );

    return { callOutput: response.functionOutput, proof };
  }
}
