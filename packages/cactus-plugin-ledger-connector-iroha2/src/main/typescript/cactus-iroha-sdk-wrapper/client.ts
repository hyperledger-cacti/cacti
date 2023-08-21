/**
 * Cactus wrapper around IrohaV2 Client and some related functions.
 */

import { crypto } from "@iroha2/crypto-target-node";
import {
  Signer,
  Torii,
  setCrypto,
  makeTransactionPayload,
  executableIntoSignedTransaction,
  computeTransactionHash,
  makeVersionedSignedTransaction,
} from "@iroha2/client";
import {
  AssetDefinitionId,
  AssetValueType,
  DomainId,
  EvaluatesToRegistrableBox,
  Executable,
  Expression,
  IdentifiableBox,
  Instruction,
  MapNameValue,
  Metadata,
  Mintable,
  Name as IrohaName,
  Value as IrohaValue,
  NewAssetDefinition,
  NewDomain,
  OptionIpfsPath,
  RegisterBox,
  VecInstruction,
  Asset,
  MintBox,
  EvaluatesToValue,
  EvaluatesToIdBox,
  IdBox,
  BurnBox,
  PublicKey,
  NewAccount,
  VecPublicKey,
  TransferBox,
  TransactionPayload,
  AccountId,
  RejectionReason,
  FilterBox,
  PipelineEventFilter,
  OptionPipelineEntityKind,
  PipelineEntityKind,
  OptionPipelineStatusKind,
  OptionHash,
  VersionedSignedTransaction,
} from "@iroha2/data-model";
import { Key, KeyPair } from "@iroha2/crypto-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { bytesToHex, hexToBytes } from "hada";

import { CactusIrohaV2QueryClient } from "./query";
import {
  createAccountId,
  createAssetId,
  createAssetValue,
  createIrohaValue,
} from "./data-factories";
import {
  TransactResponseV1,
  TransactionStatusV1,
  Iroha2BaseConfigTorii,
} from "../generated/openapi/typescript-axios";
import { IrohaV2PrerequisitesProvider } from "./prerequisites-provider";

setCrypto(crypto);

/**
 * Generates key pair compatible with IrohaV2 SDK client.
 *
 * @warning Returned `KeyPair` must be freed by the caller! (use `.free()` method)
 * @param publicKeyMultihash public key in multihash format.
 * @param privateKeyJson private key payload and digest function.
 * @returns IrohaV2 SDK `KeyPair`
 */
export function generateIrohaV2KeyPair(
  publicKeyMultihash: string,
  privateKeyJson: Key,
): KeyPair {
  const freeableKeys: { free(): void }[] = [];

  try {
    const multihashBytes = Uint8Array.from(hexToBytes(publicKeyMultihash));

    const multihash = crypto.createMultihashFromBytes(multihashBytes);
    freeableKeys.push(multihash);
    const publicKey = crypto.createPublicKeyFromMultihash(multihash);
    freeableKeys.push(publicKey);
    const privateKey = crypto.createPrivateKeyFromJsKey(privateKeyJson);
    freeableKeys.push(privateKey);

    const keyPair = crypto.createKeyPairFromKeys(publicKey, privateKey);

    return keyPair;
  } finally {
    freeableKeys.forEach((x) => x.free());
  }
}

/**
 * Single instruction internal representation.
 */
interface NamedIrohaV2Instruction {
  name: string;
  instruction: Instruction;
}

/**
 * Raw type of executableIntoSignedTransaction payloadParams parameter.
 */
type IrohaInPayloadParams = Parameters<
  typeof executableIntoSignedTransaction
>[0]["payloadParams"];

/**
 * Transaction parameters type to be send in payload.
 * Comes from Iroha SDK.
 */
export type TransactionPayloadParameters = Exclude<
  IrohaInPayloadParams,
  undefined
>;

/**
 * Cactus wrapper around Iroha V2 SDK Client. Should not be used outside of this connector.
 * - Provides convenient functions to transact / query the ledger.
 * - Each transaction method adds the instruction to the transaction list that is executed together during `send()` call.
 * - Use `query` member to access query interface (that doesn't affect client transaction list)
 * - Each method returns `this` so invocations can be chained.
 */
