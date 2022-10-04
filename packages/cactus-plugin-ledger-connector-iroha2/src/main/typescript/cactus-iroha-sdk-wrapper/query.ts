/**
 * Cactus wrapper around IrohaV2 Client query utilities.
 * Intended to be used through `CactusIrohaV2Client` interface but can be instantiated separately if needed.
 */

import { Client, Torii, Signer, ToriiQueryResult } from "@iroha2/client";
import {
  DomainId,
  Expression,
  QueryBox,
  Value,
  FindDomainById,
  EvaluatesToDomainId,
  IdBox,
  Name as IrohaName,
  FindAssetById,
  EvaluatesToAssetId,
  FindAssetDefinitionById,
  EvaluatesToAssetDefinitionId,
  FindAccountById,
  EvaluatesToAccountId,
  FindTransactionByHash,
  EvaluatesToHash,
  Domain,
  VecValue,
  AssetDefinition,
  Asset,
  Account,
  TransactionValue,
  Peer,
} from "@iroha2/data-model";

import { Checks, Logger } from "@hyperledger/cactus-common";

import safeStringify from "fast-safe-stringify";
import { hexToBytes } from "hada";
import {
  createAccountId,
  createAssetDefinitionId,
  createAssetId,
} from "./data-factories";

/**
 * Cactus wrapper around IrohaV2 Client query utilities.
 * Intended to be used through `CactusIrohaV2Client` interface but can be instantiated separately if needed.
 *
 * @todo Implement pagination once it's supported by the upstream iroha-javascript SDK.
 */
export class CactusIrohaV2QueryClient {
  /**
   * Iroha lightweight client used to send queries to the ledger.
   */
  private irohaClient: Client;

  constructor(
    irohaToriiClient: Torii,
    irohaSigner: Signer,
    private readonly log: Logger,
  ) {
    Checks.truthy(
      irohaToriiClient,
      "CactusIrohaV2QueryClient irohaToriiClient",
    );
    Checks.truthy(irohaSigner, "CactusIrohaV2QueryClient irohaSigner");

    this.irohaClient = new Client({
      torii: irohaToriiClient,
      signer: irohaSigner,
    });

    this.log.debug("CactusIrohaV2QueryClient created.");
  }

  /**
   * Helper function to match vector response from Iroha and handle possible errors.
   *
   * @param result Query result object
   * @param queryName Query name for diagnostics.
   * @returns Vector result
   */
  private matchVectorResult(
    result: ToriiQueryResult,
    queryName: string,
  ): VecValue {
    return result.match({
      Ok: (res) => res.result.as("Vec"),
      Err: (error) => {
        throw new Error(`${queryName} query error: ${safeStringify(error)}`);
      },
    });
  }

  // Domains

  /**
   * Query all the domains details in the ledger.
   * Can return a lot of data.
   *
   * @returns domain list
   */
  public async findAllDomains(): Promise<Domain[]> {
    const result = await this.irohaClient.requestWithQueryBox(
      QueryBox("FindAllDomains", null),
    );

    const vectorResult = this.matchVectorResult(result, "findAllDomains");
    const domains = vectorResult.map((i) => i.as("Identifiable").as("Domain"));

    this.log.debug("findAllDomains:", domains);
    return domains;
  }

  /**
   * Query single domain by it's name
   *
   * @param domainName
   * @returns Domain data
   */
  public async findDomainById(domainName: IrohaName): Promise<Domain> {
    Checks.truthy(domainName, "findDomainById arg domainName");

    const result = await this.irohaClient.requestWithQueryBox(
      QueryBox(
        "FindDomainById",
        FindDomainById({
          id: EvaluatesToDomainId({
            expression: Expression(
              "Raw",
              Value(
                "Id",
                IdBox(
                  "DomainId",
                  DomainId({
                    name: domainName,
                  }),
                ),
              ),
            ),
          }),
        }),
      ),
    );

    const domain = result.match({
      Ok: (res) => res.result.as("Identifiable").as("Domain"),
      Err: (error) => {
        throw new Error(
          `findDomainById query error: ${safeStringify(error.toJSON())}`,
        );
      },
    });

    this.log.debug("findDomainById:", domain);
    return domain;
  }

