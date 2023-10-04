/**
 * Cactus wrapper around IrohaV2 Client query utilities.
 * Intended to be used through `CactusIrohaV2Client` interface but can be instantiated separately if needed.
 */

import {
  Torii,
  Signer,
  ToriiQueryResult,
  makeQueryPayload,
  makeVersionedSignedQuery,
} from "@iroha2/client";
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
  VecValue,
  VersionedSignedQueryRequest,
  QueryPayload,
  AccountId,
} from "@iroha2/data-model";

import { Checks, Logger } from "@hyperledger/cactus-common";

import safeStringify from "fast-safe-stringify";
import { hexToBytes } from "hada";
import {
  createAccountId,
  createAssetDefinitionId,
  createAssetId,
} from "./data-factories";
import { IrohaV2PrerequisitesProvider } from "./prerequisites-provider";

/**
 * Action context for specific query.
 * Contains methods for sending request or generating payloads.
 */
interface QueryContext<
  QueryBoxFactory extends (...args: any[]) => QueryBox,
  QueryResponseType,
> {
  /**
   * Request query response from the ledger.
   * You must provide a signer to the client (to sign the query transaction), or this method will fail.
   */
  request: (
    ...params: Parameters<QueryBoxFactory>
  ) => Promise<QueryResponseType>;

  /**
   * Generate unsigned query request payload using provided parameters.
   * Payload must be signed, and then sent to the ledger with `QueryContext` method `requestSigned`.
   */
  payload: (...params: Parameters<QueryBoxFactory>) => Promise<Uint8Array>;

  /**
   * Send signed request payload to the ledger.
   */
  requestSigned: (
    signedPayload: VersionedSignedQueryRequest | ArrayBufferView,
  ) => Promise<QueryResponseType>;
}

/**
 * Cactus wrapper around IrohaV2 Client query utilities.
 * Intended to be used through `CactusIrohaV2Client` interface but can be instantiated separately if needed.
 *
 * @todo Implement pagination once it's supported by the upstream iroha-javascript SDK.
 */
