import {
  OracleAbstract,
  type OracleAbstractOptions,
  type UpdateOracleEntryBase,
  type ReadEntryArgsBase,
} from "./oracle-abstract";
import {
  EthContractInvocationType,
  PluginLedgerConnectorBesu,
  type Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import safeStableStringify from "safe-stable-stringify";
import {
  type Logger,
  LoggerProvider,
  type LogLevelDesc,
} from "@hyperledger/cactus-common";
import type {
  IPluginBungeeHermesOptions,
  PluginBungeeHermes,
} from "@hyperledger/cactus-plugin-bungee-hermes";
import type { IPluginLedgerConnectorEthereumOptions } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { OracleResponse } from "./oracle-types";

export interface UpdateEVMOracleTransactionConfig {
  contractName: string;
  keychainId: string;
  signingCredential: Web3SigningCredential;
  gas: number;
  network: {
    id: string;
    ledgerType: string;
  };
  options: any;
  bungeeOptions: IPluginBungeeHermesOptions;
}

export interface UpdateEVMOracleEntry extends UpdateOracleEntryBase {}
export interface ReadEntryArgs extends ReadEntryArgsBase {}

export interface OracleEVMOptions extends OracleAbstractOptions {
  oracleConfig: UpdateEVMOracleTransactionConfig;
  connectorConfig: IPluginLedgerConnectorEthereumOptions;
}
export class OracleEVM extends OracleAbstract {
  public static CLASS_NAME = "OracleAbstract";
  private readonly connector: PluginLedgerConnectorBesu;
  protected readonly config: UpdateEVMOracleTransactionConfig;
  private readonly logger: Logger;
  private readonly bungee: PluginBungeeHermes;

  constructor(options: OracleEVMOptions, level?: LogLevelDesc) {
    super({
      bungee: options.bungee,
      logLevel: level || options.logLevel,
    });
    const label = OracleEVM.CLASS_NAME;
    this.logger = LoggerProvider.getOrCreate({ label, level: level || "INFO" });
    this.config = options.oracleConfig;
    this.connector = new PluginLedgerConnectorBesu(this.config.options);
    this.network = this.config.network.id;
    this.bungee = options.bungee;
  }

  public async updateEntry(
    entry: UpdateEVMOracleEntry,
  ): Promise<{ transactionResponse: OracleResponse; proof: any }> {
    const fnTag = `${OracleEVM.CLASS_NAME}#updateEntry`;
    this.logger.debug(
      `${fnTag}: Updating entry with header: ${safeStableStringify(entry.header)}`,
    );

    const response = (await this.connector.invokeContract({
      contractName: this.config.contractName,
      keychainId: this.config.keychainId,
      invocationType: EthContractInvocationType.Send,
      methodName: "UpdateEVMOracleEntry",
      params: [
        entry.header.targetChainId,
        entry.header.sequenceNumber.toString(),
        entry.payload,
      ],
      signingCredential: this.config.signingCredential,
      gas: this.config.gas,
    })) as {
      success: boolean;
      out: { transactionReceipt: { transactionHash?: string } };
    };

    if (!response.success) {
      throw new Error(`${fnTag}: EVM transaction failed`);
    }

    const transactionResponse: OracleResponse = {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };

    const networkDetails = {
      signingCredential: this.config.signingCredential,
      contractName: this.config.contractName,
      connectorApiPath: this.network,
      keychainId: this.config.keychainId,
      contractAddress: "",
      participant: "",
    };

    const snapshot = await this.bungee.generateSnapshot(
      [],
      "ORACLE_EVM",
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
    const fnTag = `${OracleEVM.CLASS_NAME}#readEntry`;
    this.logger.debug(
      `${fnTag}: Reading entry with args: ${safeStableStringify(args)}`,
    );

    const response = (await this.connector.invokeContract({
      contractName: args.contractId,
      keychainId: this.config.keychainId,
      invocationType: EthContractInvocationType.Call,
      methodName: args.methodName,
      params: args.params || [],
      signingCredential: this.config.signingCredential,
      gas: this.config.gas,
    })) as { success: boolean; callOutput: any };

    if (!response.success) {
      throw new Error(`${fnTag}: EVM read transaction failed`);
    }

    const networkDetails = {
      signingCredential: this.config.signingCredential,
      contractName: this.config.contractName,
      connectorApiPath: this.network,
      keychainId: this.config.keychainId,
      contractAddress: "",
      participant: "",
    };

    const snapshot = await this.bungee.generateSnapshot(
      [],
      "ORACLE_EVM",
      networkDetails,
    );
    const proof = this.bungee.generateView(
      snapshot,
      "0",
      Number.MAX_SAFE_INTEGER.toString(),
      undefined,
    );

    return { callOutput: response.callOutput, proof };
  }
}
