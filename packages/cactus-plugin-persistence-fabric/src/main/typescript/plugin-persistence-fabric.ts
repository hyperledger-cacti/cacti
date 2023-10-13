import "@hyperledger/cactus-core-api";
import { sha256 } from "js-sha256";
import * as fabricprototypes from "fabric-protos";

import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import type { Express } from "express";

import {
  FabricSigningCredential,
  FabricContractInvocationType,
  GatewayOptions,
  FabricApiClient,
  GetBlockResponseV1,
  RunTransactionResponseType,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import PostgresDatabaseClient from "./db-client/db-client";

import OAS from "../json/openapi.json";

//types and interfaces
import { AxiosResponse } from "axios";
import { QueryResult } from "pg";
import {
  getStatusReturn,
  InsertBlockDataEntryInterface,
  InsertDetailedTransactionEntryInterface,
} from "./types";

export interface IPluginPersistenceFabricOptions extends ICactusPluginOptions {
  gatewayOptions: GatewayOptions;
  apiClient: FabricApiClient;
  connectionString: string;
  logLevel: LogLevelDesc;
  instanceId: string;
}

export class PluginPersistenceFabric
  implements ICactusPlugin, IPluginWebService
{
  private log: Logger;
  public static readonly CLASS_NAME = "PluginPersistenceFabric";
  private dbClient: PostgresDatabaseClient;
  private readonly instanceId: string;
  private apiClient: FabricApiClient;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private isConnected = false;
  private isWebServicesRegistered = false;

  private failedBlocks = new Set<number>();

  // = > private lastSeenBlock = 0;
  private lastSeenBlock = 0;
  // Last Block in Ledger
  private lastBlock = 0;

  //check which blocks are missing
  private missedBlocks: string[] = [];
  private howManyBlocksMissing = 0;

  public ledgerChannelName = "mychannel";
  public ledgerContractName = "basic";
  // gateway options
  public gatewayOptions: GatewayOptions;
  // synchronization ongoing
  public synchronizationGo = true;

  constructor(public readonly options: IPluginPersistenceFabricOptions) {
    const level = this.options.logLevel || "INFO";
    const label = PluginPersistenceFabric.CLASS_NAME;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
    this.gatewayOptions = options.gatewayOptions;
    // this.fabricConnectorPlugin = new PluginLedgerConnectorFabric(options);

    // database
    this.instanceId = options.instanceId;
    this.apiClient = options.apiClient;

    this.dbClient = new PostgresDatabaseClient({
      connectionString: options.connectionString,
      logLevel: level,
    });
  }

  public async shutdown(): Promise<void> {
    this.apiClient.close();
    await this.dbClient.shutdown();
    this.isConnected = false;
  }

  public getStatus(): getStatusReturn {
    return {
      instanceId: this.instanceId,
      connected: this.isConnected,
      webServicesRegistered: this.isWebServicesRegistered,
      lastSeenBlock: this.lastSeenBlock,
    };
  }

  /**
   * Should be called before using the plugin.
   * Connects to the database and initializes the plugin schema and status entry.
   */

  public async onPluginInit(): Promise<void> {
    await this.dbClient.connect();
    this.log.info("Connect the PostgreSQL PostgresDatabaseClient");
    await this.dbClient.initializePlugin(
      PluginPersistenceFabric.CLASS_NAME,
      this.instanceId,
    );
    this.log.info("Plugin initialized");
    this.isConnected = true;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }
  // this is just test function to check if you correctly created instance of plugin
  public async helloWorldTest(): Promise<string> {
    return new Promise<string>((resolve) => {
      resolve("hello World test");
    });
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-persistence-fabric`;
  }

  /**
   * Get OpenAPI definition for this plugin.
   * @returns OpenAPI spec object
   */
  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public async registerWebServices(
    app: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    webServices.forEach((ws) => ws.registerExpress(app));
    return webServices;
  }
  // For future development
  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const pkgName = this.getPackageName();

    if (this.endpoints) {
      return this.endpoints;
    }
    this.log.info(`Creating web services for plugin ${pkgName}...`);

    const endpoints: IWebServiceEndpoint[] = [];

    this.endpoints = endpoints;

    this.log.info(`Instantiated web svcs for plugin ${pkgName} OK`, {
      endpoints,
    });
    return endpoints;
  }

  // current last block from ledger ( not in database )
  public currentLastBlock(): number {
    return this.lastBlock;
  }
  // this is greatest block number successfully migrated to database
  public currentLastSeenBlock(): number {
    return this.lastSeenBlock;
  }
  // Additional check if ledger is in synchronization
  public isLastBlockGreatherThenLastSeen(): boolean {
    if (this.lastSeenBlock >= this.lastBlock) {
      return false;
    } else {
      return true;
    }
  }
  /**
   * lastBlockInLedger
   * @returns this.lastBlock which is last block in ledger assuming using getBlock and node js SDK
   */
  public async lastBlockInLedger(
    signingCredentialInput: FabricSigningCredential,
  ): Promise<number> {
    const lastBlockInChainTest = await this.apiClient.runTransactionV1({
      signingCredential: signingCredentialInput,
      channelName: this.ledgerChannelName,
      invocationType: FabricContractInvocationType.Call,
      contractName: "qscc",
      methodName: "GetChainInfo",
      params: [this.ledgerChannelName.toString()],
      responseType: RunTransactionResponseType.JSON,
    });
    this.log.warn("lastBlockInChainTest", lastBlockInChainTest);
    const parse = JSON.parse(lastBlockInChainTest.data.functionOutput);
    const blockProto = JSON.stringify(
      fabricprototypes.common.BlockchainInfo.decode(parse.data),
    );
    const lastBlockPreview = JSON.parse(blockProto);
    this.log.info("lastBlockPreview ", lastBlockPreview.height);

    const lastBlock = lastBlockPreview.height;
    return lastBlock;
  }
  //test
  /**
   * lastBlockInLedgerWithoutFabricProto
   * @returns this.lastBlock which is last block in ledger assuming using getBlock and node js SDK
   */
  public async lastBlockInLedgerWithoutFabricProto(): Promise<number> {
    let tempBlockNumber = this.lastBlock;
    let blockNumber = tempBlockNumber.toString();
    let block: AxiosResponse<GetBlockResponseV1> =
      null as unknown as AxiosResponse<GetBlockResponseV1>;
    let moreBlocks = true;
    do {
      try {
        block = await this.apiClient.getBlockV1({
          channelName: this.ledgerChannelName,
          gatewayOptions: this.gatewayOptions,
          query: {
            blockNumber,
          },
        });
      } catch (error) {
        this.log.info("Last block in ledger", tempBlockNumber - 1);
        moreBlocks = false;
      }

      if (block?.status == 200) {
        if (moreBlocks) {
          // Update information about last Block in Ledger - this.lastBlock
          this.lastBlock = tempBlockNumber;
          tempBlockNumber = tempBlockNumber + 1;
          blockNumber = tempBlockNumber.toString();
        }
      } else {
        moreBlocks = false;
      }
    } while (moreBlocks);
    return this.lastBlock;
  }
  /**  Synchronization of blocks
   * - Synchronize entire first edgeOfLedger blocks of ledger state
   * @param edgeOfLedger defines which part of blockchain do we want to include in database
   * with the database as a good start and to check if everything is correctly set.
   * @returns string promise done after finishing the process
   * // future changes - parameter to set which part of blokchain to move to database
   */

  async initialBlocksSynchronization(edgeOfLedger: number): Promise<string> {
    let tempBlockNumber = 0;
    let blockNumber = tempBlockNumber.toString();
    let block: AxiosResponse<GetBlockResponseV1> =
      null as unknown as AxiosResponse<GetBlockResponseV1>;
    let moreBlocks = true;
    do {
      try {
        block = await this.apiClient.getBlockV1({
          channelName: this.ledgerChannelName,
          gatewayOptions: this.gatewayOptions,
          query: {
            blockNumber,
          },
        });
      } catch (error) {
        this.log.info("Last block in ledger", tempBlockNumber - 1);
        moreBlocks = false;
      }

      if (block?.status == 200) {
        const logBlock = JSON.stringify(block.data);

        // Put scrapped block into database
        this.log.info(logBlock);
        this.log.info("Block number: ", blockNumber);

        if (moreBlocks) {
          await this.migrateBlockNrWithTransactions(blockNumber);
          this.lastSeenBlock = tempBlockNumber;
          this.lastBlock = tempBlockNumber;
          tempBlockNumber = tempBlockNumber + 1;
          blockNumber = tempBlockNumber.toString();
          if (tempBlockNumber > edgeOfLedger) {
            moreBlocks = false;
          }
        }
      } else {
        moreBlocks = false;
      }
    } while (moreBlocks);
    return "done";
  }

  /**  Synchronization of blocks
   * - Synchronize entire ledger state
   * with the database as far as the lastBlockInLedger shows ( triggered once )
   * @returns string promise lastBlock number after finishing the process
   *
   */

  async continueBlocksSynchronization(
    signingCredential: FabricSigningCredential,
  ): Promise<string> {
    this.lastSeenBlock = await this.dbClient.getMaxBlockNumber();
    let tempBlockNumber = this.lastSeenBlock;
    let blockNumber = tempBlockNumber.toString();
    this.lastBlock = await this.lastBlockInLedger(signingCredential);
    let block: AxiosResponse<GetBlockResponseV1> =
      null as unknown as AxiosResponse<GetBlockResponseV1>;
    this.synchronizationGo = true;
    do {
      if (this.lastBlock > this.lastSeenBlock) {
        try {
          block = await this.apiClient.getBlockV1({
            channelName: this.ledgerChannelName,
            gatewayOptions: this.gatewayOptions,
            query: {
              blockNumber,
            },
          });
        } catch (error) {
          this.log.info("Last block in ledger", tempBlockNumber - 1);
        }

        if (block?.status == 200) {
          await this.migrateBlockNrWithTransactions(blockNumber);
          this.lastSeenBlock = tempBlockNumber;
          tempBlockNumber = tempBlockNumber + 1;
          blockNumber = tempBlockNumber.toString();
        }
      } else {
        this.missedBlocks.push(blockNumber.toString());
        this.howManyBlocksMissing = this.howManyBlocksMissing + 1;
      }
      if (this.synchronizationGo && this.lastSeenBlock >= this.lastBlock) {
        this.synchronizationGo = false;
      }
    } while (this.synchronizationGo);
    return "done";
  }

  /**  Synchronization of blocks
   * - Synchronize entire ledger state
   * with the database as far as the lastBlockInLedger shows ( triggered more than once )
   * @returns string promise lastBlock number after finishing the process
   *
   */
  // NOTE: this function can loop into very long almost infinite loop or even
  // infinite loop
  async continuousBlocksSynchronization(
    signingCredential: FabricSigningCredential,
  ): Promise<string> {
    this.lastSeenBlock = await this.dbClient.getMaxBlockNumber();
    this.synchronizationGo = true;
    let tempBlockNumber = this.lastSeenBlock; //last block migrated to database
    let blockNumber = tempBlockNumber.toString();
    this.lastBlock = await this.lastBlockInLedger(signingCredential);
    let block: AxiosResponse<GetBlockResponseV1> =
      null as unknown as AxiosResponse<GetBlockResponseV1>;
    let checkBlock = true;
    do {
      if (this.lastBlock > this.lastSeenBlock) {
        try {
          block = await this.apiClient.getBlockV1({
            channelName: this.ledgerChannelName,
            gatewayOptions: this.gatewayOptions,
            query: {
              blockNumber,
            },
          });
        } catch (error) {
          this.log.info("Last block in ledger", tempBlockNumber - 1);
        }

        if (block?.status == 200) {
          const isThisBlockPresent =
            await this.dbClient.isThisBlockInDB(tempBlockNumber);

          if (isThisBlockPresent.rowCount === 0) {
            checkBlock = true;
          } else {
            checkBlock = false; // this block is in database so skip it
          }

          if (checkBlock) {
            await this.migrateBlockNrWithTransactions(blockNumber);
            this.lastSeenBlock = Number(blockNumber);
            if (tempBlockNumber > this.lastBlock) {
              this.lastBlock = tempBlockNumber;
            }
          }
          if (!this.synchronizationGo) {
            checkBlock = false;
          }
          tempBlockNumber = tempBlockNumber + 1;
        }

        blockNumber = tempBlockNumber.toString();
      }
      this.lastBlock = await this.lastBlockInLedger(signingCredential);
    } while (this.synchronizationGo);
    return "stopped";
  }

  async changeSynchronization(): Promise<boolean> {
    if (this.synchronizationGo) {
      this.synchronizationGo = false;
    } else {
      this.synchronizationGo = true;
    }
    return this.synchronizationGo;
  }

  async getBlockFromLedger(blockNumber: string): Promise<any> {
    const block: AxiosResponse<GetBlockResponseV1> =
      await this.apiClient.getBlockV1({
        channelName: this.ledgerChannelName,
        gatewayOptions: this.gatewayOptions,
        query: {
          blockNumber,
        },
        skipDecode: false,
      });

    const tempBlockParse = block.data;

    return tempBlockParse;
  }

  // Migration of block nr with transaction inside
  // NOTE that each block have at least 1 transaction endorsement
  /**
   *
   * @param blockNumber this is parameter of function which set
   * block number to be moved from ledger to database
   * @returns true a boolean which indicates successfull migration
   */
  public async migrateBlockNrWithTransactions(
    blockNumber: string,
  ): Promise<boolean> {
    const block: AxiosResponse<GetBlockResponseV1> =
      await this.apiClient.getBlockV1({
        channelName: this.ledgerChannelName,
        gatewayOptions: this.gatewayOptions,
        query: {
          blockNumber,
        },
      });

    const tempBlockParse: any = JSON.parse(JSON.stringify(block.data));

    const hash = Buffer.from(
      tempBlockParse.decodedBlock.header.data_hash.data,
    ).toString("hex");

    const block_data = {
      fabric_block_id: hash,
      fabric_block_num: Number(blockNumber),
      fabric_block_data: JSON.stringify(block.data),
    };

    // Put scrapped block into database
    const txLen = tempBlockParse.decodedBlock.data.data.length;
    if (txLen === 0) {
      return false;
    }
    for (let txIndex = 0; txIndex < txLen; txIndex++) {
      const transactionDataObject =
        tempBlockParse.decodedBlock.data.data[txIndex];
      const transactionDataStringifies = JSON.stringify(transactionDataObject);

      let txid = "";

      const detailedTxData: InsertDetailedTransactionEntryInterface = {
        block_number: "",
        block_id: "",
        transaction_id: "",
        createdat: "",
        chaincodename: "",
        status: 0,
        creator_msp_id: "",
        endorser_msp_id: "",
        chaincode_id: "",
        type: "",
        read_set: "",
        write_set: "",
        channel_id: "",
        payload_extension: "",
        creator_id_bytes: "",
        creator_nonce: "",
        chaincode_proposal_input: "",
        tx_response: "",
        payload_proposal_hash: "",
        endorser_id_bytes: "",
        endorser_signature: "",
      };

      let rwset;
      let readSet;
      let writeSet;
      let chaincodeID;
      let status;

      let envelope_signature = transactionDataObject.signature;
      if (envelope_signature !== undefined) {
        envelope_signature = Buffer.from(envelope_signature).toString("hex");
      }
      detailedTxData.payload_extension =
        transactionDataObject.payload.header.channel_header.extension;
      if (detailedTxData.payload_extension !== undefined) {
        detailedTxData.payload_extension = Buffer.from(
          detailedTxData.payload_extension,
        ).toString("hex");
      }
      detailedTxData.creator_nonce =
        transactionDataObject.payload.header.signature_header.nonce;
      if (detailedTxData.creator_nonce !== undefined) {
        detailedTxData.creator_nonce = Buffer.from(
          detailedTxData.creator_nonce,
        ).toString("hex");
      }

      const creator_id_bytes =
        transactionDataObject.payload.header.signature_header.creator.id_bytes.data.toString();
      if (transactionDataObject.payload.data.actions !== undefined) {
        chaincodeID =
          transactionDataObject.payload.data.actions[0].payload.action
            .proposal_response_payload.extension;
        status =
          transactionDataObject.payload.data.actions[0].payload.action
            .proposal_response_payload.extension.response.status;
        this.log.info("rwset  :", JSON.stringify(rwset));
        rwset =
          transactionDataObject.payload.data.actions[0].payload.action
            .proposal_response_payload.extension.results.ns_rwset;

        if (rwset !== undefined) {
          readSet = rwset.reads;
          writeSet = rwset.writes;
          detailedTxData.read_set = JSON.stringify(readSet, null, 2);
          detailedTxData.write_set = JSON.stringify(writeSet, null, 2);
        } else {
          readSet = " as usual ";
          writeSet = " as usual ";
        }

        detailedTxData.chaincode_proposal_input =
          transactionDataObject.payload.data.actions[0].payload.chaincode_proposal_payload.input.chaincode_spec.input.args;
        if (detailedTxData.chaincode_proposal_input !== undefined) {
          let inputs = "";
          for (const input of detailedTxData.chaincode_proposal_input) {
            inputs =
              (inputs === "" ? inputs : `${inputs}`) +
              "," +
              Buffer.from(input).toString("hex");
          }
          detailedTxData.chaincode_proposal_input = inputs;
        }
        // endorser_signature =
        detailedTxData.endorser_signature =
          transactionDataObject.payload.data.actions[0].payload.action.endorsements[0].signature;
        if (detailedTxData.endorser_signature !== undefined) {
          detailedTxData.endorser_signature = Buffer.from(
            detailedTxData.endorser_signature,
          ).toString("hex");
        }
        // payload_proposal_hash = transactionDataObject.payload.data.actions[0].payload.action.proposal_response_payload.proposal_hash.data.toString(
        detailedTxData.payload_proposal_hash =
          transactionDataObject.payload.data.actions[0].payload.action.proposal_response_payload.proposal_hash.data.toString(
            "hex",
          );
        // endorser_id_bytes = transactionDataObject.payload.data.actions[0].payload.action.endorsements[0].endorser.id_bytes.data.toString(
        detailedTxData.endorser_id_bytes =
          transactionDataObject.payload.data.actions[0].payload.action.endorsements[0].endorser.id_bytes.data.toString(
            "hex",
          );

        detailedTxData.endorser_msp_id =
          tempBlockParse.decodedBlock.data.data[
            txIndex
          ].payload.data.actions[0].payload.action.endorsements[0].endorser.mspid;
        detailedTxData.tx_response =
          tempBlockParse.decodedBlock.data.data[
            txIndex
          ].payload.data.actions[0].payload.action.proposal_response_payload.extension;
      }

      if (
        transactionDataObject.payload.header.channel_header.typeString ===
        "CONFIG"
      ) {
        txid = sha256(transactionDataStringifies);
        readSet =
          transactionDataObject.payload.data.last_update.payload?.data
            .config_update.read_set;
        writeSet =
          transactionDataObject.payload.data.last_update.payload?.data
            .config_update.write_set;
      } else {
        txid =
          tempBlockParse.decodedBlock.data.data[txIndex].payload.header
            .channel_header.tx_id;
      }

      const chaincode_id: string = "" + JSON.stringify(chaincodeID);

      let chaincodename = "";
      // checking if proposal_response_payload is present and operational
      let checker = "";
      const BlockNumberIn: string = blockNumber;
      try {
        checker =
          tempBlockParse.decodedBlock.data.data[txIndex].payload.data.actions[0]
            .payload.action.proposal_response_payload;
      } catch (error) {}

      if (checker !== "") {
        chaincodename =
          tempBlockParse.decodedBlock.data.data[txIndex].payload.data.actions[0]
            .payload.action.proposal_response_payload.extension.chaincode_id
            .name;
      } else {
        chaincodename = " ";
      }

      await this.dbClient.insertDetailedTransactionEntry({
        block_number: BlockNumberIn,
        block_id: hash,
        transaction_id: txid,
        createdat:
          tempBlockParse.decodedBlock.data.data[txIndex].payload.header
            .channel_header.timestamp,
        chaincodename: chaincodename,
        status: status,
        creator_msp_id:
          tempBlockParse.decodedBlock.data.data[txIndex].payload.header
            .signature_header.creator.mspid,
        endorser_msp_id: detailedTxData.endorser_msp_id,
        chaincode_id: chaincode_id, //tempBlockParse.decodedBlock.data.data[0].payload.data.payload.chaincode_proposal_payload.input.chaincode_spec.chaincode_id,
        type: tempBlockParse.decodedBlock.data.data[txIndex].payload.header
          .channel_header.typeString,
        read_set: detailedTxData.read_set, //tempBlockParse.decodedBlock.data.data[0].payload.data.actions[0].payload.action.proposal_response_payload,
        write_set: detailedTxData.write_set, //tempBlockParse.decodedBlock.data.data[0].payload.data.actions[0].payload.chaincode_proposal_payload.input.chaincode_spec.input,
        channel_id:
          tempBlockParse.decodedBlock.data.data[txIndex].payload.header
            .channel_header.channel_id,
        payload_extension: detailedTxData.payload_extension, //tempBlockParse.decodedBlock.data.data[0].payload.data.actions[0].payload.action.proposal_response_payload.extension,
        creator_id_bytes: creator_id_bytes, //tempBlockParse.decodedBlock.data.data[0].payload.header.signature_header.creator.id_bytes.data,
        creator_nonce: detailedTxData.creator_nonce, //tempBlockParse.decodedBlock.data.data[0].payload.header.signature_header.nonce,
        chaincode_proposal_input: detailedTxData.chaincode_proposal_input, //tempBlockParse.decodedBlock.data.data[0].payload.data.actions.payload.chaincode_proposal_payload.input.chaincode_spec.input,
        tx_response: detailedTxData.tx_response,
        payload_proposal_hash: detailedTxData.payload_proposal_hash, //tempBlockParse.decodedBlock.data.data[0].payload.data.actions[0].payload.action.proposal_response_payload.proposal.hash.data,
        endorser_id_bytes: detailedTxData.endorser_id_bytes, //tempBlockParse.decodedBlock.data.data[0].payload.data.actions[0].payload.action.endorsements.endorser.id_bytes.data,
        endorser_signature: detailedTxData.endorser_signature, //tempBlockParse.decodedBlock.data.data[0].payload.data.actions[0].payload.action.endorsements.signature.data,
      });

      await this.dbClient.insertBlockTransactionEntry({
        transaction_id: txid,
        fabric_block_id: hash,
        fabric_transaction_data:
          tempBlockParse.decodedBlock.data.data[txIndex].payload.data.actions,
      });
    }

    await this.dbClient.insertBlockDataEntry(block_data);

    if (Number(blockNumber) > this.lastSeenBlock) {
      //update last seen and migrated to database block
      this.lastSeenBlock = Number(blockNumber);
    }

    await this.dbClient.insertBlockDetails({
      fabric_block_id: hash,
      fabric_blocknum: blockNumber,
      fabric_datahash: hash,
      fabric_tx_count: txLen,
      fabric_createdat:
        tempBlockParse.decodedBlock.data.data[0].payload.header.channel_header
          .timestamp,
      fabric_prev_blockhash: tempBlockParse.decodedBlock.header.previous_hash,
      fabric_channel_id:
        tempBlockParse.decodedBlock.data.data[0].payload.header.channel_header
          .channel_id,
    });

    if (Number(blockNumber) > this.lastSeenBlock) {
      //update last seen and migrated to database block
      this.lastSeenBlock = Number(blockNumber);
    }

    return true;
  }
  /**
 *
 * @param limitLastBlockConsidered  this parameter - set the last block in ledger which we consider valid by our party and synchronize only to this point in ledger
If some blocks above this number are already in database they will not be removed.
 * @returns number which is this.lastBlock , artificially set lastBlock in ledger
 */
  public setLastBlockConsidered(limitLastBlockConsidered: number): number {
    this.lastBlock = limitLastBlockConsidered;
    return this.lastBlock;
  }

  /**
   *
   * @returns number blocks missing according to last run of function which checks missing blocks
   * whichBlocksAreMissingInDdSimple
   */
  public showHowManyBlocksMissing(): number {
    return this.howManyBlocksMissing;
  }

  /**
   * - Walk through all the blocks
   * that could not be synchronized with the DB for some reasons and list them
   * @returns number of missing blocks
   */
  public async whichBlocksAreMissingInDdSimple(): Promise<number> {
    this.howManyBlocksMissing = 0;

    for (let iterator: number = this.lastBlock; iterator >= 0; iterator--) {
      const isThisBlockPresent = await this.dbClient.isThisBlockInDB(iterator);

      if (isThisBlockPresent.rowCount === 0) {
        this.missedBlocks.push(iterator.toString());
        this.howManyBlocksMissing += 1;
      }
    }

    this.log.info("missedBlocks", JSON.stringify(this.missedBlocks));
    return this.howManyBlocksMissing;
  }
  /**
   * synchronization of missing Blocks
   * run function whichBlocksAreMissingInDdSimple before using this one
   * @returns number of missing blocks if any , should return 0
   */
  async synchronizeOnlyMissedBlocks(): Promise<number> {
    if (this.howManyBlocksMissing > 0) {
      let missedIndex = 0;
      let blockNumber: string = this.missedBlocks[missedIndex];
      let moreBlocks = true;
      this.log.info("database start Synchronization");
      do {
        blockNumber = this.missedBlocks[missedIndex];
        const block: AxiosResponse<GetBlockResponseV1> =
          await this.apiClient.getBlockV1({
            channelName: this.ledgerChannelName,
            gatewayOptions: this.gatewayOptions,
            query: {
              blockNumber,
            },
          });

        if (block.status == 200) {
          // Put scrapped block into database
          const migrateBlock =
            await this.migrateBlockNrWithTransactions(blockNumber);
          if (migrateBlock) {
            const delSynchronized = this.missedBlocks.indexOf(blockNumber);
            delete this.missedBlocks[delSynchronized];
          }
          missedIndex = missedIndex + 1;
          this.howManyBlocksMissing = this.howManyBlocksMissing - 1;
        }

        if (this.howManyBlocksMissing <= 0) {
          moreBlocks = false;
        }
      } while (moreBlocks);
    }
    this.log.info("database Is in Synchronization");
    return this.howManyBlocksMissing;
  }

  /** migrateNextBlock
   * tries to migrate next block according to lastBlock information stored in plugin
   */
  public async migrateNextBlock(): Promise<number> {
    const toMigrate: number = this.lastBlock + 1;
    try {
      await this.migrateBlockNrWithTransactions(toMigrate.toString());
      this.lastSeenBlock = toMigrate;
      return toMigrate;
    } catch (error: unknown) {
      const message = `Parsing block #${toMigrate} failed: ${error}`;
      this.log.info(message);
    }
    return 0;
  }

  public async insertBlockDataEntry(
    data: InsertBlockDataEntryInterface,
  ): Promise<QueryResult> {
    console.log("insert Block Data Entry");
    const test = this.dbClient.insertBlockDataEntry(data);

    return test;
  }
}
