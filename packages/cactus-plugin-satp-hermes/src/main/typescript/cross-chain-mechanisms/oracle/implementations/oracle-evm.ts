import { OracleAbstract, type OracleAbstractOptions } from "../oracle-abstract";
import safeStableStringify from "safe-stable-stringify";
import {
  ISignerKeyPair,
  type LogLevelDesc,
  Secp256k1Keys,
} from "@hyperledger-cacti/cactus-common";
import { SATPLoggerProvider as LoggerProvider } from "../../../core/satp-logger-provider";
import type { SATPLogger as Logger } from "../../../core/satp-logger";
import { PluginBungeeHermes } from "@hyperledger-cacti/cactus-plugin-bungee-hermes";
import { StrategyEthereum } from "@hyperledger-cacti/cactus-plugin-bungee-hermes/dist/lib/main/typescript/strategy/strategy-ethereum";
import {
  ContractJSON,
  EthContractInvocationType,
  GasTransactionConfig,
  IPluginLedgerConnectorEthereumOptions,
  isWeb3SigningCredentialNone,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialCactiKeychainRef,
  Web3SigningCredentialGethKeychainPassword,
  Web3SigningCredentialPrivateKeyHex,
} from "@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum";
import { IOracleEntryBase, IOracleListenerBase } from "../oracle-types";
import { EthereumLeaf } from "../../bridge/leafs/ethereum-leaf";
import { LedgerType } from "@hyperledger-cacti/cactus-core-api";
import {
  ClaimFormatError,
  NoSigningCredentialError,
  UnsupportedNetworkError,
} from "../../common/errors";
import { ClaimFormat } from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  BusinessLogicContract,
  NetworkId,
  OracleOperation,
  OracleResponse,
} from "../../../public-api";

import { getUint8Key } from "../../bridge/leafs/leafs-utils";
import { v4 as uuidv4 } from "uuid";
import { SolidityEventLog } from "@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum";
import { keccak256 } from "web3-utils";
import { AbiEventFragment, DecodedParams } from "web3";
import { MonitorService } from "../../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";
import { IEthereumNetworkConfig } from "../../bridge/bridge-types";

export interface IEVMOracleEntry extends IOracleEntryBase {
  contractAddress: string;
  contractAbi: any[];
  contractBytecode: string;
}

export interface IOracleEVMOptions
  extends OracleAbstractOptions,
    IEthereumNetworkConfig {}

export class OracleEVM extends OracleAbstract {
  public static CLASS_NAME = "OracleEVM";
  protected readonly connector: PluginLedgerConnectorEthereum;
  protected readonly logger: Logger;
  protected readonly logLevel: LogLevelDesc;
  protected readonly bungee?: PluginBungeeHermes;
  protected readonly claimFormats: ClaimFormat[];
  protected readonly keyPair: ISignerKeyPair;
  protected readonly gasConfig: GasTransactionConfig | undefined;
  protected readonly monitorService: MonitorService;

  private readonly signingCredential:
    | Web3SigningCredentialPrivateKeyHex
    | Web3SigningCredentialGethKeychainPassword
    | Web3SigningCredentialCactiKeychainRef;

  protected readonly id: string;

  protected readonly networkIdentification: NetworkId;

  constructor(public readonly options: IOracleEVMOptions) {
    super();
    const label = OracleEVM.CLASS_NAME;
    this.logLevel = options.logLevel || "INFO";
    this.monitorService = options.monitorService;
    this.logger = LoggerProvider.getOrCreate(
      { label, level: this.logLevel },
      options.monitorService,
    );

    this.logger.debug(
      `${OracleEVM.CLASS_NAME}#constructor options: ${safeStableStringify(options)}`,
    );

    if (options.networkIdentification.ledgerType !== LedgerType.Ethereum) {
      throw new UnsupportedNetworkError(
        `${OracleEVM.CLASS_NAME}#constructor, supports only Ethereum networks but got ${options.networkIdentification.ledgerType}`,
      );
    }

    this.gasConfig = options.gasConfig;

    this.networkIdentification = {
      id: options.networkIdentification.id,
      ledgerType: options.networkIdentification.ledgerType,
    };

    this.id = this.options.leafId || this.createId(EthereumLeaf.CLASS_NAME);
    this.keyPair = options.keyPair || Secp256k1Keys.generateKeyPairsBuffer();

    this.claimFormats = options.claimFormats
      ? options.claimFormats.concat(ClaimFormat.DEFAULT)
      : [ClaimFormat.DEFAULT];

    this.connector = new PluginLedgerConnectorEthereum(
      options.connectorOptions as IPluginLedgerConnectorEthereumOptions,
    );

    if (isWeb3SigningCredentialNone(options.signingCredential)) {
      throw new NoSigningCredentialError(
        `${EthereumLeaf.CLASS_NAME}#constructor, options.signingCredential`,
      );
    }
    this.signingCredential = options.signingCredential;

    for (const claim of this.claimFormats) {
      switch (claim) {
        case ClaimFormat.BUNGEE:
          {
            this.bungee = new PluginBungeeHermes({
              instanceId: uuidv4(),
              pluginRegistry: (
                options.connectorOptions as IPluginLedgerConnectorEthereumOptions
              ).pluginRegistry,
              keyPair: getUint8Key(this.keyPair),
              logLevel: this.logLevel,
            });
            this.bungee.addStrategy(
              this.options.networkIdentification.id,
              new StrategyEthereum(this.logLevel),
            );
          }
          break;
        case ClaimFormat.DEFAULT:
          break;
        default:
          throw new ClaimFormatError(`Claim format not supported: ${claim}`);
      }
    }
  }

