import type {
  BesuConfig,
  TransactionResponse,
} from "../../types/blockchain-interaction";
import {
  EthContractInvocationType,
  type IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
  type RunTransactionResponse,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { NetworkBridge } from "./network-bridge";
import { PluginBungeeHermes } from "@hyperledger/cactus-plugin-bungee-hermes";
import { StrategyBesu } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/strategy/strategy-besu";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PrivacyPolicyOpts } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/generated/openapi/typescript-axios";
import { EvmAsset, getVarTypes } from "./types/evm-asset";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import type { InteractionsRequest } from "../../generated/SATPWrapperContract";
import { getInteractionType } from "./types/asset";
import { InteractionData } from "./types/interact";
import { OntologyError, TransactionError } from "./bridge-errors";
import { ClaimFormat } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";

interface BesuResponse {
  success: boolean;
  out: RunTransactionResponse;
  callOutput: unknown;
}
export class BesuBridge implements NetworkBridge {
  public static readonly CLASS_NAME = "BesuBridge";

  network: string;
  networkType: LedgerType;
  claimFormat: ClaimFormat;
  public log: Logger;

  private connector: PluginLedgerConnectorBesu;
  private bungee: PluginBungeeHermes;
  private options: IPluginLedgerConnectorBesuOptions;
  private config: BesuConfig;

  constructor(besuConfig: BesuConfig, level?: LogLevelDesc) {
    this.config = besuConfig;
    this.options = besuConfig.options;
    const label = BesuBridge.CLASS_NAME;

    level = level || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level });
    this.claimFormat = besuConfig.claimFormat;
    this.connector = new PluginLedgerConnectorBesu(besuConfig.options);
    this.bungee = new PluginBungeeHermes(besuConfig.bungeeOptions);
    this.network = besuConfig.network.id;
    this.networkType = besuConfig.network.ledgerType;
    this.bungee.addStrategy(this.network, new StrategyBesu(level));

    //TODO is this needed?
    if (besuConfig.besuAssets) {
      besuConfig.besuAssets.forEach(async (asset) => {
        await this.wrapAsset(asset);
      });
    }
  }
  public getNetworkType(): LedgerType {
    return this.networkType;
  }

  public async wrapAsset(asset: EvmAsset): Promise<TransactionResponse> {
    const fnTag = `${BesuBridge.CLASS_NAME}#wrapAsset`;
    this.log.debug(
      `${fnTag}, Wrapping Asset: {${asset.tokenId}, ${asset.owner}, ${asset.contractAddress}, ${asset.tokenType}}`,
    );

    if (asset.ontology === undefined) {
      throw new OntologyError(fnTag);
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
      throw new TransactionError(fnTag);
    }

    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
  }
  public async unwrapAsset(assetId: string): Promise<TransactionResponse> {
    const fnTag = `${BesuBridge.CLASS_NAME}#unwrapAsset`;
    this.log.debug(`${fnTag}, Unwrapping Asset: ${assetId}`);
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
      throw new TransactionError(fnTag);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
  }
  public async lockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${BesuBridge.CLASS_NAME}#lockAsset`;
    this.log.debug(`${fnTag}, Locking Asset: ${assetId} amount: ${amount}`);
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
      throw new TransactionError(fnTag);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
  }
  public async unlockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${BesuBridge.CLASS_NAME}#unlockAsset`;
    this.log.debug(`${fnTag}, Unlocking Asset: ${assetId} amount: ${amount}`);
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
      throw new TransactionError(fnTag);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
  }
  public async mintAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${BesuBridge.CLASS_NAME}#mintAsset`;
    this.log.debug(`${fnTag}, Minting Asset: ${assetId} amount: ${amount}`);
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
      throw new TransactionError(fnTag);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
  }
  public async burnAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${BesuBridge.CLASS_NAME}#burnAsset`;
    this.log.debug(`${fnTag}, Burning Asset: ${assetId} amount: ${amount}`);
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
      throw new TransactionError(fnTag);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
  }
  public async assignAsset(
    assetId: string,
    to: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${BesuBridge.CLASS_NAME}#assignAsset`;
    this.log.debug(
      `${fnTag}, Assigning Asset: ${assetId} amount: ${amount} to: ${to}`,
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
      throw new TransactionError(fnTag);
    }
    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
    };
  }

  public async getAssets(): Promise<string[]> {
    const fnTag = `${BesuBridge.CLASS_NAME}#getAssets`;
    this.log.debug(`${fnTag}, Getting Assets`);
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
      throw new TransactionError(fnTag);
    }

    return response.callOutput as string[];
  }

  public async getAsset(assetId: string): Promise<EvmAsset> {
    const fnTag = `${BesuBridge.CLASS_NAME}#getAsset`;
    this.log.debug(`${fnTag}, Getting Asset`);
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
      throw new TransactionError(fnTag);
    }

    return response.callOutput as EvmAsset;
  }

  public networkName(): string {
    return this.network;
  }

  public async runTransaction(
    methodName: string,
    params: string[],
    invocationType: EthContractInvocationType,
  ): Promise<TransactionResponse> {
    const fnTag = `${BesuBridge.CLASS_NAME}#runTransaction`;
    this.log.debug(
      `${fnTag}, Running Transaction: ${methodName} with params: ${params}`,
    );
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
      throw new TransactionError(fnTag);
    }

    return {
      transactionId: response.out.transactionReceipt.transactionHash ?? "",
      transactionReceipt:
        safeStableStringify(response.out.transactionReceipt) ?? "",
      output: response.callOutput ?? undefined,
    };
  }
  public async getView(assetId: string): Promise<string> {
    const networkDetails = {
      connector: this.connector,
      //connectorApiPath: "",
      signingCredential: this.config.signingCredential,
      contractName: this.config.contractName,
      contractAddress: this.config.contractAddress,
      keychainId: this.config.keychainId,
      participant: "Org1MSP", // ??
    };

    const snapshot = await this.bungee.generateSnapshot(
      [assetId],
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

    return safeStableStringify(generated);
  }
  public async getReceipt(
    //assetId: string,
    transactionId: string,
  ): Promise<string> {
    const fnTag = `${BesuBridge.CLASS_NAME}#getReceipt`;
    this.log.debug(
      `${fnTag}, Getting Receipt: transactionId: ${transactionId}`,
    );
    //TODO: implement getReceipt instead of transaction
    const receipt = await this.connector.getTransaction({
      transactionHash: transactionId,
    });

    return safeStableStringify(receipt.transaction);
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

  /**
   * Merges two receipts into one.
   *
   * @param receipt1 - First receipt to merge.
   * @param receipt2 - Second receipt to merge.
   * @returns The merged receipt as a string.
   */
  merge_receipt(
    receipt1: string | undefined,
    receipt2: string | undefined,
  ): string {
    if (!receipt1 && !receipt2) return "";
    if (!receipt1) return receipt2 as string;
    if (!receipt2) return receipt1 as string;

    const mergedReceipt = {
      ...JSON.parse(receipt1 as string),
      ...JSON.parse(receipt2 as string),
    };

    return safeStableStringify(mergedReceipt) || "";
  }
}
