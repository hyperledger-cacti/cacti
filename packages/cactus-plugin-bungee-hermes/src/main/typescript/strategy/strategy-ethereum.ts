import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";
import {
  Web3SigningCredential,
  DefaultApi as EthereumApi,
  EthContractInvocationType,
  InvokeContractV1Request,
  InvokeRawWeb3EthMethodV1Request,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { NetworkDetails, ObtainLedgerStrategy } from "./obtain-ledger-strategy";
import { Configuration } from "@hyperledger/cactus-core-api";
import { State } from "../view-creation/state";
import { StateProof } from "../view-creation/state-proof";
import Web3 from "web3";
import { Proof } from "../view-creation/proof";
import { TransactionProof } from "../view-creation/transaction-proof";
import { Transaction } from "../view-creation/transaction";

interface EvmLog {
  address: string;
  data: string;
  blockHash: string;
  transactionHash: string;
  topics: Array<string>;
  logIndex: number;
  transactionIndex: number;
  blockNumber: number;
}

interface EvmBlock {
  number?: number;
  hash?: string;
  parentHash?: string;
  nonce?: string;
  sha3Uncles?: string;
  logsBloom?: string;
  transactionsRoot?: string;
  stateRoot?: string;
  miner?: string;
  difficulty?: number;
  totalDifficulty?: number;
  extraData?: string;
  size?: number;
  gasLimit?: number;
  gasUsed?: number;
  timestamp?: string;
  transactions?: Array<unknown>;
  uncles?: Array<unknown>;
}
export interface EthereumNetworkDetails extends NetworkDetails {
  signingCredential: Web3SigningCredential;
  keychainId: string;
  contractName: string;
  contractAddress: string;
}
export class StrategyEthereum implements ObtainLedgerStrategy {
  public static readonly CLASS_NAME = "StrategyEthereum";

  public log: Logger;

  constructor(level: LogLevelDesc) {
    this.log = LoggerProvider.getOrCreate({
      label: StrategyEthereum.CLASS_NAME,
      level,
    });
  }

  public async generateLedgerStates(
    stateIds: string[],
    networkDetails: EthereumNetworkDetails,
  ): Promise<Map<string, State>> {
    const fnTag = `${StrategyEthereum.CLASS_NAME}#generateLedgerStates()`;
    this.log.debug(`Generating ledger snapshot`);
    Checks.truthy(networkDetails, `${fnTag} networkDetails`);

    const config = new Configuration({
      basePath: networkDetails.connectorApiPath,
    });
    const ethereumApi = new EthereumApi(config);

    const ledgerStates = new Map<string, State>();
    const assetsKey =
      stateIds.length == 0
        ? await this.getAllAssetsKey(networkDetails, ethereumApi)
        : stateIds;
    this.log.debug("Current assets detected to capture: " + assetsKey);
    for (const assetKey of assetsKey) {
      const { transactions, values, blocks } = await this.getAllInfoByKey(
        assetKey,
        networkDetails,
        ethereumApi,
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
          blockSigners: [], // Non applicable for ethereum
        });
      }
      state.setStateProof([stateProof]);
      ledgerStates.set(assetKey, state);
    }
    return ledgerStates;
  }

  async getAllAssetsKey(
    networkDetails: EthereumNetworkDetails,
    api: EthereumApi,
  ): Promise<string[]> {
    const parameters = {
      contract: {
        contractName: networkDetails.contractName,
        keychainId: networkDetails.keychainId,
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "getAllAssetsIDs",
      params: [],
      signingCredential: networkDetails.signingCredential,
    };
    const response = await api.invokeContractV1(
      parameters as InvokeContractV1Request,
    );
    if (response.status >= 200 && response.status < 300) {
      if (response.data.callOutput) {
        return response.data.callOutput as string[];
      } else {
        throw new Error(
          `${StrategyEthereum.CLASS_NAME}#getAllAssetsKey: contract ${networkDetails.contractName} method getAllAssetsIDs output is falsy`,
        );
      }
    }
    throw new Error(
      `${StrategyEthereum.CLASS_NAME}#getAllAssetsKey: EthereumAPI error with status ${response.status}: ` +
        response.data,
    );
  }

  async getAllInfoByKey(
    key: string,
    networkDetails: EthereumNetworkDetails,
    api: EthereumApi,
  ): Promise<{
    transactions: Transaction[];
    values: string[];
    blocks: Map<string, EvmBlock>;
  }> {
    const filter = {
      fromBlock: "earliest",
      toBlock: "latest",
      address: networkDetails.contractAddress,
      topics: [null, Web3.utils.keccak256(key)], //filter logs by asset key
    };
    const getLogsReq: InvokeRawWeb3EthMethodV1Request = {
      methodName: "getPastLogs",
      params: [filter],
    };
    const response = await api.invokeWeb3EthMethodV1(getLogsReq);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `${StrategyEthereum.CLASS_NAME}#getAllInfoByKey: BesuAPI getPastLogsV1 error with status ${response.status}: ` +
          response.data,
      );
    }
    if (!response.data.data) {
      throw new Error(
        `${StrategyEthereum.CLASS_NAME}#getAllInfoByKey: BesuAPI getPastLogsV1 API call successfull but output data is falsy`,
      );
    }
    const decoded = response.data.data as EvmLog[];
    const transactions: Transaction[] = [];
    const blocks: Map<string, EvmBlock> = new Map<string, EvmBlock>();
    const values: string[] = [];
    this.log.debug("Getting transaction logs for asset: " + key);

    for (const log of decoded) {
      const getTransactionReq: InvokeRawWeb3EthMethodV1Request = {
        methodName: "getTransaction",
        params: [log.transactionHash],
      };
      const txTx = await api.invokeWeb3EthMethodV1(getTransactionReq);

      if (txTx.status < 200 || txTx.status >= 300) {
        throw new Error(
          `${StrategyEthereum.CLASS_NAME}#getAllInfoByKey: EthereumAPI invokeWeb3EthMethodV1 getTransaction error with status ${txTx.status}: ` +
            txTx.data,
        );
      }
      if (!txTx.data.data) {
        throw new Error(
          `${StrategyEthereum.CLASS_NAME}#getAllInfoByKey: EthereumAPI invokeWeb3EthMethodV1 getTransaction successfull but output data is falsy`,
        );
      }

      const getBlockReq: InvokeRawWeb3EthMethodV1Request = {
        methodName: "getBlock",
        params: [log.blockHash],
      };
      const txBlock = await api.invokeWeb3EthMethodV1(getBlockReq);

      if (txBlock.status < 200 || txBlock.status >= 300) {
        throw new Error(
          `${StrategyEthereum.CLASS_NAME}#getAllInfoByKey: EthereumAPI invokeWeb3EthMethodV1 getBlock error with status ${txBlock.status}: ` +
            txBlock.data,
        );
      }
      if (!txBlock.data.data) {
        throw new Error(
          `${StrategyEthereum.CLASS_NAME}#getAllInfoByKey: EthereumAPI invokeWeb3EthMethodV1 getBlock successfull but output data is falsy`,
        );
      }

      this.log.debug(
        "Transaction: " +
          log.transactionHash +
          "\nData: " +
          JSON.stringify(log.data) +
          "\n =========== \n",
      );
      const proof = new Proof({
        creator: txTx.data.data.from as string, //no sig for ethereum
      });
      const transaction: Transaction = new Transaction(
        log.transactionHash,
        txBlock.data.data.timestamp,
        new TransactionProof(proof, log.transactionHash),
      );
      transaction.setStateId(key);
      transaction.setTarget(networkDetails.contractAddress as string);
      transaction.setPayload(txTx.data.data.input ? txTx.data.data.input : ""); //FIXME: payload = transaction input ?
      transactions.push(transaction);
      values.push(JSON.stringify(log.data));

      blocks.set(transaction.getId(), txBlock.data.data);
    }

    return { transactions: transactions, values: values, blocks: blocks };
  }
}
