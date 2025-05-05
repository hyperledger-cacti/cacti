import { OracleAbstract, type OracleAbstractOptions } from "../oracle-abstract";
import safeStableStringify from "safe-stable-stringify";
import {
  ISignerKeyPair,
  type Logger,
  LoggerProvider,
  type LogLevelDesc,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import { PluginBungeeHermes } from "@hyperledger/cactus-plugin-bungee-hermes";
import { StrategyEthereum } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/strategy/strategy-ethereum";
import {
  ContractJSON,
  EthContractInvocationType,
  IPluginLedgerConnectorEthereumOptions,
  isWeb3SigningCredentialNone,
  PluginLedgerConnectorEthereum,
  Web3SigningCredentialCactiKeychainRef,
  Web3SigningCredentialGethKeychainPassword,
  Web3SigningCredentialPrivateKeyHex,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { IOracleEntryBase, IOracleListenerBase } from "../oracle-types";
import {
  EthereumLeaf,
  IEthereumLeafNeworkOptions,
} from "../../bridge/leafs/ethereum-leaf";
import { LedgerType } from "@hyperledger/cactus-core-api";
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
import { SolidityEventLog } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { keccak256 } from "web3-utils";
import { AbiEventFragment, DecodedParams } from "web3";

export interface IEVMOracleEntry extends IOracleEntryBase {
  contractAddress: string;
  contractAbi: any[];
  contractBytecode: string;
}

export interface IOracleEVMOptions
  extends OracleAbstractOptions,
    IEthereumLeafNeworkOptions {}

export class OracleEVM extends OracleAbstract {
  public static CLASS_NAME = "OracleEVM";
  protected readonly connector: PluginLedgerConnectorEthereum;
  protected readonly logger: Logger;
  protected readonly logLevel: LogLevelDesc;
  protected readonly bungee?: PluginBungeeHermes;
  protected readonly claimFormats: ClaimFormat[];
  protected readonly keyPair: ISignerKeyPair;

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
    this.logger = LoggerProvider.getOrCreate({ label, level: this.logLevel });

    this.logger.debug(
      `${OracleEVM.CLASS_NAME}#constructor options: ${safeStableStringify(options)}`,
    );

    if (options.networkIdentification.ledgerType !== LedgerType.Ethereum) {
      throw new UnsupportedNetworkError(
        `${OracleEVM.CLASS_NAME}#constructor, supports only Ethereum networks but got ${options.networkIdentification.ledgerType}`,
      );
    }

    this.networkIdentification = {
      id: options.networkIdentification.id,
      ledgerType: options.networkIdentification.ledgerType,
    };

    this.id = this.options.leafId || this.createId(EthereumLeaf.CLASS_NAME);
    this.keyPair = options.keyPair || Secp256k1Keys.generateKeyPairsBuffer();

    this.claimFormats = !!options.claimFormats
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
    // TODO: Implement contract deployment logic
    return Promise.resolve();
  }

  public async updateEntry(args: IEVMOracleEntry): Promise<OracleResponse> {
    const fnTag = `${OracleEVM.CLASS_NAME}#updateEntry`;
    this.logger.debug(`${fnTag}: Updating args}`);

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
  }

  public async readEntry(args: IEVMOracleEntry): Promise<OracleResponse> {
    const fnTag = `${OracleEVM.CLASS_NAME}#readEntry`;
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

      const output_params = this.extractNamedParams(decoded, filter);

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
  }

  public convertOperationToEntry(operation: OracleOperation): IEVMOracleEntry {
    const fnTag = `${OracleEVM.CLASS_NAME}#convertOperationToEntry`;
    this.logger.debug(
      `${fnTag}: Converting operation to entry: ${safeStableStringify(operation)}`,
    );

    const contract: BusinessLogicContract = operation.contract;

    if (!contract.contractName || !contract.contractAddress) {
      throw new Error(`${fnTag}: Missing contract name or address in contract`);
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
  }

  /**
   * Extracts named parameters from the decoded event.
   * @param decodedEvent - The decoded event object.
   * @param filter - Optional filter for specific parameter names.
   * @returns An array of parameter values.
   */
  private extractNamedParams(decodedEvent: DecodedParams, filter?: string[]): string[] {
    const params = [];

    for (const key in decodedEvent) {
      // skip numeric keys and special properties
      if (!isNaN(Number(key)) || key === "__length__") {
        continue;
      }

      // if filter is provided, check if the key is in the filter
      if (filter && !filter.includes(key)) {
        continue;
      }

      params.push(String(decodedEvent[key]));
    }

    return params;
  }
}
