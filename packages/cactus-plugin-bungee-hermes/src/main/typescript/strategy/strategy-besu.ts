import { NetworkDetails, ObtainLedgerStrategy } from "./obtain-ledger-strategy";
import {
  Checks,
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import {
  DefaultApi as BesuApi,
  EthContractInvocationType,
  EvmBlock,
  EvmLog,
  EvmTransaction,
  GetBlockV1Request,
  GetPastLogsV1Request,
  GetTransactionV1Request,
  InvokeContractV1Request,
  PluginLedgerConnectorBesu,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { State } from "../view-creation/state";
import { StateProof } from "../view-creation/state-proof";
import { Configuration } from "@hyperledger/cactus-core-api";
import { Transaction } from "../view-creation/transaction";
import Web3 from "web3";
import { Proof } from "../view-creation/proof";
import { TransactionProof } from "../view-creation/transaction-proof";
import { BadRequestError, InternalServerError } from "http-errors-enhanced-cjs";
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
    const fn = `${StrategyBesu.CLASS_NAME}#generateLedgerStates()`;
    this.log.debug(`Generating ledger snapshot`);
    Checks.truthy(networkDetails, `${fn} networkDetails`);

    let besuApi: BesuApi | undefined;
    let connector: PluginLedgerConnectorBesu | undefined;

    if (networkDetails.connector) {
      connector = networkDetails.connector as PluginLedgerConnectorBesu;
    } else if (networkDetails.connectorApiPath) {
      const config = new Configuration({
        basePath: networkDetails.connectorApiPath,
      });
      besuApi = new BesuApi(config);
    } else {
      throw new Error(
        `${fn} networkDetails must have either connector or connectorApiPath`,
      );
    }
    const connectorOrApiClient = networkDetails.connector ? connector : besuApi;
    if (!connectorOrApiClient) {
      throw new InternalServerError(`${fn} got neither connector nor BesuAPI`);
    }
    const ledgerStates = new Map<string, State>();
    const assetsKey =
      stateIds.length == 0
        ? await this.getAllAssetsKey(networkDetails, connectorOrApiClient)
        : stateIds;
    this.log.debug("Current assets detected to capture: " + assetsKey);
    for (const assetKey of assetsKey) {
      const { transactions, values, blocks } = await this.getAllInfoByKey(
        assetKey,
        networkDetails,
        connectorOrApiClient,
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
      state.setStateProof([stateProof]);
      ledgerStates.set(assetKey, state);
    }
    return ledgerStates;
  }

  async getAllAssetsKey(
    networkDetails: BesuNetworkDetails,
    connectorOrApiClient: PluginLedgerConnectorBesu | BesuApi,
  ): Promise<string[]> {
    const parameters = {
      contractName: networkDetails.contractName,
      keychainId: networkDetails.keychainId,
      invocationType: EthContractInvocationType.Call,
      methodName: "getAllAssetsIDs",
      params: [],
      signingCredential: networkDetails.signingCredential,
      gas: 1000000,
    };
    const response = await this.invokeContract(
      parameters as InvokeContractV1Request,
      connectorOrApiClient,
    );
    return response;
  }

  async getAllInfoByKey(
    key: string,
    networkDetails: BesuNetworkDetails,
    connectorOrApiClient: PluginLedgerConnectorBesu | BesuApi,
  ): Promise<{
    transactions: Transaction[];
    values: string[];
    blocks: Map<string, EvmBlock>;
  }> {
    const req = {
      fromBlock: "earliest",
      toBlock: "latest",
      address: networkDetails.contractAddress,
      topics: [[null], [Web3.utils.keccak256(key)]], //filter logs by asset key
    };

    const decoded = await this.getPastLogs(req, connectorOrApiClient);
    const transactions: Transaction[] = [];
    const blocks: Map<string, EvmBlock> = new Map<string, EvmBlock>();
    const values: string[] = [];
    this.log.debug("Getting transaction logs for asset: " + key);

    for (const log of decoded) {
      const txTx = await this.getTransaction(
        {
          transactionHash: log.transactionHash,
        } as GetTransactionV1Request,
        connectorOrApiClient,
      );

      const txBlock = await this.getBlock(
        {
          blockHashOrBlockNumber: log.blockHash,
        } as GetBlockV1Request,
        connectorOrApiClient,
      );

      this.log.debug(
        "Transaction: " +
          log.transactionHash +
          "\nData: " +
          safeStableStringify(log.data) +
          "\n =========== \n",
      );
      const proof = new Proof({
        creator: txTx.from as string, //no sig for besu
      });
      const transaction: Transaction = new Transaction(
        log.transactionHash,
        txBlock.timestamp,
        new TransactionProof(proof, log.transactionHash),
      );
      transaction.setStateId(key);
      transaction.setTarget(networkDetails.contractAddress as string);
      transaction.setPayload(txTx.input ? txTx.input : ""); //FIXME: payload = transaction input ?
      transactions.push(transaction);
      values.push(safeStableStringify(log.data));

      blocks.set(transaction.getId(), txBlock);
    }

    return { transactions: transactions, values: values, blocks: blocks };
  }

  async invokeContract(
    parameters: InvokeContractV1Request,
    connectorOrApiClient: PluginLedgerConnectorBesu | BesuApi,
  ): Promise<string[]> {
    const fn = `${StrategyBesu.CLASS_NAME}#invokeContract()`;
    if (!connectorOrApiClient) {
      // throw BadRequestError because it is not our fault that we did not get
      // all the needed parameters, e.g. we are signaling that this is a "user error"
      // where the "user" is the other developer who called our function.
      throw new BadRequestError(`${fn} connectorOrApiClient is falsy`);
    } else if (connectorOrApiClient instanceof PluginLedgerConnectorBesu) {
      const connector: PluginLedgerConnectorBesu = connectorOrApiClient;
      const response = await connector.invokeContract(parameters);
      if (!response) {
        // We throw an InternalServerError because the user is not responsible
        // for us not being able to obtain a result from the contract invocation.
        // They provided us parameters for the call (which we then validated and
        // accepted) an therefore now if something goes wrong we have to throw
        // an exception accordingly (e.g. us "admitting fault")
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.callOutput) {
        throw new InternalServerError(`${fn} response.callOutput is falsy`);
      }
      const { callOutput } = response;
      if (!Array.isArray(callOutput)) {
        throw new InternalServerError(`${fn} callOutput not an array`);
      }
      const allItemsAreStrings = callOutput.every((x) => typeof x === "string");
      if (!allItemsAreStrings) {
        throw new InternalServerError(`${fn} callOutput has non-string items`);
      }
      return response.callOutput as string[];
    } else if (connectorOrApiClient instanceof BesuApi) {
      const api: BesuApi = connectorOrApiClient;
      const response = await api.invokeContractV1(parameters);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.status) {
        throw new InternalServerError(`${fn} response.status is falsy`);
      }
      const { status, data, statusText, config } = response;
      if (response.status < 200 || response.status > 300) {
        // We log the error here on the debug level so that later on we can inspect the contents
        // of it in the logs if we need to. The reason that this is important is because we do not
        // want to dump the full response onto our own error response that is going back to the caller
        // due to that potentially being a security issue that we are exposing internal data via the
        // error responses.
        // With that said, we still need to make sure that we can determine the root cause of any
        // issues after the fact and therefore we must save the error response details somewhere (the logs)
        this.log.debug("BesuAPI non-2xx HTTP response:", data, status, config);

        // For the caller/client we just send back a generic error admitting that we somehow messed up:
        const errorMessage = `${fn} BesuAPI error status: ${status}: ${statusText}`;
        throw new InternalServerError(errorMessage);
      }
      if (!data) {
        throw new InternalServerError(`${fn} response.data is falsy`);
      }
      if (!data.callOutput) {
        throw new InternalServerError(`${fn} data.callOutput is falsy`);
      }
      const { callOutput } = data;
      if (!Array.isArray(callOutput)) {
        throw new InternalServerError(`${fn} callOutput not an array`);
      }
      const allItemsAreStrings = callOutput.every((x) => typeof x === "string");
      if (!allItemsAreStrings) {
        throw new InternalServerError(`${fn} callOutput has non-string items`);
      }
      return response.data.callOutput;
    }
    throw new InternalServerError(`${fn}: neither BesuAPI nor Connector given`);
  }

  async getPastLogs(
    req: GetPastLogsV1Request,
    connectorOrApiClient: PluginLedgerConnectorBesu | BesuApi,
  ): Promise<EvmLog[]> {
    const fn = `${StrategyBesu.CLASS_NAME}#getPastLogs()`;
    if (!connectorOrApiClient) {
      throw new BadRequestError(`${fn} connectorOrApiClient is falsy`);
    } else if (connectorOrApiClient instanceof PluginLedgerConnectorBesu) {
      const connector: PluginLedgerConnectorBesu = connectorOrApiClient;
      const response = await connector.getPastLogs(req);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.logs) {
        throw new InternalServerError(`${fn} response.logs is falsy`);
      }
      const { logs } = response;
      if (!Array.isArray(logs)) {
        throw new InternalServerError(`${fn} logs not an array`);
      }
      const allItemsAreEvmLog = logs.every((x) => this.isEvmLog(x));
      if (!allItemsAreEvmLog) {
        throw new InternalServerError(`${fn} logs has non-EvmLog items`);
      }
      return response.logs as EvmLog[];
    } else if (connectorOrApiClient instanceof BesuApi) {
      const api: BesuApi = connectorOrApiClient;
      const response = await api.getPastLogsV1(req);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.status) {
        throw new InternalServerError(`${fn} response.status is falsy`);
      }
      const { status, data, statusText, config } = response;
      if (response.status < 200 || response.status > 300) {
        this.log.debug("BesuAPI non-2xx HTTP response:", data, status, config);
        const errorMessage = `${fn} BesuAPI error status: ${status}: ${statusText}`;
        throw new InternalServerError(errorMessage);
      }
      if (!data) {
        throw new InternalServerError(`${fn} response.data is falsy`);
      }
      if (!data.logs) {
        throw new InternalServerError(`${fn} data.logs is falsy`);
      }
      const { logs } = data;
      if (!Array.isArray(logs)) {
        throw new InternalServerError(`${fn} logs not an array`);
      }
      const allItemsAreEvmLog = logs.every((x) => this.isEvmLog(x));
      if (!allItemsAreEvmLog) {
        throw new InternalServerError(`${fn} logs has non-EvmLog items`);
      }
      return response.data.logs;
    }
    throw new InternalServerError(`${fn}: neither BesuAPI nor Connector given`);
  }

  isEvmLog(x: any): x is EvmLog {
    return (
      "address" in x &&
      "data" in x &&
      "blockHash" in x &&
      "transactionHash" in x &&
      "topics" in x &&
      "blockNumber" in x &&
      "logIndex" in x &&
      "transactionIndex" in x
    );
  }

  async getTransaction(
    req: GetTransactionV1Request,
    connectorOrApiClient: PluginLedgerConnectorBesu | BesuApi,
  ): Promise<EvmTransaction> {
    const fn = `${StrategyBesu.CLASS_NAME}#getTransaction()`;
    if (!connectorOrApiClient) {
    } else if (connectorOrApiClient instanceof PluginLedgerConnectorBesu) {
      const connector: PluginLedgerConnectorBesu = connectorOrApiClient;
      const response = await connector.getTransaction(req);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.transaction) {
        throw new InternalServerError(`${fn} response.transaction is falsy`);
      }
      return response.transaction;
    } else if (connectorOrApiClient instanceof BesuApi) {
      const api: BesuApi = connectorOrApiClient;
      const response = await api.getTransactionV1(req);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.status) {
        throw new InternalServerError(`${fn} response.status is falsy`);
      }
      const { status, data, statusText, config } = response;
      if (response.status < 200 || response.status > 300) {
        this.log.debug("BesuAPI non-2xx HTTP response:", data, status, config);

        const errorMessage = `${fn} BesuAPI error status: ${status}: ${statusText}`;
        throw new InternalServerError(errorMessage);
      }
      if (!data) {
        throw new InternalServerError(`${fn} response.data is falsy`);
      }
      if (!data.transaction) {
        throw new InternalServerError(`${fn} data.transaction is falsy`);
      }
      return response.data.transaction;
    }
    throw new InternalServerError(`${fn}: neither BesuAPI nor Connector given`);
  }

  async getBlock(
    req: GetBlockV1Request,
    connectorOrApiClient: PluginLedgerConnectorBesu | BesuApi,
  ): Promise<EvmBlock> {
    const fn = `${StrategyBesu.CLASS_NAME}#getBlock()`;
    if (!connectorOrApiClient) {
    } else if (connectorOrApiClient instanceof PluginLedgerConnectorBesu) {
      const connector: PluginLedgerConnectorBesu = connectorOrApiClient;
      const response = await connector.getBlock(req);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.block) {
        throw new InternalServerError(`${fn} response.block is falsy`);
      }
      return response.block;
    } else if (connectorOrApiClient instanceof BesuApi) {
      const api: BesuApi = connectorOrApiClient;
      const response = await api.getBlockV1(req);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.status) {
        throw new InternalServerError(`${fn} response.status is falsy`);
      }
      const { status, data, statusText, config } = response;
      if (response.status < 200 || response.status > 300) {
        this.log.debug("BesuAPI non-2xx HTTP response:", data, status, config);

        const errorMessage = `${fn} BesuAPI error status: ${status}: ${statusText}`;
        throw new InternalServerError(errorMessage);
      }
      if (!data) {
        throw new InternalServerError(`${fn} response.data is falsy`);
      }
      if (!data.block) {
        throw new InternalServerError(`${fn} data.block is falsy`);
      }
      return data.block;
    }
    throw new InternalServerError(`${fn}: neither BesuAPI nor Connector given`);
  }
}