export class CactusIrohaV2Client {
  private readonly log: Logger;
  private readonly transactions: Array<NamedIrohaV2Instruction> = [];
  private readonly prerequisitesProvider: IrohaV2PrerequisitesProvider;

  /**
   * Iroha signer used to sign transaction with user private key and account.
   */
  public readonly irohaSigner?: Signer;

  /**
   * Separate interface for sending IrohaV2 queries.
   */
  public readonly query: CactusIrohaV2QueryClient;

  constructor(
    public readonly toriiOptions: Iroha2BaseConfigTorii,
    public readonly accountId: AccountId,
    private readonly keyPair?: KeyPair,
    private readonly logLevel: LogLevelDesc = "info",
  ) {
    Checks.truthy(accountId, "signerOptions accountId");

    const label = this.constructor.name;
    this.log = LoggerProvider.getOrCreate({ level: this.logLevel, label });
    this.log.debug(`${label} created`);

    if (keyPair) {
      this.log.debug("KeyPair present, add Signer and Query function.");
      this.irohaSigner = new Signer(accountId, keyPair);
    }

    this.prerequisitesProvider = new IrohaV2PrerequisitesProvider(
      toriiOptions.apiURL,
    );

    this.query = new CactusIrohaV2QueryClient(
      this.prerequisitesProvider,
      this.irohaSigner ?? this.accountId,
      this.log,
    );
  }

