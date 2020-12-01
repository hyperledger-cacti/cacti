import { Optional } from "typescript-optional";
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ICactusPlugin,
  IPluginWebService,
  IWebServiceEndpoint,
  PluginAspect,
} from "@hyperledger/cactus-core-api";
import { InsertBambooHarvestEndpoint } from "./web-services/insert-bamboo-harvest-endpoint";
import {
  DefaultApi as QuorumApi,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";
import { DefaultApi as BesuApi } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { ListBambooHarvestEndpoint } from "./web-services/list-bamboo-harvest-endpoint";
import { ISupplyChainContractDeploymentInfo } from "../i-supply-chain-contract-deployment-info";
import { InsertBookshelfEndpoint } from "./web-services/insert-bookshelf-endpoint";
import { ListBookshelfEndpoint } from "./web-services/list-bookshelf-endpoint";

export interface ISupplyChainCactusPluginOptions {
  logLevel?: LogLevelDesc;
  instanceId: string;
  quorumApiClient: QuorumApi;
  besuApiClient: BesuApi;
  web3SigningCredential: Web3SigningCredential;
  contracts: ISupplyChainContractDeploymentInfo;
}

export class SupplyChainCactusPlugin
  implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "SupplyChainCactusPlugin";

  private readonly log: Logger;
  private readonly instanceId: string;

  public get className() {
    return SupplyChainCactusPlugin.CLASS_NAME;
  }

  constructor(public readonly options: ISupplyChainCactusPluginOptions) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} arg options.instanceId`);
    Checks.nonBlankString(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(options.contracts, `${fnTag} arg options.contracts`);
    Checks.truthy(
      options.web3SigningCredential,
      `${fnTag} arg options.web3SigningCredential`
    );
    Checks.truthy(
      options.quorumApiClient,
      `${fnTag} arg options.quorumApiClient`
    );

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
  }

  public async installWebServices(
    expressApp: any
  ): Promise<IWebServiceEndpoint[]> {
    const insertBambooHarvest = new InsertBambooHarvestEndpoint({
      contractAddress: this.options.contracts.bambooHarvestRepository.address,
      contractAbi: this.options.contracts.bambooHarvestRepository.abi,
      apiClient: this.options.quorumApiClient,
      web3SigningCredential: this.options.web3SigningCredential,
      logLevel: this.options.logLevel,
    });
    insertBambooHarvest.registerExpress(expressApp);

    const listBambooHarvest = new ListBambooHarvestEndpoint({
      contractAddress: this.options.contracts.bambooHarvestRepository.address,
      contractAbi: this.options.contracts.bambooHarvestRepository.abi,
      apiClient: this.options.quorumApiClient,
      logLevel: this.options.logLevel,
    });
    listBambooHarvest.registerExpress(expressApp);

    const insertBookshelf = new InsertBookshelfEndpoint({
      contractAddress: this.options.contracts.bookshelfRepository.address,
      contractAbi: this.options.contracts.bookshelfRepository.abi,
      besuApi: this.options.besuApiClient,
      web3SigningCredential: this.options.web3SigningCredential,
      logLevel: this.options.logLevel,
    });
    insertBookshelf.registerExpress(expressApp);

    const listBookshelf = new ListBookshelfEndpoint({
      contractAddress: this.options.contracts.bookshelfRepository.address,
      contractAbi: this.options.contracts.bookshelfRepository.abi,
      besuApi: this.options.besuApiClient,
      logLevel: this.options.logLevel,
    });
    listBookshelf.registerExpress(expressApp);

    return [
      insertBambooHarvest,
      listBambooHarvest,
      insertBookshelf,
      listBookshelf,
    ];
  }

  public getHttpServer(): Optional<any> {
    return Optional.empty();
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return "@hyperledger/cactus-example-supply-chain-backend";
  }

  public getAspect(): PluginAspect {
    return PluginAspect.WEB_SERVICE;
  }
}
