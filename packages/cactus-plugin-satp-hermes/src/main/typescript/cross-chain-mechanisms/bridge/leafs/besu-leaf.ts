import { INetworkOptions, TransactionResponse } from "../bridge-types";
import {
  EthContractInvocationType,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  RunTransactionResponse,
  Web3SigningCredential,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialNone,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
  Web3TransactionReceipt,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { PluginBungeeHermes } from "@hyperledger/cactus-plugin-bungee-hermes";
import { StrategyBesu } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/strategy/strategy-besu";
import { EvmAsset } from "../ontology/assets/evm-asset";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  ClaimFormat,
  TokenType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { BridgeLeafFungible } from "../bridge-leaf-fungible";
import { BridgeLeafNonFungible } from "../bridge-leaf-non-fungible";
import { BridgeLeaf } from "../bridge-leaf";
import { IBridgeLeafOptions } from "../bridge-leaf";
import { v4 as uuidv4 } from "uuid";
import {
  NoSigningCredentialError,
  UnsupportedNetworkError,
  TransactionError,
  ReceiptError,
  TransactionReceiptError,
  ContractAddressError,
  WrapperContractError,
  BungeeError,
  InvalidWrapperContract,
  ViewError,
  WrapperContractAlreadyCreatedError,
  ProofError,
  ClaimFormatError,
  ConnectorOptionsError,
  ApproveAddressError,
} from "../bridge-errors";
import { ISignerKeyPair, Secp256k1Keys } from "@hyperledger/cactus-common";
import SATPWrapperContract from "../../../../solidity/generated/satp-wrapper.sol/SATPWrapperContract.json";
import { OntologyManager } from "../ontology/ontology-manager";
import { Asset } from "../ontology/assets/asset";
import { TokenResponse } from "../../../generated/SATPWrapperContract";
import { NetworkId } from "../../../public-api";
import { getEnumKeyByValue } from "../../../services/utils";
import { getUint8Key } from "./leafs-utils";

export interface IBesuLeafNeworkOptions extends INetworkOptions {
  signingCredential: Web3SigningCredential;
  connectorOptions: Partial<IPluginLedgerConnectorBesuOptions>;
  leafId?: string;
  keyPair?: ISignerKeyPair;
  claimFormats?: ClaimFormat[];
  wrapperContractName?: string;
  wrapperContractAddress?: string;
  gas?: number;
}

export interface IBesuLeafOptions
  extends IBridgeLeafOptions,
    IBesuLeafNeworkOptions {}

/**
 * Represents the response from an Besu transaction.
 *
 * @interface EthereumResponse
 *
 * @property {boolean} success - Indicates whether the transaction was successful.
 * @property {RunTransactionResponse} out - The detailed response of the executed transaction.
 * @property {unknown} callOutput - The output of the call, which can be of any type.
 */
interface BesuResponse {
  success: boolean;
  out: RunTransactionResponse;
  callOutput: unknown;
}

/**
 * The `BesuLeaf` class extends the `BridgeLeaf` class and implements the `BridgeLeafFungible` and `BridgeLeafNonFungible` interfaces.
 * It represents a leaf node in a cross-chain bridge mechanism specifically for the Besu blockchain.
 * This class handles the deployment and interaction with wrapper contracts on the Besu network,
 * as well as the wrapping, unwrapping, locking, unlocking, minting, burning, and assigning of assets.
 * It also provides methods to retrieve assets and their views, and to run arbitrary transactions on the Besu network.
 *
 * @remarks
 * The `BesuLeaf` class is designed to facilitate cross-chain asset transfers and interactions on the Besu blockchain.
 * It leverages the `PluginLedgerConnectorBesu` for blockchain interactions and supports both fungible and non-fungible assets.
 * The class also integrates with the `PluginBungeeHermes` for generating views and snapshots of assets.
 *
 * @example
 * ```typescript
 * const besuLeaf = new BesuLeaf({
 *   networkIdentification: { id: "besu-network", ledgerType: LedgerType.Besu2X },
 *   keyPair: myKeyPair,
 *   connectorOptions: {
 *     instanceId: uuidv4(),
 *     rpcApiHttpHost,
 *     rpcApiWsHost,
 *     pluginRegistry,
 *     logLevel,
 *   },
 *   signingCredential: mySigningCredential,
 *   ontologyManager: myOntologyManager,
 * });
 *
 * await besuLeaf.deployFungibleWrapperContract("MyFungibleContract");
 * const transactionResponse = await besuLeaf.wrapAsset(myAsset);
 * console.log(transactionResponse.transactionId);
 * ```
 *
 * @throws {UnsupportedNetworkError} If the provided network identification is not a supported Besu network.
 * @throws {NoSigningCredentialError} If no signing credential is provided in the options.
 * @throws {InvalidWrapperContract} If either the contract name or contract address is missing.
 */
export class BesuLeaf
  extends BridgeLeaf
  implements BridgeLeafFungible, BridgeLeafNonFungible
{
  public static readonly CLASS_NAME = "BesuLeaf";

  protected readonly log: Logger;
  protected readonly logLevel: LogLevelDesc;

  protected readonly id: string;

  protected readonly networkIdentification: NetworkId;

  protected readonly keyPair: ISignerKeyPair;

  protected readonly connector: PluginLedgerConnectorBesu;

  protected bungee?: PluginBungeeHermes;

  protected readonly claimFormats: ClaimFormat[];

  protected readonly ontologyManager: OntologyManager;

  private readonly signingCredential:
    | Web3SigningCredentialPrivateKeyHex
    | Web3SigningCredentialCactusKeychainRef;

  private readonly gas: number;

  private wrapperFungibleDeployReceipt: Web3TransactionReceipt | undefined;

  private wrapperContractAddress: string | undefined;

  private wrapperContractName: string | undefined;

  /**
   * Constructs a new instance of the `BesuLeaf` class.
   *
   * @param options - The options for configuring the `BesuLeaf` instance.
   * @throws {UnsupportedNetworkError} If the provided network identification is not a supported Besu network.
   * @throws {NoSigningCredentialError} If no signing credential is provided in the options.
   * @throws {InvalidWrapperContract} If either the contract name or contract address is missing.
   */
  constructor(public readonly options: IBesuLeafOptions) {
    super();
    const label = BesuLeaf.CLASS_NAME;
    this.logLevel = this.options.logLevel || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level: this.logLevel });

    this.log.debug(
      `${BesuLeaf.CLASS_NAME}#constructor options: ${safeStableStringify(options)}`,
    );

    if (
      options.networkIdentification.ledgerType !== LedgerType.Besu1X &&
      options.networkIdentification.ledgerType !== LedgerType.Besu2X
    ) {
      throw new UnsupportedNetworkError(
        `${BesuLeaf.CLASS_NAME}#constructor, supports only Besu networks but got ${options.networkIdentification.ledgerType}`,
      );
    }

    this.networkIdentification = {
      id: options.networkIdentification.id,
      ledgerType: options.networkIdentification.ledgerType,
    };

    this.id = this.options.leafId || this.createId(BesuLeaf.CLASS_NAME);
    this.keyPair = options.keyPair || Secp256k1Keys.generateKeyPairsBuffer();

    this.claimFormats = !!options.claimFormats
      ? options.claimFormats.concat(ClaimFormat.DEFAULT)
      : [ClaimFormat.DEFAULT];

    if (!this.isFullPluginOptions(options.connectorOptions)) {
      throw new ConnectorOptionsError(
        "Invalid options provided to the FabricLeaf constructor. Please provide a valid IPluginLedgerConnectorBesuOptions object.",
      );
    }

    this.connector = new PluginLedgerConnectorBesu(
      options.connectorOptions as IPluginLedgerConnectorBesuOptions,
    );

    this.ontologyManager = options.ontologyManager;

    if (isWeb3SigningCredentialNone(options.signingCredential)) {
      throw new NoSigningCredentialError(
        `${BesuLeaf.CLASS_NAME}#constructor, options.signingCredential`,
      );
    }
    this.signingCredential = options.signingCredential;

    this.gas = options.gas || 999999999999999; // TODO: set default gas

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
            `${BesuLeaf.CLASS_NAME}#constructor, Claim format not supported: ${claim}`,
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
        `${BesuLeaf.CLASS_NAME}#constructor, No wrapper contract provided, creation required`,
      );
    } else {
      throw new InvalidWrapperContract(
        `${BesuLeaf.CLASS_NAME}#constructor, Contract Name or Contract Address missing`,
      );
    }
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
   * const approveAddress = fabricLeaf.getApproveAddress("FUNGIBLE");
   * console.log(approveAddress); // Output: Bridge ID for fungible assets
   * ```
   */
  public getApproveAddress(assetType: TokenType): string {
    const fnTag = `${BesuLeaf.CLASS_NAME}#getApproveAddress`;
    this.log.debug(
      `${fnTag}, Getting Approve Address for asset type: ${getEnumKeyByValue(TokenType, assetType)}`,
    );
    switch (assetType) {
      case TokenType.ERC20:
      case TokenType.NONSTANDARD_FUNGIBLE:
        if (!this.wrapperContractAddress) {
          throw new ApproveAddressError(
            `${fnTag}, Wrapper Contract Address not available for approving address`,
          );
        }
        return this.wrapperContractAddress;
      case TokenType.ERC721:
      case TokenType.NONSTANDARD_NONFUNGIBLE:
        //TODO implement
        throw new ApproveAddressError(
          `${fnTag}, Non-fungible wrapper contract not implemented`,
        );
      default:
        throw new ApproveAddressError(
          `${fnTag}, Invalid asset type: ${getEnumKeyByValue(TokenType, assetType)}`,
        );
    }
  }

  /**
   * Deploys the necessary contracts for the Ethereum leaf.
   *
   * This method deploys the fungible wrapper contract and, if uncommented,
   * can also deploy the non-fungible wrapper contract. The deployments are
   * executed in parallel using `Promise.all`.
   *
   * @returns {Promise<void>} A promise that resolves when all contracts are deployed.
   */
  public async deployContracts(): Promise<void> {
    await Promise.all([
      this.deployFungibleWrapperContract(),
      // this.deployNonFungibleWrapperContract(),
    ]);
  }

  /**
   * Retrieves the deployment receipt of the non-fungible wrapper contract.
   *
   * @returns
   * @throws
   */
  public getDeployNonFungibleWrapperContractReceipt(): unknown {
    //TODO implement
    throw new Error("Method not implemented.");
  }

  /**
   * Deploys a non-fungible wrapper contract.
   *
   **/
  public deployNonFungibleWrapperContract(): Promise<void> {
    //TODO implement
    throw new Error("Method not implemented.");
  }
  /**
   * Retrieves the deployment receipt of the fungible wrapper contract.
   *
   * @returns {Web3TransactionReceipt} The transaction receipt of the deployed fungible wrapper contract.
   * @throws {ReceiptError} If the fungible wrapper contract has not been deployed.
   */
  public getDeployFungibleWrapperContractReceipt(): Web3TransactionReceipt {
    if (!this.wrapperFungibleDeployReceipt) {
      throw new ReceiptError(
        `${BesuLeaf.CLASS_NAME}#getDeployFungibleWrapperContractReceipt() Fungible Wrapper Contract Not deployed`,
      );
    }
    return this.wrapperFungibleDeployReceipt;
  }
  /**
   * Deploys a fungible wrapper contract.
   *
   * @param {string} [contractName] - The name of the contract to be deployed.
   * @returns {Promise<void>} A promise that resolves when the contract is deployed.
   * @throws {WrapperContractAlreadyCreatedError} If the wrapper contract is already created.
   * @throws {TransactionReceiptError} If the deployment transaction receipt is not found.
   * @throws {ContractAddressError} If the contract address is not found in the deployment receipt.
   */
  public async deployFungibleWrapperContract(
    contractName?: string,
  ): Promise<void> {
    const fnTag = `${BesuLeaf.CLASS_NAME}#deployFungibleWrapperContract`;
    this.log.debug(`${fnTag}, Deploying Wrapper Contract`);

    if (this.wrapperContractAddress && this.wrapperContractName) {
      this.log.debug(
        `${fnTag}, Wrapper Contract already created, wrapperContractAddress: ${this.wrapperContractAddress}, wrapperContractName: ${this.wrapperContractName}`,
      );
      throw new WrapperContractAlreadyCreatedError(fnTag);
    }

    this.wrapperContractName =
      contractName || `${this.id}-fungible-wrapper-contract`;

    const deployOutWrapperContract =
      await this.connector.deployContractNoKeychain({
        contractName: this.wrapperContractName,
        contractAbi: SATPWrapperContract.abi,
        constructorArgs: [this.signingCredential.ethAccount],
        web3SigningCredential: this.signingCredential,
        bytecode: SATPWrapperContract.bytecode.object,
        gas: this.gas,
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

    this.wrapperFungibleDeployReceipt =
      deployOutWrapperContract.transactionReceipt;

    this.wrapperContractAddress =
      deployOutWrapperContract.transactionReceipt.contractAddress;

    this.log.debug(
      `${fnTag}, Wrapper Contract deployed receipt: ${safeStableStringify(deployOutWrapperContract.transactionReceipt)}`,
    );
  }

  /**
   * Retrieves the contract address of the wrapper contract.
   *
   * @param {string} type - The type of the wrapper contract.
   * @returns {unknown} The contract address of the wrapper contract.
   * @throws {InvalidWrapperContract} If the wrapper contract type is invalid.
   */
  public getWrapperContract(type: "FUNGIBLE" | "NONFUNGIBLE"): string {
    const fnTag = `${BesuLeaf.CLASS_NAME}}#getWrapperContract`;
    this.log.debug(`${fnTag}, Getting Wrapper Contract Adress`);
    switch (type) {
      case "FUNGIBLE":
        if (!this.wrapperContractAddress) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }
        return this.wrapperContractAddress;
      case "NONFUNGIBLE":
        //TODO implement
        throw new Error("Method not implemented.");
      default:
        throw new Error("Invalid type");
    }
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
    const fnTag = `${BesuLeaf.CLASS_NAME}}#wrapAsset`;
    this.log.debug(
      `${fnTag}, Wrapping Asset: {${asset.id}, ${asset.owner}, ${asset.contractAddress}, ${asset.type}}`,
    );

    const interactions = this.ontologyManager.getOntologyInteractions(
      LedgerType.Besu2X,
      asset.referenceId,
    );

    if (!this.wrapperContractName || !this.wrapperContractAddress) {
      throw new WrapperContractError(`${fnTag}, Wrapper Contract not deployed`);
    }

    const response = (await this.connector.invokeContract({
      contractName: this.wrapperContractName,
      contractAbi: SATPWrapperContract.abi,
      contractAddress: this.wrapperContractAddress,
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
      ],
      signingCredential: this.signingCredential,
      gas: this.gas,
    })) as BesuResponse;

    if (!response.success) {
      throw new TransactionError(fnTag);
    }

    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
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
    const fnTag = `${BesuLeaf.CLASS_NAME}}#unwrapAsset`;
    this.log.debug(`${fnTag}, Unwrapping Asset: ${assetId}`);

    if (!this.wrapperContractName || !this.wrapperContractAddress) {
      throw new WrapperContractError(`${fnTag}, Wrapper Contract not deployed`);
    }

    const response = (await this.connector.invokeContract({
      contractName: this.wrapperContractName,
      contractAbi: SATPWrapperContract.abi,
      contractAddress: this.wrapperContractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "unwrap",
      params: [assetId],
      signingCredential: this.signingCredential,
      gas: this.gas,
    })) as BesuResponse;
    if (!response.success) {
      throw new TransactionError(fnTag);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
  }

  /**
   * Locks an asset.
   *
   * @param {string} assetId - The ID of the asset to be locked.
   * @param {number} amount - The amount of the asset to be locked.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async lockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${BesuLeaf.CLASS_NAME}}#lockAsset`;
    this.log.debug(`${fnTag}, Locking Asset: ${assetId} amount: ${amount}`);

    if (!this.wrapperContractName || !this.wrapperContractAddress) {
      throw new WrapperContractError(`${fnTag}, Wrapper Contract not deployed`);
    }

    const response = (await this.connector.invokeContract({
      contractName: this.wrapperContractAddress,
      contractAbi: SATPWrapperContract.abi,
      contractAddress: this.wrapperContractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "lock",
      params: [assetId, amount.toString()],
      signingCredential: this.signingCredential,
      gas: this.gas,
    })) as BesuResponse;
    if (!response.success) {
      throw new TransactionError(fnTag);
    }

    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
  }

  /**
   * Unlocks an asset.
   *
   * @param {string} assetId - The ID of the asset to be unlocked.
   * @param {number} amount - The amount of the asset to be unlocked.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async unlockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${BesuLeaf.CLASS_NAME}}#unlockAsset`;
    this.log.debug(`${fnTag}, Unlocking Asset: ${assetId} amount: ${amount}`);

    if (!this.wrapperContractName || !this.wrapperContractAddress) {
      throw new WrapperContractError(`${fnTag}, Wrapper Contract not deployed`);
    }

    const response = (await this.connector.invokeContract({
      contractName: this.wrapperContractAddress,
      contractAbi: SATPWrapperContract.abi,
      contractAddress: this.wrapperContractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "unlock",
      params: [assetId, amount.toString()],
      signingCredential: this.signingCredential,
      gas: this.gas,
    })) as BesuResponse;
    if (!response.success) {
      throw new TransactionError(fnTag);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
  }

  /**
   * Mints an asset.
   *
   * @param {string} assetId - The ID of the asset to be minted.
   * @param {number} amount - The amount of the asset to be minted.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async mintAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${BesuLeaf.CLASS_NAME}}#mintAsset`;
    this.log.debug(`${fnTag}, Minting Asset: ${assetId} amount: ${amount}`);

    if (!this.wrapperContractName || !this.wrapperContractAddress) {
      throw new WrapperContractError(`${fnTag}, Wrapper Contract not deployed`);
    }

    const response = (await this.connector.invokeContract({
      contractName: this.wrapperContractName,
      contractAbi: SATPWrapperContract.abi,
      contractAddress: this.wrapperContractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "mint",
      params: [assetId, amount.toString()],
      signingCredential: this.signingCredential,
      gas: this.gas,
    })) as BesuResponse;
    if (!response.success) {
      throw new TransactionError(fnTag);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
  }

  /**
   * Burns an asset.
   *
   * @param {string} assetId - The ID of the asset to be burned.
   * @param {number} amount - The amount of the asset to be burned.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async burnAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${BesuLeaf.CLASS_NAME}}#burnAsset`;
    this.log.debug(`${fnTag}, Burning Asset: ${assetId} amount: ${amount}`);

    if (!this.wrapperContractName || !this.wrapperContractAddress) {
      throw new WrapperContractError(`${fnTag}, Wrapper Contract not deployed`);
    }

    const response = (await this.connector.invokeContract({
      contractName: this.wrapperContractName,
      contractAbi: SATPWrapperContract.abi,
      contractAddress: this.wrapperContractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "burn",
      params: [assetId, amount.toString()],
      signingCredential: this.signingCredential,
      gas: this.gas,
    })) as BesuResponse;
    if (!response.success) {
      throw new TransactionError(fnTag);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
  }

  /**
   * Assigns an asset to a new owner.
   *
   * @param {string} assetId - The ID of the asset to be assigned.
   * @param {string} to - The new owner of the asset.
   * @param {number} amount - The amount of the asset to be assigned.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async assignAsset(
    assetId: string,
    to: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${BesuLeaf.CLASS_NAME}}#assignAsset`;
    this.log.debug(
      `${fnTag}, Assigning Asset: ${assetId} amount: ${amount} to: ${to}`,
    );

    if (!this.wrapperContractName || !this.wrapperContractAddress) {
      throw new WrapperContractError(`${fnTag}, Wrapper Contract not deployed`);
    }

    const response = (await this.connector.invokeContract({
      contractName: this.wrapperContractName,
      contractAbi: SATPWrapperContract.abi,
      contractAddress: this.wrapperContractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "assign",
      params: [assetId, to, amount],
      signingCredential: this.signingCredential,
      gas: this.gas,
    })) as BesuResponse;
    if (!response.success) {
      throw new TransactionError(fnTag);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
  }

  /**
   * Retrieves all asset IDs.
   *
   * @returns {Promise<string[]>} A promise that resolves to an array of asset IDs.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async getAssets(): Promise<string[]> {
    const fnTag = `${BesuLeaf.CLASS_NAME}}#getAssets`;
    this.log.debug(`${fnTag}, Getting Assets`);

    if (!this.wrapperContractName || !this.wrapperContractAddress) {
      throw new WrapperContractError(`${fnTag}, Wrapper Contract not deployed`);
    }

    const response = (await this.connector.invokeContract({
      contractName: this.wrapperContractName,
      contractAbi: SATPWrapperContract.abi,
      contractAddress: this.wrapperContractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "getAllAssetsIDs",
      params: [],
      signingCredential: this.signingCredential,
      gas: this.gas,
    })) as BesuResponse;

    if (!response.success) {
      throw new TransactionError(fnTag);
    }

    return response.callOutput as string[];
  }

  /**
   * Retrieves an asset by its ID.
   *
   * @param {string} assetId - The ID of the asset to be retrieved.
   * @returns {Promise<EvmAsset>} A promise that resolves to the asset.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async getAsset(assetId: string): Promise<EvmAsset> {
    const fnTag = `${BesuLeaf.CLASS_NAME}}#getAsset`;
    this.log.debug(`${fnTag}, Getting Asset`);

    if (!this.wrapperContractName || !this.wrapperContractAddress) {
      throw new WrapperContractError(`${fnTag}, Wrapper Contract not deployed`);
    }

    const response = (await this.connector.invokeContract({
      contractName: this.wrapperContractName,
      contractAbi: SATPWrapperContract.abi,
      contractAddress: this.wrapperContractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "getToken",
      params: [assetId],
      signingCredential: this.signingCredential,
      gas: this.gas,
    })) as BesuResponse;

    if (!response.success) {
      throw new TransactionError(fnTag);
    }

    const token = response.callOutput as TokenResponse;

    return {
      contractName: token.contractName,
      id: token.tokenId,
      referenceId: token.referenceId,
      contractAddress: token.contractAddress,
      type: Number(token.tokenType),
      owner: token.owner,
      amount: token.amount,
      network: this.networkIdentification,
    } as EvmAsset;
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
    const fnTag = `${BesuLeaf.CLASS_NAME}}#runTransaction`;
    this.log.debug(
      `${fnTag}, Running Transaction: ${methodName} with params: ${params}`,
    );

    if (!this.wrapperContractName || !this.wrapperContractAddress) {
      throw new WrapperContractError(`${fnTag}, Wrapper Contract not deployed`);
    }

    const response = (await this.connector.invokeContract({
      contractName: this.wrapperContractAddress,
      contractAbi: SATPWrapperContract.abi,
      contractAddress: this.wrapperContractAddress,
      invocationType: invocationType,
      methodName: methodName,
      params: params,
      signingCredential: this.signingCredential,
      gas: this.gas,
    })) as BesuResponse;

    if (!response.success) {
      throw new TransactionError(fnTag);
    }

    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
      output: response.callOutput ?? undefined,
    };
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
    const fnTag = `${BesuLeaf.CLASS_NAME}}#getView`;
    this.log.debug(`${fnTag}, Getting View for asset: ${assetId}`);

    if (!this.wrapperContractName || !this.wrapperContractAddress) {
      throw new WrapperContractError(`${fnTag}, Wrapper Contract not deployed`);
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
      throw new ViewError(`${fnTag}, View is undefined`);
    }

    return safeStableStringify(generated);
  }

  /**
   * Retrieves the receipt of a transaction by its ID.
   *
   * @param {string} transactionId - The ID of the transaction to get the receipt for.
   * @returns {Promise<string>} A promise that resolves to the transaction receipt.
   */
  public async getReceipt(transactionId: string): Promise<string> {
    const fnTag = `${BesuLeaf.CLASS_NAME}}#getReceipt`;
    this.log.debug(
      `${fnTag}, Getting Receipt: transactionId: ${transactionId}`,
    );
    //TODO: implement getReceipt instead of transaction
    const receipt = await this.connector.getTransaction({
      transactionHash: transactionId,
    });

    return safeStableStringify(receipt.transaction);
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
    const fnTag = `${BesuLeaf.CLASS_NAME}}#runTransaction`;
    this.log.debug(
      `${fnTag}, Getting Proof of asset: ${asset.id} with a format of: ${claimFormat}`,
    );
    switch (claimFormat) {
      case ClaimFormat.BUNGEE:
        if (claimFormat in this.claimFormats)
          return await this.getView(asset.id);
        else throw new ProofError(`Claim format not supported: ${claimFormat}`);
      case ClaimFormat.DEFAULT:
        return "";
      default:
        throw new ProofError(`Claim format not supported: ${claimFormat}`);
    }
  }

  private isFullPluginOptions = (
    obj: Partial<IPluginLedgerConnectorBesuOptions>,
  ): obj is IPluginLedgerConnectorBesuOptions => {
    return (
      obj.pluginRegistry !== undefined &&
      obj.rpcApiHttpHost !== undefined &&
      obj.rpcApiWsHost !== undefined
    );
  };
}
export function isWeb3SigningCredentialNone(x?: {
  type?: Web3SigningCredentialType;
}): x is Web3SigningCredentialNone {
  return x?.type === Web3SigningCredentialType.None;
}
