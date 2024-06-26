import {
  FabricContractInvocationType,
  IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { PluginBungeeHermes } from "@hyperledger/cactus-plugin-bungee-hermes";
import { StrategyFabric } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/strategy/strategy-fabric";
import {
  FabricConfig,
  TransactionResponse,
} from "../../../types/blockchain-interaction";
import { PrivacyPolicyOpts } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/generated/openapi/typescript-axios";
import { FabricAsset } from "./types/fabric-asset";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { NetworkBridge } from "./network-bridge-interface";

export class FabricBridge implements NetworkBridge {
  public static readonly CLASS_NAME = "FabricBridge";

  public network: string = "FABRIC";

  public log: Logger;

  connector: PluginLedgerConnectorFabric;
  bungee: PluginBungeeHermes;
  options: IPluginLedgerConnectorFabricOptions;
  config: FabricConfig;

  constructor(fabricConfig: FabricConfig) {
    this.config = fabricConfig;
    this.options = fabricConfig.options;
    this.connector = new PluginLedgerConnectorFabric(fabricConfig.options);
    this.bungee = new PluginBungeeHermes(fabricConfig.bungeeOptions);
    this.bungee.addStrategy(this.network, new StrategyFabric("INFO"));
    this.log = LoggerProvider.getOrCreate({
      label: StrategyFabric.CLASS_NAME,
      level: fabricConfig.logLevel || "INFO",
    });
  }
  public async wrapAsset(asset: FabricAsset): Promise<TransactionResponse> {
    this.log.debug(`Wrapping Asset: ${asset.tokenId}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "wrap",
      params: [
        asset.tokenType,
        asset.tokenId,
        asset.owner,
        asset.mspId,
        asset.channelName,
        asset.contractName,
      ],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }
  public async unwrapAsset(assetId: string): Promise<TransactionResponse> {
    this.log.debug(`Unwrapping Asset: ${assetId}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "unwrap",
      params: [assetId],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }
  public async lockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    this.log.debug(`Locking Asset: ${assetId} amount: ${amount}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "lock",
      params: [assetId, amount.toString()],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }
  public async unlockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    this.log.debug(`Unlocking Asset: ${assetId} amount: ${amount}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "unlock",
      params: [assetId, amount.toString()],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }
  public async mintAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    this.log.debug(`Minting Asset: ${assetId} amount: ${amount}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "mint",
      params: [assetId, amount.toString()],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }
  public async burnAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    this.log.debug(`Burning Asset: ${assetId} amount: ${amount}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "burn",
      params: [assetId, amount.toString()],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }
  public async assignAsset(
    assetId: string,
    to: string,
    amount: number,
  ): Promise<TransactionResponse> {
    this.log.debug(`Assigning Asset: ${assetId} to: ${to} amount: ${amount}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "assign",
      params: [assetId, to, amount.toString()],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }

  public async getAsset(assetId: string): Promise<FabricAsset> {
    this.log.debug(`Getting Asset: ${assetId}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "GetAsset",
      params: [assetId],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Call,
    });

    const token = JSON.parse(response.functionOutput) as FabricAsset;

    return token;
  }

  public async getClientId(): Promise<string> {
    this.log.debug(`Getting Client Id`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "ClientAccountID",
      params: [],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Call,
    });

    return response.functionOutput;
  }

  public networkName(): string {
    return this.network;
  }

  public async runTransaction(
    methodName: string,
    params: string[],
  ): Promise<TransactionResponse> {
    this.log.debug(`Running Transaction: ${methodName} with params: ${params}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: methodName,
      params: params,
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    return {
      transactionId: response.transactionId,
      transactionReceipt: "response.transactionReceipt",
      output: response.functionOutput,
    };
  }

  public async getReceipt(
    assetId: string,
    transactionId: string,
  ): Promise<string> {
    this.log.debug(
      `Getting Receipt for Asset: ${assetId} Transaction: ${transactionId}`,
    );
    const networkDetails = {
      //connector: this.connector,
      connectorApiPath: "", //todo check this to not use api
      signingCredential: this.config.signingCredential,
      contractName: this.config.contractName,
      channelName: this.config.channelName,
      participant: "Org1MSP",
    };

    const snapshot = await this.bungee.generateSnapshot(
      [],
      this.network,
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

    const view = await this.bungee.processView(
      generated.view,
      //PrivacyPolicyOpts.SingleTransaction,
      PrivacyPolicyOpts.PruneState,
      [assetId, transactionId],
    );

    return view.getViewStr();
  }
}
