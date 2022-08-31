/**
 * Cactus wrapper around IrohaV2 Client and some related functions.
 */

import { crypto } from "@iroha2/crypto-target-node";
import {
  Client,
  Signer,
  Torii,
  setCrypto,
  CreateToriiProps,
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
} from "@iroha2/data-model";
import { Key, KeyPair } from "@iroha2/crypto-core";
const { adapter: irohaWSAdapter } = require("@iroha2/client/web-socket/node");

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { hexToBytes } from "hada";
import { fetch as undiciFetch } from "undici";

import { CactusIrohaV2QueryClient } from "./query";
import {
  createAccountId,
  createAssetId,
  createAssetValue,
  createIrohaValue,
} from "./data-factories";

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
 * Cactus wrapper around Iroha V2 SDK Client. Should not be used outside of this connector.
 * - Provides convenient functions to transact / query the ledger.
 * - Each transaction method adds the instruction to the transaction list that is executed together during `send()` call.
 * - Use `query` member to access query interface (that doesn't affect client transaction list)
 * - Each method returns `this` so invocations can be chained.
 */
export class CactusIrohaV2Client {
  private readonly log: Logger;
  private readonly transactions: Array<NamedIrohaV2Instruction> = [];

  /**
   * Upstream IrohaV2 SDK client used by this wrapper.
   */
  public readonly irohaClient: Client;

  /**
   * Separate interface for making the IrohaV2 queries.
   */
  public readonly query: CactusIrohaV2QueryClient;

  constructor(
    public readonly toriiOptions: Omit<CreateToriiProps, "ws" | "fetch">,
    public readonly signerOptions: ConstructorParameters<typeof Signer>,
    private readonly logLevel: LogLevelDesc = "info",
  ) {
    Checks.truthy(toriiOptions.apiURL, "toriiOptions apiURL");
    Checks.truthy(toriiOptions.telemetryURL, "toriiOptions telemetryURL");
    Checks.truthy(signerOptions[0], "signerOptions account");
    Checks.truthy(signerOptions[1], "signerOptions keyPair");

    const torii = new Torii({
      ...toriiOptions,
      ws: irohaWSAdapter,
      fetch: undiciFetch as any,
    });

    const signer = new Signer(...signerOptions);

    this.irohaClient = new Client({ torii, signer });

    const label = this.constructor.name;
    this.log = LoggerProvider.getOrCreate({ level: this.logLevel, label });

    this.log.debug(`${label} created`);

    this.query = new CactusIrohaV2QueryClient(this.irohaClient, this.log);
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
   * Send all the stored instructions as single Iroha transaction.
   *
   * @returns this
   */
  public async send(): Promise<this> {
    if (this.transactions.length === 0) {
      this.log.warn("send() ignored - no instructions to be sent!");
      return this;
    }

    const irohaInstructions = this.transactions.map(
      (entry) => entry.instruction,
    );
    this.log.info(
      `Send transaction with ${irohaInstructions.length} instructions to Iroha ledger`,
    );
    this.log.debug(this.getTransactionSummary());

    await this.irohaClient.submitExecutable(
      Executable("Instructions", VecInstruction(irohaInstructions)),
    );

    this.clear();

    return this;
  }

  /**
   * Free all allocated resources.
   * Should be called before the shutdown.
   */
  public free(): void {
    this.log.debug("Free CactusIrohaV2Client key pair");
    // TODO - Investigate if signer keypair not leaking now
    //this.irohaClient.keyPair?.free();
    this.clear();
  }
}
