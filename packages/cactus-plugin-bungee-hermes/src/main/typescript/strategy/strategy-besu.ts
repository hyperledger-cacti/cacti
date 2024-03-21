import { NetworkDetails, ObtainLedgerStrategy } from "./obtain-ledger-strategy";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  DefaultApi as BesuApi,
  EthContractInvocationType,
  EvmBlock,
  EvmLog,
  GetBlockV1Request,
  GetPastLogsV1Request,
  GetTransactionV1Request,
  InvokeContractV1Request,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { State } from "../view-creation/state";
import { StateProof } from "../view-creation/state-proof";
import { Configuration } from "@hyperledger/cactus-core-api";
import { Transaction } from "../view-creation/transaction";
import Web3 from "web3";
import { Proof } from "../view-creation/proof";
import { TransactionProof } from "../view-creation/transaction-proof";

export interface BesuNetworkDetails extends NetworkDetails {
  signingCredential: Web3SigningCredential;
  keychainId: string;
  contractName: string;
  contractAddress: string;
}
export class StrategyBesu implements ObtainLedgerStrategy {
  public static readonly CLASS_NAME = "StrategyBesu";

  public log: Logger;

  constructor(level: LogLevelDesc) {
    this.log = LoggerProvider.getOrCreate({
      label: StrategyBesu.CLASS_NAME,
      level,
    });
  }

  public async generateLedgerStates(
    stateIds: string[],
    networkDetails: BesuNetworkDetails,
  ): Promise<Map<string, State>> {
    this.log.debug(`Generating ledger snapshot`);
    const config = new Configuration({
      basePath: networkDetails.connectorApiPath,
    });
    const besuApi = new BesuApi(config);

    const ledgerStates = new Map<string, State>();
    const assetsKey =
      stateIds.length == 0
        ? ((await this.getAllAssetsKey(networkDetails, besuApi)) as string[])
        : stateIds;
    this.log.debug("Current assets detected to capture: " + assetsKey);
    for (const assetKey of assetsKey) {
      const { transactions, values, blocks } = await this.getAllInfoByKey(
        assetKey,
        networkDetails,
        besuApi,
      );

      const state = new State(assetKey, values, transactions);

      const stateProof = new StateProof(
        state.getValue(),
        parseInt(state.getVersion()),
        state.getId(),
      );
      const blocksHash: string[] = [];
      for (const block of blocks.values()) {
        if (blocksHash.indexOf(block.hash as string) !== -1) {
          continue;
        }
        blocksHash.push(block.hash as string);
        stateProof.addBlock({
          blockHash: block.hash as string,
          blockCreator: block.miner as string,
          blockSigners: [], // FIXME: query blocksigners (blockchain specific)
        });
      }
      state.setStateProof([]);
      ledgerStates.set(assetKey, state);
    }
    return ledgerStates;
  }

  async getAllAssetsKey(
    networkDetails: BesuNetworkDetails,
    api: BesuApi,
  ): Promise<string | string[]> {
    const parameters = {
      contractName: networkDetails.contractName,
      keychainId: networkDetails.keychainId,
      invocationType: EthContractInvocationType.Call,
      methodName: "getAllAssetsIDs",
      params: [],
      signingCredential: networkDetails.signingCredential,
      gas: 1000000,
    };
    const response = await api.invokeContractV1(
      parameters as InvokeContractV1Request,
    );
    if (response != undefined) {
      return response.data.callOutput;
    }

    return "response undefined";
  }

  async getAllInfoByKey(
    key: string,
    networkDetails: BesuNetworkDetails,
    api: BesuApi,
  ): Promise<{
    transactions: Transaction[];
    values: string[];
    blocks: Map<string, EvmBlock>;
  }> {
    const req = {
      address: networkDetails.contractAddress,
      topics: [[null], [Web3.utils.keccak256(key)]], //filter logs by asset key
    };
    const response = await api.getPastLogsV1(req as GetPastLogsV1Request);
    if (response == undefined) {
      return {
        transactions: [],
        values: [],
        blocks: new Map<string, EvmBlock>(),
      };
    }
    const decoded = response.data.logs as EvmLog[];
    const transactions: Transaction[] = [];
    const blocks: Map<string, EvmBlock> = new Map<string, EvmBlock>();
    const values: string[] = [];
    this.log.debug("Getting transaction logs for asset: " + key);

    for (const log of decoded) {
      const txTx = await api.getTransactionV1({
        transactionHash: log.transactionHash,
      } as GetTransactionV1Request);

      const txBlock = await api.getBlockV1({
        blockHashOrBlockNumber: log.blockHash,
      } as GetBlockV1Request);
      if (txTx == undefined || txBlock == undefined) {
        this.log.debug(
          "some error occurred fetching transaction or block info in ",
        );
        return {
          transactions: [],
          values: [],
          blocks: new Map<string, EvmBlock>(),
        };
      }
      this.log.debug(
        "Transaction: " +
          log.transactionHash +
          "\nData: " +
          JSON.stringify(log.data) +
          "\n =========== \n",
      );
      const proof = new Proof({
        creator: txTx.data.transaction.from as string, //no sig for besu
      });
      const transaction: Transaction = new Transaction(
        log.transactionHash,
        txBlock.data.block.timestamp,
        new TransactionProof(proof),
      );
      transaction.setStateId(key);
      transaction.setTarget(networkDetails.contractAddress as string);
      transaction.setPayload(
        txTx.data.transaction.input ? txTx.data.transaction.input : "",
      ); //FIXME: payload = transaction input ?
      transactions.push(transaction);
      values.push(JSON.stringify(log.data));

      blocks.set(transaction.getId(), txBlock.data.block);
    }

    return { transactions: transactions, values: values, blocks: blocks };
  }
}
