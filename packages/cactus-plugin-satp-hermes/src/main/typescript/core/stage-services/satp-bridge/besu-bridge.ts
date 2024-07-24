import {
  BesuConfig,
  TransactionResponse,
} from "../../../types/blockchain-interaction";
import {
  EthContractInvocationType,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  RunTransactionResponse,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { NetworkBridge } from "./network-bridge";
import { PluginBungeeHermes } from "@hyperledger/cactus-plugin-bungee-hermes";
import { StrategyBesu } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/strategy/strategy-besu";
import { PrivacyPolicyOpts } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/generated/openapi/typescript-axios";
import { BesuAsset, getVarTypes } from "./types/besu-asset";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { InteractionsRequest } from "../../../generated/SATPWrapperContract";
import { getInteractionType } from "./types/asset";
import { InteractionData } from "./types/interact";

interface BesuResponse {
  success: boolean;
  out: RunTransactionResponse;
  callOutput: unknown;
}
export class BesuBridge implements NetworkBridge {
  public static readonly CLASS_NAME = "BesuBridge";

  network: string = "BESU";

  public log: Logger;

  private connector: PluginLedgerConnectorBesu;
  private bungee: PluginBungeeHermes;
  private options: IPluginLedgerConnectorBesuOptions;
  private config: BesuConfig;

  constructor(besuConfig: BesuConfig) {
    this.config = besuConfig;
    this.options = besuConfig.options;
    const level = this.config.logLevel || "INFO";
    const label = BesuBridge.CLASS_NAME;

    this.log = LoggerProvider.getOrCreate({ label, level });

    this.connector = new PluginLedgerConnectorBesu(besuConfig.options);
    this.bungee = new PluginBungeeHermes(besuConfig.bungeeOptions);
    this.bungee.addStrategy(this.network, new StrategyBesu("INFO"));
  }

  public async wrapAsset(asset: BesuAsset): Promise<TransactionResponse> {
    this.log.debug(
      `${BesuBridge.CLASS_NAME}#wrapAsset Wrapping Asset: {${asset.tokenId}, ${asset.owner}, ${asset.contractAddress}, ${asset.tokenType}}`,
    );

    if (asset.ontology === undefined) {
      throw new Error(
        `${BesuBridge.CLASS_NAME}#wrapAsset: Ontology is required to interact with tokens`,
      );
    }

    const interactions = this.interactionList(asset.ontology);

    const response = (await this.connector.invokeContract({
      contractName: this.config.contractName,
      keychainId: this.config.keychainId,
      invocationType: EthContractInvocationType.Send,
      methodName: "wrap",
      params: [
        asset.contractAddress,
        asset.tokenType,
        asset.tokenId,
        asset.owner,
        interactions,
      ],
      signingCredential: this.config.signingCredential,
      gas: this.config.gas,
    })) as BesuResponse;

    if (!response.success) {
      throw new Error(`${BesuBridge.CLASS_NAME}#wrapAsset:Transaction failed`);
    }

    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt: JSON.stringify(response.out.transactionReceipt) ?? "",
    };
  }
  public async unwrapAsset(assetId: string): Promise<TransactionResponse> {
    this.log.debug(
      `${BesuBridge.CLASS_NAME}#UnwrapAsset Unwrapping Asset: ${assetId}`,
    );
    const response = (await this.connector.invokeContract({
      contractName: this.config.contractName,
      keychainId: this.config.keychainId,
      invocationType: EthContractInvocationType.Send,
      methodName: "unwrap",
      params: [assetId],
      signingCredential: this.config.signingCredential,
      gas: this.config.gas,
    })) as BesuResponse;
    if (!response.success) {
      throw new Error(
        `${BesuBridge.CLASS_NAME}#unwrapAsset:Transaction failed`,
      );
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt: JSON.stringify(response.out.transactionReceipt) ?? "",
    };
  }
  public async lockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    this.log.debug(
      `${BesuBridge.CLASS_NAME}#lockAsset Locking Asset: ${assetId} amount: ${amount}`,
    );
    const response = (await this.connector.invokeContract({
      contractName: this.config.contractName,
      keychainId: this.config.keychainId,
      invocationType: EthContractInvocationType.Send,
      methodName: "lock",
      params: [assetId, amount.toString()],
      signingCredential: this.config.signingCredential,
      gas: this.config.gas,
    })) as BesuResponse;
    if (!response.success) {
      throw new Error(`${BesuBridge.CLASS_NAME}#lockAsset:Transaction failed}`);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt: JSON.stringify(response.out.transactionReceipt) ?? "",
    };
  }
  public async unlockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    this.log.debug(
      `${BesuBridge.CLASS_NAME}#unlockAsset Unlocking Asset: ${assetId} amount: ${amount}`,
    );
    const response = (await this.connector.invokeContract({
      contractName: this.config.contractName,
      keychainId: this.config.keychainId,
      invocationType: EthContractInvocationType.Send,
      methodName: "unlock",
      params: [assetId, amount.toString()],
      signingCredential: this.config.signingCredential,
      gas: this.config.gas,
    })) as BesuResponse;
    if (!response.success) {
      throw new Error(
        `${BesuBridge.CLASS_NAME}#unlockAsset:Transaction failed}`,
      );
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt: JSON.stringify(response.out.transactionReceipt) ?? "",
    };
  }
  public async mintAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    this.log.debug(
      `${BesuBridge.CLASS_NAME}#mintAsset Minting Asset: ${assetId} amount: ${amount}`,
    );
    const response = (await this.connector.invokeContract({
      contractName: this.config.contractName,
      keychainId: this.config.keychainId,
      invocationType: EthContractInvocationType.Send,
      methodName: "mint",
      params: [assetId, amount.toString()],
      signingCredential: this.config.signingCredential,
      gas: this.config.gas,
    })) as BesuResponse;
    if (!response.success) {
      throw new Error(`${BesuBridge.CLASS_NAME}#mintAsset:Transaction failed}`);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt: JSON.stringify(response.out.transactionReceipt) ?? "",
    };
  }
  public async burnAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    this.log.debug(
      `${BesuBridge.CLASS_NAME}#burnAsset Burning Asset: ${assetId} amount: ${amount}`,
    );
    const response = (await this.connector.invokeContract({
      contractName: this.config.contractName,
      keychainId: this.config.keychainId,
      invocationType: EthContractInvocationType.Send,
      methodName: "burn",
      params: [assetId, amount.toString()],
      signingCredential: this.config.signingCredential,
      gas: this.config.gas,
    })) as BesuResponse;
    if (!response.success) {
      throw new Error(`${BesuBridge.CLASS_NAME}#burnAsset:Transaction failed}`);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt: JSON.stringify(response.out.transactionReceipt) ?? "",
    };
  }
  public async assignAsset(
    assetId: string,
    to: string,
    amount: number,
  ): Promise<TransactionResponse> {
    this.log.debug(
      `${BesuBridge.CLASS_NAME}#assignAsset Assigning Asset: ${assetId} amount: ${amount} to: ${to}`,
    );
    const response = (await this.connector.invokeContract({
      contractName: this.config.contractName,
      keychainId: this.config.keychainId,
      invocationType: EthContractInvocationType.Send,
      methodName: "assign",
      params: [assetId, to, amount],
      signingCredential: this.config.signingCredential,
      gas: this.config.gas,
    })) as BesuResponse;
    if (!response.success) {
      throw new Error(
        `${BesuBridge.CLASS_NAME}#assignAsset:Transaction failed}`,
      );
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt: JSON.stringify(response.out.transactionReceipt) ?? "",
    };
  }

  public async getAssets(): Promise<string[]> {
    this.log.debug(`${BesuBridge.CLASS_NAME}#getAssets Getting Assets`);
    const response = (await this.connector.invokeContract({
      contractName: this.config.contractName,
      keychainId: this.config.keychainId,
      invocationType: EthContractInvocationType.Call,
      methodName: "getAllAssetsIDs",
      params: [],
      signingCredential: this.config.signingCredential,
      gas: this.config.gas,
    })) as BesuResponse;

    if (!response.success) {
      throw new Error(`${BesuBridge.CLASS_NAME}#getAssets: Transaction failed`);
    }

    return response.callOutput as string[];
  }

  public async getAsset(assetId: string): Promise<BesuAsset> {
    this.log.debug(`${BesuBridge.CLASS_NAME}#getAsset Getting Asset`);
    const response = (await this.connector.invokeContract({
      contractName: this.config.contractName,
      keychainId: this.config.keychainId,
      invocationType: EthContractInvocationType.Call,
      methodName: "getToken",
      params: [assetId],
      signingCredential: this.config.signingCredential,
      gas: this.config.gas,
    })) as BesuResponse;

    if (!response.success) {
      throw new Error(`${BesuBridge.CLASS_NAME}#getAsset: Transaction failed`);
    }

    return response.callOutput as BesuAsset;
  }

  public networkName(): string {
    return this.network;
  }

  public async runTransaction(
    methodName: string,
    params: string[],
    invocationType: EthContractInvocationType,
  ): Promise<TransactionResponse> {
    this.log.debug(`Running Transaction: ${methodName}`);
    const response = (await this.connector.invokeContract({
      contractName: this.config.contractName,
      keychainId: this.config.keychainId,
      invocationType: invocationType,
      methodName: methodName,
      params: params,
      signingCredential: this.config.signingCredential,
      gas: this.config.gas,
    })) as BesuResponse;

    if (!response.success) {
      throw new Error(
        `${BesuBridge.CLASS_NAME}#runTransaction:Transaction failed}`,
      );
    }

    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt: JSON.stringify(response.out.transactionReceipt) ?? "",
      output: response.callOutput ?? undefined,
    };
  }

  public async getReceipt(
    assetId: string,
    transactionHash: string,
  ): Promise<string> {
    this.log.debug(
      `Getting Receipt: ${assetId} transactionHash: ${transactionHash}`,
    );
    //todo needs implementation
    const networkDetails = {
      //connector: this.connector,
      connectorApiPath: "",
      signingCredential: this.config.signingCredential,
      contractName: this.config.contractName,
      contractAddress: this.config.contractAddress,
      keychainId: this.config.keychainId,
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
      [assetId, transactionHash],
    );

    return view.getViewStr();
  }

  private interactionList(jsonString: string): InteractionsRequest[] {
    const ontologyJSON = JSON.parse(jsonString);

    const interactions: InteractionsRequest[] = [];

    for (const interaction in ontologyJSON["ontology"]) {
      const functions: string[] = [];
      const variables: string | number[][] = [];

      for (const signature of ontologyJSON["ontology"][
        interaction
      ] as InteractionData[]) {
        functions.push(signature.functionSignature);
        const vars: string | number[] = [];

        for (const variable of signature.variables) {
          vars.push(getVarTypes(variable));
        }
        variables.push(vars);
      }

      const interactionRequest: InteractionsRequest = {
        interactionType: getInteractionType(interaction),
        functionsSignature: functions,
        variables: variables,
        available: true,
      };
      interactions.push(interactionRequest);
    }

    return interactions;
  }
}
