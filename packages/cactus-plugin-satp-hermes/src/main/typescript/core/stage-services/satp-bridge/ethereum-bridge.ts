import {
  EthereumConfig,
  TransactionResponse,
} from "../../../types/blockchain-interaction";
import {
  EthContractInvocationType,
  InvokeRawWeb3EthMethodV1Request,
  IPluginLedgerConnectorEthereumOptions,
  PluginLedgerConnectorEthereum,
  RunTransactionResponse,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { NetworkBridge } from "./network-bridge";
import { PluginBungeeHermes } from "@hyperledger/cactus-plugin-bungee-hermes";
import { StrategyEthereum } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/strategy/strategy-ethereum";
import { EvmAsset, getVarTypes } from "./types/evm-asset";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { InteractionsRequest } from "../../../generated/SATPWrapperContract";
import { getInteractionType } from "./types/asset";
import { InteractionData } from "./types/interact";
import { OntologyError, TransactionError } from "../../errors/bridge-erros";
import { ClaimFormat } from "../../../generated/proto/cacti/satp/v02/common/message_pb";

interface EthereumResponse {
  success: boolean;
  out: RunTransactionResponse;
  callOutput: unknown;
}
export class EthereumBridge implements NetworkBridge {
  public static readonly CLASS_NAME = "EthereumBridge";

  network: string = "ETHEREUM";
  claimFormat: ClaimFormat;
  public log: Logger;

  private connector: PluginLedgerConnectorEthereum;
  private bungee: PluginBungeeHermes;
  private options: IPluginLedgerConnectorEthereumOptions;
  private config: EthereumConfig;

  constructor(ethereumConfig: EthereumConfig, level?: LogLevelDesc) {
    this.config = ethereumConfig;
    this.options = ethereumConfig.options;
    const label = EthereumBridge.CLASS_NAME;

    level = level || "INFO";
    this.log = LoggerProvider.getOrCreate({ label, level });
    this.claimFormat = ethereumConfig.claimFormat;
    this.connector = new PluginLedgerConnectorEthereum(ethereumConfig.options);
    this.bungee = new PluginBungeeHermes(ethereumConfig.bungeeOptions);
    this.bungee.addStrategy(this.network, new StrategyEthereum(level));

    //TODO is this needed?
    if (ethereumConfig.ethereumAssets) {
      ethereumConfig.ethereumAssets.forEach(async (asset) => {
        await this.wrapAsset(asset);
      });
    }
  }

  public async wrapAsset(asset: EvmAsset): Promise<TransactionResponse> {
    const fnTag = `${EthereumBridge.CLASS_NAME}}#wrapAsset`;
    this.log.debug(
      `${fnTag}, Wrapping Asset: {${asset.tokenId}, ${asset.owner}, ${asset.contractAddress}, ${asset.tokenType}}`,
    );

    if (asset.ontology === undefined) {
      throw new OntologyError(fnTag);
    }

    const interactions = this.interactionList(asset.ontology);

    const response = (await this.connector.invokeContract({
      contract: {
        contractName: this.config.contractName,
        keychainId: this.config.keychainId,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "wrap",
      params: [
        asset.contractAddress,
        asset.tokenType,
        asset.tokenId,
        asset.owner,
        interactions,
      ],
      web3SigningCredential: this.config.signingCredential,
    })) as EthereumResponse;

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
    const fnTag = `${EthereumBridge.CLASS_NAME}}#unwrapAsset`;
    this.log.debug(`${fnTag}, Unwrapping Asset: ${assetId}`);
    const response = (await this.connector.invokeContract({
      contract: {
        contractName: this.config.contractName,
        keychainId: this.config.keychainId,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "unwrap",
      params: [assetId],
      web3SigningCredential: this.config.signingCredential,
    })) as EthereumResponse;
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
    const fnTag = `${EthereumBridge.CLASS_NAME}}#lockAsset`;
    this.log.debug(`${fnTag}, Locking Asset: ${assetId} amount: ${amount}`);
    const response = (await this.connector.invokeContract({
      contract: {
        contractName: this.config.contractName,
        keychainId: this.config.keychainId,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "lock",
      params: [assetId, amount.toString()],
      web3SigningCredential: this.config.signingCredential,
    })) as EthereumResponse;
    if (!response.success) {
      this.log.debug(response);
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
    const fnTag = `${EthereumBridge.CLASS_NAME}}#unlockAsset`;
    this.log.debug(`${fnTag}, Unlocking Asset: ${assetId} amount: ${amount}`);
    const response = (await this.connector.invokeContract({
      contract: {
        contractName: this.config.contractName,
        keychainId: this.config.keychainId,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "unlock",
      params: [assetId, amount.toString()],
      web3SigningCredential: this.config.signingCredential,
    })) as EthereumResponse;
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
    const fnTag = `${EthereumBridge.CLASS_NAME}}#mintAsset`;
    this.log.debug(`${fnTag}, Minting Asset: ${assetId} amount: ${amount}`);
    const response = (await this.connector.invokeContract({
      contract: {
        contractName: this.config.contractName,
        keychainId: this.config.keychainId,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "mint",
      params: [assetId, amount.toString()],
      web3SigningCredential: this.config.signingCredential,
    })) as EthereumResponse;
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
    const fnTag = `${EthereumBridge.CLASS_NAME}}#burnAsset`;
    this.log.debug(`${fnTag}, Burning Asset: ${assetId} amount: ${amount}`);
    const response = (await this.connector.invokeContract({
      contract: {
        contractName: this.config.contractName,
        keychainId: this.config.keychainId,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "burn",
      params: [assetId, amount.toString()],
      web3SigningCredential: this.config.signingCredential,
    })) as EthereumResponse;
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
    const fnTag = `${EthereumBridge.CLASS_NAME}}#assignAsset`;
    this.log.debug(
      `${fnTag}, Assigning Asset: ${assetId} amount: ${amount} to: ${to}`,
    );
    const response = (await this.connector.invokeContract({
      contract: {
        contractName: this.config.contractName,
        keychainId: this.config.keychainId,
      },
      invocationType: EthContractInvocationType.Send,
      methodName: "assign",
      params: [assetId, to, amount],
      web3SigningCredential: this.config.signingCredential,
    })) as EthereumResponse;
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
    const fnTag = `${EthereumBridge.CLASS_NAME}}#getAssets`;
    this.log.debug(`${fnTag}, Getting Assets`);
    const response = (await this.connector.invokeContract({
      contract: {
        contractName: this.config.contractName,
        keychainId: this.config.keychainId,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "getAllAssetsIDs",
      params: [],
      web3SigningCredential: this.config.signingCredential,
    })) as EthereumResponse;

    if (!response.success) {
      throw new TransactionError(fnTag);
    }

    return response.callOutput as string[];
  }

  public async getAsset(assetId: string): Promise<EvmAsset> {
    const fnTag = `${EthereumBridge.CLASS_NAME}}#getAsset`;
    this.log.debug(`${fnTag}, Getting Asset`);
    const response = (await this.connector.invokeContract({
      contract: {
        contractName: this.config.contractName,
        keychainId: this.config.keychainId,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "getToken",
      params: [assetId],
      web3SigningCredential: this.config.signingCredential,
    })) as EthereumResponse;

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
    const fnTag = `${EthereumBridge.CLASS_NAME}}#runTransaction`;
    this.log.debug(
      `${fnTag}, Running Transaction: ${methodName} with params: ${params}`,
    );
    const response = (await this.connector.invokeContract({
      contract: {
        contractName: this.config.contractName,
        keychainId: this.config.keychainId,
      },
      invocationType: invocationType,
      methodName: methodName,
      params: params,
      web3SigningCredential: this.config.signingCredential,
    })) as EthereumResponse;

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
    const fnTag = `${EthereumBridge.CLASS_NAME}}#getReceipt`;
    this.log.debug(
      `${fnTag}, Getting Receipt: transactionId: ${transactionId}`,
    );
    //TODO: implement getReceipt instead of transaction
    const getTransactionReq: InvokeRawWeb3EthMethodV1Request = {
      methodName: "getTransaction",
      params: [transactionId],
    };
    const receipt =
      await this.connector.invokeRawWeb3EthMethod(getTransactionReq);

    return safeStableStringify(receipt) ?? "";
  }

  interactionList(jsonString: string): InteractionsRequest[] {
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
