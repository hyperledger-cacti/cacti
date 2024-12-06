import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Checks,
} from "@hyperledger/cactus-common";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import {
  Web3SigningCredential,
  DefaultApi as EthereumApi,
  EthContractInvocationType,
  InvokeContractV1Request,
  InvokeRawWeb3EthMethodV1Request,
  PluginLedgerConnectorEthereum,
  InvokeRawWeb3EthMethodV1Response,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { NetworkDetails, ObtainLedgerStrategy } from "./obtain-ledger-strategy";
import { Configuration } from "@hyperledger/cactus-core-api";
import { State } from "../view-creation/state";
import { StateProof } from "../view-creation/state-proof";
import Web3 from "web3";
import { Proof } from "../view-creation/proof";
import { TransactionProof } from "../view-creation/transaction-proof";
import { Transaction } from "../view-creation/transaction";
import { BadRequestError, InternalServerError } from "http-errors-enhanced-cjs";

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
    const fn = `${StrategyEthereum.CLASS_NAME}#generateLedgerStates()`;
    this.log.debug(`Generating ledger snapshot`);
    Checks.truthy(networkDetails, `${fn} networkDetails`);

    let ethereumApi: EthereumApi | undefined;
    let connector: PluginLedgerConnectorEthereum | undefined;

    if (networkDetails.connector) {
      connector = networkDetails.connector as PluginLedgerConnectorEthereum;
    } else if (networkDetails.connectorApiPath) {
      const config = new Configuration({
        basePath: networkDetails.connectorApiPath,
      });
      ethereumApi = new EthereumApi(config);
    } else {
      throw new Error(
        `${StrategyEthereum.CLASS_NAME}#generateLedgerStates: networkDetails must have either connector or connectorApiPath`,
      );
    }

    const connectorOrApiClient = connector ? connector : ethereumApi;
    if (!connectorOrApiClient) {
      throw new InternalServerError(
        `${fn} got neither connector nor EthereumApi`,
      );
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
    connectorOrApiClient: PluginLedgerConnectorEthereum | EthereumApi,
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
    const response = await this.invokeContract(
      parameters as InvokeContractV1Request,
      connectorOrApiClient,
    );
    return response;
  }

  async getAllInfoByKey(
    key: string,
    networkDetails: EthereumNetworkDetails,
    connectorOrApiClient: PluginLedgerConnectorEthereum | EthereumApi,
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
    const response = await this.invokeWeb3EthMethod(
      getLogsReq,
      connectorOrApiClient,
    );
    const decoded = response.data as EvmLog[];
    const transactions: Transaction[] = [];
    const blocks: Map<string, EvmBlock> = new Map<string, EvmBlock>();
    const values: string[] = [];
    this.log.debug("Getting transaction logs for asset: " + key);

    for (const log of decoded) {
      const getTransactionReq: InvokeRawWeb3EthMethodV1Request = {
        methodName: "getTransaction",
        params: [log.transactionHash],
      };
      const txTx = await this.invokeWeb3EthMethod(
        getTransactionReq,
        connectorOrApiClient,
      );

      const getBlockReq: InvokeRawWeb3EthMethodV1Request = {
        methodName: "getBlock",
        params: [log.blockHash],
      };
      const txBlock = await this.invokeWeb3EthMethod(
        getBlockReq,
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
        creator: txTx.data.from as string, //no sig for ethereum
      });
      const transaction: Transaction = new Transaction(
        log.transactionHash,
        txBlock.data.timestamp,
        new TransactionProof(proof, log.transactionHash),
      );
      transaction.setStateId(key);
      transaction.setTarget(networkDetails.contractAddress as string);
      transaction.setPayload(txTx.data.input ? txTx.data.input : ""); //FIXME: payload = transaction input ?
      transactions.push(transaction);
      values.push(safeStableStringify(log.data));

      blocks.set(transaction.getId(), txBlock.data);
    }

    return { transactions: transactions, values: values, blocks: blocks };
  }

  async invokeContract(
    parameters: InvokeContractV1Request,
    connectorOrApiClient: PluginLedgerConnectorEthereum | EthereumApi,
  ): Promise<string[]> {
    const fn = `${StrategyEthereum.CLASS_NAME}#invokeContract()`;
    if (!connectorOrApiClient) {
      // throw BadRequestError because it is not our fault that we did not get
      // all the needed parameters, e.g. we are signaling that this is a "user error"
      // where the "user" is the other developer who called our function.
      throw new BadRequestError(`${fn} connectorOrApiClient is falsy`);
    } else if (connectorOrApiClient instanceof PluginLedgerConnectorEthereum) {
      const connector: PluginLedgerConnectorEthereum = connectorOrApiClient;
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
    } else if (connectorOrApiClient instanceof EthereumApi) {
      const api: EthereumApi = connectorOrApiClient;
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
        this.log.debug(
          "EthereumApi non-2xx HTTP response:",
          data,
          status,
          config,
        );

        // For the caller/client we just send back a generic error admitting that we somehow messed up:
        const errorMessage = `${fn} EthereumApi error status: ${status}: ${statusText}`;
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
    throw new InternalServerError(
      `${fn}: neither EthereumApi nor Connector given`,
    );
  }

  async invokeWeb3EthMethod(
    parameters: InvokeRawWeb3EthMethodV1Request,
    connectorOrApiClient: PluginLedgerConnectorEthereum | EthereumApi,
  ): Promise<InvokeRawWeb3EthMethodV1Response> {
    const fn = `${StrategyEthereum.CLASS_NAME}#invokeContract()`;
    if (!connectorOrApiClient) {
      throw new BadRequestError(`${fn} connectorOrApiClient is falsy`);
    } else if (connectorOrApiClient instanceof PluginLedgerConnectorEthereum) {
      const connector: PluginLedgerConnectorEthereum = connectorOrApiClient;
      const response = {
        data: await connector.invokeRawWeb3EthMethod(parameters),
      } as InvokeRawWeb3EthMethodV1Response;
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.data) {
        throw new InternalServerError(`${fn} response.data is falsy`);
      }
      return response as InvokeRawWeb3EthMethodV1Response;
    } else if (connectorOrApiClient instanceof EthereumApi) {
      const api: EthereumApi = connectorOrApiClient;
      const response = await api.invokeWeb3EthMethodV1(parameters);
      if (!response) {
        throw new InternalServerError(`${fn} response is falsy`);
      }
      if (!response.status) {
        throw new InternalServerError(`${fn} response.status is falsy`);
      }
      const { status, data, statusText, config } = response;
      if (response.status < 200 || response.status > 300) {
        this.log.debug(
          "EthereumAPI non-2xx HTTP response:",
          data,
          status,
          config,
        );
        const errorMessage = `${fn} EthereumAPI error status: ${status}: ${statusText}`;
        throw new InternalServerError(errorMessage);
      }
      if (!data) {
        throw new InternalServerError(`${fn} response.data is falsy`);
      }
      if (!data.data) {
        throw new InternalServerError(`${fn} data.data is falsy`);
      }
      return data;
    }
    throw new InternalServerError(
      `${fn}: neither EthereumAPI nor Connector given`,
    );
  }
}
