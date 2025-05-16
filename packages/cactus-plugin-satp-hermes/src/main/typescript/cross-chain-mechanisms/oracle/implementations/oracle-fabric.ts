import {
  DeploymentTargetOrganization,
  FabricContractInvocationType,
  type FabricSigningCredential,
  type IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import {
  ISignerKeyPair,
  type Logger,
  LoggerProvider,
  type LogLevelDesc,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import { PluginBungeeHermes } from "@hyperledger/cactus-plugin-bungee-hermes";
import { StrategyFabric } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/strategy/strategy-fabric";
import { OracleAbstract, type OracleAbstractOptions } from "../oracle-abstract";
import { IOracleEntryBase, IOracleListenerBase } from "../oracle-types";
import { ClaimFormat } from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import {
  NetworkId,
  OracleOperation,
  OracleResponse,
} from "../../../public-api";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { X509Identity } from "fabric-network";
import { getUint8Key } from "../../bridge/leafs/leafs-utils";
import {
  UnsupportedNetworkError,
  ConnectorOptionsError,
  ClaimFormatError,
  ChannelNameError,
} from "../../common/errors";
import { v4 as uuidv4 } from "uuid";

interface ContractEvent {
  chaincodeId: string;
  eventName: string;
  payload?: Buffer;
}

export interface IFabricOracleEntry extends IOracleEntryBase {
  channelName: string;
}

export interface IOracleFabricOptions extends OracleAbstractOptions {
  signingCredential: FabricSigningCredential;
  connectorOptions: Partial<IPluginLedgerConnectorFabricOptions>;
  channelName: string;
  targetOrganizations?: Array<DeploymentTargetOrganization>;
  userIdentity?: X509Identity;
  caFile?: string;
  ccSequence?: number;
  orderer?: string;
  ordererTLSHostnameOverride?: string;
  connTimeout?: number;
  signaturePolicy?: string;
  mspId?: string;
  leafId?: string;
  keyPair?: ISignerKeyPair;
  claimFormats?: ClaimFormat[];
}

export class OracleFabric extends OracleAbstract {
  public static readonly CLASS_NAME = "OracleFabric";
  protected readonly id: string;
  protected readonly log: Logger;
  protected readonly logLevel: LogLevelDesc;
  protected readonly networkIdentification: NetworkId;
  protected readonly keyPair: ISignerKeyPair;
  protected readonly connector: PluginLedgerConnectorFabric;
  protected readonly bungee?: PluginBungeeHermes;
  protected readonly claimFormats: ClaimFormat[];

  private readonly signingCredential: FabricSigningCredential;
  private readonly channelName: string;

  constructor(public readonly options: IOracleFabricOptions) {
    super();
    const label = OracleFabric.CLASS_NAME;
    this.logLevel = this.options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level: this.logLevel });

    this.log.debug(
      `${OracleFabric.CLASS_NAME}#constructor options: ${safeStableStringify(options)}`,
    );

    if (options.networkIdentification.ledgerType !== LedgerType.Fabric2) {
      throw new UnsupportedNetworkError(
        `${OracleFabric.CLASS_NAME} supports only Besu networks but got ${options.networkIdentification.ledgerType}`,
      );
    }

    this.networkIdentification = {
      id: options.networkIdentification.id,
      ledgerType: options.networkIdentification.ledgerType,
    };

    this.id = this.options.leafId || this.createId(OracleFabric.CLASS_NAME);
    this.keyPair = options.keyPair || Secp256k1Keys.generateKeyPairsBuffer();

    this.claimFormats = !!options.claimFormats
      ? options.claimFormats.concat(ClaimFormat.DEFAULT)
      : [ClaimFormat.DEFAULT];

    if (!this.isFullPluginOptions(options.connectorOptions)) {
      throw new ConnectorOptionsError(
        "Invalid options provided to the OracleFabric constructor. Please provide a valid IPluginLedgerConnectorFabricOptions object.",
      );
    }

    this.connector = new PluginLedgerConnectorFabric(
      options.connectorOptions as IPluginLedgerConnectorFabricOptions,
    );

    this.signingCredential = options.signingCredential;

    for (const claim of this.claimFormats) {
      switch (claim) {
        case ClaimFormat.BUNGEE:
          {
            this.bungee = new PluginBungeeHermes({
              instanceId: uuidv4(),
              pluginRegistry: (
                options.connectorOptions as IPluginLedgerConnectorFabricOptions
              ).pluginRegistry,
              keyPair: getUint8Key(this.keyPair),
              logLevel: this.logLevel,
            });
            this.bungee.addStrategy(
              this.options.networkIdentification.id,
              new StrategyFabric(this.logLevel),
            );
          }
          break;
        case ClaimFormat.DEFAULT:
          break;
        default:
          throw new ClaimFormatError(`Claim format not supported: ${claim}`);
      }
    }

    if (!options.channelName) {
      throw new ChannelNameError(
        `${OracleFabric.CLASS_NAME}#constructor, Channel Name not provided`,
      );
    }
    this.channelName = options.channelName;
  }

  public deployContracts(): Promise<void> {
    // TODO: Implement contract deployment logic
    return Promise.resolve();
  }

  /**
   * Executes an update transaction on Fabric.
   */
  public async updateEntry(args: IFabricOracleEntry): Promise<OracleResponse> {
    const fnTag = `${OracleFabric.CLASS_NAME}#updateEntry`;
    this.log.debug(`${fnTag}: Updating entry}`);

    const response = await this.connector.transact({
      ...args,
      channelName: this.channelName,
      signingCredential: this.signingCredential,
      invocationType: FabricContractInvocationType.Send,
    });

    if (!response || !response.transactionId) {
      throw new Error(`${fnTag}: Transaction failed`);
    }

    const transactionResponse: OracleResponse = {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };

    transactionResponse.proof = undefined;

    return transactionResponse;
  }

  public async readEntry(args: IFabricOracleEntry): Promise<OracleResponse> {
    const fnTag = `${OracleFabric.CLASS_NAME}#readEntry`;
    this.log.debug(
      `${fnTag}: Reading entry with args: ${safeStableStringify(args)}`,
    );

    const response = await this.connector.transact({
      ...args,
      signingCredential: this.signingCredential,
      invocationType: FabricContractInvocationType.Call,
    });

    if (!response) {
      throw new Error(`${fnTag}: Read transaction failed`);
    }

    const proof = undefined;

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
      proof,
    };
  }

  public async subscribeContractEvent(
    args: IOracleListenerBase,
    callback: (params: string[]) => void,
    filter: string[],
  ): Promise<{ unsubscribe: () => void }> {
    const fnTag = `${OracleFabric.CLASS_NAME}#subscribeContractEvent`;
    this.log.debug(
      `${fnTag}: Subscribing to event with args: ${safeStableStringify(args)}`,
    );

    const { removeListener } = await this.connector.createFabricListener({
      channelName: this.channelName,
      contractName: args.contractName,
      signingCredential: this.signingCredential,
    },
    async (event: ContractEvent) => {
      this.log.debug(
        `${fnTag}: Received event log: ${safeStableStringify(event)}`,
      );

      if (event) {
        if (event.eventName === args.eventSignature && event.payload) {
          const payload = event.payload.toString("utf-8");
          const payloadJson = JSON.parse(payload);

          const output_params = this.extractNamedParams(payloadJson, filter);

          callback(output_params);

        } else {
          this.log.debug(
            `${fnTag}: Event name ${event.eventName} does not match expected ${args.eventSignature}. Will not process.`,
          );
          return;
        }
      }
    });

    return {
      unsubscribe: () => removeListener(),
    };
  }

  public convertOperationToEntry(
    operation: OracleOperation,
  ): IFabricOracleEntry {
    return {
      contractName: operation.contract.contractName!,
      methodName: operation.contract.methodName!,
      params: operation.contract.params!,
      channelName: this.channelName,
    };
  }

  private isFullPluginOptions = (
    obj: Partial<IPluginLedgerConnectorFabricOptions>,
  ): obj is IPluginLedgerConnectorFabricOptions => {
    return (
      obj.peerBinary !== undefined &&
      obj.cliContainerEnv !== undefined &&
      obj.pluginRegistry !== undefined
    );
  };
}
