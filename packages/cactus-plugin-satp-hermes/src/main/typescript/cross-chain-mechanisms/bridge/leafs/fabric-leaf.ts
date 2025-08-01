import {
  ChainCodeProgrammingLanguage,
  DeployContractV1Response,
  DeploymentTargetOrganization,
  FabricContractInvocationType,
  FabricSigningCredential,
  FileBase64,
  IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import path from "path";
import fs from "fs-extra";
import { PluginBungeeHermes } from "@hyperledger/cactus-plugin-bungee-hermes";
import { StrategyFabric } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/strategy/strategy-fabric";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import { LogLevelDesc, Secp256k1Keys } from "@hyperledger/cactus-common";
import { SatpLoggerProvider as LoggerProvider } from "../../../core/satp-logger-provider";
import { SATPLogger as Logger } from "../../../core/satp-logger";
import { v4 as uuidv4 } from "uuid";
import {
  ClaimFormat,
  TokenType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { BridgeLeaf, IBridgeLeafOptions } from "../bridge-leaf";
import { BridgeLeafFungible } from "../bridge-leaf-fungible";
import { BridgeLeafNonFungible } from "../bridge-leaf-non-fungible";
import { OntologyManager } from "../ontology/ontology-manager";
import { ISignerKeyPair } from "@hyperledger/cactus-common/";
import {
  ApproveAddressError,
  BungeeError,
  ChannelNameError,
  ClaimFormatError,
  ConnectorOptionsError,
  InvalidWrapperContract,
  ProofError,
  ReceiptError,
  TransactionError,
  TransactionReceiptError,
  UnsupportedNetworkError,
  WrapperContractAlreadyCreatedError,
  WrapperContractError,
} from "../../common/errors";
import { INetworkOptions, TransactionResponse } from "../bridge-types";
import { FabricAsset } from "../ontology/assets/fabric-asset";
import { Asset } from "../ontology/assets/asset";
import { X509Identity } from "fabric-network";
import { NetworkId } from "../../../public-api";
import { getEnumKeyByValue } from "../../../services/utils";
import { getUint8Key } from "./leafs-utils";
import { MonitorService } from "../../../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";
export interface IFabricLeafNeworkOptions extends INetworkOptions {
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
  wrapperContractName?: string;
  leafId?: string;
  keyPair?: ISignerKeyPair;
  claimFormats?: ClaimFormat[];
}

export interface IFabricLeafOptions
  extends IBridgeLeafOptions,
    IFabricLeafNeworkOptions {}

/**
 * The `FabricLeaf` class extends the `BridgeLeaf` class and implements the `BridgeLeafFungible` and `BridgeLeafNonFungible` interfaces.
 * It represents a leaf node in a cross-chain bridge mechanism specifically for the Hyperledger Fabric blockchain.
 * This class handles the deployment and interaction with wrapper contracts on the Fabric network,
 * as well as the wrapping, unwrapping, locking, unlocking, minting, burning, and assigning of assets.
 * It also provides methods to retrieve assets and their views, and to run arbitrary transactions on the Fabric network.
 *
 * @remarks
 * The `FabricLeaf` class is designed to facilitate cross-chain asset transfers and interactions on the Hyperledger Fabric blockchain.
 * It leverages the `PluginLedgerConnectorFabric` for blockchain interactions and supports both fungible and non-fungible assets.
 * The class also integrates with the `PluginBungeeHermes` for generating views and snapshots of assets.
 *
 * @example
 * ```typescript
 * const fabricLeaf = new FabricLeaf({
 *   networkIdentification: { id: "fabric-network", ledgerType: LedgerType.Fabric2 },
 *   keyPair: myKeyPair,
 *   instanceId: uuidv4(),
 *     peerBinary: "/fabric-samples/bin/peer",
 *     goBinary: "/usr/local/go/bin/go",
 *     pluginRegistry,
 *     cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
 *     sshConfig: sshConfig,
 *     logLevel,
 *     connectionProfile: connectionProfile,
 *     discoveryOptions: discoveryOptions,
 *     eventHandlerOptions: {
 *       strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
 *       commitTimeout: 300,
 *     },
 *   signingCredential: mySigningCredential,
 *   ontologyManager: myOntologyManager,
 *   channelName: "mychannel",
 *   targetOrganizations: [{ mspId: "Org1MSP", peerEndpoint: "peer0.org1.example.com:7051" }],
 *   caFile: "/path/to/ca.pem",
 *   ccSequence: 1,
 *   orderer: "orderer.example.com:7050",
 *   ordererTLSHostnameOverride: "orderer.example.com",
 * });
 *
 * await fabricLeaf.deployFungibleWrapperContract("MyFungibleContract");
 * const transactionResponse = await fabricLeaf.wrapAsset(myAsset);
 * console.log(transactionResponse.transactionId);
 * ```
 *
 * @throws {UnsupportedNetworkError} If the provided network identification is not a supported Fabric network.
 * @throws {ChannelNameError} If no channel name is provided in the options.
 * @throws {InvalidWrapperContract} If the necessary variables for deploying the wrapper contract are missing.
 * @throws {WrapperContractError} If the wrapper contract is not deployed or already created.
 * @throws {TransactionError} If a transaction fails.
 * @throws {ReceiptError} If the receipt for a deployed contract is not available.
 * @throws {BungeeError} If the Bungee plugin is not initialized.
 */

export class FabricLeaf
  extends BridgeLeaf
  implements BridgeLeafFungible, BridgeLeafNonFungible
{
  public static readonly CLASS_NAME = "FabricLeaf";

  protected readonly log: Logger;
  protected readonly logLevel: LogLevelDesc;

  protected readonly id: string;

  protected readonly networkIdentification: NetworkId;

  protected readonly keyPair: ISignerKeyPair;

  protected readonly connector: PluginLedgerConnectorFabric;

  protected bungee?: PluginBungeeHermes;

  protected readonly claimFormats: ClaimFormat[];

  protected readonly ontologyManager: OntologyManager;

  private readonly signingCredential: FabricSigningCredential;

  private readonly wrapperSatpContractDir = path.join(
    __dirname,
    "../fabric-contracts/satp-wrapper/chaincode-typescript",
  );

  private wrapperFungibleDeployReceipt: DeployContractV1Response | undefined;

  private contractChannel: string | undefined;

  private wrapperContractName: string | undefined;

  private targetOrganizations: Array<DeploymentTargetOrganization> | undefined;
  private caFile: string | undefined;
  private ccSequence: number | undefined;
  private orderer: string | undefined;
  private ordererTLSHostnameOverride: string | undefined;
  private connTimeout: number | undefined;
  private signaturePolicy: string | undefined;
  private mspId: string | undefined;
  private bridgeId: string | undefined;
  private readonly monitorService: MonitorService;
  /**
   * Constructs a new instance of the FabricLeaf class.
   *
   * @param options - The options for configuring the FabricLeaf instance.
   * @throws UnsupportedNetworkError - If the provided network identification is not of type Fabric2.
   * @throws ChannelNameError - If the channel name is not provided in the options, without this we cannot deploy contracts to the fabric network.
   * @throws InvalidWrapperContract - If the necessary variables for deploying the wrapper contract are missing.
   *
   */
  constructor(
    public readonly options: IFabricLeafOptions,
    ontologyManager: OntologyManager,
    monitorService: MonitorService,
  ) {
    const fnTag = `${FabricLeaf.CLASS_NAME}#constructor()`;
    super();
    const label = FabricLeaf.CLASS_NAME;
    this.logLevel = this.options.logLevel || "INFO";
    this.monitorService = monitorService;
    this.log = LoggerProvider.getOrCreate(
      { label, level: this.logLevel },
      this.monitorService,
    );
    this.log.debug(
      `${FabricLeaf.CLASS_NAME}#constructor options: ${safeStableStringify(options)}`,
    );

    if (options.networkIdentification.ledgerType !== LedgerType.Fabric2) {
      throw new UnsupportedNetworkError(
        `${FabricLeaf.CLASS_NAME} supports only Besu networks but got ${options.networkIdentification.ledgerType}`,
      );
    }

    this.networkIdentification = {
      id: options.networkIdentification.id,
      ledgerType: options.networkIdentification.ledgerType,
    };

    this.id = this.options.leafId || this.createId(FabricLeaf.CLASS_NAME);
    this.keyPair = options.keyPair || Secp256k1Keys.generateKeyPairsBuffer();

    this.claimFormats = !!options.claimFormats
      ? options.claimFormats.concat(ClaimFormat.DEFAULT)
      : [ClaimFormat.DEFAULT];

    if (!this.isFullPluginOptions(options.connectorOptions)) {
      throw new ConnectorOptionsError(
        "Invalid options provided to the FabricLeaf constructor. Please provide a valid IPluginLedgerConnectorFabricOptions object.",
      );
    }

    this.connector = new PluginLedgerConnectorFabric(
      options.connectorOptions as IPluginLedgerConnectorFabricOptions,
    );

    this.ontologyManager = ontologyManager;

    this.signingCredential = options.signingCredential;
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
              throw new ClaimFormatError(
                `Claim format not supported: ${claim}`,
              );
          }
        }

        if (!options.channelName) {
          throw new ChannelNameError(
            `${FabricLeaf.CLASS_NAME}#constructor, Channel Name not provided`,
          );
        }
        this.contractChannel = options.channelName;

        if (options.wrapperContractName) {
          this.wrapperContractName = options.wrapperContractName;
        } else if (
          //this variables are necessary to deploy the wrapper contract
          options.targetOrganizations &&
          options.caFile &&
          options.ccSequence &&
          options.orderer &&
          options.ordererTLSHostnameOverride &&
          options.mspId
        ) {
          this.log.debug(
            `${FabricLeaf.CLASS_NAME}#constructor, No wrapper contract provided, creation required`,
          );
          this.targetOrganizations = options.targetOrganizations;
          this.caFile = options.caFile;
          this.ccSequence = options.ccSequence;
          this.orderer = options.orderer;
          this.ordererTLSHostnameOverride = options.ordererTLSHostnameOverride;
          this.mspId = options.mspId;
        } else {
          throw new InvalidWrapperContract(
            `${FabricLeaf.CLASS_NAME}#constructor, Missing variables necessary to deploy the Wrapper Contract, given: ${safeStableStringify(options)}`,
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
    const fnTag = `${FabricLeaf.CLASS_NAME}#getApproveAddress`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.log.debug(
          `${fnTag}, Getting Approve Address for asset type: ${getEnumKeyByValue(TokenType, assetType)}`,
        );
        switch (assetType) {
          case TokenType.ERC20:
          case TokenType.NONSTANDARD_FUNGIBLE:
            if (!this.bridgeId) {
              throw new ApproveAddressError(
                `${fnTag}, Bridge ID not available for approving address`,
              );
            }
            return this.bridgeId;
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
   * This method deploys the fungible wrapper contract and, if uncommented,
   * can also deploy the non-fungible wrapper contract. The deployments are
   * executed in parallel using `Promise.all`.
   *
   * @returns {Promise<void>} A promise that resolves when all contracts are deployed.
   */
  public async deployContracts(): Promise<void> {
    const fnTag = `${FabricLeaf.CLASS_NAME}#deployContracts`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        await Promise.all([
          this.deployFungibleWrapperContract(),
          // this.deployNonFungibleWrapperContract(),
        ]);
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
   * Retrieves the deployment receipt of the non-fungible wrapper contract.
   *
   * @returns
   * @throws
   */
  public getDeployNonFungibleWrapperContractReceipt(): unknown {
    const fnTag = `${FabricLeaf.CLASS_NAME}#getDeployNonFungibleWrapperContractReceipt`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        //TODO implement
        throw new Error("Method not implemented.");
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
   * Deploys a non-fungible wrapper contract.
   *
   **/
  public deployNonFungibleWrapperContract(): Promise<void> {
    const fnTag = `${FabricLeaf.CLASS_NAME}#deployNonFungibleWrapperContract`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        //TODO implement
        throw new Error("Method not implemented.");
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
   * Retrieves the deployment receipt for the fungible wrapper contract.
   *
   * @returns {DeployContractV1Response} The deployment receipt of the fungible wrapper contract.
   * @throws {ReceiptError} If the fungible wrapper contract has not been deployed.
   */
  public getDeployFungibleWrapperContractReceipt(): DeployContractV1Response {
    const fnTag = `${FabricLeaf.CLASS_NAME}#getDeployFungibleWrapperContractReceipt`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        if (!this.wrapperFungibleDeployReceipt) {
          throw new ReceiptError(
            `${FabricLeaf.CLASS_NAME}#getDeployFungibleWrapperContractReceipt() Fungible Wrapper Contract Not deployed`,
          );
        }
        return this.wrapperFungibleDeployReceipt;
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
   * Deploys a fungible wrapper contract to the Fabric network.
   *
   * @param contractName - Optional name for the wrapper contract. If not provided, a default name will be generated.
   * @throws {ChannelNameError} If the channel name is not available.
   * @throws {WrapperContractAlreadyCreatedError} If the wrapper contract is already created or if there are missing variables for contract creation.
   * @throws {TransactionReceiptError} If the wrapper contract deployment fails.
   */
  public async deployFungibleWrapperContract(
    contractName?: string,
  ): Promise<void> {
    const fnTag = `${FabricLeaf.CLASS_NAME}#deployWrapperContract`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Deploying Wrapper Contract`);

        if (!this.contractChannel) {
          throw new ChannelNameError(`${fnTag}, Channel Name not available`);
        }

        if (this.wrapperContractName) {
          throw new WrapperContractAlreadyCreatedError(fnTag);
        }

        if (
          !(
            this.targetOrganizations &&
            this.caFile &&
            this.ccSequence &&
            this.orderer &&
            this.ordererTLSHostnameOverride
          )
        ) {
          throw new WrapperContractError(
            `${fnTag}, Missing variables for contract creation`,
          );
        }

        this.wrapperContractName =
          contractName || `${uuidv4()}-fungible-wrapper-contract`;

        // ├── package.json
        // ├── src
        // │   ├── index.ts
        // │   ├── interaction-signature.ts
        // │   ├── ITraceableContract.ts
        // │   ├── satp-wrapper.ts
        // │   └── token.ts
        // ├── tsconfig.json
        // --------
        const wrapperSourceFiles: FileBase64[] = [];
        {
          const filename = "./tsconfig.json";
          const relativePath = "./";
          const filePath = path.join(
            this.wrapperSatpContractDir,
            relativePath,
            filename,
          );
          const buffer = await fs.readFile(filePath);
          wrapperSourceFiles.push({
            body: buffer.toString("base64"),
            filepath: relativePath,
            filename,
          });
        }
        {
          const filename = "./package.json";
          const relativePath = "./";
          const filePath = path.join(
            this.wrapperSatpContractDir,
            relativePath,
            filename,
          );
          const buffer = await fs.readFile(filePath);
          wrapperSourceFiles.push({
            body: buffer.toString("base64"),
            filepath: relativePath,
            filename,
          });
        }
        {
          const filename = "./index.ts";
          const relativePath = "./src/";
          const filePath = path.join(
            this.wrapperSatpContractDir,
            relativePath,
            filename,
          );
          const buffer = await fs.readFile(filePath);
          wrapperSourceFiles.push({
            body: buffer.toString("base64"),
            filepath: relativePath,
            filename,
          });
        }
        {
          const filename = "./interaction-signature.ts";
          const relativePath = "./src/";
          const filePath = path.join(
            this.wrapperSatpContractDir,
            relativePath,
            filename,
          );
          const buffer = await fs.readFile(filePath);
          wrapperSourceFiles.push({
            body: buffer.toString("base64"),
            filepath: relativePath,
            filename,
          });
        }
        {
          const filename = "./ITraceableContract.ts";
          const relativePath = "./src/";
          const filePath = path.join(
            this.wrapperSatpContractDir,
            relativePath,
            filename,
          );
          const buffer = await fs.readFile(filePath);
          wrapperSourceFiles.push({
            body: buffer.toString("base64"),
            filepath: relativePath,
            filename,
          });
        }
        {
          const filename = "./satp-wrapper.ts";
          const relativePath = "./src/";
          const filePath = path.join(
            this.wrapperSatpContractDir,
            relativePath,
            filename,
          );
          const buffer = await fs.readFile(filePath);
          wrapperSourceFiles.push({
            body: buffer.toString("base64"),
            filepath: relativePath,
            filename,
          });
        }
        {
          const filename = "./token.ts";
          const relativePath = "./src/";
          const filePath = path.join(
            this.wrapperSatpContractDir,
            relativePath,
            filename,
          );
          const buffer = await fs.readFile(filePath);
          wrapperSourceFiles.push({
            body: buffer.toString("base64"),
            filepath: relativePath,
            filename,
          });
        }

        const deployOutWrapperContract = await this.connector.deployContract({
          channelId: this.contractChannel,
          ccVersion: "1.0.0",
          sourceFiles: wrapperSourceFiles,
          ccName: this.wrapperContractName,
          targetOrganizations: this.targetOrganizations,
          caFile: this.caFile,
          ccLabel: "fungible-wrapper-contract",
          ccLang: ChainCodeProgrammingLanguage.Typescript,
          ccSequence: this.ccSequence,
          orderer: this.orderer,
          ordererTLSHostnameOverride: this.ordererTLSHostnameOverride,
          connTimeout: this.connTimeout,
          signaturePolicy: this.signaturePolicy,
        });

        if (!deployOutWrapperContract.success) {
          throw new TransactionReceiptError(
            `${fnTag}, Wrapper Contract deployment failed: ${safeStableStringify(deployOutWrapperContract)}`,
          );
        }

        this.wrapperFungibleDeployReceipt = deployOutWrapperContract;

        this.log.debug(
          `${fnTag}, Wrapper Contract deployed receipt: ${safeStableStringify(deployOutWrapperContract)}`,
        );

        if (!this.mspId) {
          throw new WrapperContractError(
            `${fnTag}, Missing mspId for initializing the wrapper contract`,
          );
        }

        const initializeResponse = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: "Initialize",
          params: [this.mspId],
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Send,
        });

        if (
          initializeResponse == undefined ||
          initializeResponse.transactionId == ""
        ) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract initialization failed`,
          );
        }

        const bridgeIdResponse = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: "ClientAccountID",
          params: [],
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Call,
        });

        if (bridgeIdResponse.functionOutput == undefined) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract bridge ID retrieval failed`,
          );
        }

        this.bridgeId = bridgeIdResponse.functionOutput;
        this.log.debug(`${fnTag}, Bridge ID: ${this.bridgeId}`);

        const setBridgeResponse = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: "setBridge",
          params: [this.mspId, this.bridgeId],
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Send,
        });

        if (
          setBridgeResponse == undefined ||
          setBridgeResponse.transactionId == ""
        ) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract bridge setting failed`,
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
   * Retrieves the contract name of the wrapper contract.
   *
   * @param {string} type - The type of the wrapper contract.
   * @returns {unknown} The contract address of the wrapper contract.
   * @throws {InvalidWrapperContract} If the wrapper contract type is invalid.
   */
  public getWrapperContract(type: "FUNGIBLE" | "NONFUNGIBLE"): string {
    const fnTag = `${FabricLeaf.CLASS_NAME}#getWrapperContract`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.log.debug(`${fnTag}, Getting Wrapper Contract Adress`);
        switch (type) {
          case "FUNGIBLE":
            if (!this.wrapperContractName) {
              throw new WrapperContractError(
                `${fnTag}, Wrapper Contract not deployed`,
              );
            }
            return this.wrapperContractName;
          case "NONFUNGIBLE":
            //TODO implement
            throw new InvalidWrapperContract(
              `${fnTag}, Non-fungible wrapper contract not implemented`,
            );
          default:
            throw new InvalidWrapperContract(
              `${fnTag}, Invalid wrapper contract`,
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
   * Wraps an asset on the Fabric network.
   *
   * @param asset - The asset to be wrapped, containing its id, owner, type, mspId, channelName, and contractName.
   * @returns {Promise<TransactionResponse>} The response of the transaction, including the transaction ID and output.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async wrapAsset(asset: FabricAsset): Promise<TransactionResponse> {
    const fnTag = `${FabricLeaf.CLASS_NAME}}#wrapAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Wrapping Asset: {${asset.id}, ${asset.owner}, ${asset.type}}`,
        );

        const interactions = this.ontologyManager.getOntologyInteractions(
          LedgerType.Fabric2,
          asset.referenceId,
        );

        if (!this.contractChannel || !this.wrapperContractName) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: "wrap",
          params: [
            asset.type.toString(),
            asset.id,
            asset.referenceId,
            asset.owner,
            asset.mspId,
            asset.channelName,
            asset.contractName,
            safeStableStringify(interactions),
          ],
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Send,
        });

        if (response == undefined || response.transactionId == "") {
          throw new TransactionError(fnTag);
        }

        return {
          transactionId: response.transactionId,
          output: response.functionOutput,
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
   * Unwraps an asset on the Fabric network.
   *
   * @param assetId - The ID of the asset to be unwrapped.
   * @returns {Promise<TransactionResponse>} The response of the transaction, including the transaction ID and output.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async unwrapAsset(assetId: string): Promise<TransactionResponse> {
    const fnTag = `${FabricLeaf.CLASS_NAME}}#unwrapAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Unwrapping Asset: ${assetId}`);

        if (!this.contractChannel || !this.wrapperContractName) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: "unwrap",
          params: [assetId],
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Send,
        });

        if (response == undefined || response.transactionId == "") {
          throw new TransactionError(fnTag);
        }

        return {
          transactionId: response.transactionId,
          output: response.functionOutput,
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
   * Locks a specified amount of an asset on the Fabric network.
   *
   * @param assetId - The ID of the asset to be locked.
   * @param amount - The amount of the asset to be locked.
   * @returns {Promise<TransactionResponse>} The response of the transaction, including the transaction ID and output.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async lockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${FabricLeaf.CLASS_NAME}}#lockAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Locking Asset: ${assetId} amount: ${amount}`);

        if (!this.contractChannel || !this.wrapperContractName) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: "lock",
          params: [assetId, amount.toString()],
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Send,
        });

        if (response == undefined || response.transactionId == "") {
          throw new TransactionError(fnTag);
        }

        return {
          transactionId: response.transactionId,
          output: response.functionOutput,
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
   * @param {number} amount - The amount of the asset to be unlocked.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async unlockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${FabricLeaf.CLASS_NAME}}#unlockAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Unlocking Asset: ${assetId} amount: ${amount}`,
        );

        if (!this.contractChannel || !this.wrapperContractName) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: "unlock",
          params: [assetId, amount.toString()],
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Send,
        });

        if (response == undefined || response.transactionId == "") {
          throw new TransactionError(fnTag);
        }

        return {
          transactionId: response.transactionId,
          output: response.functionOutput,
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
   * @param {number} amount - The amount of the asset to be minted.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async mintAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${FabricLeaf.CLASS_NAME}}#mintAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Minting Asset: ${assetId} amount: ${amount}`);

        if (!this.contractChannel || !this.wrapperContractName) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: "mint",
          params: [assetId, amount.toString()],
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Send,
        });

        if (response == undefined || response.transactionId == "") {
          throw new TransactionError(fnTag);
        }

        return {
          transactionId: response.transactionId,
          output: response.functionOutput,
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
   * @param {number} amount - The amount of the asset to be burned.
   * @returns {Promise<TransactionResponse>} A promise that resolves to the transaction response.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async burnAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${FabricLeaf.CLASS_NAME}}#burnAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Burning Asset: ${assetId} amount: ${amount}`);

        if (!this.contractChannel || !this.wrapperContractName) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: "burn",
          params: [assetId, amount.toString()],
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Send,
        });

        if (response == undefined || response.transactionId == "") {
          throw new TransactionError(fnTag);
        }

        return {
          transactionId: response.transactionId,
          output: response.functionOutput,
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
    const fnTag = `${FabricLeaf.CLASS_NAME}}#assignAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Assigning Asset: ${assetId} amount: ${amount} to: ${to}`,
        );

        if (!this.contractChannel || !this.wrapperContractName) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: "assign",
          params: [assetId, to, amount.toString()],
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Send,
        });

        if (response == undefined || response.transactionId == "") {
          throw new TransactionError(fnTag);
        }

        return {
          transactionId: response.transactionId,
          output: response.functionOutput,
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
   * @returns {Promise<FabricAsset>} A promise that resolves to an array fabric assets.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async getAsset(assetId: string): Promise<FabricAsset> {
    const fnTag = `${FabricLeaf.CLASS_NAME}}#getAsset`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Getting Asset`);

        if (!this.contractChannel || !this.wrapperContractName) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: "GetAsset",
          params: [assetId],
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Call,
        });

        if (response == undefined) {
          throw new TransactionError(fnTag);
        }

        const token = JSON.parse(response.functionOutput);

        return {
          type: Number(token.tokenType),
          id: token.tokenId,
          referenceId: token.referenceId,
          owner: token.owner,
          mspId: token.mspId,
          channelName: token.channelName,
          contractName: token.contractName,
          amount: token.amount.toString(),
          network: this.networkIdentification,
        } as FabricAsset;
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
   * Retrieves the list of assets from the Fabric network.
   *
   * @returns {Promise<string[]>} A promise that resolves to an array of asset strings.
   *
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction response is undefined.
   *
   * @example
   * ```typescript
   * const assets = await fabricLeaf.getAssets();
   * console.log(assets); // Output: ["asset1", "asset2", ...]
   * ```
   */
  public async getAssets(): Promise<string[]> {
    const fnTag = `${FabricLeaf.CLASS_NAME}}#getAssets`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Getting Assets`);

        if (!this.contractChannel || !this.wrapperContractName) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: "GetAssets",
          params: [],
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Call,
        });

        if (response == undefined) {
          throw new TransactionError(fnTag);
        }

        return JSON.parse(response.functionOutput);
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
   * Retrieves the client ID associated with the Fabric network,
   * this is necessary because as there is no notion of address in Hyperledger Fabric,
   * we cannot know for sure the address ou id of us in that network and channel.
   *
   * @returns {Promise<string>} A promise that resolves to the client ID.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   * @throws {TransactionError} If the transaction fails.
   */
  public async getClientId(): Promise<string> {
    const fnTag = `${FabricLeaf.CLASS_NAME}}#getClientId`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Getting Client Id`);

        if (!this.contractChannel || !this.wrapperContractName) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: "ClientAccountID",
          params: [],
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Call,
        });

        if (response == undefined) {
          throw new TransactionError(fnTag);
        }

        return response.functionOutput;
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
   * Executes a transaction on the Fabric network using the specified method name and parameters.
   *
   * @param methodName - The name of the method to invoke on the Fabric contract.
   * @param params - An array of string parameters to pass to the method.
   * @returns A promise that resolves to a `TransactionResponse` object containing the transaction ID and output.
   * @throws `WrapperContractError` if the wrapper contract is not deployed.
   * @throws `TransactionError` if the transaction response is undefined or the transaction ID is empty.
   */
  public async runTransaction(
    methodName: string,
    params: string[],
  ): Promise<TransactionResponse> {
    const fnTag = `${FabricLeaf.CLASS_NAME}}#runTransaction`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(
          `${fnTag}, Running Transaction: ${methodName} with params: ${params}`,
        );

        if (!this.contractChannel || !this.wrapperContractName) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const response = await this.connector.transact({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          methodName: methodName,
          params: params,
          contractName: this.wrapperContractName,
          invocationType: FabricContractInvocationType.Send,
        });

        if (response == undefined || response.transactionId == "") {
          throw new TransactionError(fnTag);
        }

        return {
          transactionId: response.transactionId,
          output: response.functionOutput,
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
    const fnTag = `${FabricLeaf.CLASS_NAME}}#getView`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Getting View: ${assetId}`);

        if (!this.contractChannel || !this.wrapperContractName) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const networkDetails = {
          connector: this.connector,
          signingCredential: this.signingCredential,
          contractName: this.wrapperContractName,
          channelName: this.contractChannel,
          participant: this.id,
        };

        if (this.bungee == undefined) {
          throw new BungeeError(`${fnTag}, Bungee not initialized`);
        }

        try {
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

          return safeStableStringify(generated);
        } catch (error) {
          console.error(error);
          return "";
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
   * Retrieves the receipt for a given transaction ID.
   *
   * @param transactionId - The ID of the transaction for which to get the receipt.
   * @returns A promise that resolves to the receipt of the transaction as a string.
   * @throws {WrapperContractError} If the wrapper contract is not deployed.
   */
  public async getReceipt(transactionId: string): Promise<string> {
    const fnTag = `${FabricLeaf.CLASS_NAME}}#getReceipt`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Getting Receipt: ${transactionId}`);

        if (!this.contractChannel || !this.wrapperContractName) {
          throw new WrapperContractError(
            `${fnTag}, Wrapper Contract not deployed`,
          );
        }

        const receipt = await this.connector.getTransactionReceiptByTxID({
          signingCredential: this.signingCredential,
          channelName: this.contractChannel,
          contractName: "qscc",
          invocationType: FabricContractInvocationType.Call,
          methodName: "GetBlockByTxID",
          params: [this.contractChannel, transactionId],
        });

        return safeStableStringify(receipt);
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
    const fnTag = `${FabricLeaf.CLASS_NAME}}#runTransaction`;
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
    const fnTag = `${FabricLeaf.CLASS_NAME}#shutdownConnection`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        try {
          await this.connector.shutdown();
          this.log.debug(
            `${FabricLeaf.CLASS_NAME}#shutdownConnection, Connector shutdown successfully`,
          );
        } catch (error) {
          this.log.error(
            `${FabricLeaf.CLASS_NAME}#shutdownConnection, Error shutting down connector: ${error}`,
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
    obj: Partial<IPluginLedgerConnectorFabricOptions>,
  ): obj is IPluginLedgerConnectorFabricOptions => {
    return (
      obj.peerBinary !== undefined &&
      obj.cliContainerEnv !== undefined &&
      obj.pluginRegistry !== undefined
    );
  };
}
