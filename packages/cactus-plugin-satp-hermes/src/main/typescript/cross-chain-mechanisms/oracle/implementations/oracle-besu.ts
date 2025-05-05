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
import { IOracleEntryBase, IOracleListenerBase } from "../oracle-types";

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
import { IBesuLeafNeworkOptions } from "../../bridge/leafs/besu-leaf";
import {
  EthContractInvocationType,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialPrivateKeyHex,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { isWeb3SigningCredentialNone } from "../../common/utils";
import { StrategyBesu } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/strategy/strategy-besu";

export interface IBesuOracleEntry extends IOracleEntryBase {
  contractAddress: string;
  contractAbi: any[];
  gas?: number;
}

export interface IOracleBesuOptions
  extends OracleAbstractOptions,
    IBesuLeafNeworkOptions {}

export class OracleBesu extends OracleAbstract {
  public static CLASS_NAME = "OracleBesu";
  protected readonly connector: PluginLedgerConnectorBesu;
  protected readonly logger: Logger;
  protected readonly logLevel: LogLevelDesc;
  protected readonly bungee?: PluginBungeeHermes;
  protected readonly claimFormats: ClaimFormat[];
  protected readonly keyPair: ISignerKeyPair;

  private readonly signingCredential:
    | Web3SigningCredentialPrivateKeyHex
    | Web3SigningCredentialCactusKeychainRef;

  protected readonly id: string;

  protected readonly networkIdentification: NetworkId;

  constructor(public readonly options: IOracleBesuOptions) {
    super();
    const label = OracleBesu.CLASS_NAME;
    this.logLevel = options.logLevel || "INFO";
    this.logger = LoggerProvider.getOrCreate({ label, level: this.logLevel });

    this.logger.debug(
      `${OracleBesu.CLASS_NAME}#constructor options: ${safeStableStringify(options)}`,
    );

    if (
      options.networkIdentification.ledgerType !== LedgerType.Besu1X &&
      options.networkIdentification.ledgerType !== LedgerType.Besu2X
    ) {
      throw new UnsupportedNetworkError(
        `${OracleBesu.CLASS_NAME}#constructor, supports only Besu networks but got ${options.networkIdentification.ledgerType}`,
      );
    }

    this.networkIdentification = {
      id: options.networkIdentification.id,
      ledgerType: options.networkIdentification.ledgerType,
    };

    this.id = this.options.leafId || this.createId(OracleBesu.CLASS_NAME);
    this.keyPair = options.keyPair || Secp256k1Keys.generateKeyPairsBuffer();

    this.claimFormats = !!options.claimFormats
      ? options.claimFormats.concat(ClaimFormat.DEFAULT)
      : [ClaimFormat.DEFAULT];

    this.connector = new PluginLedgerConnectorBesu(
      options.connectorOptions as IPluginLedgerConnectorBesuOptions,
    );

    if (isWeb3SigningCredentialNone(options.signingCredential)) {
      throw new NoSigningCredentialError(
        `${OracleBesu.CLASS_NAME}#constructor, options.signingCredential`,
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
                options.connectorOptions as IPluginLedgerConnectorBesuOptions
              ).pluginRegistry,
              keyPair: getUint8Key(this.keyPair),
              logLevel: this.logLevel,
            });
            this.bungee.addStrategy(
              this.options.networkIdentification.id,
              new StrategyBesu(this.logLevel),
            );
          }
          break;
        case ClaimFormat.DEFAULT:
          break;
        default:
          throw new ClaimFormatError(
            `${OracleBesu.CLASS_NAME}#constructor, Claim format not supported: ${claim}`,
          );
      }
    }
  }

  public deployContracts(): Promise<void> {
    // TODO: Implement contract deployment logic
    return Promise.resolve();
  }

  public async updateEntry(args: IBesuOracleEntry): Promise<OracleResponse> {
    const fnTag = `${OracleBesu.CLASS_NAME}#updateEntry`;
    this.logger.debug(`${fnTag}: Updating args}`);

    if (!args.contractName || !args.contractAddress) {
      throw new Error(`${fnTag}: Missing contract name or address in args`);
    }
    if (!args.contractAbi) {
      throw new Error(`${fnTag}: Missing contract ABI in args`);
    }
    if (!args.methodName) {
      throw new Error(`${fnTag}: Missing method name in args`);
    }

    const response = (await this.connector.invokeContract({
      ...args,
      invocationType: EthContractInvocationType.Send,
      signingCredential: this.signingCredential,
      gas: 6721975,
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

  public async readEntry(args: IBesuOracleEntry): Promise<OracleResponse> {
    const fnTag = `${OracleBesu.CLASS_NAME}#readEntry`;
    this.logger.debug(
      `${fnTag}: Reading entry with args: ${safeStableStringify(args)}`,
    );

    const response = (await this.connector.invokeContract({
      ...args,
      invocationType: EthContractInvocationType.Call,
      signingCredential: this.signingCredential,
      // gas: args.gas,
    })) as { success: boolean; callOutput: any };

    if (!response.success) {
      throw new Error(`${fnTag}: Besu read transaction failed`);
    }

    const proof = undefined;

    return {
      transactionId: response.callOutput.transactionHash ?? "",
      transactionReceipt: response.callOutput.transactionReceipt ?? "",
      output: response.callOutput,
      proof,
    };
  }

  // TODO: Dependent on the implementation of the event listener (#3844)
  // https://github.com/hyperledger-cacti/cacti/pull/3844
  public subscribeContractEvent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args: IOracleListenerBase,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    callback: (params: string[]) => void,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filter: string[],
  ): Promise<{ unsubscribe: () => void }> {
    throw new Error("Method not implemented.");
  }

  public convertOperationToEntry(operation: OracleOperation): IBesuOracleEntry {
    const fnTag = `${OracleBesu.CLASS_NAME}#convertOperationToEntry`;
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

    return {
      contractName: contract.contractName,
      contractAddress: contract.contractAddress,
      contractAbi: contract.contractAbi,
      methodName: contract.methodName,
      params: contract.params!,
    };
  }
}