  /**
   * Add instruction to register a new domain.
   *
   * @param domainName
   * @returns this
   */
  public registerDomain(domainName: IrohaName): this {
    Checks.truthy(domainName, "registerDomain arg domainName");

    const registerBox = RegisterBox({
      object: EvaluatesToRegistrableBox({
        expression: Expression(
          "Raw",
          IrohaValue(
            "Identifiable",
            IdentifiableBox(
              "NewDomain",
              NewDomain({
                id: DomainId({
                  name: domainName,
                }),
                metadata: Metadata({ map: MapNameValue(new Map()) }),
                logo: OptionIpfsPath("None"),
              }),
            ),
          ),
        ),
      }),
    });

    const description = `RegisterDomain '${domainName}'`;
    this.transactions.push({
      name: description,
      instruction: Instruction("Register", registerBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  /**
   * Add instruction to register a new asset definition.
   * Each asset must be define before it's created or mined.
   *
   * @param assetName
   * @param domainName
   * @param valueType Type of stored asset value (e.g. `Quantity`, `Fixed`)
   * @param mintable How asset can be minted (e.g. "Infinitely", "Not")
   * @param metadata
   * @returns this
   */
  public registerAssetDefinition(
    assetName: IrohaName,
    domainName: IrohaName,
    valueType: "Fixed" | "Quantity" | "BigQuantity" | "Store",
    mintable: "Infinitely" | "Once" | "Not",
    metadata: Map<IrohaName, IrohaValue> = new Map(),
  ): this {
    Checks.truthy(assetName, "registerAsset arg assetName");
    Checks.truthy(domainName, "registerAsset arg domainName");
    Checks.truthy(valueType, "registerAsset arg valueType");
    Checks.truthy(mintable, "registerAsset arg mintable");

    const assetDefinition = NewAssetDefinition({
      id: AssetDefinitionId({
        name: assetName,
        domain_id: DomainId({ name: domainName }),
      }),
      value_type: AssetValueType(valueType),
      metadata: Metadata({
        map: MapNameValue(metadata),
      }),
      mintable: Mintable(mintable),
    });

    const registerBox = RegisterBox({
      object: EvaluatesToRegistrableBox({
        expression: Expression(
          "Raw",
          IrohaValue(
            "Identifiable",
            IdentifiableBox("NewAssetDefinition", assetDefinition),
          ),
        ),
      }),
    });

    const description = `RegisterAssetDefinition '${assetName}#${domainName}', type: ${valueType}, mintable: ${mintable}`;
    this.transactions.push({
      name: description,
      instruction: Instruction("Register", registerBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  /**
   * Add instruction to register an asset that has been previously defined.
   *
   * @param assetName
   * @param domainName
   * @param accountName Asset owner name
   * @param accountDomainName Asset owner domain name
   * @param value Asset value must match `AssetValueType` from asset definition.
   * @returns this
   */
  public registerAsset(
    assetName: IrohaName,
    domainName: IrohaName,
    accountName: IrohaName,
    accountDomainName: IrohaName,
    value: Parameters<typeof createAssetValue>[0],
  ): this {
    Checks.truthy(assetName, "registerAsset arg assetName");
    Checks.truthy(domainName, "registerAsset arg domainName");
    Checks.truthy(accountName, "registerAsset arg accountName");
    Checks.truthy(accountDomainName, "registerAsset arg accountDomainName");

    const assetDefinition = Asset({
      id: createAssetId(assetName, domainName, accountName, accountDomainName),
      value: createAssetValue(value),
    });

    const registerBox = RegisterBox({
      object: EvaluatesToRegistrableBox({
        expression: Expression(
          "Raw",
          IrohaValue("Identifiable", IdentifiableBox("Asset", assetDefinition)),
        ),
      }),
    });

    const description = `RegisterAsset '${assetName}#${domainName}', value: ${value}`;
    this.transactions.push({
      name: description,
      instruction: Instruction("Register", registerBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  /**
   * Add instruction to mint specified amount of an asset.
   *
   * @param assetName
   * @param domainName
   * @param accountName Asset owner name
   * @param accountDomainName Asset owner domain name
   * @param value Asset value must match `AssetValueType` from asset definition.
   * @returns this
   */
  public mintAsset(
    assetName: IrohaName,
    domainName: IrohaName,
    accountName: IrohaName,
    accountDomainName: IrohaName,
    value: Parameters<typeof createIrohaValue>[0],
  ): this {
    Checks.truthy(assetName, "mintAsset arg assetName");
    Checks.truthy(domainName, "mintAsset arg domainName");
    Checks.truthy(accountName, "mintAsset arg accountName");
    Checks.truthy(accountDomainName, "mintAsset arg accountDomainName");
    Checks.truthy(value, "mintAsset arg value");

    const mintBox = MintBox({
      object: EvaluatesToValue({
        expression: Expression("Raw", createIrohaValue(value)),
      }),
      destination_id: EvaluatesToIdBox({
        expression: Expression(
          "Raw",
          IrohaValue(
            "Id",
            IdBox(
              "AssetId",
              createAssetId(
                assetName,
                domainName,
                accountName,
                accountDomainName,
              ),
            ),
          ),
        ),
      }),
    });

    const description = `MintAsset '${assetName}#${domainName}', value: ${value}`;
    this.transactions.push({
      name: description,
      instruction: Instruction("Mint", mintBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  /**
   * Add instruction to burn specified amount of an asset.
   *
   * @param assetName
   * @param domainName
   * @param accountName Asset owner name
   * @param accountDomainName Asset owner domain name
   * @param value Asset value to burn must match `AssetValueType` from asset definition.
   * @returns this
   */
  public burnAsset(
    assetName: IrohaName,
    domainName: IrohaName,
    accountName: IrohaName,
    accountDomainName: IrohaName,
    value: number | bigint | string | Metadata,
  ): this {
    Checks.truthy(assetName, "burnAsset arg assetName");
    Checks.truthy(domainName, "burnAsset arg domainName");
    Checks.truthy(accountName, "burnAsset arg accountName");
    Checks.truthy(accountDomainName, "burnAsset arg accountDomainName");
    Checks.truthy(value, "burnAsset arg value");

    const burnBox = BurnBox({
      object: EvaluatesToValue({
        expression: Expression("Raw", createIrohaValue(value)),
      }),
      destination_id: EvaluatesToIdBox({
        expression: Expression(
          "Raw",
          IrohaValue(
            "Id",
            IdBox(
              "AssetId",
              createAssetId(
                assetName,
                domainName,
                accountName,
                accountDomainName,
              ),
            ),
          ),
        ),
      }),
    });

    const description = `BurnAsset '${assetName}#${domainName}', value: ${value}`;
    this.transactions.push({
      name: description,
      instruction: Instruction("Burn", burnBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  /**
   * Add instruction to transfer asset between two accounts.
   *
   * @param assetName
   * @param assetDomainName
   * @param sourceAccountName Origin account name.
   * @param sourceAccountDomain Origin account domain name.
   * @param targetAccountName Target account name.
   * @param targetAccountDomain Target account domain name.
   * @param valueToTransfer Asset value to transfer must match `AssetValueType` from asset definition.
   * @returns this
   */
  public transferAsset(
    assetName: IrohaName,
    assetDomainName: IrohaName,
    sourceAccountName: IrohaName,
    sourceAccountDomain: IrohaName,
    targetAccountName: IrohaName,
    targetAccountDomain: IrohaName,
    valueToTransfer: number | bigint | string | Metadata,
  ): this {
    Checks.truthy(assetName, "transferAsset arg assetName");
    Checks.truthy(assetDomainName, "transferAsset arg assetDomainName");
    Checks.truthy(sourceAccountName, "transferAsset arg sourceAccountName");
    Checks.truthy(sourceAccountDomain, "transferAsset arg sourceAccountDomain");
    Checks.truthy(targetAccountName, "transferAsset arg targetAccountName");
    Checks.truthy(targetAccountDomain, "transferAsset arg targetAccountDomain");
    Checks.truthy(valueToTransfer, "transferAsset arg valueToTransfer");

    const transferBox = TransferBox({
      source_id: EvaluatesToIdBox({
        expression: Expression(
          "Raw",
          IrohaValue(
            "Id",
            IdBox(
              "AssetId",
              createAssetId(
                assetName,
                assetDomainName,
                sourceAccountName,
                sourceAccountDomain,
              ),
            ),
          ),
        ),
      }),
      object: EvaluatesToValue({
        expression: Expression("Raw", createIrohaValue(valueToTransfer)),
      }),
      destination_id: EvaluatesToIdBox({
        expression: Expression(
          "Raw",
          IrohaValue(
            "Id",
            IdBox(
              "AssetId",
              createAssetId(
                assetName,
                assetDomainName,
                targetAccountName,
                targetAccountDomain,
              ),
            ),
          ),
        ),
      }),
    });

    const description = `TransferAsset '${assetName}#${assetDomainName}',\
    from: ${sourceAccountName}@${sourceAccountDomain}\
    to ${targetAccountName}@${targetAccountDomain}`;

    this.transactions.push({
      name: description,
      instruction: Instruction("Transfer", transferBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  /**
   * Add instruction to register new account on the ledger.
   *
   * @param accountName
   * @param domainName
   * @param publicKeyPayload Public key, either HEX encoded string or raw `Uint8Array` bytes.
   * @param publicKeyDigestFunction
   * @param metadata
   * @returns this
   */
  public registerAccount(
    accountName: IrohaName,
    domainName: IrohaName,
    publicKeyPayload: string | Uint8Array,
    publicKeyDigestFunction = "ed25519",
    metadata: Map<IrohaName, IrohaValue> = new Map(),
  ): this {
    Checks.truthy(accountName, "registerAccount arg accountName");
    Checks.truthy(domainName, "registerAccount arg domainName");
    Checks.truthy(publicKeyPayload, "registerAccount arg publicKeyPayload");
    Checks.truthy(
      publicKeyDigestFunction,
      "registerAccount arg publicKeyDigestFunction",
    );

    let publicKeyBytes: Uint8Array;
    if (typeof publicKeyPayload === "string") {
      publicKeyBytes = Uint8Array.from(hexToBytes(publicKeyPayload));
    } else {
      publicKeyBytes = publicKeyPayload;
    }

    const publicKey = PublicKey({
      payload: publicKeyBytes,
      digest_function: publicKeyDigestFunction,
    });

    const registerBox = RegisterBox({
      object: EvaluatesToRegistrableBox({
        expression: Expression(
          "Raw",
          IrohaValue(
            "Identifiable",
            IdentifiableBox(
              "NewAccount",
              NewAccount({
                id: createAccountId(accountName, domainName),
                signatories: VecPublicKey([publicKey]),
                metadata: Metadata({ map: MapNameValue(metadata) }),
              }),
            ),
          ),
        ),
      }),
    });

    const description = `RegisterAccount '${accountName}@${domainName}'`;
    this.transactions.push({
      name: description,
      instruction: Instruction("Register", registerBox),
    });
    this.log.debug(`Added ${description} to transactions`);

    return this;
  }

  /**
   * Clear all the instructions stored in current transaction.
   *
   * @returns this
   */
  public clear(): this {
    this.transactions.length = 0;
    return this;
  }

  /**
   * Get summary report of all instructions stored in a current transaction.
   *
   * @returns printable string report
   */
  public getTransactionSummary(): string {
    const header = `Transaction Summary (total: ${this.transactions.length}):\n`;
    const instructions = this.transactions.map(
      (instruction, index) =>
        ` - Instruction #${index}: ` + instruction.name + "\n",
    );

    return header.concat(...instructions);
  }

  /**
   * Create Iroha SDK compatible `Executable` from instructions saved in current client session.
   *
   * @returns Iroha `Executable`
   */
  private createIrohaExecutable(): Executable {
    const irohaInstructions = this.transactions.map(
      (entry) => entry.instruction,
    );
    this.log.info(
      `Created executable with ${irohaInstructions.length} instructions.`,
    );

    return Executable("Instructions", VecInstruction(irohaInstructions));
  }

  /**
   * Throw if there are no instructions in current client session.
   */
  private assertTransactionsNotEmpty() {
    if (this.transactions.length === 0) {
      throw new Error(
        "assertTransactionsNotEmpty() failed - no instructions defined!",
      );
    }
  }

  /**
   * Get transaction payload buffer that can be signed and then sent to the ledger.
   *
   * @param txParams Transaction parameters.
   *
   * @returns Buffer of encoded `TransactionPayload`
   */
  public getTransactionPayloadBuffer(
    txParams?: TransactionPayloadParameters,
  ): Uint8Array {
    this.assertTransactionsNotEmpty();

    const payload = makeTransactionPayload({
      accountId: this.accountId,
      executable: this.createIrohaExecutable(),
      ...txParams,
    });

    return TransactionPayload.toBuffer(payload);
  }

  /**
   * Parse IrohaV2 `RejectionReason` and return plain string rejection description.
   *
   * @param reason Transaction rejection from the Iroha V2 ledger.
   * @returns rejection description.
   */
  private getRejectionDescription(reason: RejectionReason): string {
    Checks.truthy(reason, "getRejectionDescription arg reason");

    return reason.as("Transaction").match({
      NotPermitted: (error) => {
        return `NotPermitted: ${error.reason}`;
      },
      UnsatisfiedSignatureCondition: (error) => {
        return `UnsatisfiedSignatureCondition: ${error.reason}`;
      },
      LimitCheck: (error) => {
        return `LimitCheck: ${error}`;
      },
      InstructionExecution: (error) => {
        return `InstructionExecution: ${error.reason}`;
      },
      WasmExecution: (error) => {
        return `WasmExecution: ${error.reason}`;
      },
      UnexpectedGenesisAccountSignature: () => {
        return `UnexpectedGenesisAccountSignature`;
      },
    });
  }

  /**
   * Wait until transaction with given hash is validated on the ledger and return it's final status.
   *
   * @param txHash transaction hash in bytes format.
   * @returns transaction status (`TransactResponseV1` format).
   */
  private async waitForTransactionStatus(
    txHash: Uint8Array,
  ): Promise<TransactResponseV1> {
    Checks.truthy(txHash, "waitForTransactionStatus arg txHash");
    const txHashHex = bytesToHex([...txHash]);
    this.log.debug("waitForTransactionStatus() - hash:", txHashHex);

    const monitor = await Torii.listenForEvents(
      this.prerequisitesProvider.getApiWebSocketProperties(),
      {
        filter: FilterBox(
          "Pipeline",
          PipelineEventFilter({
            entity_kind: OptionPipelineEntityKind(
              "Some",
              PipelineEntityKind("Transaction"),
            ),
            status_kind: OptionPipelineStatusKind("None"),
            hash: OptionHash("Some", txHash),
          }),
        ),
      },
    );
    this.log.debug("waitForTransactionStatus() - monitoring started.");

    const txStatusPromise = new Promise<TransactResponseV1>(
      (resolve, reject) => {
        monitor.ee.on("error", (error) => {
          this.log.warn("waitForTransactionStatus() - Received error", error);
          reject(error);
        });

        monitor.ee.on("event", (event) => {
          try {
            const { hash, status } = event.as("Pipeline");
            const hashHex = bytesToHex([...hash]);

            status.match({
              Validating: () => {
                this.log.info(
                  `waitForTransactionStatus() - Transaction '${hashHex}' [Validating]`,
                );
              },
              Committed: () => {
                const txStatus = TransactionStatusV1.Committed;
                this.log.info(
                  `waitForTransactionStatus() - Transaction '${hashHex}' [${txStatus}]`,
                );
                resolve({
                  hash: hashHex,
                  status: txStatus,
                });
              },
              Rejected: (reason) => {
                const txStatus = TransactionStatusV1.Rejected;
                this.log.info(
                  `waitForTransactionStatus() - Transaction '${hashHex}' [${txStatus}]`,
                );
                resolve({
                  hash: hashHex,
                  status: txStatus,
                  rejectReason: this.getRejectionDescription(reason),
                });
              },
            });
          } catch (error) {
            this.log.warn(
              "waitForTransactionStatus() - Event handling error:",
              error,
            );
            reject(error);
          }
        });
      },
    );

    return txStatusPromise.finally(async () => {
      this.log.debug(
        `Transaction ${txHashHex} status received, stop the monitoring...`,
      );
      monitor.ee.clearListeners();
      await monitor.stop();
    });
  }

  /**
   * Send all the stored instructions as single Iroha transaction.
   *
   * @param txParams Transaction parameters.
   * @param waitForCommit If `true` - block and return the final transaction status. Otherwise - return immediately.
   *
   * @returns `TransactResponseV1`
   */
  public async send(
    txParams?: TransactionPayloadParameters,
    waitForCommit = false,
  ): Promise<TransactResponseV1> {
    this.assertTransactionsNotEmpty();
    if (!this.irohaSigner) {
      throw new Error("send() failed - no Iroha Signer, keyPair was missing");
    }
    this.log.debug(this.getTransactionSummary());

    const txPayload = makeTransactionPayload({
      accountId: this.irohaSigner.accountId,
      executable: this.createIrohaExecutable(),
      ...txParams,
    });
    const hash = computeTransactionHash(txPayload);
    let statusPromise;
    if (waitForCommit) {
      statusPromise = this.waitForTransactionStatus(hash);
    }

    const signedTx = makeVersionedSignedTransaction(
      txPayload,
      this.irohaSigner,
    );
    await Torii.submit(
      this.prerequisitesProvider.getApiHttpProperties(),
      signedTx,
    );
    this.clear();

    if (statusPromise) {
      return await statusPromise;
    } else {
      return {
        hash: bytesToHex([...hash]),
        status: TransactionStatusV1.Submitted,
      };
    }
  }

  /**
   * Send signed transaction payload to the ledger.
   *
   * @param signedPayload Encoded or plain `VersionedSignedTransaction`
   * @param waitForCommit If `true` - block and return the final transaction status. Otherwise - return immediately.
   *
   * @returns `TransactResponseV1`
   */
  public async sendSignedPayload(
    signedPayload: VersionedSignedTransaction | ArrayBufferView,
    waitForCommit = false,
  ): Promise<TransactResponseV1> {
    Checks.truthy(signedPayload, "sendSigned arg signedPayload");

    if (ArrayBuffer.isView(signedPayload)) {
      signedPayload = VersionedSignedTransaction.fromBuffer(signedPayload);
    }

    const hash = computeTransactionHash(signedPayload.as("V1").payload);
    if (waitForCommit) {
      const statusPromise = this.waitForTransactionStatus(hash);
      await Torii.submit(
        this.prerequisitesProvider.getApiHttpProperties(),
        signedPayload,
      );
      return await statusPromise;
    } else {
      await Torii.submit(
        this.prerequisitesProvider.getApiHttpProperties(),
        signedPayload,
      );
      return {
        hash: bytesToHex([...hash]),
        status: TransactionStatusV1.Submitted,
      };
    }
  }

  /**
   * Free all allocated resources.
   * Should be called before the shutdown.
   */
  public free(): void {
    this.log.debug("Free CactusIrohaV2Client key pair");
    this.keyPair?.free();
    this.clear();
  }
}