  // Assets

  /**
   * Query single asset definition using it's name and domain.
   *
   * @param name
   * @param domainName
   * @returns Asset definition
   */
  public async findAssetDefinitionById(
    name: IrohaName,
    domainName: IrohaName,
  ): Promise<AssetDefinition> {
    Checks.truthy(name, "findAssetDefinitionById arg name");
    Checks.truthy(domainName, "findAssetDefinitionById arg domainName");

    const result = await this.irohaClient.requestWithQueryBox(
      QueryBox(
        "FindAssetDefinitionById",
        FindAssetDefinitionById({
          id: EvaluatesToAssetDefinitionId({
            expression: Expression(
              "Raw",
              Value(
                "Id",
                IdBox(
                  "AssetDefinitionId",
                  createAssetDefinitionId(name, domainName),
                ),
              ),
            ),
          }),
        }),
      ),
    );

    const assetDef = result.match({
      Ok: (res) => res.result.as("Identifiable").as("AssetDefinition"),
      Err: (error) => {
        throw new Error(
          `findAssetDefinitionById query error: ${safeStringify(error)}`,
        );
      },
    });

    this.log.debug("findAssetDefinitionById:", assetDef);
    return assetDef;
  }

  /**
   * Query all defined asset definitions.
   * Can return a lot of data.
   *
   * @returns List of asset definitions.
   */
  public async findAllAssetsDefinitions(): Promise<AssetDefinition[]> {
    const result = await this.irohaClient.requestWithQueryBox(
      QueryBox("FindAllAssetsDefinitions", null),
    );

    const vectorResult = this.matchVectorResult(
      result,
      "findAllAssetsDefinitions",
    );
    const assetDefs = vectorResult.map((d) =>
      d.as("Identifiable").as("AssetDefinition"),
    );

    this.log.debug("findAllAssetsDefinitions:", assetDefs);
    return assetDefs;
  }

  /**
   * Query single asset by it's name, domain and account definition.
   *
   * @param assetName
   * @param assetDomainName
   * @param accountName Owner account name
   * @param accountDomainName Owner account domain name
   * @returns Asset
   */
  public async findAssetById(
    assetName: IrohaName,
    assetDomainName: IrohaName,
    accountName: IrohaName,
    accountDomainName: IrohaName,
  ): Promise<Asset> {
    Checks.truthy(assetName, "findAssetById arg assetName");
    Checks.truthy(assetDomainName, "findAssetById arg assetDomainName");
    Checks.truthy(accountName, "findAssetById arg accountName");
    Checks.truthy(accountDomainName, "findAssetById arg accountDomainName");

    const result = await this.irohaClient.requestWithQueryBox(
      QueryBox(
        "FindAssetById",
        FindAssetById({
          id: EvaluatesToAssetId({
            expression: Expression(
              "Raw",
              Value(
                "Id",
                IdBox(
                  "AssetId",
                  createAssetId(
                    assetName,
                    assetDomainName,
                    accountName,
                    accountDomainName,
                  ),
                ),
              ),
            ),
          }),
        }),
      ),
    );

    const asset = result.match({
      Ok: (res) => res.result.as("Identifiable").as("Asset"),
      Err: (error) => {
        throw new Error(`findAssetById query error: ${safeStringify(error)}`);
      },
    });

    this.log.debug("findAssetById:", asset);
    return asset;
  }

  /**
   * Query all assets on the ledger.
   * Can return a lot of data.
   *
   * @returns List of assets.
   */
  public async findAllAssets(): Promise<Asset[]> {
    const result = await this.irohaClient.requestWithQueryBox(
      QueryBox("FindAllAssets", null),
    );

    const vectorResult = this.matchVectorResult(result, "findAllAssets");
    const assets = vectorResult.map((i) => i.as("Identifiable").as("Asset"));

    this.log.debug("findAllAssets:", assets);
    return assets;
  }

  // Account