export class CactusIrohaV2QueryClient {
  constructor(
    private readonly prerequisitesProvider: IrohaV2PrerequisitesProvider,
    public readonly irohaSigner: Signer | AccountId,
    private readonly log: Logger,
  ) {
    Checks.truthy(
      prerequisitesProvider,
      "CactusIrohaV2QueryClient prerequisitesProvider",
    );
    Checks.truthy(irohaSigner, "CactusIrohaV2QueryClient irohaSigner");
    Checks.truthy(log, "CactusIrohaV2QueryClient log");

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

  /**
   * Get signer account either from directly supplied `accountId` or `irohaSigner`.
   */
  public get signerAccountId(): AccountId {
    if ("accountId" in this.irohaSigner) {
      return this.irohaSigner.accountId;
    } else {
      return this.irohaSigner;
    }
  }

  /**
   * Factory method for query context.
   *
   * @param args.getQueryBox Method for creating QueryBox for specific query.
   * @param args.parseQueryResponse Method for parsing `ToriiQueryResult` for specific query.
   *
   * @returns `QueryContext`
   */
  private createQueryContext<
    QueryBoxFactory extends (...args: any[]) => QueryBox,
    QueryResponseType,
  >(args: {
    getQueryBox: QueryBoxFactory;
    parseQueryResponse: (result: ToriiQueryResult) => QueryResponseType;
  }): QueryContext<QueryBoxFactory, QueryResponseType> {
    // Request method
    const request = async (...params: Parameters<QueryBoxFactory>) => {
      if (!("accountId" in this.irohaSigner)) {
        throw new Error(
          "query request() failed - no irohaSigner, provide signing credentials or use different method",
        );
      }

      const queryPayload = makeQueryPayload({
        accountId: this.signerAccountId,
        query: args.getQueryBox(...params),
      });
      const signedQuery = makeVersionedSignedQuery(
        queryPayload,
        this.irohaSigner,
      );

      const result = await Torii.request(
        this.prerequisitesProvider.getApiHttpProperties(),
        signedQuery,
      );

      return args.parseQueryResponse(result);
    };

    // Payload method
    const payload = async (...params: Parameters<QueryBoxFactory>) => {
      const queryBox = args.getQueryBox(...params);
      const queryPayload = makeQueryPayload({
        accountId: this.signerAccountId,
        query: queryBox,
      });
      return QueryPayload.toBuffer(queryPayload);
    };

    // RequestSigned method
    const requestSigned = async (
      signedPayload: VersionedSignedQueryRequest | ArrayBufferView,
    ) => {
      if (ArrayBuffer.isView(signedPayload)) {
        signedPayload = VersionedSignedQueryRequest.fromBuffer(signedPayload);
      }

      const result = await Torii.request(
        this.prerequisitesProvider.getApiHttpProperties(),
        signedPayload,
      );
      return args.parseQueryResponse(result);
    };

    return {
      request,
      payload,
      requestSigned,
    };
  }

  // Domains

  /**
   * Query all the domains details in the ledger.
   * Can return a lot of data.
   *
   * @returns domain list
   */
  public findAllDomains = this.createQueryContext({
    getQueryBox: () => {
      return QueryBox("FindAllDomains", null);
    },
    parseQueryResponse: (result: ToriiQueryResult) => {
      const vectorResult = this.matchVectorResult(result, "findAllDomains");
      const domains = vectorResult.map((i) =>
        i.as("Identifiable").as("Domain"),
      );

      this.log.debug("findAllDomains:", domains);
      return domains;
    },
  });

  /**
   * Query single domain by it's name
   *
   * @param domainName
   * @returns Domain data
   */
  public findDomainById = this.createQueryContext({
    getQueryBox: (domainName: IrohaName) => {
      Checks.truthy(domainName, "findDomainById arg domainName");
      return QueryBox(
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
      );
    },
    parseQueryResponse: (result: ToriiQueryResult) => {
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
    },
  });

  // Assets

  /**
   * Query single asset definition using it's name and domain.
   *
   * @param name
   * @param domainName
   * @returns Asset definition
   */
  public findAssetDefinitionById = this.createQueryContext({
    getQueryBox: (name: IrohaName, domainName: IrohaName) => {
      Checks.truthy(name, "findAssetDefinitionById arg name");
      Checks.truthy(domainName, "findAssetDefinitionById arg domainName");

      return QueryBox(
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
      );
    },
    parseQueryResponse: (result: ToriiQueryResult) => {
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
    },
  });

  /**
   * Query all defined asset definitions.
   * Can return a lot of data.
   *
   * @returns List of asset definitions.
   */
  public findAllAssetsDefinitions = this.createQueryContext({
    getQueryBox: () => {
      return QueryBox("FindAllAssetsDefinitions", null);
    },
    parseQueryResponse: (result: ToriiQueryResult) => {
      const vectorResult = this.matchVectorResult(
        result,
        "findAllAssetsDefinitions",
      );
      const assetDefs = vectorResult.map((d) =>
        d.as("Identifiable").as("AssetDefinition"),
      );

      this.log.debug("findAllAssetsDefinitions:", assetDefs);
      return assetDefs;
    },
  });

  /**
   * Query single asset by it's name, domain and account definition.
   *
   * @param assetName
   * @param assetDomainName
   * @param accountName Owner account name
   * @param accountDomainName Owner account domain name
   * @returns Asset
   */
  public findAssetById = this.createQueryContext({
    getQueryBox: (
      assetName: IrohaName,
      assetDomainName: IrohaName,
      accountName: IrohaName,
      accountDomainName: IrohaName,
    ) => {
      Checks.truthy(assetName, "findAssetById arg assetName");
      Checks.truthy(assetDomainName, "findAssetById arg assetDomainName");
      Checks.truthy(accountName, "findAssetById arg accountName");
      Checks.truthy(accountDomainName, "findAssetById arg accountDomainName");

      return QueryBox(
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
      );
    },
    parseQueryResponse: (result: ToriiQueryResult) => {
      const asset = result.match({
        Ok: (res) => res.result.as("Identifiable").as("Asset"),
        Err: (error) => {
          throw new Error(`findAssetById query error: ${safeStringify(error)}`);
        },
      });

      this.log.debug("findAssetById:", asset);
      return asset;
    },
  });

  /**
   * Query all assets on the ledger.
   * Can return a lot of data.
   *
   * @returns List of assets.
   */
  public findAllAssets = this.createQueryContext({
    getQueryBox: () => {
      return QueryBox("FindAllAssets", null);
    },
    parseQueryResponse: (result: ToriiQueryResult) => {
      const vectorResult = this.matchVectorResult(result, "findAllAssets");
      const assets = vectorResult.map((i) => i.as("Identifiable").as("Asset"));

      this.log.debug("findAllAssets:", assets);
      return assets;
    },
  });

  // Account

  /**
   * Query single account by it's name and domain.
   *
   * @param name
   * @param domainName
   * @returns Account
   */
  public findAccountById = this.createQueryContext({
    getQueryBox: (name: IrohaName, domainName: IrohaName) => {
      Checks.truthy(name, "findAccountById arg name");
      Checks.truthy(domainName, "findAccountById arg domainName");

      return QueryBox(
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
      );
    },
    parseQueryResponse: (result: ToriiQueryResult) => {
      const account = result.match({
        Ok: (res) => res.result.as("Identifiable").as("Account"),
        Err: (error) => {
          throw new Error(
            `findAccountById query error: ${safeStringify(error)}`,
          );
        },
      });

      this.log.debug("findAccountById:", account);
      return account;
    },
  });

  /**
   * Query all accounts on the ledger.
   * Can return a lot of data.
   *
   * @returns List of accounts.
   */
  public findAllAccounts = this.createQueryContext({
    getQueryBox: () => {
      return QueryBox("FindAllAccounts", null);
    },
    parseQueryResponse: (result: ToriiQueryResult) => {
      const vectorResult = this.matchVectorResult(result, "findAllAccounts");
      const accounts = vectorResult.map((i) =>
        i.as("Identifiable").as("Account"),
      );

      this.log.debug("findAllAccounts:", accounts);
      return accounts;
    },
  });

  // Transactions

  /**
   * Query all transactions on the ledger.
   * Can return a lot of data.
   *
   * @returns List of transactions.
   */
  public findAllTransactions = this.createQueryContext({
    getQueryBox: () => {
      return QueryBox("FindAllTransactions", null);
    },
    parseQueryResponse: (result: ToriiQueryResult) => {
      const vectorResult = this.matchVectorResult(
        result,
        "findAllTransactions",
      );
      const transactions = vectorResult.map(
        (i) => i.as("TransactionQueryResult").tx_value,
      );

      this.log.debug("findAllTransactions:", transactions);
      return transactions;
    },
  });

  /**
   * Query single transaction using it's hash.
   *
   * @param hash Either HEX encoded string or raw `Uint8Array` bytes.
   * @returns Transaction
   */
  public findTransactionByHash = this.createQueryContext({
    getQueryBox: (hash: string | Uint8Array) => {
      Checks.truthy(hash, "findTransactionByHash arg hash");

      this.log.debug("findTransactionByHash - search for", hash);
      let hashBytes: Uint8Array;
      if (typeof hash === "string") {
        hashBytes = Uint8Array.from(hexToBytes(hash));
      } else {
        hashBytes = hash;
      }

      return QueryBox(
        "FindTransactionByHash",
        FindTransactionByHash({
          hash: EvaluatesToHash({
            expression: Expression("Raw", Value("Hash", hashBytes)),
          }),
        }),
      );
    },
    parseQueryResponse: (result: ToriiQueryResult) => {
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
    },
  });

  // Misc

  /**
   * Query all peers on the ledger.
   * Can return a lot of data.
   *
   * @returns List of peers.
   */
  public findAllPeers = this.createQueryContext({
    getQueryBox: () => {
      return QueryBox("FindAllPeers", null);
    },
    parseQueryResponse: (result: ToriiQueryResult) => {
      const vectorResult = this.matchVectorResult(result, "findAllPeers");
      const peers = vectorResult.map((i) => i.as("Identifiable").as("Peer"));

      this.log.debug("findAllPeers:", peers);
      return peers;
    },
  });

  /**
   * Query all blocks on the ledger.
   * Can return a lot of data.
   *
   * @returns List of blocks.
   */
  public findAllBlocks = this.createQueryContext({
    getQueryBox: () => {
      return QueryBox("FindAllBlocks", null);
    },
    parseQueryResponse: (result: ToriiQueryResult) => {
      const vectorResult = this.matchVectorResult(result, "findAllBlocks");
      const blocks = vectorResult.map((i) => i.as("Block"));

      this.log.debug(`findAllBlocks: Total ${blocks.length}`);
      return blocks;
    },
  });
}
