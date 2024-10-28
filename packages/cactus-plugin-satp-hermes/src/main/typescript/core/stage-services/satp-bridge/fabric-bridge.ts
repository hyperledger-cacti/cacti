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
import { stringify as safeStableStringify } from "safe-stable-stringify";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PrivacyPolicyOpts } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/generated/openapi/typescript-axios";
import { FabricAsset, getVarTypes } from "./types/fabric-asset";
import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { NetworkBridge } from "./network-bridge";
import { InteractionSignature } from "./types/fabric-asset";
import { InteractionData } from "./types/interact";
import { getInteractionType } from "./types/asset";
import { OntologyError, TransactionError } from "../../errors/bridge-erros";
import { ClaimFormat } from "../../../generated/proto/cacti/satp/v02/common/message_pb";

export class FabricBridge implements NetworkBridge {
  public static readonly CLASS_NAME = "FabricBridge";

  network: string = "FABRIC";
  claimFormat: ClaimFormat;

  public log: Logger;

  connector: PluginLedgerConnectorFabric;
  bungee: PluginBungeeHermes;
  options: IPluginLedgerConnectorFabricOptions;
  config: FabricConfig;

  constructor(fabricConfig: FabricConfig, level?: LogLevelDesc) {
    this.config = fabricConfig;
    this.options = fabricConfig.options;
    this.connector = new PluginLedgerConnectorFabric(fabricConfig.options);
    this.claimFormat = fabricConfig.claimFormat;
    this.bungee = new PluginBungeeHermes(fabricConfig.bungeeOptions);
    level = level || "INFO";
    this.bungee.addStrategy(this.network, new StrategyFabric(level));
    this.log = LoggerProvider.getOrCreate({
      label: StrategyFabric.CLASS_NAME,
      level,
    });
  }
  public async wrapAsset(asset: FabricAsset): Promise<TransactionResponse> {
    const fnTag = `${FabricBridge.CLASS_NAME}}#wrapAsset`;
    this.log.debug(
      `${fnTag}, Wrapping Asset: {${asset.tokenId}, ${asset.owner}, ${asset.tokenType}}`,
    );
    if (asset.ontology === undefined) {
      throw new OntologyError(fnTag);
    }

    const interactions = this.interactionList(asset.ontology);

    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "wrap",
      params: [
        asset.tokenType.toString(),
        asset.tokenId,
        asset.owner,
        asset.mspId,
        asset.channelName,
        asset.contractName,
        safeStableStringify(interactions),
      ],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    if (response == undefined || response.transactionId == "") {
      throw new TransactionError(fnTag);
    }

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }
  public async unwrapAsset(assetId: string): Promise<TransactionResponse> {
    const fnTag = `${FabricBridge.CLASS_NAME}}#unwrapAsset`;
    this.log.debug(`${fnTag}, Unwrapping Asset: ${assetId}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "unwrap",
      params: [assetId],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    if (response == undefined || response.transactionId == "") {
      throw new TransactionError(fnTag);
    }

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }
  public async lockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${FabricBridge.CLASS_NAME}}#lockAsset`;
    this.log.debug(`${fnTag}, Locking Asset: ${assetId} amount: ${amount}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "lock",
      params: [assetId, amount.toString()],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    if (response == undefined || response.transactionId == "") {
      throw new TransactionError(fnTag);
    }

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }
  public async unlockAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${FabricBridge.CLASS_NAME}}#unlockAsset`;
    this.log.debug(`${fnTag}, Unlocking Asset: ${assetId} amount: ${amount}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "unlock",
      params: [assetId, amount.toString()],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    if (response == undefined || response.transactionId == "") {
      throw new TransactionError(fnTag);
    }

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }
  public async mintAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${FabricBridge.CLASS_NAME}}#mintAsset`;
    this.log.debug(`${fnTag}, Minting Asset: ${assetId} amount: ${amount}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "mint",
      params: [assetId, amount.toString()],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    if (response == undefined || response.transactionId == "") {
      throw new TransactionError(fnTag);
    }

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }
  public async burnAsset(
    assetId: string,
    amount: number,
  ): Promise<TransactionResponse> {
    const fnTag = `${FabricBridge.CLASS_NAME}}#burnAsset`;
    this.log.debug(`${fnTag}, Burning Asset: ${assetId} amount: ${amount}`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "burn",
      params: [assetId, amount.toString()],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    if (response == undefined || response.transactionId == "") {
      throw new TransactionError(fnTag);
    }

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
    const fnTag = `${FabricBridge.CLASS_NAME}}#assignAsset`;
    this.log.debug(
      `${fnTag}, Assigning Asset: ${assetId} amount: ${amount} to: ${to}`,
    );
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "assign",
      params: [assetId, to, amount.toString()],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    if (response == undefined || response.transactionId == "") {
      throw new TransactionError(fnTag);
    }

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }

  public async getAsset(assetId: string): Promise<FabricAsset> {
    const fnTag = `${FabricBridge.CLASS_NAME}}#getAsset`;
    this.log.debug(`${fnTag}, Getting Asset`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "GetAsset",
      params: [assetId],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Call,
    });

    if (response == undefined) {
      throw new TransactionError(fnTag);
    }

    const token = JSON.parse(response.functionOutput) as FabricAsset;

    return token;
  }

  public async getClientId(): Promise<string> {
    const fnTag = `${FabricBridge.CLASS_NAME}}#getClientId`;
    this.log.debug(`${fnTag}, Getting Client Id`);
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: "ClientAccountID",
      params: [],
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Call,
    });

    if (response == undefined) {
      throw new TransactionError(fnTag);
    }

    return response.functionOutput;
  }

  public networkName(): string {
    return this.network;
  }

  public async runTransaction(
    methodName: string,
    params: string[],
  ): Promise<TransactionResponse> {
    const fnTag = `${FabricBridge.CLASS_NAME}}#runTransaction`;
    this.log.debug(
      `${fnTag}, Running Transaction: ${methodName} with params: ${params}`,
    );
    const response = await this.connector.transact({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      methodName: methodName,
      params: params,
      contractName: this.config.contractName,
      invocationType: FabricContractInvocationType.Send,
    });

    if (response == undefined || response.transactionId == "") {
      throw new TransactionError(fnTag);
    }

    return {
      transactionId: response.transactionId,
      output: response.functionOutput,
    };
  }
  public async getReceipt(transactionId: string): Promise<string> {
    const fnTag = `${FabricBridge.CLASS_NAME}}#getReceipt`;
    this.log.debug(`${fnTag}, Getting Receipt: ${transactionId}`);
    const receipt = await this.connector.getTransactionReceiptByTxID({
      signingCredential: this.config.signingCredential,
      channelName: this.config.channelName,
      contractName: "qscc",
      invocationType: FabricContractInvocationType.Call,
      methodName: "GetBlockByTxID",
      params: [this.config.channelName, transactionId],
    });

    return safeStableStringify(receipt);
  }

  public async getView(assetId: string): Promise<string> {
    const fnTag = `${FabricBridge.CLASS_NAME}}#getView`;
    this.log.debug(`${fnTag}, Getting View: ${assetId}`);
    //todo needs implementation
    const networkDetails = {
      connector: this.connector,
      //connectorApiPath: "", //todo check this to not use api
      signingCredential: this.config.signingCredential,
      contractName: this.config.contractName,
      channelName: this.config.channelName,
      participant: "Org2MSP",
    };
    try {
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
      return safeStableStringify(generated);
    } catch (error) {
      console.error(error);
      return "";
    }
  }

  private interactionList(jsonString: string): InteractionSignature[] {
    const ontologyJSON = JSON.parse(jsonString);

    const interactions: InteractionSignature[] = [];

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

      const interactionRequest: InteractionSignature = {
        type: getInteractionType(interaction),
        functionsSignature: functions,
        variables: variables,
      };
      interactions.push(interactionRequest);
    }

    this.log.info(`Interactions: ${safeStableStringify(interactions)}`);

    return interactions;
  }
}
