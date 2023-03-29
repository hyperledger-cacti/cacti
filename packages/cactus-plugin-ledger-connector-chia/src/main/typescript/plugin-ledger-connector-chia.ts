import { Server } from "http";
import { Server as SecureServer } from "https";

import type { Server as SocketIoServer } from "socket.io";
import type { Socket as SocketIoSocket } from "socket.io";
import type { Express } from "express";

import OAS from "../json/openapi.json";

import Web3 from "web3";
import { Wallet } from "chia-js";
import { WalletBalance } from "./moreModel";
import { WalletBalanceResponse } from "./model-type-guards";

import type { WebsocketProvider } from "web3-core";
//import EEAClient, { ICallOptions, IWeb3InstanceExtended } from "web3-eea";
import Web3JsQuorum, { IWeb3Quorum } from "web3js-quorum";

import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  PluginRegistry,
  consensusHasTransactionFinality,
} from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { DeployContractSolidityBytecodeEndpoint } from "./web-services/deploy-contract-solidity-bytecode-endpoint";

import {
  WatchBlocksV1,
  DeployContractSolidityBytecodeV1Request,
  DeployContractSolidityBytecodeV1Response,
  RunTransactionRequest,
  RunTransactionResponse,
} from "./generated/openapi/typescript-axios";

