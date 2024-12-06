import {
  FabricSigningCredential,
  DefaultApi as FabricApi,
  Configuration,
  FabricContractInvocationType,
  RunTransactionRequest,
  PluginLedgerConnectorFabric,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { NetworkDetails, ObtainLedgerStrategy } from "./obtain-ledger-strategy";
import {
  Checks,
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import { Transaction } from "../view-creation/transaction";
import { State } from "../view-creation/state";
import { StateProof } from "../view-creation/state-proof";
import { Proof } from "../view-creation/proof";
import { TransactionProof } from "../view-creation/transaction-proof";
import { BadRequestError, InternalServerError } from "http-errors-enhanced-cjs";

export interface FabricNetworkDetails extends NetworkDetails {
  signingCredential: FabricSigningCredential;
  contractName: string;
  channelName: string;
}
export class StrategyFabric implements ObtainLedgerStrategy {
  public static readonly CLASS_NAME = "StrategyFabric";

  public log: Logger;

  constructor(level: LogLevelDesc) {
    this.log = LoggerProvider.getOrCreate({
      label: StrategyFabric.CLASS_NAME,
      level,
    });
  }

  public async generateLedgerStates(
    stateIds: string[],
    networkDetails: FabricNetworkDetails,
  ): Promise<Map<string, State>> {
    const fn = `${StrategyFabric.CLASS_NAME}#generateLedgerStates()`;
    this.log.debug(`Generating ledger snapshot`);
    Checks.truthy(networkDetails, `${fn} networkDetails`);

    let fabricApi: FabricApi | undefined;
    let connector: PluginLedgerConnectorFabric | undefined;

    if (networkDetails.connector) {
      connector = networkDetails.connector as PluginLedgerConnectorFabric;
    } else if (networkDetails.connectorApiPath) {
      const config = new Configuration({
        basePath: networkDetails.connectorApiPath,
      });
      fabricApi = new FabricApi(config);
    } else {
      throw new Error(
        `${fn} networkDetails must have either connector or connectorApiPath`,
      );
    }
    const connectorOrApiClient = networkDetails.connector
      ? connector
      : fabricApi;
    if (!connectorOrApiClient) {
      throw new InternalServerError(
        `${fn} got neither connector nor FabricAPI`,
      );
    }
    const assetsKey =
      stateIds.length == 0
        ? (
            await this.getAllAssetsKey(networkDetails, connectorOrApiClient)
          ).split(",")
        : stateIds;
    const ledgerStates = new Map<string, State>();
    //For each key in ledgerAssetsKey
    for (const assetKey of assetsKey) {
      const assetValues: string[] = [];
      const txWithTimeS: Transaction[] = [];

      const txs = await this.getAllTxByKey(
        networkDetails,
        assetKey,
        connectorOrApiClient,
      );
      //For each tx get receipt
      let last_receipt;
      for (const tx of txs) {
        const receipt = JSON.parse(
          await this.fabricGetTxReceiptByTxIDV1(
            networkDetails,
            tx.getId(),
            connectorOrApiClient,
          ),
        );
        tx.getProof().setCreator(
          new Proof({
            creator: receipt.transactionCreator.creatorID,
            mspid: receipt.transactionCreator.mspid,
          }),
        );
        if (!receipt.rwsetWriteData) {
          assetValues.push("");
        } else {
          assetValues.push(JSON.parse(receipt.rwsetWriteData).Value.toString());
        }
        tx.setStateId(assetKey);
        tx.setTarget(receipt.channelID + ": " + receipt.chainCodeName);

        for (const endorsement of receipt.transactionEndorsement) {
          const signature64 = Buffer.from(endorsement.signature).toString(
            "base64",
          );
          tx.addEndorser(
            new Proof({
              mspid: endorsement.mspid,
              creator: endorsement.endorserID,
              signature: signature64,
            }),
          );
        }
        txWithTimeS.push(tx);
        last_receipt = receipt;
      }
      const block = await this.fabricGetBlockByTxID(
        networkDetails,
        txs[txs.length - 1].getId(),
        connectorOrApiClient,
      );
      const state = new State(assetKey, assetValues, txWithTimeS);
      ledgerStates.set(assetKey, state);
      const stateProof = new StateProof(
        state.getValue(),
        parseInt(state.getVersion()),
        state.getId(),
      );
      //only adding last block for each state, in the state proof
      stateProof.addBlock({
        blockHash: block.hash,
        blockCreator:
          safeStableStringify({
            mspid: last_receipt.blockMetaData.mspid,
            id: last_receipt.blockMetaData.blockCreatorID,
          }) ?? "",
        blockSigners: block.signers,
      });

      state.setStateProof([stateProof]);
    }
    return ledgerStates;
  }

  async fabricGetTxReceiptByTxIDV1(
    networkDetails: FabricNetworkDetails,
    transactionId: string,
    connectorOrApiClient: PluginLedgerConnectorFabric | FabricApi,
  ): Promise<string> {
    const fn = `${StrategyFabric.CLASS_NAME}#fabricGetTxReceiptByTxIDV1()`;
    const parameters = {
      signingCredential: networkDetails.signingCredential,
      channelName: networkDetails.channelName,
      contractName: "qscc",
      invocationType: FabricContractInvocationType.Call,
      methodName: "GetBlockByTxID",
      params: [networkDetails.channelName, transactionId],
    } as RunTransactionRequest;

    if (!connectorOrApiClient) {
      throw new BadRequestError(`${fn} connectorOrApiClient is falsy`);
    } else if (connectorOrApiClient instanceof PluginLedgerConnectorFabric) {
      const connector: PluginLedgerConnectorFabric = connectorOrApiClient;
      const response = await connector.getTransactionReceiptByTxID(parameters);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      const receiptLockRes = safeStableStringify(response);
      if (!receiptLockRes) {
        throw new InternalServerError(`${fn} receiptLockRes is falsy`);
      }
      return receiptLockRes;
    } else if (connectorOrApiClient instanceof FabricApi) {
      const api: FabricApi = connectorOrApiClient;
      const response = await api.getTransactionReceiptByTxIDV1(parameters);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.status) {
        throw new InternalServerError(`${fn} response.status is falsy`);
      }
      const { status, data, statusText, config } = response;
      if (response.status < 200 || response.status > 300) {
        this.log.debug(
          "FabricAPI non-2xx HTTP response:",
          data,
          status,
          config,
        );
        const errorMessage = `${fn} FabricAPI error status: ${status}: ${statusText}`;
        throw new InternalServerError(errorMessage);
      }
      if (!data) {
        throw new InternalServerError(`${fn} response.data is falsy`);
      }

      const receiptLockRes = safeStableStringify(data);
      if (!receiptLockRes) {
        throw new InternalServerError(`${fn} receiptLockRes is falsy`);
      }
      return receiptLockRes;
    }
    throw new InternalServerError(
      `${fn}: neither FabricAPI nor Connector given`,
    );
  }

  async fabricGetBlockByTxID(
    networkDetails: FabricNetworkDetails,
    txId: string,
    connectorOrApiClient: PluginLedgerConnectorFabric | FabricApi,
  ): Promise<{ hash: string; signers: string[] }> {
    const fn = `${StrategyFabric.CLASS_NAME}#fabricGetBlockByTxID()`;
    const gatewayOptions = {
      identity: networkDetails.signingCredential.keychainRef,
      wallet: {
        keychain: {
          keychainId: networkDetails.signingCredential.keychainId,
          keychainRef: networkDetails.signingCredential.keychainRef,
        },
      },
    };
    const getBlockReq = {
      channelName: networkDetails.channelName as string,
      gatewayOptions,
      query: {
        transactionId: txId,
      },
      skipDecode: false,
    };

    let block_data;

    if (!connectorOrApiClient) {
      throw new BadRequestError(`${fn} connectorOrApiClient is falsy`);
    } else if (connectorOrApiClient instanceof PluginLedgerConnectorFabric) {
      const connector: PluginLedgerConnectorFabric = connectorOrApiClient;
      const response = await connector.getBlock(getBlockReq);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      block_data = response;
    } else if (connectorOrApiClient instanceof FabricApi) {
      const api: FabricApi = connectorOrApiClient;
      const response = await api.getBlockV1(getBlockReq);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.status) {
        throw new InternalServerError(`${fn} response.status is falsy`);
      }
      const { status, data, statusText, config } = response;
      if (response.status < 200 || response.status > 300) {
        this.log.debug(
          "FabricAPI non-2xx HTTP response:",
          data,
          status,
          config,
        );
        const errorMessage = `${fn} FabricAPI error status: ${status}: ${statusText}`;
        throw new InternalServerError(errorMessage);
      }
      if (!data) {
        throw new InternalServerError(`${fn} response.data is falsy`);
      }
      block_data = response.data;
    } else {
      throw new InternalServerError(
        `${fn}: neither FabricAPI nor Connector given`,
      );
    }

    const block = JSON.parse(safeStableStringify(block_data)).decodedBlock;

    const blockSig = block.metadata.metadata[0].signatures;
    const sigs = [];
    for (const sig of blockSig) {
      const decoded = {
        creator: {
          mspid: sig.signature_header.creator.mspid,
          id: Buffer.from(sig.signature_header.creator.id_bytes.data).toString(
            "hex",
          ),
        },
        signature: Buffer.from(sig.signature.data).toString("hex"),
      };
      sigs.push(safeStableStringify(decoded));
    }
    return {
      hash: Buffer.from(block.header.data_hash.data).toString("hex"),
      signers: sigs,
    };
  }

  async getAllAssetsKey(
    networkDetails: FabricNetworkDetails,
    connectorOrApiClient: PluginLedgerConnectorFabric | FabricApi,
  ): Promise<string> {
    const fn = `${StrategyFabric.CLASS_NAME}#getAllAssetsKey()`;
    const parameters = {
      signingCredential: networkDetails.signingCredential,
      channelName: networkDetails.channelName,
      contractName: networkDetails.contractName,
      methodName: "GetAllAssetsKey",
      invocationType: FabricContractInvocationType.Call,
      params: [],
    } as RunTransactionRequest;

    if (!connectorOrApiClient) {
      throw new BadRequestError(`${fn} connectorOrApiClient is falsy`);
    } else if (connectorOrApiClient instanceof PluginLedgerConnectorFabric) {
      const connector: PluginLedgerConnectorFabric = connectorOrApiClient;
      const response = await connector.transact(parameters);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.functionOutput) {
        throw new InternalServerError(`${fn} response.functionOutput is falsy`);
      }
      const { functionOutput } = response;
      if (!(typeof functionOutput === "string")) {
        throw new InternalServerError(
          `${fn} response.functionOutput is not a string`,
        );
      }
      return functionOutput;
    } else if (connectorOrApiClient instanceof FabricApi) {
      const api: FabricApi = connectorOrApiClient;
      const response = await api.runTransactionV1(parameters);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.status) {
        throw new InternalServerError(`${fn} response.status is falsy`);
      }
      const { status, data, statusText, config } = response;
      if (response.status < 200 || response.status > 300) {
        this.log.debug(
          "FabricAPI non-2xx HTTP response:",
          data,
          status,
          config,
        );
        const errorMessage = `${fn} FabricAPI error status: ${status}: ${statusText}`;
        throw new InternalServerError(errorMessage);
      }
      if (!data) {
        throw new InternalServerError(`${fn} response.data is falsy`);
      }
      if (!data.functionOutput) {
        throw new InternalServerError(`${fn} response.functionOutput is falsy`);
      }
      const { functionOutput } = data;
      if (!(typeof functionOutput === "string")) {
        throw new InternalServerError(
          `${fn} response.functionOutput is not a string`,
        );
      }
      return functionOutput;
    }
    throw new InternalServerError(
      `${fn}: neither FabricAPI nor Connector given`,
    );
  }

  async getAllTxByKey(
    networkDetails: FabricNetworkDetails,
    key: string,
    connectorOrApiClient: PluginLedgerConnectorFabric | FabricApi,
  ): Promise<Transaction[]> {
    const fn = `${StrategyFabric.CLASS_NAME}#getAllTxByKey()`;
    const parameters = {
      signingCredential: networkDetails.signingCredential,
      channelName: networkDetails.channelName,
      contractName: networkDetails.contractName,
      methodName: "GetAllTxByKey",
      invocationType: FabricContractInvocationType.Call,
      params: [key],
    } as RunTransactionRequest;

    if (!connectorOrApiClient) {
      throw new BadRequestError(`${fn} connectorOrApiClient is falsy`);
    } else if (connectorOrApiClient instanceof PluginLedgerConnectorFabric) {
      const connector: PluginLedgerConnectorFabric = connectorOrApiClient;
      const response = await connector.transact(parameters);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.functionOutput) {
        throw new InternalServerError(`${fn} response.functionOutput is falsy`);
      }
      return this.txsStringToTxs(response.functionOutput);
    } else if (connectorOrApiClient instanceof FabricApi) {
      const api: FabricApi = connectorOrApiClient;
      const response = await api.runTransactionV1(parameters);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.status) {
        throw new InternalServerError(`${fn} response.status is falsy`);
      }
      const { status, data, statusText, config } = response;
      if (response.status < 200 || response.status > 300) {
        this.log.debug(
          "FabricAPI non-2xx HTTP response:",
          data,
          status,
          config,
        );
        const errorMessage = `${fn} FabricAPI error status: ${status}: ${statusText}`;
        throw new InternalServerError(errorMessage);
      }
      if (!data) {
        throw new InternalServerError(`${fn} response.data is falsy`);
      }
      if (!data.functionOutput) {
        throw new InternalServerError(`${fn} response.functionOutput is falsy`);
      }
      return this.txsStringToTxs(data.functionOutput);
    }
    throw new InternalServerError(
      `${fn}: neither FabricAPI nor Connector given`,
    );
  }

  // Receive transactions in string format and parses to Transaction []
  txsStringToTxs(txString: string): Transaction[] {
    const transactions: Transaction[] = [];
    const txs = JSON.parse(txString);
    for (const tx of txs) {
      const txId = tx.value.txId;
      const ts = tx.value.timestamp.seconds;
      const transaction = new Transaction(
        txId,
        ts,
        new TransactionProof(new Proof({ creator: "" }), txId), //transaction proof details are set in function 'generateLedgerStates'
      );
      transaction.setPayload(safeStableStringify(tx.value) ?? "");
      transactions.push(transaction);
    }
    return transactions.reverse();
  }
}