  /**
   * Query single account by it's name and domain.
   *
   * @param name
   * @param domainName
   * @returns Account
   */
  public async findAccountById(
    name: IrohaName,
    domainName: IrohaName,
  ): Promise<Account> {
    Checks.truthy(name, "findAccountById arg name");
    Checks.truthy(domainName, "findAccountById arg domainName");

    const result = await this.irohaClient.requestWithQueryBox(
      QueryBox(
        "FindAccountById",
        FindAccountById({
          id: EvaluatesToAccountId({
            expression: Expression(
              "Raw",
              Value(
                "Id",
                IdBox("AccountId", createAccountId(name, domainName)),
              ),
            ),
          }),
        }),
      ),
    );

    const account = result.match({
      Ok: (res) => res.result.as("Identifiable").as("Account"),
      Err: (error) => {
        throw new Error(`findAccountById query error: ${safeStringify(error)}`);
      },
    });

    this.log.debug("findAccountById:", account);
    return account;
  }

  /**
   * Query all accounts on the ledger.
   * Can return a lot of data.
   *
   * @returns List of accounts.
   */
  public async findAllAccounts(): Promise<Account[]> {
    const result = await this.irohaClient.requestWithQueryBox(
      QueryBox("FindAllAccounts", null),
    );

    const vectorResult = this.matchVectorResult(result, "findAllAccounts");
    const accounts = vectorResult.map((i) =>
      i.as("Identifiable").as("Account"),
    );

    this.log.debug("findAllAccounts:", accounts);
    return accounts;
  }

  // Transactions

  /**
   * Query all transactions on the ledger.
   * Can return a lot of data.
   *
   * @returns List of transactions.
   */
  public async findAllTransactions(): Promise<TransactionValue[]> {
    const result = await this.irohaClient.requestWithQueryBox(
      QueryBox("FindAllTransactions", null),
    );

    const vectorResult = this.matchVectorResult(result, "findAllTransactions");
    const transactions = vectorResult.map((i) => i.as("TransactionValue"));

    this.log.debug("findAllTransactions:", transactions);
    return transactions;
  }

  /**
   * Query single transaction using it's hash.
   *
   * @param hash Either HEX encoded string or raw `Uint8Array` bytes.
   * @returns Transaction
   */
  public async findTransactionByHash(
    hash: string | Uint8Array,
  ): Promise<TransactionValue> {
    Checks.truthy(hash, "findTransactionByHash arg hash");

    this.log.debug("findTransactionByHash - search for", hash);
    let hashBytes: Uint8Array;
    if (typeof hash === "string") {
      hashBytes = Uint8Array.from(hexToBytes(hash));
    } else {
      hashBytes = hash;
    }

    const result = await this.irohaClient.requestWithQueryBox(
      QueryBox(
        "FindTransactionByHash",
        FindTransactionByHash({
          hash: EvaluatesToHash({
            expression: Expression("Raw", Value("Hash", hashBytes)),
          }),
        }),
      ),
    );

    const transaction = result.match({
      Ok: (res) => res.result.as("TransactionValue"),
      Err: (error) => {
        throw new Error(
          `findTransactionByHash query error: ${safeStringify(error)}`,
        );
      },
    });

    this.log.debug("findTransactionByHash:", transaction);
    return transaction;
  }

  // Misc

  /**
   * Query all peers on the ledger.
   * Can return a lot of data.
   *
   * @returns List of peers.
   */
  public async findAllPeers(): Promise<Peer[]> {
    const result = await this.irohaClient.requestWithQueryBox(
      QueryBox("FindAllPeers", null),
    );

    const vectorResult = this.matchVectorResult(result, "findAllPeers");
    const peers = vectorResult.map((i) => i.as("Identifiable").as("Peer"));

    this.log.debug("findAllPeers:", peers);
    return peers;
  }

  /**
   * Query all blocks on the ledger.
   * Can return a lot of data.
   *
   * @returns List of blocks.
   */
  public async findAllBlocks(): Promise<unknown> {
    const result = await this.irohaClient.requestWithQueryBox(
      QueryBox("FindAllBlocks", null),
    );

    const vectorResult = this.matchVectorResult(result, "findAllBlocks");
    const blocks = vectorResult.map((i) => i.as("Block"));

    this.log.debug(`findAllBlocks: Total ${blocks.length}`);
    return blocks;
  }
}