  public deployContracts(): Promise<void> {
    const fnTag = `${OracleEVM.CLASS_NAME}#deployContracts`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        // TODO: Implement contract deployment logic
        return Promise.resolve();
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async updateEntry(args: IEVMOracleEntry): Promise<OracleResponse> {
    const fnTag = `${OracleEVM.CLASS_NAME}#updateEntry`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.logger.debug(`${fnTag}: Writing data in EVM blockchain}`);

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: args.contractName,
              bytecode: args.contractBytecode,
              abi: args.contractAbi,
            } as ContractJSON,
            contractAddress: args.contractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: args.methodName,
          params: args.params,
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as {
          success: boolean;
          out: { transactionReceipt: { transactionHash?: string } };
        };

        if (!response.success) {
          throw new Error(`${fnTag}: EVM transaction failed`);
        }

        const transactionResponse: OracleResponse = {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt: response.out.transactionReceipt,
        };

        transactionResponse.proof = undefined;

        return transactionResponse;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async readEntry(args: IEVMOracleEntry): Promise<OracleResponse> {
    const fnTag = `${OracleEVM.CLASS_NAME}#readEntry`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.logger.debug(
          `${fnTag}: Reading entry with args: ${safeStableStringify(args)}`,
        );

        const response = await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: args.contractName,
              bytecode: args.contractBytecode,
              abi: args.contractAbi,
            } as ContractJSON,
            contractAddress: args.contractAddress,
          },
          invocationType: EthContractInvocationType.Call,
          methodName: args.methodName,
          params: args.params || [],
          web3SigningCredential: this.signingCredential,
        });

        if (!response.success) {
          throw new Error(`${fnTag}: EVM read transaction failed`);
        }

        const proof = undefined;

        return {
          transactionId: undefined,
          transactionReceipt: undefined,
          output: response.callOutput,
          proof,
        };
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
   * Subscribes to events emitted by the ledger.
   * This method defines the specific behavior for the Ethereum ledger.
   *
   * @param args - The oracle entry base arguments.
   * @param callback - The callback function to handle the event data.
   * @returns A subscription object that can be used to unsubscribe from the event.
   */
  public async subscribeContractEvent(
    args: IOracleListenerBase,
    callback: (params: string[]) => void,
    filter?: string[],
  ): Promise<{ unsubscribe: () => void }> {
    const fnTag = `${OracleEVM.CLASS_NAME}#subscribeContractEvent`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.logger.debug(
          `${fnTag}: Subscribing to event with args: ${safeStableStringify(args)}`,
        );

        const subscriber = (await this.connector.createSubscriber("logs", {
          address: args.contractAddress,
          topics: [keccak256(args.eventSignature.replace(/\s+/g, ""))], //remove whitespaces and hash the event signature
        })) as {
          on: (event: string, callback: (log: unknown) => void) => void;
          unsubscribe: () => void;
        };

        subscriber.on("data", (log: unknown) => {
          this.logger.debug(
            `${fnTag}: Received event log: ${safeStableStringify(log)}`,
          );

          const decoded = this.connector.decodeEvent(
            log as SolidityEventLog,
            args.contractAbi as AbiEventFragment[],
            args.eventSignature.split("(")[0], // Extract event name from signature
          );

          if (!decoded) {
            this.logger.error(
              `${fnTag}: Failed to decode event log: ${safeStableStringify(log)}`,
            );
            throw new Error(
              `${fnTag}: Failed to decode event log: ${safeStableStringify(log)}`,
            );
          }

          const output_params = this.extractNamedParams(
            this.decodedEventToDict(decoded),
            filter,
          );

          callback(output_params);
        });

        subscriber.on("error", (error: any) => {
          this.logger.error(
            `${fnTag}: Error in event subscription: ${error.message}`,
          );
        });

        return {
          unsubscribe: () => subscriber.unsubscribe(),
        };
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public convertOperationToEntry(operation: OracleOperation): IEVMOracleEntry {
    const fnTag = `${OracleEVM.CLASS_NAME}#convertOperationToEntry`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.logger.debug(
          `${fnTag}: Converting operation to entry: ${safeStableStringify(operation)}`,
        );

        const contract: BusinessLogicContract = operation.contract;

        if (!contract.contractName || !contract.contractAddress) {
          throw new Error(
            `${fnTag}: Missing contract name or address in contract`,
          );
        }
        if (!contract.contractAbi) {
          throw new Error(`${fnTag}: Missing contract ABI in contract`);
        }
        if (!contract.methodName) {
          throw new Error(`${fnTag}: Missing method name in contract`);
        }
        if (!contract.contractBytecode) {
          throw new Error(`${fnTag}: Missing contract bytecode in contract`);
        }

        return {
          contractName: contract.contractName,
          contractAddress: contract.contractAddress,
          contractAbi: contract.contractAbi,
          contractBytecode: contract.contractBytecode,
          methodName: contract.methodName,
          params: contract.params!,
        };
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
   * Converts a decoded event log into a Record<string, string>.
   * @param decoded - The decoded event log from ethers.js parseLog.
   * @returns A record mapping parameter names to their string values.
   */
  private decodedEventToDict(decoded: DecodedParams): Record<string, string> {
    const fnTag = `${OracleEVM.CLASS_NAME}#decodedEventToDict`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        const result: Record<string, string> = {};

        for (const [key, value] of Object.entries(decoded)) {
          // Skip numeric keys to avoid indexed parameters
          if (!isNaN(Number(key))) continue;

          result[key] =
            value !== null && value !== undefined ? String(value) : "";
        }

        return result;
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