import { InvokeContractEndpoint } from "./web-services/invoke-contract-endpoint";
import { ChiaSignTransactionEndpointV1 } from "./web-services/sign-transaction-endpoint-v1";
import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import {
  GetPrometheusExporterMetricsEndpointV1,
  IGetPrometheusExporterMetricsEndpointV1Options,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";
import { WatchBlocksV1Endpoint } from "./web-services/watch-blocks-v1-endpoint";
import { GetBalanceEndpoint } from "./web-services/get-balance-endpoint";
import { GetTransactionEndpoint } from "./web-services/get-transaction-endpoint";
import { GetPastLogsEndpoint } from "./web-services/get-past-logs-endpoint";
import { RunTransactionEndpoint } from "./web-services/run-transaction-endpoint";
import { GetBlockEndpoint } from "./web-services/get-block-v1-endpoint-";

export const E_KEYCHAIN_NOT_FOUND = "cactus.connector.Chia.keychain_not_found";

export interface IPluginLedgerConnectorChiaOptions
  extends ICactusPluginOptions {
  rpcApiHttpHost: string;
  rpcApiWsHost: string;
  pluginRegistry: PluginRegistry;
  prometheusExporter?: PrometheusExporter;
  logLevel?: LogLevelDesc;
}

export class PluginLedgerConnectorChia
  implements
    IPluginLedgerConnector<
      DeployContractSolidityBytecodeV1Request,
      DeployContractSolidityBytecodeV1Response,
      RunTransactionRequest,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService {
  private readonly instanceId: string;
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;
  private readonly web3Provider: WebsocketProvider;
  private readonly web3: Web3;
  private readonly wallet: Wallet;
  private web3Quorum: IWeb3Quorum | undefined;
  private readonly pluginRegistry: PluginRegistry;
  private contracts: {
    [name: string]: Contract;
  } = {};

  private endpoints: IWebServiceEndpoint[] | undefined;
  private httpServer: Server | SecureServer | null = null;

  public static readonly CLASS_NAME = "PluginLedgerConnectorChia";

  public get className(): string {
    return PluginLedgerConnectorChia.CLASS_NAME;
  }

  constructor(public readonly options: IPluginLedgerConnectorChiaOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.rpcApiHttpHost, `${fnTag} options.rpcApiHttpHost`);
    Checks.truthy(options.rpcApiWsHost, `${fnTag} options.rpcApiWsHost`);
    Checks.truthy(options.pluginRegistry, `${fnTag} options.pluginRegistry`);
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.web3Provider = new Web3.providers.WebsocketProvider(
      this.options.rpcApiWsHost,
    );
    this.web3 = new Web3(this.web3Provider);
    this.instanceId = options.instanceId;
    this.pluginRegistry = options.pluginRegistry;
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

    this.prometheusExporter.startMetricsCollection();
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async onPluginInit(): Promise<void> {
    this.web3Quorum = Web3JsQuorum(this.web3);
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }

  async registerWebServices(
    app: Express,
    wsApi: SocketIoServer,
  ): Promise<IWebServiceEndpoint[]> {
    const { web3 } = this;
    const { logLevel } = this.options;
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));

    wsApi.on("connection", (socket: SocketIoSocket) => {
      this.log.debug(`New Socket connected. ID=${socket.id}`);

      socket.on(WatchBlocksV1.Subscribe, () => {
        new WatchBlocksV1Endpoint({ web3, socket, logLevel }).subscribe();
      });
    });
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new DeployContractSolidityBytecodeEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetBalanceEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetTransactionEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetPastLogsEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new RunTransactionEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new GetBlockEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new InvokeContractEndpoint({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const endpoint = new ChiaSignTransactionEndpointV1({
        connector: this,
        logLevel: this.options.logLevel,
      });
      endpoints.push(endpoint);
    }
    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(endpoint);
    }
    this.endpoints = endpoints;
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-Chia`;
  }

  public async getConsensusAlgorithmFamily(): Promise<
    ConsensusAlgorithmFamily
  > {
    return ConsensusAlgorithmFamily.Authority;
  }
  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily = await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  /**
   * Verifies that it is safe to call a specific method of a Web3 Contract.
   *
   * @param contract The Web3 Contract instance to check whether it has a method with a specific name or not.
   * @param name The name of the method that will be checked if it's usable on `contract` or not.
   * @returns Boolean `true` when it IS safe to call the method named `name` on the contract.
   * @throws If the contract instance is falsy or it's methods object is falsy. Also throws if the method name is a blank string.
   */
  public async isSafeToCallContractMethod(
    contract: Contract,
    name: string,
  ): Promise<boolean> {
    Checks.truthy(
      contract,
      `${this.className}#isSafeToCallContractMethod():contract`,
    );

    Checks.truthy(
      contract.methods,
      `${this.className}#isSafeToCallContractMethod():contract.methods`,
    );

    Checks.nonBlankString(
      name,
      `${this.className}#isSafeToCallContractMethod():name`,
    );

    const { methods } = contract;

    return Object.prototype.hasOwnProperty.call(methods, name);
  }

  public async getWalletBalance(walletId: number): Promise<WalletBalance> {
    const { wallet_balance } = await this.request<WalletBalanceResponse>(
      "get_wallet_balance",
      { wallet_id: walletId },
    );

    return wallet_balance;
  }

  public async getPublicKeys(): Promise<string[]> {
    const { public_key_fingerprints } = await this.request<PublicKeysResponse>(
      "get_public_keys",
      {},
    );

    return public_key_fingerprints;
  }

  public async getPrivateKey(fingerprint: number): Promise<string[]> {
    const { private_key } = await this.request<PrivateKeyResponse>(
      "get_private_key",
      { fingerprint },
    );

    return private_key;
  }

  public async generateMnemonic(): Promise<string[]> {
    const { mnemonic } = await this.request<GenerateMnemonicResponse>(
      "generate_mnemonic",
      {},
    );

    return mnemonic;
  }

  public async addKey(
    mnemonic: string[],
    type = "new_wallet",
  ): Promise<AddKeyResponse> {
    return this.request<AddKeyResponse>("add_key", {
      mnemonic,
      type,
    });
  }

  public async deleteKey(
    fingerprint: number,
  ): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("delete_key", { fingerprint });
  }

  public async deleteAllKeys(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("delete_all_keys", {});
  }

  public async getSyncStatus(): Promise<SyncStatusResponse> {
    const status = await this.request<SyncStatusResponse>(
      "get_sync_status",
      {},
    );
    return status;
  }

  public async getHeightInfo(): Promise<number> {
    const { height } = await this.request<HeightResponse>(
      "get_height_info",
      {},
    );

    return height;
  }

  public async farmBlock(address: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("farm_block", { address });
  }

  public async getWallets(): Promise<WalletInfo[]> {
    const { wallets } = await this.request<WalletsResponse>("get_wallets", {});

    return wallets;
  }

  public async getTransaction(
    walletId: number,
    transactionId: string,
  ): Promise<Transaction> {
    const { transaction } = await this.request<TransactionResponse>(
      "get_transaction",
      {
        wallet_id: walletId,
        transaction_id: transactionId,
      },
    );

    return transaction;
  }

  public async getTransactions(
    walletId: number,
    limit: number,
  ): Promise<Transaction[]> {
    const { transactions } = await this.request<TransactionsResponse>(
      "get_transactions",
      { wallet_id: walletId, end: limit },
    );

    return transactions;
  }

  public async getNextAddress(walletId: number): Promise<string> {
    const { address } = await this.request<NextAddressResponse>(
      "get_next_address",
      {
        wallet_id: walletId,
        new_address: true,
      },
    );
    return address;
  }

  public async getCurrentAddress(walletId: number): Promise<string> {
    const { address } = await this.request<NextAddressResponse>(
      "get_next_address",
      {
        wallet_id: walletId,
        new_address: false,
      },
    );
    return address;
  }

  public async sendTransaction(
    walletId: number,
    amount: number,
    address: string,
    fee: number,
  ): Promise<TransactionResponse> {
    const transaction = await this.request<TransactionResponse>(
      "send_transaction",
      {
        wallet_id: walletId,
        amount,
        address,
        fee,
      },
    );

    return transaction;
  }

  public async createNewCCWallet(
    host: string,
    amount: number,
  ): Promise<CreateNewCCWalletResponse> {
    return await this.request<CreateNewCCWalletResponse>("create_new_wallet", {
      host,
      wallet_type: "cc_wallet",
      mode: "new",
      amount,
    });
  }

  public async createExistingCCWallet(
    host: string,
    colour: string,
  ): Promise<CreateExistingCCWalletResponse> {
    return await this.request<CreateExistingCCWalletResponse>(
      "create_new_wallet",
      {
        host,
        wallet_type: "cc_wallet",
        mode: "existing",
        colour,
      },
    );
  }

  public async createNewAdminRLWallet(
    host: string,
    interval: number,
    limit: number,
    pubkey: string,
    amount: number,
    fee?: number,
  ): Promise<CreateNewAdminRlWalletResponse> {
    return await this.request<CreateNewAdminRlWalletResponse>(
      "create_new_wallet",
      {
        host,
        wallet_type: "rl_wallet",
        rl_type: "admin",
        interval,
        limit,
        pubkey,
        amount,
        fee: fee || 0,
      },
    );
  }

  public async createNewUserRLWallet(
    host: string,
  ): Promise<CreateNewUserRlWalletResponse> {
    return await this.request<CreateNewUserRlWalletResponse>(
      "create_new_wallet",
      {
        host,
        wallet_type: "rl_wallet",
        rl_type: "user",
      },
    );
  }

  public async createSignedTransaction(
    additions: Array<Addition>,
    coins?: string,
    fee?: number,
  ): Promise<CreateSignedTransactionResponse> {
    const additionArray = [];
    for (let i = 0; i < additions.length; i++) {
      additionArray.push(JSON.parse(JSON.stringify(additions[i])));
    }
    return this.request<CreateSignedTransactionResponse>(
      "create_signed_transaction",
      {
        additions: additionArray,
        coins,
        fee,
      },
    );
  }

  public async createBackup(
    filePath: string,
  ): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("create_backup", {
      file_path: filePath,
    });
  }

  public async getTransactionCount(
    walletId: number,
  ): Promise<TransactionCountResponse> {
    return this.request<TransactionCountResponse>("get_transaction_count", {
      wallet_id: walletId,
    });
  }

  public async ccSetName(walletId: number, name: string): Promise<number> {
    return this.request<number>("cc_set_name", {
      wallet_id: walletId,
      name,
    });
  }

  public async ccGetName(walletId: number): Promise<CCGetNameResponse> {
    return this.request<CCGetNameResponse>("cc_get_name", {
      wallet_id: walletId,
    });
  }

  public async ccSpend(
    walletId: number,
    inner_address: string,
    amount: number,
    fee?: number,
  ): Promise<CCSpendResponse> {
    return this.request<CCSpendResponse>("cc_spend", {
      wallet_id: walletId,
      inner_address,
      amount,
      fee: fee !== undefined ? fee : 0,
    });
  }

  public async ccGetColour(walletId: number): Promise<CCGetColourResponse> {
    return this.request<CCGetColourResponse>("cc_get_colour", {
      wallet_id: walletId,
    });
  }

  public async ccCreateOfferForIds(
    ids: Array<CCTradeIds>,
    filename: string,
  ): Promise<boolean> {
    const idsObj: any = {};
    for (let i = 0; i < ids.length; i++) {
      idsObj[ids[i].wallet_id] = ids[i].amount;
    }
    return this.request<boolean>("create_offer_for_ids", {
      ids: JSON.parse(JSON.stringify(idsObj)),
      filename,
    });
  }

  public async ccGetDiscrepanciesForOffer(
    filename: string,
  ): Promise<CCDiscrepancyResponse> {
    return this.request<CCDiscrepancyResponse>("get_discrepancies_for_offer", {
      filename,
    });
  }

  public async ccRespondToOffer(filename: string): Promise<boolean> {
    return this.request<boolean>("respond_to_offer", {
      filename,
    });
  }

  public async ccGetTrade(tradeId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("get_trade", {
      trade_id: tradeId,
    });
  }

  public async ccGetAllTrades(): Promise<Array<Record<string, unknown>>> {
    return this.request<Array<Record<string, unknown>>>("get_all_trades", {});
  }

  public async ccCancelTrade(
    tradeId: string,
    secure?: boolean,
  ): Promise<boolean> {
    return this.request<boolean>("cancel_trade", {
      trade_id: tradeId,
      secure,
    });
  }

  // For rate limited wallet
  public async rlSetUserInfo(
    walletId: string,
    origin: RLOrigin,
    interval: number,
    limit: number,
    admin_pubkey: string,
  ): Promise<void> {
    return this.request<void>("rl_set_user_info", {
      wallet_id: walletId,
      origin: JSON.stringify(origin),
      interval,
      limit,
      admin_pubkey,
    });
  }

  public async rlSendClawbackTransaction(
    walletId: string,
    fee?: number,
  ): Promise<CCSpendResponse> {
    return this.request<CCSpendResponse>("send_clawback_transaction", {
      wallet_id: walletId,
      fee,
    });
  }

  public async rlAddRateLimitedFund(
    walletId: string,
    puzzleHash: string,
    amount: number,
    fee?: number,
  ): Promise<string> {
    return this.request<string>("add_rate_limited_fund", {
      wallet_id: walletId,
      puzzle_hash: puzzleHash,
      amount,
      fee,
    });
  }
}
