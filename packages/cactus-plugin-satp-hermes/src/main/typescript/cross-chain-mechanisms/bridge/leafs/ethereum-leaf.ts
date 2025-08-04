import { INetworkOptions, TransactionResponse } from "../bridge-types";
import {
  EthContractInvocationType,
  GasTransactionConfig,
  InvokeRawWeb3EthMethodV1Request,
  IPluginLedgerConnectorEthereumOptions,
  isWeb3SigningCredentialNone,
  PluginLedgerConnectorEthereum,
  RunTransactionResponse,
  Web3SigningCredential,
  Web3SigningCredentialCactiKeychainRef,
  Web3SigningCredentialGethKeychainPassword,
  Web3SigningCredentialPrivateKeyHex,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { PluginBungeeHermes } from "@hyperledger/cactus-plugin-bungee-hermes";
import { StrategyEthereum } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/strategy/strategy-ethereum";
import {
  EvmAsset,
  EvmFungibleAsset,
  EvmNonFungibleAsset,
} from "../ontology/assets/evm-asset";
import { LogLevelDesc, Secp256k1Keys } from "@hyperledger/cactus-common";
import { SATPLoggerProvider as LoggerProvider } from "../../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../../core/satp-logger";
import { v4 as uuidv4 } from "uuid";
import {
  ClaimFormat,
  TokenType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { OntologyManager } from "../ontology/ontology-manager";
import { Web3TransactionReceipt } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { BridgeLeafFungible } from "../bridge-leaf-fungible";
import { BridgeLeafNonFungible } from "../bridge-leaf-non-fungible";
import { BridgeLeaf, IBridgeLeafOptions } from "../bridge-leaf";
import {
  ApproveAddressError,
  BungeeError,
  ClaimFormatError,
  ConnectorOptionsError,
  ContractAddressError,
  InvalidWrapperContract,
  NoSigningCredentialError,
  ProofError,
  ReceiptError,
  TransactionError,
  TransactionReceiptError,
  UnsupportedNetworkError,
  WrapperContractAlreadyCreatedError,
  WrapperContractError,
} from "../../common/errors";
import { ISignerKeyPair } from "@hyperledger/cactus-common";
import SATPWrapperContract from "../../../../solidity/generated/SATPWrapperContract.sol/SATPWrapperContract.json";
import { Asset, UniqueTokenID, Amount } from "../ontology/assets/asset";
import { TokenResponse } from "../../../generated/SATPWrapperContract";
import { NetworkId } from "../../../public-api";
import { getEnumKeyByValue } from "../../../services/utils";
import { getUint8Key } from "./leafs-utils";
import { MonitorService } from "../../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";

export interface IEthereumLeafNeworkOptions extends INetworkOptions {
  signingCredential: Web3SigningCredential;
  connectorOptions: Partial<IPluginLedgerConnectorEthereumOptions>;
  wrapperContractName?: string;
  wrapperContractAddress?: string;
  gasConfig?: GasTransactionConfig;
  leafId?: string;
  keyPair?: ISignerKeyPair;
  claimFormats?: ClaimFormat[];
}
export interface IEthereumLeafOptions
  extends IBridgeLeafOptions,
    IEthereumLeafNeworkOptions {}

/**
 * Represents the response from an Ethereum transaction.
 *
 * @interface EthereumResponse
 *
 * @property {boolean} success - Indicates whether the transaction was successful.
 * @property {RunTransactionResponse} out - The detailed response of the executed transaction.
 * @property {unknown} callOutput - The output of the call, which can be of any type.
 */
interface EthereumResponse {
  success: boolean;
  out: RunTransactionResponse;
  callOutput: unknown;
}

/**
 * Represents an Ethereum leaf in a cross-chain bridge mechanism.
 *
 * This class extends the `BridgeLeaf` class and implements the `BridgeLeafFungible` and `BridgeLeafNonFungible` interfaces.
 * It provides methods for deploying wrapper contracts, wrapping and unwrapping assets, locking and unlocking assets,
 * minting and burning assets, assigning assets, and retrieving asset information.
 *
 * @class EthereumLeaf
 * @extends BridgeLeaf
 * @implements BridgeLeafFungible
 * @implements BridgeLeafNonFungible
 *
 * @property {Logger} log - The logger instance for logging messages.
 * @property {LogLevelDesc} logLevel - The log level for the logger.
 * @property {string} id - The unique identifier for the Ethereum leaf.
 * @property {NetworkId} networkIdentification - The network identification details.
 * @property {ISignerKeyPairs} keyPair - The key pair used for signing transactions.
 * @property {PluginLedgerConnectorEthereum} connector - The Ethereum ledger connector plugin instance.
 * @property {PluginBungeeHermes} [bungee] - The Bungee Hermes plugin instance for Bungee claim format.
 * @property {ClaimFormat} claimFormat - The claim format used for the Ethereum leaf.
 * @property {OntologyManager} ontologyManager - The ontology manager instance.
 * @property {Web3SigningCredentialPrivateKeyHex | Web3SigningCredentialGethKeychainPassword | Web3SigningCredentialCactiKeychainRef} signingCredential - The credential used for signing transactions.
 * @property {number} gas - The gas limit for transactions.
 * @property {Web3TransactionReceipt} [wrapperFungibleDeployReceipt] - The receipt of the deployed fungible wrapper contract.
 * @property {string} [wrapperContractAddress] - The address of the wrapper contract.
 * @property {string} [wrapperContractName] - The name of the wrapper contract.
 */
export class EthereumLeaf
  extends BridgeLeaf
  implements BridgeLeafFungible, BridgeLeafNonFungible
{
  public static readonly CLASS_NAME = "EthereumLeaf";

  protected readonly log: Logger;
  protected readonly logLevel: LogLevelDesc;

  protected readonly id: string;

  protected readonly networkIdentification: NetworkId;

  protected readonly keyPair: ISignerKeyPair;

  protected readonly connector: PluginLedgerConnectorEthereum;

  protected bungee?: PluginBungeeHermes;

  protected readonly claimFormats: ClaimFormat[];

  protected readonly ontologyManager: OntologyManager;

  private readonly signingCredential:
    | Web3SigningCredentialPrivateKeyHex
    | Web3SigningCredentialGethKeychainPassword
    | Web3SigningCredentialCactiKeychainRef;

  private readonly gasConfig: GasTransactionConfig | undefined;

  private wrapperDeployReceipt: Web3TransactionReceipt | undefined;

  private wrapperContractAddress: string | undefined;

  private wrapperContractName: string | undefined;

  private readonly monitorService: MonitorService;

  /**
   * Constructs a new instance of the `EthereumLeaf` class.
   *
   * @param {EthereumLeafOptions} options - The options for configuring the Ethereum leaf.
   *
   * @throws {UnsupportedNetworkError} If the network type is not Ethereum.
   * @throws {NoSigningCredentialError} If no signing credential is provided.
   * @throws {InvalidWrapperContract} If the wrapper contract name or address is missing.
   */
  constructor(
    public readonly options: IEthereumLeafOptions,
    ontologyManager: OntologyManager,
    monitorService: MonitorService,
  ) {
    const fnTag = `${EthereumLeaf.CLASS_NAME}#constructor()`;
    super();
    const label = EthereumLeaf.CLASS_NAME;
    this.logLevel = this.options.logLevel || "INFO";
    this.monitorService = monitorService;
    this.log = LoggerProvider.getOrCreate(
      { label, level: this.logLevel },
      this.monitorService,
    );
    this.log.debug(
      `${EthereumLeaf.CLASS_NAME}#constructor options: ${safeStableStringify(options)}`,
    );

    if (options.networkIdentification.ledgerType !== LedgerType.Ethereum) {
      throw new UnsupportedNetworkError(
        `${EthereumLeaf.CLASS_NAME}#constructor, supports only Ethereum networks but got ${options.networkIdentification.ledgerType}`,
      );
    }

    this.networkIdentification = {
      id: options.networkIdentification.id,
      ledgerType: options.networkIdentification.ledgerType,
    };

    this.id = this.options.leafId || this.createId(EthereumLeaf.CLASS_NAME);
    this.keyPair = options.keyPair || Secp256k1Keys.generateKeyPairsBuffer();

    this.claimFormats = options.claimFormats
      ? options.claimFormats.concat(ClaimFormat.DEFAULT)
      : [ClaimFormat.DEFAULT];

    if (!this.isFullPluginOptions(options.connectorOptions)) {
      throw new ConnectorOptionsError(
        "Invalid options provided to the FabricLeaf constructor. Please provide a valid IPluginLedgerConnectorEthereumOptions object.",
      );
    }

    this.connector = new PluginLedgerConnectorEthereum(
      options.connectorOptions as IPluginLedgerConnectorEthereumOptions,
    );

    this.ontologyManager = ontologyManager;

    if (isWeb3SigningCredentialNone(options.signingCredential)) {
      throw new NoSigningCredentialError(
        `${EthereumLeaf.CLASS_NAME}#constructor, options.signingCredential`,
      );
    }
    this.signingCredential = options.signingCredential;

    this.gasConfig = options.gasConfig;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);

    context.with(ctx, () => {
      try {
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
              throw new ClaimFormatError(
                `Claim format not supported: ${claim}`,
              );
          }
        }

        if (options.wrapperContractAddress && options.wrapperContractName) {
          this.wrapperContractAddress = options.wrapperContractAddress;
          this.wrapperContractName = options.wrapperContractName;
        } else if (
          !options.wrapperContractAddress &&
          !options.wrapperContractName
        ) {
          this.log.debug(
            `${EthereumLeaf.CLASS_NAME}#constructor, No wrapper contract provided, creation required`,
          );
        } else {
          throw new InvalidWrapperContract(
            `${EthereumLeaf.CLASS_NAME}#constructor, Contract Name or Contract Address missing`,
          );
        }
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: String(error),
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Retrieves the approve address for a specified asset type.
   *
   * @param assetType - The type of the asset for which the approve address is to be retrieved.
   *                     It can be either "Fungible" or "NonFungible".
   * @returns {string} The approve address for the specified asset type.
   * @throws {ApproveAddressError} If the bridge ID is not available for "Fungible" assets,
   *                               or if the asset type is invalid or not implemented.
   *
   * @example
   * ```typescript
   * const approveAddress = fabricLeaf.getApproveAddress("Fungible");
   * console.log(approveAddress); // Output: Bridge ID for fungible assets
   * ```
   */
  public getApproveAddress(assetType: TokenType): string {
    const fnTag = `${EthereumLeaf.CLASS_NAME}#getApproveAddress`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.log.debug(
          `${fnTag}, Getting Approve Address for asset type: ${getEnumKeyByValue(TokenType, assetType)}`,
        );
        switch (assetType) {
          case TokenType.NONSTANDARD_FUNGIBLE:
          case TokenType.NONSTANDARD_NONFUNGIBLE:
            if (!this.wrapperContractAddress) {
              throw new ApproveAddressError(
                `${fnTag}, Wrapper Contract Address not available for approving address`,
              );
            }
            return this.wrapperContractAddress;
          default:
            throw new ApproveAddressError(
              `${fnTag}, Invalid asset type: ${getEnumKeyByValue(TokenType, assetType)}`,
            );
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
   * Deploys the necessary contracts for the Ethereum leaf.
   *
   * This method deploys the wrapper contract and may deploy other needed contracts. The deployments are
   * executed in parallel using `Promise.all`.
   *
   * @returns {Promise<void>} A promise that resolves when all contracts are deployed.
   */
  public async deployContracts(): Promise<void> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}#deployContracts`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        await Promise.all([this.deployWrapperContract()]);
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
   * Retrieves the deployment receipt of the wrapper contract.
   *
   * @returns {Web3TransactionReceipt} The transaction receipt of the deployed wrapper contract.
   * @throws {ReceiptError} If the wrapper contract has not been deployed.
   */
  public getDeployWrapperContractReceipt(): Web3TransactionReceipt {
    const fnTag = `${EthereumLeaf.CLASS_NAME}#getDeployFungibleWrapperContractReceipt`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        if (!this.wrapperDeployReceipt) {
          throw new ReceiptError(
            `${EthereumLeaf.CLASS_NAME}#getDeployWrapperContractReceipt() Wrapper Contract Not deployed`,
          );
        }
        return this.wrapperDeployReceipt;
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
   * Deploys a wrapper contract.
   *
   * @param {string} [contractName] - The name of the contract to be deployed.
   * @returns {Promise<void>} A promise that resolves when the contract is deployed.
   * @throws {WrapperContractError} If the wrapper contract is already created.
   * @throws {TransactionReceiptError} If the deployment transaction receipt is not found.
   * @throws {ContractAddressError} If the contract address is not found in the deployment receipt.
   */
  public async deployWrapperContract(contractName?: string): Promise<void> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}#deployWrapperContract`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Deploying Wrapper Contract`);

        if (this.wrapperContractAddress && this.wrapperContractName) {
          throw new WrapperContractAlreadyCreatedError(fnTag);
        }

        this.wrapperContractName =
          contractName || `${this.id}-wrapper-contract`;

        const deployOutWrapperContract = await this.connector.deployContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
          },
          constructorArgs: [this.signingCredential.ethAccount],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        });

        if (!deployOutWrapperContract.transactionReceipt) {
          throw new TransactionReceiptError(
            `${fnTag}, Wrapper Contract deployment failed: ${safeStableStringify(deployOutWrapperContract)}`,
          );
        }

        if (!deployOutWrapperContract.transactionReceipt.contractAddress) {
          throw new ContractAddressError(
            `${fnTag}, Wrapper Contract address not found in deploy receipt: ${safeStableStringify(deployOutWrapperContract.transactionReceipt)}`,
          );
        }

        this.wrapperDeployReceipt = deployOutWrapperContract.transactionReceipt;

        this.wrapperContractAddress =
          deployOutWrapperContract.transactionReceipt.contractAddress;

        this.log.debug(
          `${fnTag}, Wrapper Contract deployed receipt: ${safeStableStringify(deployOutWrapperContract.transactionReceipt)}`,
        );
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
   * Retrieves the contract address of the wrapper contract.
   *
   * @param {string} type - The type of the wrapper contract.
   * @returns {unknown} The contract address of the wrapper contract.
   * @throws {InvalidWrapperContract} If the wrapper contract type is invalid.
   */
  public getWrapperContract(type: TokenType): string {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#getWrapperContract`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.log.debug(`${fnTag}, Getting Wrapper Contract Address`);
        switch (type) {
          case TokenType.NONSTANDARD_FUNGIBLE:
          case TokenType.NONSTANDARD_NONFUNGIBLE:
            if (!this.wrapperContractAddress) {
              throw new WrapperContractError(
                `${fnTag}, Wrapper Contract not deployed`,
              );
            }
            return this.wrapperContractAddress;
          default:
            throw new Error("Invalid type");
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
   * Wraps an asset.
   *
   * @param {EvmAsset} asset - The asset to be wrapped.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async wrapAsset(asset: EvmAsset): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#wrapAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Wrapping Asset: {${asset.id}, ${asset.owner}, ${asset.contractAddress}, ${asset.type}}`,
        );

        const interactions = this.ontologyManager.getOntologyInteractions(
          LedgerType.Ethereum,
          asset.referenceId,
        );

        switch (asset.type) {
          case TokenType.NONSTANDARD_FUNGIBLE:
          case TokenType.NONSTANDARD_NONFUNGIBLE:
            if (!this.wrapperContractName || !this.wrapperContractAddress) {
              throw new WrapperContractError(
                `${fnTag}, Wrapper Contract not deployed`,
              );
            }
            break;
          default:
            throw new Error("Type not supported");
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "wrap",
          params: [
            asset.contractName,
            asset.contractAddress,
            asset.type,
            asset.id,
            asset.referenceId,
            asset.owner,
            interactions,
            asset.ercTokenStandard,
          ],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;

        if (!response.success) {
          throw new TransactionError(fnTag);
        }

        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Unwraps an asset.
   *
   * @param {string} assetId - The ID of the asset to be unwrapped.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async unwrapAsset(assetId: string): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#unwrapAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Unwrapping Asset: ${assetId}`);

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "unwrap",
          params: [assetId],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;
        if (!response.success) {
          throw new TransactionError(fnTag);
        }
        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Locks an asset.
   *
   * @param {string} assetId - The ID of the asset to be locked.
   * @param {Amount | UniqueTokenID} assetAttribute - The attribute of the asset to be locked.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async lockAsset(
    assetId: string,
    assetAttribute: Amount | UniqueTokenID,
  ): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#lockAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Locking Asset: ${assetId} with attribute ${assetAttribute}`,
        );

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "lock",
          params: [assetId, assetAttribute],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;
        if (!response.success) {
          this.log.debug(response);
          throw new TransactionError(fnTag);
        }
        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Unlocks an asset.
   *
   * @param {string} assetId - The ID of the asset to be unlocked.
   * @param {Amount | UniqueTokenID} assetAttribute - The attribute of the asset to be unlocked.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async unlockAsset(
    assetId: string,
    assetAttribute: Amount | UniqueTokenID,
  ): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#unlockAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Unlocking Asset: ${assetId} with attribute: ${assetAttribute}`,
        );

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "unlock",
          params: [assetId, assetAttribute],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;
        if (!response.success) {
          this.log.debug(response);
          throw new TransactionError(fnTag);
        }
        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Mints an asset.
   *
   * @param {string} assetId - The ID of the asset to be minted.
   * @param {Amount | UniqueTokenID} assetAttribute - The attribute of the asset to be minted.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async mintAsset(
    assetId: string,
    assetAttribute: Amount | UniqueTokenID,
  ): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#mintAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Minting Asset: ${assetId} with attribute: ${assetAttribute}`,
        );

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "mint",
          params: [assetId, assetAttribute],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;
        if (!response.success) {
          this.log.debug(response);
          throw new TransactionError(fnTag);
        }
        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Burns an asset.
   *
   * @param {string} assetId - The ID of the asset to be burned.
   * @param {Amount | UniqueTokenID} assetAttribute - The attribute of the asset to be burned.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async burnAsset(
    assetId: string,
    assetAttribute: Amount | UniqueTokenID,
  ): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#burnAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Burning Asset: ${assetId} with attribute: ${assetAttribute}`,
        );

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "burn",
          params: [assetId, assetAttribute],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;
        if (!response.success) {
          this.log.debug(response);
          throw new TransactionError(fnTag);
        }
        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Assigns an asset to a new owner.
   *
   * @param {string} assetId - The ID of the asset to be assigned.
   * @param {string} to - The new owner of the asset.
   * @param {Amount | UniqueTokenID} assetAttribute - The attribute of the asset to be assigned.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async assignAsset(
    assetId: string,
    to: string,
    assetAttribute: Amount | UniqueTokenID,
  ): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#assignAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Assigning Asset: ${assetId} with attribute: ${assetAttribute} to: ${to}`,
        );

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Send,
          methodName: "assign",
          params: [assetId, to, assetAttribute],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;
        if (!response.success) {
          throw new TransactionError(fnTag);
        }
        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
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
   * Retrieves all asset IDs.
   *
   * @returns {Promise<string[]>} A promise that resolves to an array of asset IDs.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async getAssets(): Promise<string[]> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#getAssets`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Getting Assets`);

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Call,
          methodName: "getAllAssetsIDs",
          params: [],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;

        if (!response.success) {
          throw new TransactionError(fnTag);
        }

        return response.callOutput as string[];
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
   * Retrieves an asset by its ID.
   *
   * @param {string} assetId - The ID of the asset to be retrieved.
   * @returns {Promise<EvmAsset>} A promise that resolves to the asset.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async getAsset(
    assetId: string,
    uniqueDescriptor?: UniqueTokenID,
  ): Promise<EvmAsset> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#getAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Getting Asset`);

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: EthContractInvocationType.Call,
          methodName: "getToken",
          params: [
            assetId,
            ...(uniqueDescriptor !== undefined ? [uniqueDescriptor] : []),
          ],
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;

        if (!response.success) {
          throw new TransactionError(fnTag);
        }

        const token = response.callOutput as TokenResponse;

        switch (Number(token.tokenType)) {
          case TokenType.NONSTANDARD_FUNGIBLE:
            this.log.debug("Returning Fungible Asset");
            return {
              contractName: token.contractName,
              id: token.tokenId,
              referenceId: token.referenceId,
              contractAddress: token.contractAddress,
              type: Number(token.tokenType),
              owner: token.owner,
              amount: Number(token.amount) as Amount,
              network: this.networkIdentification,
              ercTokenStandard: Number(token.ercTokenStandard),
            } as EvmFungibleAsset;
          case TokenType.NONSTANDARD_NONFUNGIBLE:
            this.log.debug("Returning Non Fungible Asset");
            return {
              contractName: token.contractName,
              id: token.tokenId,
              referenceId: token.referenceId,
              contractAddress: token.contractAddress,
              type: Number(token.tokenType),
              owner: token.owner,
              uniqueDescriptor: Number(token.amount) as UniqueTokenID,
              network: this.networkIdentification,
              ercTokenStandard: Number(token.ercTokenStandard),
            } as EvmNonFungibleAsset;
          default:
            throw new Error("Unexpected Token Type");
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
   * Runs a costum transaction on the wrapper contract.
   *
   * @param {string} methodName - The name of the method to be invoked.
   * @param {string[]} params - The parameters for the method invocation.
   * @param {EthContractInvocationType} invocationType - The type of invocation (Send or Call).
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async runTransaction(
    methodName: string,
    params: string[],
    invocationType: EthContractInvocationType,
  ): Promise<TransactionResponse> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#runTransaction`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Running Transaction: ${methodName} with params: ${params}`,
        );

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = (await this.connector.invokeContract({
          contract: {
            contractJSON: {
              contractName: this.wrapperContractName,
              abi: SATPWrapperContract.abi,
              bytecode: SATPWrapperContract.bytecode.object,
            },
            contractAddress: this.wrapperContractAddress,
          },
          invocationType: invocationType,
          methodName: methodName,
          params: params,
          web3SigningCredential: this.signingCredential,
          gasConfig: this.gasConfig,
        })) as EthereumResponse;

        if (!response.success) {
          throw new TransactionError(fnTag);
        }

        return {
          transactionId: response.out.transactionReceipt.transactionHash ?? "",
          transactionReceipt:
            safeStableStringify(response.out.transactionReceipt) ?? "",
          output: response.callOutput ?? undefined,
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
   * Retrieves the view for a specific asset using BUNGEE.
   *
   * @param {string} assetId - The ID of the asset to get the view for.
   * @returns {Promise<string>} A promise that resolves to the view of the asset.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {BungeeError} If Bungee is not initialized.
   * @throws {ViewError} If the view is undefined.
   */
  public async getView(assetId: string): Promise<string> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#getView`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Getting View for asset: ${assetId}`);

        if (!this.wrapperContractName || !this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const networkDetails = {
          connector: this.connector,
          signingCredential: this.signingCredential,
          contractName: this.wrapperContractName,
          contractAddress: this.wrapperContractAddress,
          participant: this.id,
        };

        if (this.bungee == undefined) {
          throw new BungeeError(`${fnTag}, Bungee not initialized`);
        }

        const snapshot = await this.bungee.generateSnapshot(
          [assetId],
          this.networkIdentification.id,
          networkDetails,
        );

        const generated = this.bungee.generateView(
          snapshot,
          "0",
          Number.MAX_SAFE_INTEGER.toString(),
          undefined,
        );

        if (generated.view == undefined) {
          throw new Error("View is undefined");
        }

        return safeStableStringify(generated);
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
   * Retrieves the receipt of a transaction by its ID.
   *
   * @param {string} transactionId - The ID of the transaction to get the receipt for.
   * @returns {Promise<string>} A promise that resolves to the transaction receipt.
   */
  public async getReceipt(transactionId: string): Promise<string> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#getReceipt`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Getting Receipt: transactionId: ${transactionId}`,
        );
        //TODO: implement getReceipt instead of transaction
        const getTransactionReq: InvokeRawWeb3EthMethodV1Request = {
          methodName: "getTransaction",
          params: [transactionId],
        };
        const receipt =
          await this.connector.invokeRawWeb3EthMethod(getTransactionReq);

        return safeStableStringify(receipt) ?? "";
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
   * Retrieves the proof for a given asset ID.
   *
   * @param assetId - The ID of the asset for which the proof is to be retrieved.
   * @param claimFormat - The claim format wanted.
   * @returns A promise that resolves to a string containing the proof.
   * @throws {ProofError} If the claim format is not supported.
   */
  public async getProof(
    asset: Asset,
    claimFormat: ClaimFormat,
  ): Promise<string> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}}#runTransaction`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Getting Proof of asset: ${asset.id} with a format of: ${claimFormat}`,
        );
        switch (claimFormat) {
          case ClaimFormat.BUNGEE:
            if (claimFormat in this.claimFormats)
              return await this.getView(asset.id);
            else
              throw new ProofError(
                `Claim format not supported: ${claimFormat}`,
              );
          case ClaimFormat.DEFAULT:
            return "";
          default:
            throw new ProofError(`Claim format not supported: ${claimFormat}`);
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

  public async shutdownConnection(): Promise<void> {
    const fnTag = `${EthereumLeaf.CLASS_NAME}#shutdownConnection`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    context.with(ctx, async () => {
      try {
        try {
          await this.connector.shutdown();
          this.log.debug(
            `${EthereumLeaf.CLASS_NAME}#shutdownConnection, Connector shutdown successfully`,
          );
        } catch (error) {
          this.log.error(
            `${EthereumLeaf.CLASS_NAME}#shutdownConnection, Error shutting down connector: ${error}`,
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

  private isFullPluginOptions = (
    obj: Partial<IPluginLedgerConnectorEthereumOptions>,
  ): obj is IPluginLedgerConnectorEthereumOptions => {
    return obj.pluginRegistry !== undefined;
  };
}
